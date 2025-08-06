import React, { useState, useEffect, useCallback } from 'react'; // eslint-disable-line no-unused-vars
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  MiniMap,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Parser } from '@dbml/core';
import TableNode from './TableNode';
import TableHeaderNode from './TableHeaderNode';
import ColumnNode from './ColumnNode';
import TableGroupNode from './TableGroupNode';
import EdgeTooltip from './EdgeTooltip';
import ColumnTooltip from './ColumnTooltip';
import TableNoteTooltip from './TableNoteTooltip';
import StickyNote from './StickyNote';
import ErrorDisplay from './ErrorDisplay';
import TableNavigationDropdown from './TableNavigationDropdown';
import { transformDBMLToNodes } from '../utils/dbmlTransformer';
import { parseDBMLError, formatErrorForDisplay } from '../utils/errorParser';
import {
  saveLayout,
  loadLayout,
  generateFileId,
  extractTablePositions,
  cleanupObsoletePositions
} from '../utils/layoutStorage';

const nodeTypes = {
  table: TableNode,
  tableHeader: TableHeaderNode,
  column: ColumnNode,
  tableGroup: TableGroupNode,
  stickyNote: StickyNote,
};

// Component that handles table navigation within React Flow context
const TableNavigationPanel = ({ dbmlData }) => {
  const { setCenter, getNode } = useReactFlow();

  // Navigate to a specific table
  const handleTableSelect = useCallback((option) => {
    if (option.type === 'table') {
      const tableNodeId = `table-${option.value}`;
      const tableNode = getNode(tableNodeId);
      
      if (tableNode) {
        const { x, y } = tableNode.position;
        const tableWidth = tableNode.data?.tableWidth || 200;
        const tableHeight = 42 + (tableNode.data?.columnCount || 0) * 30 + 16; // header + columns + padding
        
        // Center on the table with some offset
        const centerX = x + tableWidth / 2;
        const centerY = y + tableHeight / 2;
        
        setCenter(centerX, centerY, { zoom: 1, duration: 800 });
      }
    }
  }, [setCenter, getNode]);

  return (
    <Panel position="top-left">
      <TableNavigationDropdown 
        dbmlData={dbmlData} 
        onTableSelect={handleTableSelect}
      />
    </Panel>
  );
};

const DBMLPreview = ({ initialContent }) => {

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dbmlData, setDbmlData] = useState(null);
  const [dbmlContent, setDbmlContent] = useState(initialContent || '');
  const [parseError, setParseError] = useState(null);
  const [enhancedErrorInfo, setEnhancedErrorInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState(new Set());
  const [tooltipData, setTooltipData] = useState(null);
  const [columnTooltipData, setColumnTooltipData] = useState(null);
  const [tableNoteTooltipData, setTableNoteTooltipData] = useState(null);
  const [tableGroups, setTableGroups] = useState([]);
  const [draggedGroupPositions, setDraggedGroupPositions] = useState(new Map());
  const [fileId, setFileId] = useState(null);
  const [savedPositions, setSavedPositions] = useState({});
  const [, setFilePath] = useState(null);


  // Disabled manual connections for preview-only mode
  const onConnect = useCallback(() => {
    // No-op: Manual connections disabled in preview mode
  }, []);

  // Node click handler for column nodes and sticky notes
  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'column') {
      const columnData = node.data;

      if (columnData) {
        // Calculate position based on node position
        const position = {
          x: (node.position?.x || 0) + (columnData.columnWidth || 200) + 20,
          y: (node.position?.y || 0)
        };

        handleColumnClick(columnData.column, columnData.enumDef, position);
      }
    }
  }, [handleColumnClick]);

  // Handle edge click for tooltip display
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();

    // Calculate tooltip position from mouse event
    const rect = event.currentTarget.getBoundingClientRect?.() || { left: 0, top: 0 };
    const position = {
      x: event.clientX || (rect.left + 100),
      y: event.clientY || (rect.top + 50)
    };

    // Also toggle selection for visual feedback
    setSelectedEdgeIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(edge.id)) {
        newSelected.delete(edge.id);
        setTooltipData(null);
      } else {
        newSelected.clear();
        newSelected.add(edge.id);
        setTooltipData({
          edge,
          position
        });
      }
      return newSelected;
    });
  }, []);

  // Handle tooltip close
  const handleCloseTooltip = useCallback(() => {
    setTooltipData(null);
    setSelectedEdgeIds(new Set());
  }, []);

  // Handle column click for tooltip display
  const handleColumnClick = useCallback((column, enumDef, position) => {
    // Close other tooltips
    setTooltipData(null);
    setSelectedEdgeIds(new Set());
    setTableNoteTooltipData(null);

    // Open column tooltip
    setColumnTooltipData({
      column,
      enumDef,
      position
    });
  }, []);

  // Handle table note click for tooltip display
  const handleTableNoteClick = useCallback((table, position) => {
    // Close other tooltips
    setTooltipData(null);
    setSelectedEdgeIds(new Set());
    setColumnTooltipData(null);

    // Open table note tooltip
    setTableNoteTooltipData({
      table,
      position
    });
  }, []);


  // Handle column tooltip close
  const handleCloseColumnTooltip = useCallback(() => {
    setColumnTooltipData(null);
  }, []);

  // Handle table note tooltip close
  const handleCloseTableNoteTooltip = useCallback(() => {
    setTableNoteTooltipData(null);
  }, []);


  // Handle ESC key and click outside to close tooltips
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setTooltipData(null);
        setSelectedEdgeIds(new Set());
        setColumnTooltipData(null);
        setTableNoteTooltipData(null);
          }
    };

    const handleClickOutside = (event) => {
      // Check if click is outside any tooltip or on a column node
      const isClickInsideTooltip = event.target.closest('[data-tooltip]');
      const isClickOnColumn = event.target.closest('[data-column-node]');

      if (!isClickInsideTooltip && !isClickOnColumn) {
        setTooltipData(null);
        setSelectedEdgeIds(new Set());
        setColumnTooltipData(null);
        setTableNoteTooltipData(null);
          }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Recalculate TableGroup bounds based on member table positions
  const recalculateTableGroupBounds = useCallback((currentNodes, currentTableGroups) => {
    if (!currentTableGroups || currentTableGroups.length === 0) {
      return currentNodes;
    }

    const updatedNodes = [...currentNodes];
    const padding = 24;

    currentTableGroups.forEach((group) => {
      // Find all table nodes belonging to this group
      const groupTables = currentNodes.filter(node =>
        node.type === 'tableHeader' && node.data?.tableGroup?.name === group.name
      );

      if (groupTables.length > 0) {
        // Calculate bounding box for all tables in this group
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

        // Find the TableGroup node and update its position and size
        const groupNodeIndex = updatedNodes.findIndex(node =>
          node.id === `tablegroup-${group.fullName}`
        );

        if (groupNodeIndex !== -1) {
          updatedNodes[groupNodeIndex] = {
            ...updatedNodes[groupNodeIndex],
            position: {
              x: minX - padding,
              y: minY - padding
            },
            style: {
              ...updatedNodes[groupNodeIndex].style,
              width: (maxX - minX) + (padding * 2),
              height: (maxY - minY) + (padding * 2),
            }
          };
        }
      }
    });

    return updatedNodes;
  }, []);

  // Save layout when table positions change
  const saveCurrentLayout = useCallback(() => {
    if (fileId) {
      // Use a fresh reference to nodes via setNodes callback
      setNodes(currentNodes => {
        if (currentNodes.length > 0) {
          const positions = extractTablePositions(currentNodes);
          setSavedPositions(positions);
          saveLayout(fileId, positions);
        }
        return currentNodes; // Don't modify nodes, just extract positions
      });
    }
  }, [fileId]);

  // Reset layout to auto-layout
  const resetLayout = useCallback(() => {
    if (fileId) {
      setSavedPositions({});
      saveLayout(fileId, {});
      // Trigger re-transform with empty positions
      if (dbmlData) {
        const { nodes: newNodes, edges: newEdges, tableGroups: newTableGroups } = transformDBMLToNodes(dbmlData, {}, handleColumnClick, handleTableNoteClick);
        setNodes(newNodes);
        setEdges(newEdges);
        setTableGroups(newTableGroups || []);
      }
    }
  }, [fileId, dbmlData, setNodes, setEdges, handleColumnClick, handleTableNoteClick]);

  // Custom nodes change handler that handles TableGroup dragging
  const handleNodesChange = useCallback((changes) => {
    // Track group drag start positions
    const groupDragStartChanges = changes.filter(change =>
      change.type === 'position' &&
      change.id.startsWith('tablegroup-') &&
      change.dragging === true
    );

    groupDragStartChanges.forEach(change => {
      setDraggedGroupPositions(prev => {
        const newMap = new Map(prev);
        if (!newMap.has(change.id)) {
          // Store the initial position when drag starts
          const currentNode = nodes.find(n => n.id === change.id);
          if (currentNode) {
            newMap.set(change.id, currentNode.position);
          }
        }
        return newMap;
      });
    });

    // Handle group drag completion
    const groupDragEndChanges = changes.filter(change =>
      change.type === 'position' &&
      change.id.startsWith('tablegroup-') &&
      change.dragging === false
    );

    if (groupDragEndChanges.length > 0) {
      groupDragEndChanges.forEach(groupChange => {
        const groupId = groupChange.id;
        const startPosition = draggedGroupPositions.get(groupId);

        if (startPosition) {
          const endPosition = { x: groupChange.position.x, y: groupChange.position.y };
          const offsetX = endPosition.x - startPosition.x;
          const offsetY = endPosition.y - startPosition.y;

          // Move member tables and update saved positions
          setNodes(currentNodes => {
            const updatedNodes = [...currentNodes];
            const groupNode = updatedNodes.find(node => node.id === groupId);
            const groupName = groupNode?.data?.tableGroup?.name;

            if (groupName && (offsetX !== 0 || offsetY !== 0)) {
              const updatedPositions = { ...savedPositions };

              updatedNodes.forEach((node, index) => {
                if (node.type === 'tableHeader' && node.data?.tableGroup?.name === groupName) {
                  const newPosition = {
                    x: node.position.x + offsetX,
                    y: node.position.y + offsetY
                  };

                  updatedNodes[index] = {
                    ...node,
                    position: newPosition
                  };

                  // Update saved positions for member tables
                  updatedPositions[node.id] = newPosition;
                }
              });

              // Update saved positions state and storage
              setSavedPositions(updatedPositions);
              if (fileId) {
                saveLayout(fileId, updatedPositions);
              }
            }

            return updatedNodes;
          });

          // Clear the tracked position
          setDraggedGroupPositions(prev => {
            const newMap = new Map(prev);
            newMap.delete(groupId);
            return newMap;
          });
        }
      });
    }

    // Apply the standard changes
    onNodesChange(changes);

    // Check for any node position changes (tables or sticky notes)
    const hasAnyNodePositionChanges = changes.some(change =>
      change.type === 'position' &&
      change.dragging === false &&
      (change.id.startsWith('table-') || change.id.startsWith('note-'))
    );

    // Check if group drag ended (we already saved positions above)
    const hasGroupDragEnd = groupDragEndChanges.length > 0;

    // Save layout for any node position changes (except when group drag already saved)
    if (hasAnyNodePositionChanges && !hasGroupDragEnd) {
      setTimeout(() => {
        saveCurrentLayout();
      }, 100);
    }

    // Recalculate bounds for table groups if needed (for both individual and group moves)
    if ((hasAnyNodePositionChanges || hasGroupDragEnd) && tableGroups.length > 0) {
      setTimeout(() => {
        setNodes(currentNodes => recalculateTableGroupBounds(currentNodes, tableGroups));
      }, 200); // Slightly longer delay to ensure group positions are saved first
    }
  }, [onNodesChange, tableGroups, recalculateTableGroupBounds, setNodes, draggedGroupPositions, saveCurrentLayout, savedPositions]);

  // Parse DBML content
  const parseDBML = useCallback(async (content) => {
    if (!content || content.trim() === '') {
      setDbmlData(null);
      setParseError(null);
      setEnhancedErrorInfo(null);
      setNodes([]);
      setEdges([]);
      setTableGroups([]);
      return;
    }

    setIsLoading(true);
    setParseError(null);
    setEnhancedErrorInfo(null);

    try {
      const parser = new Parser();
      const parsed = parser.parse(content, 'dbmlv2');
      setDbmlData(parsed);
    } catch (error) {
      console.error('DBML Parse Error:', error);

      // Parse and enhance the error information
      const parsedError = parseDBMLError(error, content);
      const formattedError = formatErrorForDisplay(parsedError);

      setParseError(error.message || 'Failed to parse DBML content');
      setEnhancedErrorInfo(formattedError);
      setDbmlData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize file path and load saved layout
  useEffect(() => {
    // Get file path from window global (set by extension)
    const windowFilePath = window.filePath;
    if (windowFilePath) {
      setFilePath(windowFilePath);

      // Generate file ID based on file path
      const newFileId = generateFileId(windowFilePath);
      setFileId(newFileId);

      // Load saved positions for this file
      const positions = loadLayout(newFileId);
      setSavedPositions(positions);
    }
  }, []);

  // Parse initial content
  useEffect(() => {
    if (dbmlContent) {
      parseDBML(dbmlContent);
    }
  }, [dbmlContent, parseDBML]);

  // Listen for messages from VS Code extension
  useEffect(() => {
    const vscode = window.vscode;

    const messageListener = (event) => {
      const message = event.data;

      switch (message.type) {
        case 'updateContent':
          setDbmlContent(message.content || '');
          break;
      }
    };

    window.addEventListener('message', messageListener);

    // Request initial data
    vscode.postMessage({ type: 'ready' });

    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, []);

  // Transform DBML data to nodes and edges when data changes
  useEffect(() => {
    if (dbmlData && fileId !== null) {
      try {
        // Get current saved positions at execution time
        const currentSavedPositions = loadLayout(fileId);

        // Clean up obsolete positions first
        const tableHeaderIds = [];
        const stickyNoteIds = [];
        
        // Collect table IDs
        dbmlData.schemas?.forEach(schema => {
          schema.tables?.forEach(table => {
            const fullName = schema.name && dbmlData.schemas.length > 1 ? `${schema.name}.${table.name}` : table.name;
            tableHeaderIds.push(`table-${fullName}`);
          });
        });
        
        // Collect sticky note IDs
        if (dbmlData.notes) {
          dbmlData.notes.forEach(note => {
            stickyNoteIds.push(`note-${note.name}`);
          });
        }
        
        const allCurrentIds = [...tableHeaderIds, ...stickyNoteIds];
        const cleanedPositions = cleanupObsoletePositions(currentSavedPositions, allCurrentIds);
        if (Object.keys(cleanedPositions).length !== Object.keys(currentSavedPositions).length) {
          setSavedPositions(cleanedPositions);
          saveLayout(fileId, cleanedPositions);
        }

        const { nodes: newNodes, edges: newEdges, tableGroups: newTableGroups } = transformDBMLToNodes(dbmlData, cleanedPositions, handleColumnClick, handleTableNoteClick);
        setNodes(newNodes);
        setEdges(newEdges);
        setTableGroups(newTableGroups || []);
      } catch (error) {
        console.error('Error transforming DBML data:', error);
      }
    }
  }, [dbmlData, fileId, setNodes, setEdges]);

  // Update edge styles based on selection state
  useEffect(() => {
    if (edges.length > 0) {
      const updatedEdges = edges.map(edge => {
        const isSelected = selectedEdgeIds.has(edge.id);

        const currentStroke = edge.style?.stroke;
        const currentStrokeWidth = edge.style?.strokeWidth;
        const currentDashArray = edge.style?.strokeDasharray;
        const currentAnimated = edge.animated;

        const expectedStroke = isSelected ? 'var(--vscode-focusBorder)' : 'var(--vscode-charts-lines)';
        const expectedStrokeWidth = isSelected ? 3 : 2;
        const expectedDashArray = isSelected ? '5 5' : '0';
        const expectedAnimated = isSelected;

        // Only update if the style has actually changed
        if (currentStroke !== expectedStroke || currentStrokeWidth !== expectedStrokeWidth || currentDashArray !== expectedDashArray || currentAnimated !== expectedAnimated) {
          return {
            ...edge,
            animated: expectedAnimated,
            style: {
              ...edge.style,
              stroke: expectedStroke,
              strokeWidth: expectedStrokeWidth,
              strokeDasharray: expectedDashArray,
            }
          };
        }
        return edge;
      });

      // Only set edges if there are actual changes
      const hasChanges = updatedEdges.some((edge, index) => edge !== edges[index]);
      if (hasChanges) {
        setEdges(updatedEdges);
      }
    }
  }, [selectedEdgeIds, edges, setEdges]);

  // Show error state with enhanced error display
  if (parseError && enhancedErrorInfo) {
    return (
      <ErrorDisplay
        errorInfo={enhancedErrorInfo}
        onRetry={() => parseDBML(dbmlContent)}
        content={dbmlContent}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          color: 'var(--vscode-editor-foreground)',
          fontSize: '16px'
        }}>
          ⏳ Parsing DBML...
        </div>
      </div>
    );
  }

  // Calculate total tables and refs across all schemas
  const totalTables = dbmlData?.schemas?.reduce((total, schema) =>
    total + (schema.tables?.length || 0), 0) || 0;
  const totalRefs = dbmlData?.schemas?.reduce((total, schema) =>
    total + (schema.refs?.length || 0), 0) || 0;

  // Show empty state
  if (!dbmlData || !dbmlData.schemas?.length || totalTables === 0) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{
          color: 'var(--vscode-descriptionForeground)',
          fontSize: '16px'
        }}>
          📄 No tables found in DBML
        </div>
        <div style={{
          color: 'var(--vscode-descriptionForeground)',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          Make sure your DBML file contains table definitions
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        nodesConnectable={false}
        nodesDraggable={true}
        minZoom={0.05}
        maxZoom={2}
      >
        <Controls />
        <Background />
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor="var(--vscode-button-background)"
          nodeStrokeColor="var(--vscode-panel-border)"
          bgColor="var(--vscode-panel-background)"
          maskColor="rgba(0, 0, 0, 0.1)"
          maskStrokeColor="var(--vscode-panel-border)"
          position="bottom-right"
          pannable={true}
          style={{
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '4px'
          }}
        />
        
        <TableNavigationPanel dbmlData={dbmlData} />

        {/* Stats Panel - Top Right */}
        <Panel position="top-right">
          <div style={{
            background: 'var(--vscode-editor-background)',
            color: 'var(--vscode-editor-foreground)',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <strong>DBML Preview</strong>
            <div style={{ fontSize: '12px' }}>
              {totalTables} tables
            </div>
            <div style={{ fontSize: '12px' }}>
              {totalRefs} relationships
            </div>
            <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>
              {dbmlData?.schemas?.length || 0} schema{(dbmlData?.schemas?.length || 0) !== 1 ? 's' : ''}
            </div>
            <button
              onClick={resetLayout}
              style={{
                background: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: '1px solid var(--vscode-button-border)',
                padding: '4px 8px',
                borderRadius: '2px',
                fontSize: '10px',
                cursor: 'pointer',
                marginTop: '4px'
              }}
              title="Reset table positions to auto-layout"
            >
              Reset Layout
            </button>
          </div>
        </Panel>
      </ReactFlow>

      {tooltipData && (
        <EdgeTooltip
          edge={tooltipData.edge}
          position={tooltipData.position}
          onClose={handleCloseTooltip}
        />
      )}

      {columnTooltipData && (
        <ColumnTooltip
          column={columnTooltipData.column}
          enumDef={columnTooltipData.enumDef}
          position={columnTooltipData.position}
          onClose={handleCloseColumnTooltip}
        />
      )}

      {tableNoteTooltipData && (
        <TableNoteTooltip
          table={tableNoteTooltipData.table}
          position={tableNoteTooltipData.position}
          onClose={handleCloseTableNoteTooltip}
        />
      )}
    </div>
  );
};

export default DBMLPreview;