import React, { useState, useEffect, useCallback, useRef } from 'react'; // eslint-disable-line no-unused-vars
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Panel,
  MiniMap,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import themeManager, { getThemeVar } from '../styles/themeManager.js';
import { Parser } from '@dbml/core';
import TableNode from './TableNode';
import TableHeaderNode from './TableHeaderNode';
import ColumnNode from './ColumnNode';
import TableGroupNode from './TableGroupNode';
import EdgeTooltip from './EdgeTooltip';
import ColumnTooltip from './ColumnTooltip';
import TableNoteTooltip from './TableNoteTooltip';
import TableChecksTooltip from './TableChecksTooltip';
import StickyNote from './StickyNote';
import ErrorDisplay from './ErrorDisplay';
import TableNavigationDropdown from './TableNavigationDropdown';
import { transformDBMLToNodes } from '../utils/dbmlTransformer';
import { parseDBMLError, formatErrorForDisplay } from '../utils/errorParser';
import { preprocessChecks } from '../utils/dbmlPreprocessor';
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

        setCenter(centerX, centerY, { zoom: 1.5, duration: 800 });
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

// Component that provides table navigation functionality to parent
const EdgeNavigationProvider = ({ setNavigationHandler }) => {
  const { setCenter, getNode } = useReactFlow();

  // Create navigation handler function
  useEffect(() => {
    const navigationHandler = (option) => {
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

          setCenter(centerX, centerY, { zoom: 1.5, duration: 800 });
        }
      }
    };

    // Pass the handler to parent
    setNavigationHandler(navigationHandler);
  }, [setCenter, getNode, setNavigationHandler]);

  // This component doesn't render anything
  return null;
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
  const [tableChecksTooltipData, setTableChecksTooltipData] = useState(null);
  const [tableGroups, setTableGroups] = useState([]);
  const [draggedGroupPositions, setDraggedGroupPositions] = useState(new Map());
  const [fileId, setFileId] = useState(null);
  const [savedPositions, setSavedPositions] = useState({});
  const [, setFilePath] = useState(null);
  const [currentTheme, setCurrentTheme] = useState({});
  const [inheritThemeStyle, setInheritThemeStyle] = useState(true);
  const [edgeType, setEdgeType] = useState('smoothstep');
  const [exportQuality, setExportQuality] = useState(0.95);
  const [exportBackground, setExportBackground] = useState(true);
  const [exportPadding, setExportPadding] = useState(20);
  const [handleTableNavigation, setHandleTableNavigation] = useState(null);
  const [tableChecks, setTableChecks] = useState({});

  // Ref to the React Flow instance — used to call fitView() imperatively during bulk export
  const reactFlowRef = useRef(null);

  // Export handlers
  const handleExportToPng = useCallback(async () => {
    try {
      const flowElement = document.querySelector('.react-flow');
      if (!flowElement) {
        console.error('React Flow element not found');
        return;
      }

      // Hide UI elements before export
      const controls = flowElement.querySelector('.react-flow__controls');
      const minimap = flowElement.querySelector('.react-flow__minimap');
      const panels = flowElement.querySelectorAll('.react-flow__panel');

      const elementsToHide = [controls, minimap, ...Array.from(panels)].filter(Boolean);
      elementsToHide.forEach(el => {
        el.style.display = 'none';
      });

      // Wait a moment for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate filename based on file path or default
      const fileName = window.filePath
        ? window.filePath.split('/').pop().replace('.dbml', '')
        : 'dbml-diagram';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

      const dataUrl = await toPng(flowElement, {
        quality: exportQuality,
        backgroundColor: exportBackground ? getThemeVar('background') : 'transparent',
        pixelRatio: 2, // Higher resolution for better quality
        style: {
          padding: `${exportPadding}px`,
        }
      });

      // Restore UI elements
      elementsToHide.forEach(el => {
        el.style.display = '';
      });

      const link = document.createElement('a');
      link.download = `${fileName}_${timestamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting to PNG:', error);
      // Restore UI elements in case of error
      const flowElement = document.querySelector('.react-flow');
      if (flowElement) {
        const controls = flowElement.querySelector('.react-flow__controls');
        const minimap = flowElement.querySelector('.react-flow__minimap');
        const panels = flowElement.querySelectorAll('.react-flow__panel');
        [controls, minimap, ...Array.from(panels)].filter(Boolean).forEach(el => {
          el.style.display = '';
        });
      }
      alert('Failed to export diagram to PNG. Please try again.');
    }
  }, [exportQuality, exportBackground, exportPadding]);

  const handleExportToSvg = useCallback(async () => {
    try {
      const flowElement = document.querySelector('.react-flow');
      if (!flowElement) {
        console.error('React Flow element not found');
        return;
      }

      // Hide UI elements before export
      const controls = flowElement.querySelector('.react-flow__controls');
      const minimap = flowElement.querySelector('.react-flow__minimap');
      const panels = flowElement.querySelectorAll('.react-flow__panel');

      const elementsToHide = [controls, minimap, ...Array.from(panels)].filter(Boolean);
      elementsToHide.forEach(el => {
        el.style.display = 'none';
      });

      // Wait a moment for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate filename based on file path or default
      const fileName = window.filePath
        ? window.filePath.split('/').pop().replace('.dbml', '')
        : 'dbml-diagram';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

      const dataUrl = await toSvg(flowElement, {
        backgroundColor: exportBackground ? getThemeVar('background') : 'transparent',
        style: {
          padding: `${exportPadding}px`,
        }
      });

      // Restore UI elements
      elementsToHide.forEach(el => {
        el.style.display = '';
      });

      const link = document.createElement('a');
      link.download = `${fileName}_${timestamp}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting to SVG:', error);
      // Restore UI elements in case of error
      const flowElement = document.querySelector('.react-flow');
      if (flowElement) {
        const controls = flowElement.querySelector('.react-flow__controls');
        const minimap = flowElement.querySelector('.react-flow__minimap');
        const panels = flowElement.querySelectorAll('.react-flow__panel');
        [controls, minimap, ...Array.from(panels)].filter(Boolean).forEach(el => {
          el.style.display = '';
        });
      }
      alert('Failed to export diagram to SVG. Please try again.');
    }
  }, [exportBackground, exportPadding]);

  // Bulk export: capture the current diagram and send the PNG data URL back to the extension host
  const handleBulkExportProcess = useCallback(async (outputName, content) => {
    const vscode = window.vscode;
    try {
      // Set a stable non-null fileId so the transform useEffect (which guards on fileId !== null) runs.
      // Use the outputName so each file gets a unique layout bucket in sessionStorage.
      setFileId(generateFileId(outputName));
      setDbmlContent(content);

      // Wait for the full render pipeline: DBML parse + dagre layout + React re-render
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Fit the viewport to the rendered nodes before capturing.
      // The fitView prop only fires on initial mount; we must call it imperatively here.
      reactFlowRef.current?.fitView({ duration: 0 });
      await new Promise(resolve => setTimeout(resolve, 300));

      const flowElement = document.querySelector('.react-flow');
      if (!flowElement) throw new Error('React Flow element not found');

      const elementsToHide = [
        flowElement.querySelector('.react-flow__controls'),
        flowElement.querySelector('.react-flow__minimap'),
        ...Array.from(flowElement.querySelectorAll('.react-flow__panel'))
      ].filter(Boolean);
      elementsToHide.forEach(el => { el.style.display = 'none'; });

      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(flowElement, {
        quality: exportQuality,
        backgroundColor: exportBackground ? getThemeVar('background') : 'transparent',
        pixelRatio: 2,
        style: { padding: `${exportPadding}px` }
      });

      elementsToHide.forEach(el => { el.style.display = ''; });

      vscode.postMessage({ type: 'bulkExportResult', outputName, dataUrl });
    } catch (error) {
      const fe = document.querySelector('.react-flow');
      if (fe) {
        [fe.querySelector('.react-flow__controls'), fe.querySelector('.react-flow__minimap'),
          ...Array.from(fe.querySelectorAll('.react-flow__panel'))].filter(Boolean)
          .forEach(el => { el.style.display = ''; });
      }
      vscode.postMessage({ type: 'bulkExportResult', outputName, error: error.message || 'Unknown error' });
    }
  }, [exportQuality, exportBackground, exportPadding]);

  // Ref so the message listener (registered once with [] deps) always calls the latest version
  const handleBulkExportProcessRef = useRef(null);
  handleBulkExportProcessRef.current = handleBulkExportProcess;

  // Callback to receive navigation function from EdgeNavigationProvider
  const setNavigationHandler = useCallback((navigationFn) => {
    setHandleTableNavigation(() => navigationFn);
  }, []);

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

  // Handle checks button click for tooltip display
  const handleTableChecksClick = useCallback((table, checks, position) => {
    setTooltipData(null);
    setSelectedEdgeIds(new Set());
    setColumnTooltipData(null);
    setTableNoteTooltipData(null);
    setTableChecksTooltipData({ table, checks, position });
  }, []);

  // Handle checks tooltip close
  const handleCloseTableChecksTooltip = useCallback(() => {
    setTableChecksTooltipData(null);
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
        const { nodes: newNodes, edges: newEdges, tableGroups: newTableGroups } = transformDBMLToNodes(dbmlData, {}, handleColumnClick, handleTableNoteClick, edgeType, tableChecks, handleTableChecksClick);
        setNodes(newNodes);
        setEdges(newEdges);
        setTableGroups(newTableGroups || []);
      }
    }
  }, [fileId, dbmlData, edgeType, tableChecks, setNodes, setEdges, handleColumnClick, handleTableNoteClick, handleTableChecksClick]);

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
      setTableChecks({});
      setNodes([]);
      setEdges([]);
      setTableGroups([]);
      return;
    }

    setIsLoading(true);
    setParseError(null);
    setEnhancedErrorInfo(null);

    try {
      const { cleanedContent, tableChecks: extracted } = preprocessChecks(content);
      setTableChecks(extracted);
      const parser = new Parser();
      const parsed = parser.parse(cleanedContent, 'dbmlv2');
      setDbmlData(parsed);
    } catch (error) {
      console.error('DBML Parse Error:', error);

      // Parse and enhance the error information
      const parsedError = parseDBMLError(error, content);
      const formattedError = formatErrorForDisplay(parsedError);

      setParseError(error.message || 'Failed to parse DBML content');
      setEnhancedErrorInfo(formattedError);
      setTableChecks({});
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

  // Initialize theme system
  useEffect(() => {
    // Get initial configuration from window global
    const initialInheritThemeStyle = window.inheritThemeStyle !== undefined
      ? window.inheritThemeStyle
      : true;
    const initialEdgeType = window.edgeType !== undefined
      ? window.edgeType
      : 'smoothstep';
    const initialExportQuality = window.exportQuality !== undefined
      ? window.exportQuality
      : 0.95;
    const initialExportBackground = window.exportBackground !== undefined
      ? window.exportBackground
      : true;
    const initialExportPadding = window.exportPadding !== undefined
      ? window.exportPadding
      : 20;

    setInheritThemeStyle(initialInheritThemeStyle);
    setEdgeType(initialEdgeType);
    setExportQuality(initialExportQuality);
    setExportBackground(initialExportBackground);
    setExportPadding(initialExportPadding);

    // Initialize theme manager
    themeManager.initialize(initialInheritThemeStyle);
    setCurrentTheme(themeManager.getTheme());

    // Listen for theme changes
    const handleThemeChange = (newTheme) => {
      setCurrentTheme(newTheme);
    };

    themeManager.addListener(handleThemeChange);

    // Cleanup
    return () => {
      themeManager.removeListener(handleThemeChange);
    };
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
        case 'configuration':
          // Handle initial configuration response
          if (message.inheritThemeStyle !== undefined) {
            setInheritThemeStyle(message.inheritThemeStyle);
            themeManager.setInheritThemeStyle(message.inheritThemeStyle);
          }
          if (message.edgeType !== undefined) {
            setEdgeType(message.edgeType);
          }
          if (message.exportQuality !== undefined) {
            setExportQuality(message.exportQuality);
          }
          if (message.exportBackground !== undefined) {
            setExportBackground(message.exportBackground);
          }
          if (message.exportPadding !== undefined) {
            setExportPadding(message.exportPadding);
          }
          break;
        case 'configurationChanged':
          // Handle configuration changes
          if (message.inheritThemeStyle !== undefined) {
            setInheritThemeStyle(message.inheritThemeStyle);
            themeManager.setInheritThemeStyle(message.inheritThemeStyle);
          }
          if (message.edgeType !== undefined) {
            setEdgeType(message.edgeType);
          }
          if (message.exportQuality !== undefined) {
            setExportQuality(message.exportQuality);
          }
          if (message.exportBackground !== undefined) {
            setExportBackground(message.exportBackground);
          }
          if (message.exportPadding !== undefined) {
            setExportPadding(message.exportPadding);
          }
          break;
        case 'exportToPNG':
          handleExportToPng();
          break;
        case 'exportToSVG':
          handleExportToSvg();
          break;
        case 'bulkExportProcess':
          handleBulkExportProcessRef.current(message.outputName, message.content);
          break;
      }
    };

    window.addEventListener('message', messageListener);

    // Request initial data and configuration
    vscode.postMessage({ type: 'ready' });
    vscode.postMessage({ command: 'getConfiguration' });

    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, []);

  // Transform DBML data to nodes and edges when data changes or edge type changes
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

        const { nodes: newNodes, edges: newEdges, tableGroups: newTableGroups } = transformDBMLToNodes(dbmlData, cleanedPositions, handleColumnClick, handleTableNoteClick, edgeType, tableChecks, handleTableChecksClick);
        setNodes(newNodes);
        setEdges(newEdges);
        setTableGroups(newTableGroups || []);
      } catch (error) {
        console.error('Error transforming DBML data:', error);
      }
    }
  }, [dbmlData, fileId, edgeType, tableChecks, setNodes, setEdges]);

  // Update edge styles based on selection state
  useEffect(() => {
    if (edges.length > 0) {
      const updatedEdges = edges.map(edge => {
        const isSelected = selectedEdgeIds.has(edge.id);

        const currentStroke = edge.style?.stroke;
        const currentStrokeWidth = edge.style?.strokeWidth;
        const currentDashArray = edge.style?.strokeDasharray;
        const currentAnimated = edge.animated;

        const expectedStroke = isSelected ? getThemeVar('focusBorder') : getThemeVar('chartsLines');
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
          color: getThemeVar('foreground'),
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
          color: getThemeVar('descriptionForeground'),
          fontSize: '16px'
        }}>
          📄 No tables found in DBML
        </div>
        <div style={{
          color: getThemeVar('descriptionForeground'),
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
        onInit={(instance) => { reactFlowRef.current = instance; }}
        attributionPosition="bottom-left"
        nodesConnectable={false}
        nodesDraggable={true}
        minZoom={0.05}
        maxZoom={2}
      >
        <Controls />
        <Background
          variant={BackgroundVariant.Dots}
          color={getThemeVar('panelBorder')}
          size={1}
          gap={20}
          style={{
            backgroundColor: getThemeVar('background')
          }}
        />
        <MiniMap
          nodeStrokeWidth={2}
          nodeColor={getThemeVar('buttonBackground')}
          nodeStrokeColor={getThemeVar('panelBorder')}
          bgColor={getThemeVar('panelBackground')}
          maskColor="rgba(0, 0, 0, 0.1)"
          maskStrokeColor={getThemeVar('panelBorder')}
          position="bottom-right"
          pannable={true}
          style={{
            border: `1px solid ${getThemeVar('panelBorder')}`,
            borderRadius: '4px'
          }}
        />

        <TableNavigationPanel dbmlData={dbmlData} />
        <EdgeNavigationProvider setNavigationHandler={setNavigationHandler} />

        {/* Stats Panel - Top Right */}
        <Panel position="top-right">
          <div style={{
            background: getThemeVar('background'),
            color: getThemeVar('foreground'),
            padding: '8px',
            borderRadius: '4px',
            border: `1px solid ${getThemeVar('panelBorder')}`,
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
            <div style={{ fontSize: '10px', color: getThemeVar('descriptionForeground') }}>
              {dbmlData?.schemas?.length || 0} schema{(dbmlData?.schemas?.length || 0) !== 1 ? 's' : ''}
            </div>
            <button
              onClick={resetLayout}
              style={{
                background: getThemeVar('buttonSecondaryBackground'),
                color: getThemeVar('buttonSecondaryForeground'),
                border: `1px solid ${getThemeVar('buttonBorder')}`,
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
            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: `1px solid ${getThemeVar('panelBorder')}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <button
                onClick={handleExportToPng}
                style={{
                  background: getThemeVar('buttonBackground'),
                  color: getThemeVar('buttonForeground'),
                  border: `1px solid ${getThemeVar('buttonBorder')}`,
                  padding: '4px 8px',
                  borderRadius: '2px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
                title="Export diagram as PNG image"
              >
                📷 Export PNG
              </button>
              <button
                onClick={handleExportToSvg}
                style={{
                  background: getThemeVar('buttonBackground'),
                  color: getThemeVar('buttonForeground'),
                  border: `1px solid ${getThemeVar('buttonBorder')}`,
                  padding: '4px 8px',
                  borderRadius: '2px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
                title="Export diagram as SVG vector image"
              >
                🖼️ Export SVG
              </button>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {tooltipData && (
        <EdgeTooltip
          edge={tooltipData.edge}
          position={tooltipData.position}
          onClose={handleCloseTooltip}
          onTableClick={handleTableNavigation}
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

      {tableChecksTooltipData && (
        <TableChecksTooltip
          table={tableChecksTooltipData.table}
          checks={tableChecksTooltipData.checks}
          position={tableChecksTooltipData.position}
          onClose={handleCloseTableChecksTooltip}
        />
      )}
    </div>
  );
};

export default DBMLPreview;