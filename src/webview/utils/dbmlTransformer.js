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
 * Resolve table name to full name with schema prefix
 * @param {string} tableName - Table name (may or may not include schema)
 * @param {Array} tables - Array of table objects with fullName property
 * @returns {string} Full table name with schema
 */
const resolveFullTableName = (tableName, tables) => {
  // If tableName already contains a dot, it might already be schema.table
  if (tableName.includes('.')) {
    // Check if this matches any of our full table names
    const matchingTable = tables.find(table => table.fullName === tableName);
    if (matchingTable) {
      return tableName;
    }
  }

  // Look for a table with this name (without schema prefix)
  const matchingTable = tables.find(table => table.name === tableName);
  if (matchingTable) {
    return matchingTable.fullName;
  }

  // If no match found, assume it's in public schema
  return tableName;
};

const mapSourceAndTarget = (ref) => {
  let source;
  let target;

  // Handle one-to-many relationships (< and >)
  if (ref.endpoints[0].relation === '1' && ref.endpoints[1].relation === '*') {
    source = ref.endpoints[1] // many side (has foreign key)
    target = ref.endpoints[0] // one side (has primary key)
  } else if (ref.endpoints[1].relation === '1' && ref.endpoints[0].relation === '*') {
    source = ref.endpoints[0] // many side (has foreign key)
    target = ref.endpoints[1] // one side (has primary key)
  } else if (ref.endpoints[0].relation === '1') {
    source = ref.endpoints[1]
    target = ref.endpoints[0]
  } else if (ref.endpoints[1].relation === '1') {
    source = ref.endpoints[0]
    target = ref.endpoints[1]
  } else {
    // Handle one-to-one relationships (-) and other cases
    // For one-to-one, use the order as specified in DBML
    source = ref.endpoints[1]
    target = ref.endpoints[0]
  }

  return [source, target]
}

/**
 * Find enum definition for a given column type
 * @param {string} typeName - The column type name
 * @param {Object} enums - Object mapping enum names to enum definitions
 * @returns {Object|null} Enum definition or null if not found
 */
const findEnumForType = (typeName, enums) => {
  // Try direct match first
  if (enums[typeName]) {
    return enums[typeName];
  }
  
  // Try without schema prefix (for backwards compatibility)
  const enumKeys = Object.keys(enums);
  const matchingKey = enumKeys.find(key => {
    const enumName = key.includes('.') ? key.split('.').pop() : key;
    return enumName === typeName;
  });
  
  return matchingKey ? enums[matchingKey] : null;
};

/**
 * Analyze column relationships from DBML refs
 * @param {Array} refs - Array of reference objects with proper fieldNames
 * @param {Array} tables - Array of table objects with schema info
 * @returns {Object} Object mapping table names to column handle info
 */
const analyzeColumnRelationships = (refs, tables) => {
  const columnHandles = {};

  console.log('dbg: refs count:', refs.length);

  refs.forEach(ref => {
    // Use mapSourceAndTarget to properly determine source and target
    const [sourceEndpoint, targetEndpoint] = mapSourceAndTarget(ref);

    // Handle source endpoint - resolve full table name with schema
    if (sourceEndpoint?.tableName) {
      const tableName = sourceEndpoint.tableName;
      const fullTableName = resolveFullTableName(tableName, tables);
      const fieldNames = sourceEndpoint.fieldNames || [sourceEndpoint.fieldName];

      if (!columnHandles[fullTableName]) {
        columnHandles[fullTableName] = {};
      }

      fieldNames.forEach(fieldName => {
        if (fieldName) {
          columnHandles[fullTableName][fieldName] = {
            isSource: true,
            isTarget: false,
            relation: sourceEndpoint.relation
          };
        }
      });
    }

    // Handle target endpoint - resolve full table name with schema
    if (targetEndpoint?.tableName) {
      const tableName = targetEndpoint.tableName;
      const fullTableName = resolveFullTableName(tableName, tables);
      const fieldNames = targetEndpoint.fieldNames || [targetEndpoint.fieldName];

      if (!columnHandles[fullTableName]) {
        columnHandles[fullTableName] = {};
      }

      fieldNames.forEach(fieldName => {
        if (fieldName) {
          columnHandles[fullTableName][fieldName] = {
            isSource: false,
            isTarget: true,
            relation: targetEndpoint.relation
          };
        }
      });
    }
  });

  return columnHandles;
};

export const transformDBMLToNodes = (dbmlData, savedPositions = {}, onColumnClick = null) => {
  if (!dbmlData?.schemas || dbmlData.schemas.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Collect tables, refs, tableGroups, and enums from all schemas
  const allTables = [];
  const allRefs = [];
  const allTableGroups = [];
  const allEnums = {};
  const hasMultipleSchema = dbmlData.schemas.length > 1;

  dbmlData.schemas.forEach(schema => {
    if (schema.tables) {
      if (hasMultipleSchema) {
        // Add schema name to each table for identification
        const tablesWithSchema = schema.tables.map(table => ({
          ...table,
          schemaName: schema.name || 'public',
          fullName: schema.name ? `${schema.name}.${table.name}` : table.name
        }));
        allTables.push(...tablesWithSchema);
      } else {
        const tablesWithoutSchema = schema.tables.map(table => ({
          ...table,
          fullName: table.name
        }));
        allTables.push(...tablesWithoutSchema);
      }
    }

    if (schema.refs) {
      allRefs.push(...schema.refs);
    }

    if (schema.tableGroups) {
      // Add schema name to each tableGroup for identification
      const tableGroupsWithSchema = schema.tableGroups.map(tableGroup => ({
        ...tableGroup,
        schemaName: schema.name || 'public',
        fullName: hasMultipleSchema && schema.name ? `${schema.name}.${tableGroup.name}` : tableGroup.name
      }));
      allTableGroups.push(...tableGroupsWithSchema);
    }

    // Collect enums from this schema
    if (schema.enums) {
      schema.enums.forEach(enumDef => {
        // Create enum key with schema prefix if multiple schemas
        const enumKey = hasMultipleSchema && schema.name ? `${schema.name}.${enumDef.name}` : enumDef.name;
        allEnums[enumKey] = {
          name: enumDef.name,
          fullName: enumKey,
          schemaName: schema.name || 'public',
          values: enumDef.values ? enumDef.values.map(value => ({
            name: value.name,
            note: value.note || null
          })) : []
        };
      });
    }
  });

  const tables = allTables;
  const refs = allRefs;
  const tableGroups = allTableGroups;

  // Create table-to-group mapping
  const tableToGroupMap = {};
  tableGroups.forEach(group => {
    if (group.tables && Array.isArray(group.tables)) {
      group.tables.forEach(tableName => {
        // Handle both string table names and table objects
        const tableNameStr = typeof tableName === 'string' ? tableName : tableName.name;
        tableToGroupMap[tableNameStr] = group;
      });
    }
  });

  // Analyze column relationships from DBML refs only
  const columnHandles = analyzeColumnRelationships(refs, tables);

  // Create parent-child node structure
  const nodes = [];

  tables.forEach((table) => {
    const columnCount = table.fields?.length || 0;
    const tableWidth = calculateTableWidth(table);
    const tableGroup = tableToGroupMap[table.name];

    // Create table header node (parent) with schema-aware ID
    const tableHeaderNode = {
      id: `table-${table.fullName}`,
      type: 'tableHeader',
      position: { x: 0, y: 0 }, // Will be calculated by layout
      data: {
        table,
        columnCount,
        tableWidth,
        hasMultipleSchema,
        tableGroup,
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
      const columnHandleInfo = columnHandles[table.fullName]?.[column.name];
      
      // Check if this column type is an enum
      const columnTypeName = column.type?.type_name;
      const enumDef = columnTypeName ? findEnumForType(columnTypeName, allEnums) : null;
      
      const columnNode = {
        id: `${table.fullName}.${column.name}`,
        type: 'column',
        position: {
          x: tablePadding, // Position within padding
          y: startY + (columnIndex * 30) // Position after header, note, and padding
        },
        parentId: `table-${table.fullName}`,
        data: {
          column,
          hasSourceHandle: columnHandleInfo?.isSource || false,
          hasTargetHandle: columnHandleInfo?.isTarget || false,
          columnWidth,
          enumDef, // Add enum definition if this column is an enum type
          onColumnClick // Add column click handler
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
          const sourceTable = resolveFullTableName(sourceEndpoint.tableName, tables);
          const targetTable = resolveFullTableName(targetEndpoint.tableName, tables);

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
            animated: false,
            selectable: true,
            style: {
              stroke: 'var(--vscode-charts-lines)',
              strokeWidth: 2,
              strokeDasharray: '0',
            },
            data: {
              sourceTable,
              sourceColumn: sourceField,
              targetTable,
              targetColumn: targetField,
              sourceRelation,
              targetRelation,
              cardinality,
              fullRelationshipText: `${sourceTable}.${sourceField} → ${targetTable}.${targetField}`
            }
          });
        }
      });
    }
  });

  // We'll add TableGroup nodes after layout calculation to position them correctly

  // Apply auto-layout using dagre (for table header nodes and table groups)
  const layoutedElements = getLayoutedElements(nodes, edges, tableGroups, savedPositions);

  return {
    nodes: layoutedElements.nodes,
    edges: layoutedElements.edges,
    tableGroups: layoutedElements.tableGroups,
  };
};


const getLayoutedElements = (nodes, edges, tableGroups = [], savedPositions = {}, direction = 'TB') => {
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
  
  // Separate nodes into those with saved positions and those needing auto-layout
  const nodesWithSavedPositions = [];
  const nodesNeedingLayout = [];

  // Calculate table dimensions and separate nodes by layout needs
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
    
    // Check if node has saved position
    if (savedPositions[tableNode.id]) {
      nodesWithSavedPositions.push(tableNode);
    } else {
      nodesNeedingLayout.push(tableNode);
    }
  });

  // Only add nodes needing layout to dagre
  nodesNeedingLayout.forEach((node) => {
    const dimensions = tableDimensions[node.id];
    dagreGraph.setNode(node.id, {
      width: dimensions.width,
      height: dimensions.height
    });
  });

  // Add edges between table headers for dagre layout (only for nodes needing layout)
  const nodesNeedingLayoutIds = new Set(nodesNeedingLayout.map(n => n.id));
  
  edges.forEach((edge) => {
    // Extract table name from column ID (schema.table.column -> schema.table)
    const sourceTableParts = edge.source.split('.');
    const targetTableParts = edge.target.split('.');

    // Handle both schema.table.column and table.column formats
    const sourceTableName = sourceTableParts.length > 2
      ? sourceTableParts.slice(0, -1).join('.')
      : sourceTableParts[0];
    const targetTableName = targetTableParts.length > 2
      ? targetTableParts.slice(0, -1).join('.')
      : targetTableParts[0];

    const sourceTableId = `table-${sourceTableName}`;
    const targetTableId = `table-${targetTableName}`;

    // Only add edge if it connects different tables and both need layout
    if (sourceTableId !== targetTableId && 
        nodesNeedingLayoutIds.has(sourceTableId) && 
        nodesNeedingLayoutIds.has(targetTableId)) {
      dagreGraph.setEdge(sourceTableId, targetTableId);
    }
  });

  dagre.layout(dagreGraph);

  // Position table header nodes and their child column nodes
  const layoutedNodes = nodes.map((node) => {
    if (node.type === 'tableHeader') {
      // Use saved position if available, otherwise use dagre layout
      if (savedPositions[node.id]) {
        return {
          ...node,
          position: {
            x: savedPositions[node.id].x,
            y: savedPositions[node.id].y,
          },
        };
      } else if (nodesNeedingLayoutIds.has(node.id)) {
        const nodeWithPosition = dagreGraph.node(node.id);
        const dimensions = tableDimensions[node.id];
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - dimensions.width / 2,
            y: nodeWithPosition.y - dimensions.height / 2,
          },
        };
      }
      // Fallback to original position (shouldn't happen)
      return node;
    } else if (node.type === 'column') {
      // Column nodes keep their relative positions to parents
      return node;
    }
    return node;
  });

  // Calculate TableGroup positions and add them as background nodes
  const tableGroupNodes = [];
  if (tableGroups && tableGroups.length > 0) {
    tableGroups.forEach((group) => {
      // Find all table nodes belonging to this group
      const groupTables = layoutedNodes.filter(node => 
        node.type === 'tableHeader' && node.data?.tableGroup?.name === group.name
      );

      if (groupTables.length > 0) {
        // Calculate bounding box for all tables in this group
        const padding = 24;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        groupTables.forEach(tableNode => {
          const { x, y } = tableNode.position;
          const tableWidth = tableNode.data.tableWidth || 200;
          const tableHeight = 
            42 + // header height
            (tableNode.data.table?.note ? 30 : 0) + // note height
            (tableNode.data.columnCount * 30) + // columns height
            16; // padding

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + tableWidth);
          maxY = Math.max(maxY, y + tableHeight);
        });

        // Create TableGroup background node
        const tableGroupNode = {
          id: `tablegroup-${group.fullName}`,
          type: 'tableGroup',
          position: { 
            x: minX - padding, 
            y: minY - padding 
          },
          data: {
            tableGroup: group,
            tables: groupTables.map(t => t.data.table)
          },
          style: {
            width: (maxX - minX) + (padding * 2),
            height: (maxY - minY) + (padding * 2),
            backgroundColor: 'rgba(0, 122, 204, 0.1)',
            border: '1px solid rgba(0, 122, 204, 0.3)',
            borderRadius: '8px',
            zIndex: -1,
          },
          selectable: true,
          draggable: true,
        };
        
        tableGroupNodes.push(tableGroupNode);
      }
    });
  }

  // Insert TableGroup nodes at the beginning so they appear behind tables
  const finalNodes = [...tableGroupNodes, ...layoutedNodes];

  return {
    nodes: finalNodes,
    edges,
    tableGroups,
  };
};