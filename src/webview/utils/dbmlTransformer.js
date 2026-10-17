import dagre from 'dagre';
import { getThemeVar } from '../styles/themeManager.js';
import { parseHeaderColor, darkenHexColor } from './colorUtils.js';
import { refBaseKey, refKey, makeOccurrenceCounter } from './refIdentity.js';
import { applySavedRoute } from './layoutStorage.js';

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
 * Calculate the width needed for the table header based on its content
 * @param {Object} table - Table object
 * @param {Boolean} hasMultipleSchema - Whether there are multiple schemas
 * @returns {Number} Width in pixels
 */
const calculateHeaderWidth = (table, hasMultipleSchema = false) => {
  // Base padding and margins for header
  const headerPadding = 24; // 12px padding on each side
  const noteButtonWidth = table.note ? 20 : 0; // Width of note button if present
  const marginBetweenElements = 8;

  // Calculate table name width (including schema prefix if needed)
  let tableName = table.name;
  if (hasMultipleSchema && table.schemaName) {
    tableName = `${table.schemaName}.${table.name}`;
  }
  
  // Approximate 8px per character for 14px bold font
  const tableNameWidth = tableName.length * 8;

  // Total header width calculation
  const totalWidth = headerPadding + tableNameWidth + (noteButtonWidth ? marginBetweenElements + noteButtonWidth : 0);

  return totalWidth;
};

/**
 * Calculate the optimal width for a table based on its columns and header
 * @param {Object} table - Table object
 * @param {Boolean} hasMultipleSchema - Whether there are multiple schemas
 * @returns {Number} Width in pixels
 */
const calculateTableWidth = (table, hasMultipleSchema = false) => {
  // Calculate header width requirement
  const headerWidth = calculateHeaderWidth(table, hasMultipleSchema);
  
  // Calculate column width requirement
  let maxColumnWidth = 0;
  if (table.fields && table.fields.length > 0) {
    maxColumnWidth = Math.max(...table.fields.map(calculateColumnWidth));
  }

  // Add padding for parent container (8px padding on each side + borders)
  const tablePadding = 8;
  const columnBasedWidth = maxColumnWidth + (tablePadding * 2);

  // Default minimum width
  const minWidth = 200;

  // Return the maximum of header width, column width, or minimum width
  return Math.max(headerWidth, columnBasedWidth, minWidth);
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

// Decide which side of each table an edge leaves/enters on. An explicit
// data.sourceSide/targetSide ('left'|'right') always wins for that endpoint;
// otherwise, when autoEndpointSide is on, the side facing the partner table is
// chosen by comparing table centres; otherwise the legacy right->left is used.
// srcTablePos/tgtTablePos are { x, width } of the two table header nodes.
// Returns { sourceHandle, targetHandle } naming the four transparent handles.
export const chooseEffectiveSides = (edge, srcTablePos, tgtTablePos, autoEndpointSide) => {
  const explicitSource = edge?.data?.sourceSide;
  const explicitTarget = edge?.data?.targetSide;

  let sourceSide = (explicitSource === 'left' || explicitSource === 'right') ? explicitSource : undefined;
  let targetSide = (explicitTarget === 'left' || explicitTarget === 'right') ? explicitTarget : undefined;

  if (sourceSide === undefined || targetSide === undefined) {
    if (autoEndpointSide && srcTablePos && tgtTablePos) {
      const srcCenter = srcTablePos.x + (srcTablePos.width || 0) / 2;
      const tgtCenter = tgtTablePos.x + (tgtTablePos.width || 0) / 2;
      const autoSource = srcCenter > tgtCenter ? 'left' : 'right';
      const autoTarget = srcCenter > tgtCenter ? 'right' : 'left';
      if (sourceSide === undefined) sourceSide = autoSource;
      if (targetSide === undefined) targetSide = autoTarget;
    } else {
      if (sourceSide === undefined) sourceSide = 'right';
      if (targetSide === undefined) targetSide = 'left';
    }
  }

  return { sourceHandle: `source-${sourceSide}`, targetHandle: `target-${targetSide}` };
};

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
 * Merge a new handle role into a column's existing handle record. A column can be
 * a source in one Ref and a target in another; both roles must be preserved so
 * ColumnNode mounts both pairs of handles and no edge references a missing handle.
 * @param {Object|undefined} existing - The current record for this column, if any
 * @param {{isSource:boolean, isTarget:boolean, relation:string}} role
 * @returns {Object} The merged record
 */
export const mergeColumnRole = (existing, role) => {
  const merged = existing ? { ...existing } : { isSource: false, isTarget: false };
  if (role.isSource) {
    merged.isSource = true;
    merged.sourceRelation = role.relation;
  }
  if (role.isTarget) {
    merged.isTarget = true;
    merged.targetRelation = role.relation;
  }
  // Keep a best-effort single relation for backward compatibility.
  merged.relation = role.relation != null ? role.relation : merged.relation;
  return merged;
};

/**
 * Analyze column relationships from DBML refs
 * @param {Array} refs - Array of reference objects with proper fieldNames
 * @param {Array} tables - Array of table objects with schema info
 * @param {Boolean} hasMultipleSchema - Whether there are multiple schemas
 * @returns {Object} Object mapping table names to column handle info
 */
const analyzeColumnRelationships = (refs, tables, hasMultipleSchema) => {
  const columnHandles = {};


  refs.forEach((ref, refIndex) => {
    // Use mapSourceAndTarget to properly determine source and target
    const [sourceEndpoint, targetEndpoint] = mapSourceAndTarget(ref);

    // CRITICAL FIX: Use the schemaName already provided by DBML Core parser
    // The endpoints already contain the correct schema information!
    
    // Handle source endpoint - use schemaName directly from endpoint
    let sourceFullTableName = null;
    
    if (sourceEndpoint?.tableName) {
      const tableName = sourceEndpoint.tableName;
      // Endpoints on an unqualified table (e.g. `ref: > users.id`) come back
      // with schemaName === null even though the table itself resolved into
      // the "public" schema - default it the same way table nodes are built
      // below, or its fullName won't match the node/columnLookup keys.
      const schemaName = sourceEndpoint.schemaName || 'public';

      // Build full table name directly from endpoint data
      sourceFullTableName = hasMultipleSchema && schemaName ? `${schemaName}.${tableName}` : tableName;
      
      const fieldNames = sourceEndpoint.fieldNames || [sourceEndpoint.fieldName];

      if (!columnHandles[sourceFullTableName]) {
        columnHandles[sourceFullTableName] = {};
      }

      fieldNames.forEach(fieldName => {
        if (fieldName) {
          columnHandles[sourceFullTableName][fieldName] = mergeColumnRole(
            columnHandles[sourceFullTableName][fieldName],
            { isSource: true, isTarget: false, relation: sourceEndpoint.relation }
          );
        }
      });
    }

    // Handle target endpoint - use schemaName directly from endpoint  
    if (targetEndpoint?.tableName) {
      const tableName = targetEndpoint.tableName;
      // Same default as the source endpoint above.
      const schemaName = targetEndpoint.schemaName || 'public';

      // Build full table name directly from endpoint data
      const fullTableName = hasMultipleSchema && schemaName ? `${schemaName}.${tableName}` : tableName;
      const fieldNames = targetEndpoint.fieldNames || [targetEndpoint.fieldName];

      if (!columnHandles[fullTableName]) {
        columnHandles[fullTableName] = {};
      }

      fieldNames.forEach(fieldName => {
        if (fieldName) {
          columnHandles[fullTableName][fieldName] = mergeColumnRole(
            columnHandles[fullTableName][fieldName],
            { isSource: false, isTarget: true, relation: targetEndpoint.relation }
          );
        }
      });
    }
  });

  return columnHandles;
};

export const transformDBMLToNodes = (dbmlData, savedPositions = {}, onColumnClick = null, onTableNoteClick = null, edgeType = 'smoothstep', tableChecks = {}, onTableChecksClick = null, showCardinalityLabels = false, onTableIndexesClick = null, autoEndpointSide = true, relationshipMarkers = true, savedEdgeRoutes = {}, onRouteChange = null, onRouteCommit = null, editableEdgeRouting = false, onEndpointDrag = null, onResetEdge = null, onRouteConvert = null) => {
  if (!dbmlData?.schemas || dbmlData.schemas.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Collect tables, refs, tableGroups, notes, and enums from all schemas
  const allTables = [];
  const allRefs = [];
  const allTableGroups = [];
  const allNotes = [];
  const allEnums = {};
  const hasMultipleSchema = dbmlData.schemas.length > 1;

  // First, collect standalone notes from root level (they are not schema-specific)
  if (dbmlData.notes && dbmlData.notes.length > 0) {
    const rootNotes = dbmlData.notes.map(note => ({
      name: note.name,
      content: note.content,
      token: note.token,
      schemaName: 'public', // Default schema for standalone notes
      fullName: note.name
    }));
    allNotes.push(...rootNotes);
  }

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
      // Add schema context to refs for better debugging
      const refsWithSchema = schema.refs.map(ref => ({
        ...ref,
        _schemaContext: schema.name || 'public'
      }));
      allRefs.push(...refsWithSchema);
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

    if (schema.notes) {
      // Add schema name to each note for identification
      const notesWithSchema = schema.notes.map(note => ({
        ...note,
        schemaName: schema.name || 'public',
        fullName: hasMultipleSchema && schema.name ? `${schema.name}.${note.name}` : note.name
      }));
      allNotes.push(...notesWithSchema);
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
  const notes = allNotes;

  // Build column lookup map: tableName -> columnName -> column object
  const columnLookup = {};
  tables.forEach(table => {
    const tableKey = table.fullName || table.name;
    columnLookup[tableKey] = {};
    if (table.fields) {
      table.fields.forEach(field => {
        columnLookup[tableKey][field.name] = field;
      });
    }
  });

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
  const columnHandles = analyzeColumnRelationships(refs, tables, hasMultipleSchema);

  // Create parent-child node structure
  const nodes = [];

  tables.forEach((table) => {
    const columnCount = table.fields?.length || 0;
    const tableWidth = calculateTableWidth(table, hasMultipleSchema);
    const tableGroup = tableToGroupMap[table.name];
    const checks = tableChecks[table.name] || [];

    // Collect indexed column names
    const indexedColumnNames = new Set();
    if (table.indexes) {
      table.indexes.forEach(index => {
        if (index.columns) {
          index.columns.forEach(col => {
            if (col.type === 'column' && col.value) {
              indexedColumnNames.add(col.value);
            }
          });
        }
      });
    }

    // Create table header node (parent) with schema-aware ID
    const tableHeaderNode = {
      id: `table-${table.fullName}`,
      type: 'tableHeader',
      position: { x: 0, y: 0 }, // Will be calculated by layout
      zIndex: 10,
      data: {
        table: { ...table, checks, indexes: table.indexes || [] },
        columnCount,
        tableWidth,
        hasMultipleSchema,
        tableGroup,
        onTableNoteClick,
        onTableChecksClick,
        checksCount: checks.length,
        indexesCount: (table.indexes || []).length,
        onTableIndexesClick,
      },
    };
    nodes.push(tableHeaderNode);

    // Create column nodes (children)
    const headerHeight = 42;
    const tablePadding = 8;
    const startY = headerHeight + tablePadding; // Include padding offset
    const columnWidth = tableWidth - (tablePadding * 2); // Subtract both side paddings

    table.fields?.forEach((column, columnIndex) => {
      const columnHandleInfo = columnHandles[table.fullName]?.[column.name];
      
      // Check if this column type is an enum
      const columnTypeName = column.type?.type_name;
      const enumDef = columnTypeName ? findEnumForType(columnTypeName, allEnums) : null;
      
      // Attach hasIndex flag to column object directly
      if (indexedColumnNames.has(column.name)) {
        column.hasIndex = true;
      }
      
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

  // Create sticky note nodes
  notes.forEach((note) => {
    const nodeId = `note-${note.fullName}`;
    const savedPosition = savedPositions[nodeId];
    
    const stickyNoteNode = {
      id: nodeId,
      type: 'stickyNote',
      position: { x: 0, y: 0 }, // Will be calculated by layout
      data: {
        note,
        savedDimensions: savedPosition ? {
          width: savedPosition.width,
          height: savedPosition.height
        } : null,
      },
    };
    nodes.push(stickyNoteNode);
  });

  // Create edges for relationships connecting column nodes directly from DBML refs
  const edges = [];

  // Deterministic per-Ref occurrence counter, so byte-identical duplicate Refs
  // get distinct stable keys (best-effort ordinal, called once per Ref).
  const nextOccurrence = makeOccurrenceCounter();

  refs.forEach((ref, index) => {
    if (ref.endpoints && ref.endpoints.length >= 2) {
      const [sourceEndpoint, targetEndpoint] = mapSourceAndTarget(ref)

      // Use fieldNames arrays from actual DBML refs
      const sourceFieldNames = sourceEndpoint.fieldNames || [];
      const targetFieldNames = targetEndpoint.fieldNames || [];

      // Stable base identity for the whole Ref: raw schema/table (schema always
      // present) plus the COMPLETE ordered field arrays for both endpoints. The
      // occurrence counter is consulted exactly once per Ref.
      const refBaseArgs = {
        srcSchema: sourceEndpoint.schemaName,
        srcTable: sourceEndpoint.tableName,
        srcFields: sourceFieldNames,
        tgtSchema: targetEndpoint.schemaName,
        tgtTable: targetEndpoint.tableName,
        tgtFields: targetFieldNames,
      };
      const bareBase = refBaseKey(refBaseArgs);
      const occ = nextOccurrence(bareBase);
      const base = refBaseKey({ ...refBaseArgs, occurrence: occ });

      // Create edges for each field pair
      sourceFieldNames.forEach((sourceField, fieldIndex) => {
        const targetField = targetFieldNames[fieldIndex] || targetFieldNames[0];

        if (sourceField && targetField) {
          // Default missing schemaName to "public" (see analyzeColumnRelationships
          // above) so unqualified refs (`ref: > users.id`) still resolve to the
          // same node/columnLookup keys as their schema-qualified table nodes.
          const sourceSchemaName = sourceEndpoint.schemaName || 'public';
          const sourceTableName = sourceEndpoint.tableName;
          const targetSchemaName = targetEndpoint.schemaName || 'public';
          const targetTableName = targetEndpoint.tableName;
          
          // Build full table names directly from endpoint data
          const sourceTable = hasMultipleSchema && sourceSchemaName ? `${sourceSchemaName}.${sourceTableName}` : sourceTableName;
          const targetTable = hasMultipleSchema && targetSchemaName ? `${targetSchemaName}.${targetTableName}` : targetTableName;
          
          // Generate cardinality label using actual endpoint relations
          const sourceRelation = sourceEndpoint.relation || '1';
          const targetRelation = targetEndpoint.relation || '1';
          const cardinality = `${sourceRelation}:${targetRelation}`;

          // Determine nullability for label display (0 vs 1)
          const sourceColumn = columnLookup[sourceTable]?.[sourceField];
          const targetColumn = columnLookup[targetTable]?.[targetField];
          const sourceIsNullable = sourceColumn ? !sourceColumn.not_null : false;
          const targetIsNullable = targetColumn ? !targetColumn.not_null : false;

          // Determine edge color from ref
          const refColor = parseHeaderColor(ref.color);
          const edgeStroke = refColor ? darkenHexColor(refColor) : getThemeVar('chartsLines');

          // Relationship markers: crow's-foot on a many ('*') end, bar on a one
          // ('1') end. Bare ids only; React Flow resolves them to url('#id').

          // Per-rendered-line identity, and any saved route for this line.
          const lineRefKey = refKey(base, sourceField, targetField);
          const savedRoute = savedEdgeRoutes ? savedEdgeRoutes[lineRefKey] : undefined;
          // Escape hatch: only apply a saved route when both endpoints still
          // resolve to real columns; drop any non-finite checkpoint.
          const endpointsResolve = !!sourceColumn && !!targetColumn;
          const {
            sourceSide: seededSourceSide,
            targetSide: seededTargetSide,
            checkPoints: seededCheckPoints,
          } = applySavedRoute(savedRoute, endpointsResolve);

          // A routed edge (side override or waypoints) sits above tables (z 11).
          const routed = !!(seededSourceSide || seededTargetSide || (seededCheckPoints && seededCheckPoints.length));

          edges.push({
            id: `${sourceTable}.${sourceField}-${targetTable}.${targetField}-${index}-${fieldIndex}`,
            source: `${sourceTable}.${sourceField}`,
            target: `${targetTable}.${targetField}`,
            type: 'custom',
            animated: false,
            selectable: true,
            zIndex: routed ? 11 : undefined,
            style: {
              stroke: edgeStroke,
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
              fullRelationshipText: `${sourceTable}.${sourceField} → ${targetTable}.${targetField}`,
              sourceIsNullable,
              targetIsNullable,
              refColor,
              pathStyle: edgeType,
              showCardinalityLabels,
              refKey: lineRefKey,
              sourceSide: seededSourceSide,
              targetSide: seededTargetSide,
              checkPoints: seededCheckPoints,
              isEditable: editableEdgeRouting,
              showMarkers: relationshipMarkers,
              onRouteChange,
              onRouteCommit,
              onEndpointDrag,
              onResetEdge,
              onRouteConvert,
            }
          });
        }
      });
    }
  });

  // We'll add TableGroup nodes after layout calculation to position them correctly

  // Apply auto-layout using dagre (for table header nodes, sticky notes, and table groups)
  const layoutedElements = getLayoutedElements(nodes, edges, tableGroups, savedPositions);

  // Assign endpoint handles (auto or explicit override) using the laid-out table
  // geometry, so each edge leaves/enters on the side facing its partner table.
  const tablePosById = {};
  layoutedElements.nodes.forEach((node) => {
    if (node.type === 'tableHeader') {
      tablePosById[node.id] = { x: node.position.x, width: node.data?.tableWidth || 200 };
    }
  });
  layoutedElements.edges.forEach((edge) => {
    const src = tablePosById[`table-${edge.data.sourceTable}`];
    const tgt = tablePosById[`table-${edge.data.targetTable}`];
    const { sourceHandle, targetHandle } = chooseEffectiveSides(edge, src, tgt, autoEndpointSide);
    edge.sourceHandle = sourceHandle;
    edge.targetHandle = targetHandle;
  });

  return {
    nodes: layoutedElements.nodes,
    edges: layoutedElements.edges,
    tableGroups: layoutedElements.tableGroups,
    stickyNotes: notes,
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

  // Only add table header nodes and sticky notes to dagre for layout calculation
  const tableHeaderNodes = nodes.filter(node => node.type === 'tableHeader');
  const stickyNoteNodes = nodes.filter(node => node.type === 'stickyNote');
  
  // Separate nodes into those with saved positions and those needing auto-layout
  const nodesWithSavedPositions = [];
  const nodesNeedingLayout = [];

  // Calculate table dimensions and separate nodes by layout needs
  const tableDimensions = {};
  const tablePadding = 8;
  
  tableHeaderNodes.forEach((tableNode) => {
    const { columnCount, tableWidth, checksCount = 0, indexesCount = 0 } = tableNode.data;
    const checksFooterHeight = checksCount > 0 ? 32 : 0;
    const indexesFooterHeight = indexesCount > 0 ? 32 : 0;
    const totalHeight = headerHeight + (columnCount * columnHeight) + (tablePadding * 2) + checksFooterHeight + indexesFooterHeight;

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

  // Handle sticky note dimensions and positions
  stickyNoteNodes.forEach((noteNode) => {
    const savedDimensions = noteNode.data.savedDimensions;
    const noteWidth = savedDimensions?.width || 250; // Default sticky note width
    const noteHeight = savedDimensions?.height || 180; // Default sticky note height

    tableDimensions[noteNode.id] = {
      width: noteWidth,
      height: noteHeight
    };

    // Check if note has saved position
    if (savedPositions[noteNode.id]) {
      nodesWithSavedPositions.push(noteNode);
    } else {
      nodesNeedingLayout.push(noteNode);
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

  // Position table header nodes, sticky notes, and their child column nodes
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
    } else if (node.type === 'stickyNote') {
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