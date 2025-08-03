import dagre from 'dagre';

/**
 * Analyze column relationships from DBML refs
 * @param {Array} refs - Array of reference objects
 * @returns {Object} Object mapping table names to column handle info
 */
const analyzeColumnRelationships = (refs) => {
  const columnHandles = {};
  
  refs.forEach(ref => {
    const sourceEndpoint = ref.endpoints[0];
    const targetEndpoint = ref.endpoints[1];
    
    const sourceTable = sourceEndpoint.tableName;
    const targetTable = targetEndpoint.tableName;
    const sourceColumn = sourceEndpoint.fieldName;
    const targetColumn = targetEndpoint.fieldName;
    
    // Initialize table objects if they don't exist
    if (!columnHandles[sourceTable]) {
      columnHandles[sourceTable] = {};
    }
    if (!columnHandles[targetTable]) {
      columnHandles[targetTable] = {};
    }
    
    // Mark columns that have relationships
    columnHandles[sourceTable][sourceColumn] = { isSource: true, isTarget: false };
    columnHandles[targetTable][targetColumn] = { isSource: false, isTarget: true };
  });
  
  return columnHandles;
};

export const transformDBMLToNodes = (dbmlData) => {
  if (!dbmlData?.schemas?.[0]?.tables) {
    return { nodes: [], edges: [] };
  }

  const tables = dbmlData.schemas[0].tables;
  const refs = dbmlData.schemas[0].refs || [];

  // Analyze column relationships
  const columnHandles = analyzeColumnRelationships(refs);

  // Create nodes for tables
  const nodes = tables.map((table, index) => ({
    id: table.name,
    type: 'table',
    position: { x: 0, y: 0 }, // Will be calculated by layout
    data: { 
      table,
      columnHandles: columnHandles[table.name] || {}
    },
  }));

  // Create edges for relationships with column-specific handles
  const edges = refs.map((ref, index) => {
    const sourceEndpoint = ref.endpoints[0];
    const targetEndpoint = ref.endpoints[1];
    
    const sourceTable = sourceEndpoint.tableName;
    const targetTable = targetEndpoint.tableName;
    const sourceColumn = sourceEndpoint.fieldName;
    const targetColumn = targetEndpoint.fieldName;
    
    // Use column-specific handles if available, otherwise fall back to table handles
    const sourceHandleId = columnHandles[sourceTable] && columnHandles[sourceTable][sourceColumn] 
      ? sourceColumn 
      : "table-source";
      
    const targetHandleId = columnHandles[targetTable] && columnHandles[targetTable][targetColumn]
      ? targetColumn
      : "table-target";
    
    return {
      id: `${sourceTable}.${sourceColumn}-${targetTable}.${targetColumn}-${index}`,
      source: sourceTable,
      target: targetTable,
      sourceHandle: sourceHandleId,
      targetHandle: targetHandleId,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: 'var(--vscode-charts-lines)',
        strokeWidth: 2,
      },
      markerEnd: {
        type: 'arrowclosed',
        color: 'var(--vscode-charts-lines)',
      },
      label: getRelationshipLabel(ref),
      labelStyle: {
        fill: 'var(--vscode-editor-foreground)',
        fontSize: 10,
      },
    };
  });

  // Apply auto-layout using dagre
  const layoutedElements = getLayoutedElements(nodes, edges);

  return {
    nodes: layoutedElements.nodes,
    edges: layoutedElements.edges,
  };
};

const getRelationshipLabel = (ref) => {
  const sourceEndpoint = ref.endpoints[0];
  const targetEndpoint = ref.endpoints[1];
  
  // Determine relationship type based on cardinality
  if (sourceEndpoint.relation === '1' && targetEndpoint.relation === '1') {
    return '1:1';
  } else if (sourceEndpoint.relation === '1' && targetEndpoint.relation === '*') {
    return '1:M';
  } else if (sourceEndpoint.relation === '*' && targetEndpoint.relation === '1') {
    return 'M:1';
  } else if (sourceEndpoint.relation === '*' && targetEndpoint.relation === '*') {
    return 'M:M';
  }
  
  return '';
};

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 200;
  const nodeHeight = 100;

  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 50,
    ranksep: 100,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
};