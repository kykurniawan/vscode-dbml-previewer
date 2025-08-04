import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
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
import { transformDBMLToNodes } from '../utils/dbmlTransformer';
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
};

const DBMLPreview = ({ initialContent }) => {
  console.log('🎯 DBMLPreview component rendering with:', initialContent);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dbmlData, setDbmlData] = useState(null);
  const [dbmlContent, setDbmlContent] = useState(initialContent || '');
  const [parseError, setParseError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState(new Set());
  const [tooltipData, setTooltipData] = useState(null);
  const [columnTooltipData, setColumnTooltipData] = useState(null);
  const [tableNoteTooltipData, setTableNoteTooltipData] = useState(null);
  const [tableGroups, setTableGroups] = useState([]);
  const [draggedGroupPositions, setDraggedGroupPositions] = useState(new Map());
  const [fileId, setFileId] = useState(null);
  const [savedPositions, setSavedPositions] = useState({});
  const [filePath, setFilePath] = useState(null);

  console.log('🔄 State initialized - nodes:', nodes.length, 'edges:', edges.length);

  // Disabled manual connections for preview-only mode
  const onConnect = useCallback(() => {
    // No-op: Manual connections disabled in preview mode
  }, []);

  // Fallback node click handler for column nodes
  const onNodeClick = useCallback((event, node) => {
    console.log('🔥 React Flow node clicked:', node.type, node.id);
    
    if (node.type === 'column') {
      console.log('📋 Column node clicked via React Flow fallback');
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
    console.log('🖱️ Column clicked:', column?.name, 'enumDef:', !!enumDef, 'position:', position);
    
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
    
    console.log('✅ Column tooltip data set');
  }, []);

  // Handle table note click for tooltip display
  const handleTableNoteClick = useCallback((table, position) => {
    console.log('🖱️ Table note clicked:', table?.name, 'position:', position);
    
    // Close other tooltips
    setTooltipData(null);
    setSelectedEdgeIds(new Set());
    setColumnTooltipData(null);
    
    // Open table note tooltip
    setTableNoteTooltipData({
      table,
      position
    });
    
    console.log('✅ Table note tooltip data set');
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
          console.log('💾 Saving layout for fileId:', fileId);
          console.log('💾 Current nodes count:', currentNodes.length);
          console.log('💾 Extracted positions:', positions);
          setSavedPositions(positions);
          saveLayout(fileId, positions);
          console.log('💾 Layout saved successfully');
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
      console.log('🔄 Layout reset');
      // Trigger re-transform with empty positions
      if (dbmlData) {
        const { nodes: newNodes, edges: newEdges, tableGroups: newTableGroups } = transformDBMLToNodes(dbmlData, {}, handleColumnClick, handleTableNoteClick);
        setNodes(newNodes);
        setEdges(newEdges);
        setTableGroups(newTableGroups || []);
      }
    }
  }, [fileId, dbmlData, setNodes, setEdges, handleColumnClick]);

  // Custom nodes change handler that handles TableGroup dragging
  const handleNodesChange = useCallback((changes) => {
    console.log('🔄 handleNodesChange called with', changes.length, 'changes:', changes);
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
              const updatedPositions = {...savedPositions};
              
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
                console.log('💾 Layout saved for table group:', groupName, updatedPositions);
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

    // Check for any table position changes (individual or group)
    const hasAnyTablePositionChanges = changes.some(change =>
      change.type === 'position' &&
      change.dragging === false &&
      change.id.startsWith('table-')
    );

    // Check if group drag ended (we already saved positions above)
    const hasGroupDragEnd = groupDragEndChanges.length > 0;

    console.log('🔍 Position changes detected:', hasAnyTablePositionChanges);
    console.log('🔍 Group drag ended:', hasGroupDragEnd);

    // Save layout for any table position changes (except when group drag already saved)
    if (hasAnyTablePositionChanges && !hasGroupDragEnd) {
      console.log('✅ Will save layout for table position changes');
      setTimeout(() => {
        console.log('🔄 Saving layout for table position changes');
        saveCurrentLayout();
      }, 100);
    } else {
      console.log('❌ Not saving layout - hasAnyTablePositionChanges:', hasAnyTablePositionChanges, 'hasGroupDragEnd:', hasGroupDragEnd);
    }
    
    // Recalculate bounds for table groups if needed (for both individual and group moves)
    if ((hasAnyTablePositionChanges || hasGroupDragEnd) && tableGroups.length > 0) {
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
      setNodes([]);
      setEdges([]);
      setTableGroups([]);
      return;
    }

    setIsLoading(true);
    setParseError(null);

    try {
      const parser = new Parser();
      const parsed = parser.parse(content, 'dbmlv2');
      setDbmlData(parsed);
    } catch (error) {
      console.error('DBML Parse Error:', error);
      setParseError(error.message || 'Failed to parse DBML content');
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
      console.log('🆔 Generated file ID from path:', newFileId);
      setFileId(newFileId);
      
      // Load saved positions for this file
      const positions = loadLayout(newFileId);
      console.log('🔍 Loaded positions for file', newFileId, ':', positions);
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
    console.log('🔄 Transform effect triggered, dbmlData exists:', !!dbmlData, 'fileId:', fileId);
    if (dbmlData && fileId !== null) {
      try {
        // Get current saved positions at execution time
        const currentSavedPositions = loadLayout(fileId);
        console.log('💾 Current saved positions:', currentSavedPositions);
        
        // Clean up obsolete positions first
        const tableHeaderIds = [];
        dbmlData.schemas?.forEach(schema => {
          schema.tables?.forEach(table => {
            const fullName = schema.name && dbmlData.schemas.length > 1 ? `${schema.name}.${table.name}` : table.name;
            tableHeaderIds.push(`table-${fullName}`);
          });
        });
        
        const cleanedPositions = cleanupObsoletePositions(currentSavedPositions, tableHeaderIds);
        if (Object.keys(cleanedPositions).length !== Object.keys(currentSavedPositions).length) {
          setSavedPositions(cleanedPositions);
          saveLayout(fileId, cleanedPositions);
        }
        
        const { nodes: newNodes, edges: newEdges, tableGroups: newTableGroups } = transformDBMLToNodes(dbmlData, cleanedPositions, handleColumnClick, handleTableNoteClick);
        console.log('✅ Transform successful - nodes:', newNodes.length, 'edges:', newEdges.length, 'tableGroups:', newTableGroups?.length || 0);
        console.log('💾 Using saved positions:', cleanedPositions);
        console.log('📊 First few generated nodes with positions:', newNodes.filter(n => n.type === 'tableHeader').slice(0, 3).map(n => ({ id: n.id, position: n.position })));
        console.log('📦 TableGroups:', newTableGroups?.length || 0);
        setNodes(newNodes);
        setEdges(newEdges);
        setTableGroups(newTableGroups || []);
      } catch (error) {
        console.error('❌ Error transforming DBML data:', error);
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

  // Show error state
  if (parseError) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: 'var(--vscode-inputValidation-errorBackground)',
          border: '1px solid var(--vscode-inputValidation-errorBorder)',
          color: 'var(--vscode-inputValidation-errorForeground)',
          padding: '16px',
          borderRadius: '4px',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>❌ DBML Parse Error</h3>
          <p style={{ margin: '0', fontSize: '14px', fontFamily: 'monospace' }}>
            {parseError}
          </p>
        </div>
        <button
          onClick={() => parseDBML(dbmlContent)}
          style={{
            background: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        >
          Retry Parse
        </button>
      </div>
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
      >
        <Controls />
        <Background />
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
              {dbmlData.schemas?.length || 0} schema{(dbmlData.schemas?.length || 0) !== 1 ? 's' : ''}
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