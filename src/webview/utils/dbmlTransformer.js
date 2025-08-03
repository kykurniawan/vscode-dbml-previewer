import dagre from 'dagre';

/**
 * Calculate the width needed for a column based on its content
 * @param {Object} column - Column object
 * @returns {Number} Width in pixels
 */
const calculateColumnWidth = (column) => {
  // Base padding and margins
  const basePadding = 16; // 8px padding on each side
  const iconWidth = 12;
  const linkIconWidth = 12;
  const marginBetweenElements = 6;
  
  // Calculate column name width (approximate)
  const columnNameLength = column.name.length;
  const columnNameWidth = columnNameLength * 7; // Approximate 7px per character
  
  // Calculate type width
  const columnType = column.type?.type_name || 'unknown';
  const typeWidth = columnType.length * 6; // Monospace font, smaller
  
  // Total width calculation
  let totalWidth = basePadding + iconWidth + marginBetweenElements + columnNameWidth + marginBetweenElements + typeWidth;
  
  // Add extra width for link icon if this column has handles
  totalWidth += linkIconWidth + marginBetweenElements;
  
  // Minimum width
  const minWidth = 160;
  
  return Math.max(totalWidth, minWidth);
};

/**
 * Calculate the optimal width for a table based on its columns
 * @param {Object} table - Table object
 * @returns {Number} Width in pixels
 */
const calculateTableWidth = (table) => {
  if (!table.fields || table.fields.length === 0) {
    return 200; // Default minimum width
  }
  
  // Find the widest column
  const maxColumnWidth = Math.max(...table.fields.map(calculateColumnWidth));
  
  // Add padding for parent container (8px padding on each side + borders)
  const tablePadding = 8;
  return maxColumnWidth + (tablePadding * 2);
};



/**
 * Analyze column relationships from DBML refs
 * @param {Array} refs - Array of reference objects with proper fieldNames
 * @param {Array} table - Array of table objects
 * @returns {Object} Object mapping table names to column handle info
 */
const analyzeColumnRelationships = (refs) => {
  const columnHandles = {};

  console.log('dbg: refs count:', refs.length);

  refs.forEach(ref => {
    ref.endpoints?.forEach(endpoint => {
      const tableName = endpoint.tableName;
      const fieldNames = endpoint.fieldNames || [endpoint.fieldName]; // Support both formats
      
      if (tableName && fieldNames && fieldNames.length > 0) {
        // Initialize table object if it doesn't exist
        if (!columnHandles[tableName]) {
          columnHandles[tableName] = {};
        }
        
        // Mark each field in this endpoint
        fieldNames.forEach(fieldName => {
          if (fieldName) {
            // Determine if this is source or target based on relation
            // "*" relation means this side can have multiple records (many side)
            // "1" relation means this side has one record (one side)
            const isMany = endpoint.relation === '*';
            const isOne = endpoint.relation === '1';
            
            columnHandles[tableName][fieldName] = {
              isSource: isMany, // Many side typically has the foreign key (source)
              isTarget: isOne,  // One side typically has the primary key (target)
              relation: endpoint.relation
            };
          }
        });
      }
    });
  });
  
  return columnHandles;
};

export const transformDBMLToNodes = (dbmlData) => {
  if (!dbmlData?.schemas?.[0]?.tables) {
    return { nodes: [], edges: [] };
  }

  const tables = dbmlData.schemas[0].tables;
  const refs = dbmlData.schemas[0].refs || [];
  
  // Analyze column relationships from DBML refs only
  const columnHandles = analyzeColumnRelationships(refs);

  // Create parent-child node structure
  const nodes = [];
  
  tables.forEach((table) => {
    const columnCount = table.fields?.length || 0;
    const tableWidth = calculateTableWidth(table);
    
    // Create table header node (parent)
    const tableHeaderNode = {
      id: `table-${table.name}`,
      type: 'tableHeader',
      position: { x: 0, y: 0 }, // Will be calculated by layout
      data: { 
        table,
        columnCount,
        tableWidth
      },
    };
    nodes.push(tableHeaderNode);

    // Create column nodes (children)
    const headerHeight = 42;
    const noteHeight = table.note ? 30 : 0;
    const tablePadding = 8;
    const startY = headerHeight + noteHeight + tablePadding; // Include padding offset
    const columnWidth = tableWidth - (tablePadding * 2); // Subtract both side paddings
    
    table.fields?.forEach((column, columnIndex) => {
      const columnHandleInfo = columnHandles[table.name]?.[column.name];
      const columnNode = {
        id: `${table.name}.${column.name}`,
        type: 'column',
        position: { 
          x: tablePadding, // Position within padding
          y: startY + (columnIndex * 30) // Position after header, note, and padding
        },
        parentId: `table-${table.name}`,
        data: {
          column,
          hasSourceHandle: columnHandleInfo?.isSource || false,
          hasTargetHandle: columnHandleInfo?.isTarget || false,
          columnWidth
        },
        extent: 'parent', // Constrain to parent bounds
        draggable: false, // Disable dragging for column nodes
      };
      nodes.push(columnNode);
    });
  });

  // Create edges for relationships connecting column nodes directly from DBML refs
  const edges = [];
  
  refs.forEach((ref, index) => {
    if (ref.endpoints && ref.endpoints.length >= 2) {
      const [sourceEndpoint, targetEndpoint] = mapSourceAndTarget(ref)
      
      // Use fieldNames arrays from actual DBML refs
      const sourceFieldNames = sourceEndpoint.fieldNames || [];
      const targetFieldNames = targetEndpoint.fieldNames || [];
      
      // Create edges for each field pair
      sourceFieldNames.forEach((sourceField, fieldIndex) => {
        const targetField = targetFieldNames[fieldIndex] || targetFieldNames[0];

        if (sourceField && targetField) {
          const sourceTable = sourceEndpoint.tableName;
          const targetTable = targetEndpoint.tableName;
          
          // Generate cardinality label using actual endpoint relations
          const sourceRelation = sourceEndpoint.relation || '1';
          const targetRelation = targetEndpoint.relation || '1';
          const cardinality = `${sourceRelation}:${targetRelation}`;
          
          console.log(`dbg: ------`);
          console.log(`dbg: source ${sourceTable}.${sourceField} -> ${sourceRelation}`);
          console.log(`dbg: target ${targetTable}.${targetField} -> ${targetRelation}`);
          console.log(`dbg: cardinality ${cardinality}`);
          console.log(`dbg: ------`);

          edges.push({
            id: `${sourceTable}.${sourceField}-${targetTable}.${targetField}-${index}-${fieldIndex}`,
            source: `${sourceTable}.${sourceField}`,
            target: `${targetTable}.${targetField}`,
            sourceHandle: 'source',
            targetHandle: 'target',
            type: 'smoothstep',
            animated: true,
            selectable: true,
            style: {
              stroke: 'var(--vscode-charts-lines)',
              strokeWidth: 2,
              strokeDasharray: '0',
            },
            label: cardinality,
            labelStyle: {
              fill: 'var(--vscode-editor-foreground)',
              fontSize: 10,
              fontWeight: 'bold',
            },
            labelBgStyle: {
              fill: 'var(--vscode-editor-background)',
              fillOpacity: 0.8,
            },
          });
        }
      });
    }
  });

  // Apply auto-layout using dagre (only for table header nodes)
  const layoutedElements = getLayoutedElements(nodes, edges);

  return {
    nodes: layoutedElements.nodes,
    edges: layoutedElements.edges,
  };
};


const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const headerHeight = 42;
  const columnHeight = 30;

  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 50,
    ranksep: 100,
  });

  // Only add table header nodes to dagre for layout calculation
  const tableHeaderNodes = nodes.filter(node => node.type === 'tableHeader');

  // Calculate table dimensions based on content
  const tableDimensions = {};
  const tablePadding = 8;
  tableHeaderNodes.forEach((tableNode) => {
    const { table, columnCount, tableWidth } = tableNode.data;
    const noteHeight = table.note ? 30 : 0;
    const totalHeight = headerHeight + noteHeight + (columnCount * columnHeight) + (tablePadding * 2);
    
    tableDimensions[tableNode.id] = {
      width: tableWidth,
      height: totalHeight
    };
  });

  tableHeaderNodes.forEach((node) => {
    const dimensions = tableDimensions[node.id];
    dagreGraph.setNode(node.id, { 
      width: dimensions.width, 
      height: dimensions.height 
    });
  });

  // Add edges between table headers for dagre layout
  edges.forEach((edge) => {
    const sourceTableId = `table-${edge.source.split('.')[0]}`;
    const targetTableId = `table-${edge.target.split('.')[0]}`;
    
    // Only add edge if it connects different tables
    if (sourceTableId !== targetTableId) {
      dagreGraph.setEdge(sourceTableId, targetTableId);
    }
  });

  dagre.layout(dagreGraph);

  // Position table header nodes and their child column nodes
  const layoutedNodes = nodes.map((node) => {
    if (node.type === 'tableHeader') {
      const nodeWithPosition = dagreGraph.node(node.id);
      const dimensions = tableDimensions[node.id];
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - dimensions.width / 2,
          y: nodeWithPosition.y - dimensions.height / 2,
        },
      };
    } else if (node.type === 'column') {
      // Column nodes keep their relative positions to parents
      return node;
    }
    return node;
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
};

const mapSourceAndTarget = (ref) => {
  let source;
  let target;

  if (ref.endpoints[0].relation === '1') {
    source = ref.endpoints[1]
    target = ref.endpoints[0]
  } else if (ref.endpoints[1].relation === '1') {
    source = ref.endpoints[0]
    target = ref.endpoints[1]
  } else {
    source = ref.endpoints[0]
    target = ref.endpoints[1]
  }

  return [source, target]
}