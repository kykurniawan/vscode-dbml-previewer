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
 * Extract field-level references from tables by looking at field definitions
 * @param {Array} tables - Array of table objects
 * @returns {Object} Object mapping table names to column handle info
 */
const analyzeColumnRelationshipsFromTables = (tables) => {
  const columnHandles = {};
  
  tables.forEach(table => {
    table.fields?.forEach(field => {
      // Look for field-level references in the field's type or settings
      // This is a fallback since the parser doesn't extract inline refs properly
      
      // Check if field name suggests it's a foreign key (ends with _id)
      if (field.name.endsWith('_id') && field.name !== 'id') {
        // Guess the target table name by removing _id suffix
        const potentialTargetTable = field.name.replace('_id', 's'); // e.g., author_id -> authors
        const potentialTargetTable2 = field.name.replace('_id', ''); // e.g., category_id -> category
        
        // Initialize table objects if they don't exist
        if (!columnHandles[table.name]) {
          columnHandles[table.name] = {};
        }
        
        // Mark this column as a source (foreign key)
        columnHandles[table.name][field.name] = { isSource: true, isTarget: false };
        
        // Try to find target tables and mark their 'id' fields as targets
        tables.forEach(targetTable => {
          if (targetTable.name === potentialTargetTable || 
              targetTable.name === potentialTargetTable2 ||
              targetTable.name === field.name.replace('_id', '')) {
            
            if (!columnHandles[targetTable.name]) {
              columnHandles[targetTable.name] = {};
            }
            
            // Mark the 'id' field of the target table as a target
            columnHandles[targetTable.name]['id'] = { isSource: false, isTarget: true };
          }
        });
      }
    });
  });
  
  return columnHandles;
};

/**
 * Analyze column relationships from DBML refs (fallback method)
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
    
    // Only process if we have field names
    if (sourceColumn && targetColumn) {
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
    }
  });
  
  return columnHandles;
};

export const transformDBMLToNodes = (dbmlData) => {
  if (!dbmlData?.schemas?.[0]?.tables) {
    return { nodes: [], edges: [] };
  }

  const tables = dbmlData.schemas[0].tables;
  const refs = dbmlData.schemas[0].refs || [];

  // Analyze column relationships using both methods
  const columnHandlesFromRefs = analyzeColumnRelationships(refs);
  const columnHandlesFromTables = analyzeColumnRelationshipsFromTables(tables);
  
  // Merge both results, with refs taking priority
  const columnHandles = { ...columnHandlesFromTables };
  Object.keys(columnHandlesFromRefs).forEach(tableName => {
    if (!columnHandles[tableName]) {
      columnHandles[tableName] = {};
    }
    Object.assign(columnHandles[tableName], columnHandlesFromRefs[tableName]);
  });
  

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

  // Create edges for relationships connecting column nodes directly
  const edges = [];
  
  // Generate edges from inferred column relationships
  Object.keys(columnHandles).forEach(tableName => {
    Object.keys(columnHandles[tableName]).forEach(columnName => {
      const columnInfo = columnHandles[tableName][columnName];
      
      if (columnInfo.isSource) {
        // This is a foreign key column, find its target
        const foreignKeyName = columnName; // e.g., "author_id"
        const targetTableName = foreignKeyName.replace('_id', ''); // e.g., "author"
        
        // Look for the actual target table (could be plural)
        const targetTable = tables.find(t => 
          t.name === targetTableName || 
          t.name === targetTableName + 's' ||
          t.name === targetTableName.slice(0, -1) // handle "categories" -> "category_id"
        );
        
        if (targetTable) {
          const targetColumn = 'id'; // Assume foreign keys reference 'id' field
          
          edges.push({
            id: `${tableName}.${columnName}-${targetTable.name}.${targetColumn}`,
            source: `${tableName}.${columnName}`,
            target: `${targetTable.name}.${targetColumn}`,
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
            label: '1:M', // Default relationship type
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
      }
    });
  });
  
  // Also try to create edges from the original refs (in case they have field info)
  refs.forEach((ref, index) => {
    const sourceEndpoint = ref.endpoints[0];
    const targetEndpoint = ref.endpoints[1];
    
    const sourceTable = sourceEndpoint.tableName;
    const targetTable = targetEndpoint.tableName;
    const sourceColumn = sourceEndpoint.fieldName;
    const targetColumn = targetEndpoint.fieldName;
    
    // Only add if we have field names and haven't already added this edge
    if (sourceColumn && targetColumn) {
      const edgeId = `${sourceTable}.${sourceColumn}-${targetTable}.${targetColumn}`;
      const alreadyExists = edges.some(e => e.id.includes(edgeId));
      
      if (!alreadyExists) {
        edges.push({
          id: `${edgeId}-${index}`,
          source: `${sourceTable}.${sourceColumn}`,
          target: `${targetTable}.${targetColumn}`,
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
          label: getRelationshipLabel(ref),
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
    }
  });

  // Apply auto-layout using dagre (only for table header nodes)
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