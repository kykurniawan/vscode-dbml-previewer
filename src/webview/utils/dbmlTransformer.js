import dagre from 'dagre';

export const transformDBMLToNodes = (dbmlData) => {
  if (!dbmlData?.schemas?.[0]?.tables) {
    return { nodes: [], edges: [] };
  }

  const tables = dbmlData.schemas[0].tables;
  const refs = dbmlData.schemas[0].refs || [];

  // Create nodes for tables
  const nodes = tables.map((table, index) => ({
    id: table.name,
    type: 'table',
    position: { x: 0, y: 0 }, // Will be calculated by layout
    data: { table },
  }));

  // Create edges for relationships
  const edges = refs.map((ref, index) => {
    const sourceTable = ref.endpoints[0].tableName;
    const targetTable = ref.endpoints[1].tableName;
    
    return {
      id: `${sourceTable}-${targetTable}-${index}`,
      source: sourceTable,
      target: targetTable,
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