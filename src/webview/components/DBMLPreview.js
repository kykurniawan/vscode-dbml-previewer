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
import TableIndexesTooltip from './TableIndexesTooltip';
import StickyNote from './StickyNote';
import ErrorDisplay from './ErrorDisplay';
import TableNavigationDropdown from './TableNavigationDropdown';
import { transformDBMLToNodes, chooseEffectiveSides } from '../utils/dbmlTransformer';
import { parseDBMLError, formatErrorForDisplay } from '../utils/errorParser';
import { preprocessChecks, preprocessOptionalRelationships } from '../utils/dbmlPreprocessor';
import {
  saveLayout,
  loadLayout,
  generateFileId,
  extractTablePositions,
  cleanupObsoletePositions,
  applyPersistedLayout,
  cleanupObsoleteEdgeRoutes,
  translateEdgeRoutesForMove,
} from '../utils/layoutStorage';
import { currentRefKeysFromEdges } from '../utils/refIdentity';
import { nearestSide, sidesFavouredByRoute } from '../utils/edgeSides';
import { resetRoute } from '../utils/edgeSegments';
import { darkenHexColor } from '../utils/colorUtils';
import CustomEdge from './CustomEdge';

const nodeTypes = {
  table: TableNode,
  tableHeader: TableHeaderNode,
  column: ColumnNode,
  tableGroup: TableGroupNode,
  stickyNote: StickyNote,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Hide export chrome (controls, minimap, panels, and waypoint handles) for the
// duration of an export, then always restore it — even if the export throws.
// The marker-definitions SVG is intentionally left visible so markers rasterise.
async function withHiddenExportChrome(flowElement, fn) {
  const sel = '.react-flow__controls, .react-flow__minimap, .react-flow__panel,'
            + ' .dbml-waypoint-dot, .dbml-waypoint-seg, .dbml-endpoint-handle, .dbml-edge-reset';
  const hidden = Array.from(flowElement.querySelectorAll(sel));
  const prev = hidden.map(el => el.style.display);
  hidden.forEach(el => { el.style.display = 'none'; });
  try { return await fn(); }
  finally { hidden.forEach((el, i) => { el.style.display = prev[i]; }); }
}

// An edge "has a route" if it carries waypoints or an explicit side override;
// such edges are kept above tables (z 11) even when not selected.
const edgeHasRoute = (edge) => {
  const d = edge?.data || {};
  return (Array.isArray(d.checkPoints) && d.checkPoints.length > 0)
    || d.sourceSide === 'left' || d.sourceSide === 'right'
    || d.targetSide === 'left' || d.targetSide === 'right';
};

// Compare two route maps by key set and each entry's side overrides and
// checkpoint list (length + per-point x/y). Used to skip no-op route updates.
const shallowEqualRoutes = (a, b) => {
  const ak = Object.keys(a || {});
  const bk = Object.keys(b || {});
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    const ra = a[k];
    const rb = b[k];
    if (!rb) return false;
    if (ra.sourceSide !== rb.sourceSide || ra.targetSide !== rb.targetSide) return false;
    const ca = ra.checkPoints || [];
    const cb = rb.checkPoints || [];
    if (ca.length !== cb.length) return false;
    for (let i = 0; i < ca.length; i++) {
      if (ca[i].x !== cb[i].x || ca[i].y !== cb[i].y) return false;
    }
  }
  return true;
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
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
  const [edgeMenu, setEdgeMenu] = useState(null);
  const [latchedEdgeId, setLatchedEdgeId] = useState(null);
  const latchedEdgeIdRef = useRef(null);
  useEffect(() => { latchedEdgeIdRef.current = latchedEdgeId; }, [latchedEdgeId]);
  const [tooltipData, setTooltipData] = useState(null);
  const [columnTooltipData, setColumnTooltipData] = useState(null);
  const [tableNoteTooltipData, setTableNoteTooltipData] = useState(null);
  const [tableChecksTooltipData, setTableChecksTooltipData] = useState(null);
  const [tableIndexesTooltipData, setTableIndexesTooltipData] = useState(null);
  const [tableGroups, setTableGroups] = useState([]);
  const [draggedGroupPositions, setDraggedGroupPositions] = useState(new Map());
  const [fileId, setFileId] = useState(null);
  const [savedPositions, setSavedPositions] = useState({});
  const [savedEdgeRoutes, setSavedEdgeRoutes] = useState({});
  const [, setFilePath] = useState(null);

  // Refs mirroring live state so persistence can read the latest values
  // synchronously without racing pending setNodes/setEdges/setSavedEdgeRoutes.
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const routesRef = useRef({});
  const [currentTheme, setCurrentTheme] = useState({});
  const [inheritThemeStyle, setInheritThemeStyle] = useState(true);
  const [edgeType, setEdgeType] = useState('smoothstep');
  const [autoEndpointSide, setAutoEndpointSide] = useState(true);
  const [relationshipMarkers, setRelationshipMarkers] = useState(true);
  const [editableEdgeRouting, setEditableEdgeRouting] = useState(false);
  const [showCardinalityLabels, setShowCardinalityLabels] = useState(false);
  const [exportQuality, setExportQuality] = useState(0.95);
  const [exportBackground, setExportBackground] = useState(true);
  const [exportPadding, setExportPadding] = useState(20);
  const [handleTableNavigation, setHandleTableNavigation] = useState(null);
  const [tableChecks, setTableChecks] = useState({});

  // Ref to the React Flow instance — used to call fitView() imperatively during bulk export
  const reactFlowRef = useRef(null);

  // Keep nodesRef/edgesRef in sync with the latest state for synchronous snapshot reads.
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // Single route setter: keeps routesRef current synchronously (before the state
  // update) and skips no-op re-renders so the rebuild effect cannot loop.
  const setRoutes = useCallback((next) => {
    if (shallowEqualRoutes(routesRef.current, next)) return;
    routesRef.current = next;
    setSavedEdgeRoutes(next);
  }, []);

  // Pure poster: sessionStorage stays positions-only; the sidecar file is the
  // source of truth for routes. Always sends edges so the host can persist them.
  const postLayoutSnapshot = useCallback(({ positions, routes }) => {
    if (!fileId) return;
    saveLayout(fileId, positions);
    window.vscode.postMessage({ type: 'saveLayout', positions, edges: routes });
  }, [fileId]);

  // Live waypoint update while dragging: touch only the edge's checkPoints in
  // edge state; no persistence until the gesture commits.
  const onRouteChange = useCallback((edgeRefKey, nextCheckPoints) => {
    setEdges(cur => cur.map(e =>
      e.data?.refKey === edgeRefKey
        ? { ...e, data: { ...e.data, checkPoints: nextCheckPoints } }
        : e
    ));
  }, [setEdges]);

  // Commit the final waypoint array: build the next route map from routesRef and
  // the explicit points, keep it in sync synchronously, and post the snapshot.
  // Apply a Source/Target side choice ('left' | 'right' | undefined=Automatic) to
  // one edge, recompute its handles, and persist the route from explicit values.
  // Core: set BOTH endpoint sides to explicit final values ('left'|'right'|
  // undefined=Automatic) in ONE snapshot, recompute the handles and persist.
  // Taking both sides at once is what lets route inference flip both endpoints
  // without the second update reading a stale pre-first-flip edge (C8).
  const applyEndpointSidesToEdge = useCallback((edgeId, finalSourceSide, finalTargetSide, persist = true) => {
    const edge = edgesRef.current.find(e => e.id === edgeId);
    if (!edge) { setEdgeMenu(null); return; }
    const edgeRefKey = edge.data?.refKey;

    // Table geometry for the handle recompute.
    const tablePos = {};
    nodesRef.current.forEach(n => {
      if (n.type === 'tableHeader') {
        tablePos[n.id] = { x: n.position.x, width: n.data?.tableWidth || 200 };
      }
    });

    const nextData = { ...edge.data };
    if (finalSourceSide === 'left' || finalSourceSide === 'right') nextData.sourceSide = finalSourceSide; else delete nextData.sourceSide;
    if (finalTargetSide === 'left' || finalTargetSide === 'right') nextData.targetSide = finalTargetSide; else delete nextData.targetSide;

    const src = tablePos[`table-${nextData.sourceTable}`];
    const tgt = tablePos[`table-${nextData.targetTable}`];
    const { sourceHandle, targetHandle } = chooseEffectiveSides({ data: nextData }, src, tgt, autoEndpointSide);

    // Apply only the side/handle change; keep the checkPoints from the LIVE edge
    // (cur), not from nextData — nextData came from edgesRef, which lags a just-
    // committed route and would otherwise resurrect stale checkpoints into state.
    setEdges(cur => cur.map(e => e.id === edgeId
      ? { ...e, data: { ...nextData, checkPoints: e.data?.checkPoints }, sourceHandle, targetHandle }
      : e));

    // Persist explicitly from routesRef (never from queued state). Checkpoints are
    // the persisted source of truth and are unchanged by a side change.
    if (edgeRefKey && persist) {
      const next = { ...routesRef.current };
      const route = { ...(next[edgeRefKey] || {}) };
      if (nextData.sourceSide) route.sourceSide = nextData.sourceSide; else delete route.sourceSide;
      if (nextData.targetSide) route.targetSide = nextData.targetSide; else delete route.targetSide;
      const hasCheckPoints = Array.isArray(route.checkPoints) && route.checkPoints.length > 0;
      if (!route.sourceSide && !route.targetSide && !hasCheckPoints) {
        delete next[edgeRefKey];
      } else {
        next[edgeRefKey] = route;
      }
      setRoutes(next);
      postLayoutSnapshot({ positions: extractTablePositions(nodesRef.current), routes: routesRef.current });
    }

    setEdgeMenu(null);
  }, [autoEndpointSide, setEdges, setRoutes, postLayoutSnapshot]);

  // Set one endpoint's side, keeping the other endpoint's current side. Used by
  // the right-click menu and the endpoint-drag gesture.
  const applyEndpointSide = useCallback((edgeId, endpoint, value, persist = true) => {
    const edge = edgesRef.current.find(e => e.id === edgeId);
    if (!edge) { setEdgeMenu(null); return; }
    const finalSourceSide = endpoint === 'source' ? value : edge.data?.sourceSide;
    const finalTargetSide = endpoint === 'target' ? value : edge.data?.targetSide;
    applyEndpointSidesToEdge(edgeId, finalSourceSide, finalTargetSide, persist);
  }, [applyEndpointSidesToEdge]);

  // Table box (left edge + width) for every table node, in flow coordinates.
  const tableBoxes = useCallback(() => {
    const boxes = {};
    nodesRef.current.forEach(n => {
      if (n.type === 'tableHeader') {
        boxes[n.id] = { x: n.position.x, width: n.data?.tableWidth || 200 };
      }
    });
    return boxes;
  }, []);

  // Dragging an endpoint handle across its table pins that end to the side the
  // pointer is on. Live while dragging, persisted once on release.
  const onEndpointDrag = useCallback((edgeRefKey, endpoint, flowPoint, commit) => {
    const edge = edgesRef.current.find(e => e.data?.refKey === edgeRefKey);
    if (!edge) return;
    const boxes = tableBoxes();
    const tableId = endpoint === 'source'
      ? `table-${edge.data?.sourceTable}`
      : `table-${edge.data?.targetTable}`;
    const side = nearestSide(flowPoint.x, boxes[tableId]);
    if (!side) return;
    const current = endpoint === 'source' ? edge.data?.sourceSide : edge.data?.targetSide;
    if (side === current && !commit) return;
    applyEndpointSide(edge.id, endpoint, side, commit);
  }, [applyEndpointSide, tableBoxes]);

  const onRouteCommit = useCallback((edgeRefKey, finalCheckPoints) => {
    // CustomEdge already produced the merged segment-model corners — the same
    // geometry it draws — so persist them verbatim; only guard against non-finite
    // values. Re-running a different transform here could shift the corners and
    // make saved != drawn.
    const pts = (finalCheckPoints || [])
      .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
      .map((p) => ({ x: p.x, y: p.y }));

    const next = { ...routesRef.current };
    const route = { ...(next[edgeRefKey] || {}) };
    if (pts.length) route.checkPoints = pts; else delete route.checkPoints;
    if (!route.sourceSide && !route.targetSide && !(route.checkPoints && route.checkPoints.length)) {
      delete next[edgeRefKey];
    } else {
      next[edgeRefKey] = route;
    }

    setEdges(cur => cur.map(e =>
      e.data?.refKey === edgeRefKey
        ? { ...e, data: { ...e.data, checkPoints: pts.length ? pts : undefined } }
        : e
    ));
    setRoutes(next);
    postLayoutSnapshot({ positions: extractTablePositions(nodesRef.current), routes: routesRef.current });

    // Route-derived side inference: if the committed route clearly rounds a
    // table to reach its endpoint, move that endpoint to the side the route
    // argues for. It only *sets* a side the geometry implies; it never fights an
    // explicit choice, because the route the user just shaped is what it reads.
    const edge = edgesRef.current.find(e => e.data?.refKey === edgeRefKey);
    if (edge && pts.length) {
      const boxes = tableBoxes();
      const favoured = sidesFavouredByRoute({
        checkPoints: pts,
        sourceTable: boxes[`table-${edge.data?.sourceTable}`],
        targetTable: boxes[`table-${edge.data?.targetTable}`],
      });
      // Compute BOTH final sides from the one current edge and apply them in a
      // single snapshot. Two separate applyEndpointSide calls would each read
      // the same stale edgesRef.current, so a both-endpoint flip could see the
      // second call undo the first (C8).
      const nextSource = favoured.sourceSide || edge.data?.sourceSide;
      const nextTarget = favoured.targetSide || edge.data?.targetSide;
      if (nextSource !== edge.data?.sourceSide || nextTarget !== edge.data?.targetSide) {
        applyEndpointSidesToEdge(edge.id, nextSource, nextTarget, true);
      }
    }
  }, [setEdges, setRoutes, postLayoutSnapshot, tableBoxes, applyEndpointSidesToEdge]);

  // Persist the segment-model conversion of a legacy route when an edit commits
  // it — currently an endpoint-side flip (one of the specified operations). The
  // converted corners are saved with the current side overrides and NO
  // route-derived inference (the sides were just chosen). CustomEdge only calls
  // this on an actual side change, so opening a file or entering editable mode
  // stays write-free.
  const onRouteConvert = useCallback((edgeRefKey, converted) => {
    const pts = (converted || [])
      .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
      .map((p) => ({ x: p.x, y: p.y }));
    const next = { ...routesRef.current };
    const route = { ...(next[edgeRefKey] || {}) };
    if (pts.length) route.checkPoints = pts; else delete route.checkPoints;
    if (!route.sourceSide && !route.targetSide && !(route.checkPoints && route.checkPoints.length)) {
      delete next[edgeRefKey];
    } else {
      next[edgeRefKey] = route;
    }
    setEdges(cur => cur.map(e =>
      e.data?.refKey === edgeRefKey
        ? { ...e, data: { ...e.data, checkPoints: pts.length ? pts : undefined } }
        : e
    ));
    setRoutes(next);
    postLayoutSnapshot({ positions: extractTablePositions(nodesRef.current), routes: routesRef.current });
  }, [setEdges, setRoutes, postLayoutSnapshot]);

  // Per-edge reset (D5): return the edge fully to its automatic route by
  // clearing BOTH the segment corners and any left/right endpoint-side override,
  // then recompute the handles automatically and persist. The per-edge
  // equivalent of the global "Reset Layout" button. Fires immediately, no
  // confirmation (D6) — its control sits clear of the drag handles.
  const onResetEdge = useCallback((edgeRefKey) => {
    if (!edgeRefKey) return;
    const next = { ...routesRef.current };
    delete next[edgeRefKey];

    const boxes = tableBoxes();
    setEdges(cur => cur.map(e => {
      if (e.data?.refKey !== edgeRefKey) return e;
      // resetRoute() is the single definition of "back to automatic": drop the
      // corners and both side overrides.
      const nextData = { ...e.data, ...resetRoute() };
      const src = boxes[`table-${nextData.sourceTable}`];
      const tgt = boxes[`table-${nextData.targetTable}`];
      const { sourceHandle, targetHandle } = chooseEffectiveSides({ data: nextData }, src, tgt, autoEndpointSide);
      return { ...e, data: nextData, sourceHandle, targetHandle };
    }));

    setRoutes(next);
    postLayoutSnapshot({ positions: extractTablePositions(nodesRef.current), routes: routesRef.current });
  }, [autoEndpointSide, setEdges, setRoutes, postLayoutSnapshot, tableBoxes]);

  // Export handlers
  const handleExportToPng = useCallback(async () => {
    const flowElement = document.querySelector('.react-flow');
    if (!flowElement) {
      console.error('React Flow element not found');
      return;
    }
    try {
      const fileName = window.filePath
        ? window.filePath.split('/').pop().replace('.dbml', '')
        : 'dbml-diagram';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

      const dataUrl = await withHiddenExportChrome(flowElement, async () => {
        // Wait a moment for the DOM to update after hiding chrome
        await new Promise(resolve => setTimeout(resolve, 100));
        return toPng(flowElement, {
          quality: exportQuality,
          backgroundColor: exportBackground ? getThemeVar('background') : 'transparent',
          pixelRatio: 2, // Higher resolution for better quality
          style: {
            padding: `${exportPadding}px`,
          }
        });
      });

      const link = document.createElement('a');
      link.download = `${fileName}_${timestamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting to PNG:', error);
      alert('Failed to export diagram to PNG. Please try again.');
    }
  }, [exportQuality, exportBackground, exportPadding]);

  const handleExportToSvg = useCallback(async () => {
    const flowElement = document.querySelector('.react-flow');
    if (!flowElement) {
      console.error('React Flow element not found');
      return;
    }
    try {
      const fileName = window.filePath
        ? window.filePath.split('/').pop().replace('.dbml', '')
        : 'dbml-diagram';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

      const dataUrl = await withHiddenExportChrome(flowElement, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return toSvg(flowElement, {
          backgroundColor: exportBackground ? getThemeVar('background') : 'transparent',
          style: {
            padding: `${exportPadding}px`,
          }
        });
      });

      const link = document.createElement('a');
      link.download = `${fileName}_${timestamp}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting to SVG:', error);
      alert('Failed to export diagram to SVG. Please try again.');
    }
  }, [exportBackground, exportPadding]);

  // Bulk export: capture the current diagram and send the data URL back to the extension host
  const handleBulkExportProcess = useCallback(async (outputName, content, format = 'png') => {
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

      const dataUrl = await withHiddenExportChrome(flowElement, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return format === 'svg'
          ? toSvg(flowElement, {
            backgroundColor: exportBackground ? getThemeVar('background') : 'transparent',
            style: { padding: `${exportPadding}px` }
          })
          : toPng(flowElement, {
            quality: exportQuality,
            backgroundColor: exportBackground ? getThemeVar('background') : 'transparent',
            pixelRatio: 2,
            style: { padding: `${exportPadding}px` }
          });
      });

      vscode.postMessage({ type: 'bulkExportResult', outputName, dataUrl, format });
    } catch (error) {
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

  // Handle column click for tooltip display
  const handleColumnClick = useCallback((column, enumDef, position) => {
    // Close other tooltips
    setTooltipData(null);
    setSelectedEdgeIds(new Set());
    setTableNoteTooltipData(null);
    setTableIndexesTooltipData(null);

    // Open column tooltip
    setColumnTooltipData({
      column,
      enumDef,
      position
    });
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
  // A single click enters editable mode for that edge and selects it. It is
  // deliberately idempotent rather than a toggle: clicking an edge that is
  // already being edited must not shut it, or the click that ends a gesture
  // could drop the user out of edit mode. Editable mode is left by clicking
  // away from the edge (see handleClickOutside).
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setTooltipData(null);
    setLatchedEdgeId(edge.id);
    setSelectedEdgeIds(() => new Set([edge.id]));
  }, []);

  // Hovering an edge highlights it with a moving dash and opens the relationship
  // note beside the pointer; leaving closes it again. An edge that is in editable
  // mode shows no note — the note would sit over the very handles being dragged,
  // which is what made it annoying when it was click-driven and sticky.
  const onEdgeMouseEnter = useCallback((event, edge) => {
    setHoveredEdgeId(edge.id);
    if (latchedEdgeIdRef.current === edge.id) return;
    const rect = event.currentTarget?.getBoundingClientRect?.() || { left: 0, top: 0 };
    setTooltipData({
      edge,
      position: {
        x: event.clientX || (rect.left + 100),
        y: event.clientY || (rect.top + 50),
      },
    });
  }, []);
  const onEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
    setTooltipData(null);
  }, []);

  // Double-clicking an edge enters editable mode: its segment handles and reset
  // control appear (see CustomEdge). Editable mode persists until the user
  // clicks the canvas or presses Escape, so handles can be reached without
  // keeping the pointer on the line.
  const onEdgeDoubleClick = useCallback((event, edge) => {
    event.stopPropagation();
    setTooltipData(null);
    setLatchedEdgeId(edge.id);
  }, []);

  // Clicking empty canvas leaves editable mode and closes any open menu.
  const onPaneClick = useCallback(() => {
    setLatchedEdgeId(null);
    setEdgeMenu(null);
  }, []);

  // Escape also leaves editable mode.
  useEffect(() => {
    if (latchedEdgeId == null) return undefined;
    const onKey = (ev) => { if (ev.key === 'Escape') setLatchedEdgeId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [latchedEdgeId]);

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    event.stopPropagation();
    setEdgeMenu({ edgeId: edge.id, x: event.clientX, y: event.clientY });
  }, []);


  // Handle tooltip close
  const handleCloseTooltip = useCallback(() => {
    setTooltipData(null);
    setSelectedEdgeIds(new Set());
  }, []);

  // Handle table note click for tooltip display
  const handleTableNoteClick = useCallback((table, position) => {
    // Close other tooltips
    setTooltipData(null);
    setSelectedEdgeIds(new Set());
    setColumnTooltipData(null);
    setTableIndexesTooltipData(null);

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
    setTableIndexesTooltipData(null);
    setTableChecksTooltipData({ table, checks, position });
  }, []);

  // Handle checks tooltip close
  const handleCloseTableChecksTooltip = useCallback(() => {
    setTableChecksTooltipData(null);
  }, []);

  // Handle indexes button click for tooltip display
  const handleTableIndexesClick = useCallback((table, indexes, position) => {
    setTooltipData(null);
    setSelectedEdgeIds(new Set());
    setColumnTooltipData(null);
    setTableNoteTooltipData(null);
    setTableChecksTooltipData(null);
    setTableIndexesTooltipData({ table, indexes, position });
  }, []);

  // Handle indexes tooltip close
  const handleCloseTableIndexesTooltip = useCallback(() => {
    setTableIndexesTooltipData(null);
  }, []);


  // Handle ESC key and click outside to close tooltips
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setTooltipData(null);
        setSelectedEdgeIds(new Set());
        setColumnTooltipData(null);
        setTableNoteTooltipData(null);
        setTableChecksTooltipData(null);
        setTableIndexesTooltipData(null);
        setEdgeMenu(null);
        setLatchedEdgeId(null);
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
        setTableChecksTooltipData(null);
        setTableIndexesTooltipData(null);
      }

      // Dismiss the endpoint-side menu on any click outside it.
      if (!event.target.closest('[data-edge-menu]')) {
        setEdgeMenu(null);
      }

      // Release editable mode on any click away from the edge. Every
      // control that belongs to the edited edge — the edge line, the segment
      // handles, the soft split point, the endpoint side handles and the reset
      // control — keeps editable mode alive.
      const onEdgeOrHandle = event.target.closest('.react-flow__edge')
        || event.target.closest('.dbml-waypoint-dot')
        || event.target.closest('.dbml-waypoint-seg')
        || event.target.closest('.dbml-endpoint-handle')
        || event.target.closest('.dbml-edge-reset');
      if (!onEdgeOrHandle) {
        setLatchedEdgeId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
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
          const checksCount = tableNode.data.checksCount || 0;
          const indexesCount = tableNode.data.indexesCount || 0;
          const checksFooterHeight = checksCount > 0 ? 32 : 0;
          const indexesFooterHeight = indexesCount > 0 ? 32 : 0;
          const tableHeight =
            42 + // header height
            (tableNode.data.table?.note ? 30 : 0) + // note height
            (tableNode.data.columnCount * 30) + // columns height
            16 + // padding
            checksFooterHeight +
            indexesFooterHeight;

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

  // Save layout when table positions change. Routes are unchanged by a position
  // drag, so the current routesRef is reused verbatim.
  const saveCurrentLayout = useCallback(() => {
    if (fileId && nodesRef.current.length > 0) {
      const positions = extractTablePositions(nodesRef.current);
      setSavedPositions(positions);
      postLayoutSnapshot({ positions, routes: routesRef.current });
    }
  }, [fileId, postLayoutSnapshot]);

  // Reset layout to auto-layout (clears both saved positions and saved routes)
  const resetLayout = useCallback(() => {
    if (fileId) {
      setSavedPositions({});
      setRoutes({});
      saveLayout(fileId, {});
      window.vscode.postMessage({ type: 'clearLayout' });
      // Trigger re-transform with empty positions AND empty routes
      if (dbmlData) {
        const { nodes: newNodes, edges: newEdges, tableGroups: newTableGroups } = transformDBMLToNodes(dbmlData, {}, handleColumnClick, handleTableNoteClick, edgeType, tableChecks, handleTableChecksClick, showCardinalityLabels, handleTableIndexesClick, autoEndpointSide, relationshipMarkers, {}, onRouteChange, onRouteCommit, editableEdgeRouting, onEndpointDrag, onResetEdge, onRouteConvert);
        setNodes(newNodes);
        setEdges(newEdges);
        setTableGroups(newTableGroups || []);
      }
    }
  }, [fileId, dbmlData, edgeType, autoEndpointSide, relationshipMarkers, editableEdgeRouting, showCardinalityLabels, tableChecks, setNodes, setEdges, setRoutes, onRouteChange, onRouteCommit, onEndpointDrag, onResetEdge, onRouteConvert, handleColumnClick, handleTableNoteClick, handleTableChecksClick, handleTableIndexesClick]);

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

          // Explicit snapshots taken from the synced refs BEFORE scheduling any
          // state update (plan §6: never assemble persisted values inside a
          // setNodes/setEdges updater — a queued updater would drop them).
          const currentNodes = nodesRef.current;
          const groupNode = currentNodes.find(node => node.id === groupId);
          const groupName = groupNode?.data?.tableGroup?.name;

          if (groupName && (offsetX !== 0 || offsetY !== 0)) {
            const movedTableIds = new Set(
              currentNodes.filter(n => n.type === 'tableHeader' && n.data?.tableGroup?.name === groupName)
                .map(n => n.id)
            );

            // Move member tables (explicit next-nodes array + positions map).
            const updatedPositions = { ...savedPositions };
            const nextNodes = currentNodes.map(node => {
              if (node.type === 'tableHeader' && node.data?.tableGroup?.name === groupName) {
                const newPosition = { x: node.position.x + offsetX, y: node.position.y + offsetY };
                updatedPositions[node.id] = newPosition;
                return { ...node, position: newPosition };
              }
              return node;
            });

            // Translate routed edges whose BOTH endpoints moved, from explicit
            // snapshots of the current edges and routes.
            const { nextEdges, nextRoutes, edgesChanged } = translateEdgeRoutesForMove(
              edgesRef.current, routesRef.current, movedTableIds, offsetX, offsetY
            );
            const routesChanged = !shallowEqualRoutes(routesRef.current, nextRoutes);

            // Apply outside every updater; setRoutes syncs routesRef before the post.
            setNodes(nextNodes);
            setSavedPositions(updatedPositions);
            if (edgesChanged) setEdges(nextEdges);
            if (routesChanged) setRoutes(nextRoutes);
            if (fileId) {
              postLayoutSnapshot({ positions: updatedPositions, routes: routesRef.current });
            }
          }

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

    // A table move can change which side faces the partner, so recompute the
    // effective endpoint handles for every edge using the latest table geometry.
    if (hasAnyNodePositionChanges || hasGroupDragEnd) {
      setTimeout(() => {
        setNodes(currentNodes => {
          const tablePos = {};
          currentNodes.forEach(n => {
            if (n.type === 'tableHeader') {
              tablePos[n.id] = { x: n.position.x, width: n.data?.tableWidth || 200 };
            }
          });
          setEdges(currentEdges => {
            let changed = false;
            const nextEdges = currentEdges.map(edge => {
              const src = tablePos[`table-${edge.data?.sourceTable}`];
              const tgt = tablePos[`table-${edge.data?.targetTable}`];
              const { sourceHandle, targetHandle } = chooseEffectiveSides(edge, src, tgt, autoEndpointSide);
              if (edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle) {
                return edge;
              }
              changed = true;
              return { ...edge, sourceHandle, targetHandle };
            });
            return changed ? nextEdges : currentEdges;
          });
          return currentNodes;
        });
      }, 120);
    }
  }, [onNodesChange, tableGroups, recalculateTableGroupBounds, setNodes, setEdges, setRoutes, autoEndpointSide, draggedGroupPositions, saveCurrentLayout, postLayoutSnapshot, savedPositions, nodes]);

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
      const contentWithoutOptionalRefs = preprocessOptionalRelationships(content);
      const { cleanedContent, tableChecks: extracted } = preprocessChecks(contentWithoutOptionalRefs);
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

      // Use file-persisted layout as source of truth (injected by extension host),
      // falling back to sessionStorage for same-session persistence
      if (window.initialLayout && typeof window.initialLayout === 'object') {
        applyPersistedLayout(newFileId, window.initialLayout);
        setSavedPositions(window.initialLayout);
      } else {
        const positions = loadLayout(newFileId);
        setSavedPositions(positions);
      }

      // Saved edge routes come from the sidecar file only (not sessionStorage).
      if (window.initialEdgeRoutes && typeof window.initialEdgeRoutes === 'object') {
        routesRef.current = window.initialEdgeRoutes;
        setSavedEdgeRoutes(window.initialEdgeRoutes);
      }
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
    const initialAutoEndpointSide = window.autoEndpointSide !== undefined
      ? window.autoEndpointSide
      : true;
    const initialRelationshipMarkers = window.relationshipMarkers !== undefined
      ? window.relationshipMarkers
      : true;
    const initialEditableEdgeRouting = window.editableEdgeRouting !== undefined
      ? window.editableEdgeRouting
      : false;
    const initialShowCardinalityLabels = window.showCardinalityLabels !== undefined
      ? window.showCardinalityLabels
      : false;
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
    setAutoEndpointSide(initialAutoEndpointSide);
    setRelationshipMarkers(initialRelationshipMarkers);
    setEditableEdgeRouting(initialEditableEdgeRouting);
    setShowCardinalityLabels(initialShowCardinalityLabels);
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
          if (message.autoEndpointSide !== undefined) {
            setAutoEndpointSide(message.autoEndpointSide);
          }
          if (message.relationshipMarkers !== undefined) {
            setRelationshipMarkers(message.relationshipMarkers);
          }
          if (message.editableEdgeRouting !== undefined) {
            setEditableEdgeRouting(message.editableEdgeRouting);
          }
          if (message.showCardinalityLabels !== undefined) {
            setShowCardinalityLabels(message.showCardinalityLabels);
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
          if (message.autoEndpointSide !== undefined) {
            setAutoEndpointSide(message.autoEndpointSide);
          }
          if (message.relationshipMarkers !== undefined) {
            setRelationshipMarkers(message.relationshipMarkers);
          }
          if (message.editableEdgeRouting !== undefined) {
            setEditableEdgeRouting(message.editableEdgeRouting);
          }
          if (message.showCardinalityLabels !== undefined) {
            setShowCardinalityLabels(message.showCardinalityLabels);
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
          handleBulkExportProcessRef.current(message.outputName, message.content, message.format);
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
        const positionsChanged = Object.keys(cleanedPositions).length !== Object.keys(currentSavedPositions).length;

        // Transform from the newly-cleaned positions and the current routes.
        const { nodes: newNodes, edges: newEdges, tableGroups: newTableGroups } = transformDBMLToNodes(dbmlData, cleanedPositions, handleColumnClick, handleTableNoteClick, edgeType, tableChecks, handleTableChecksClick, showCardinalityLabels, handleTableIndexesClick, autoEndpointSide, relationshipMarkers, routesRef.current, onRouteChange, onRouteCommit, editableEdgeRouting, onEndpointDrag, onResetEdge, onRouteConvert);

        // Drop routes whose refKey no longer exists in the freshly built edges.
        const currentRefKeys = currentRefKeysFromEdges(newEdges);
        const cleanedRoutes = cleanupObsoleteEdgeRoutes(routesRef.current, currentRefKeys);
        const routesChanged = !shallowEqualRoutes(routesRef.current, cleanedRoutes);

        setSavedPositions(cleanedPositions);
        if (positionsChanged) {
          saveLayout(fileId, cleanedPositions);
        }
        setRoutes(cleanedRoutes);
        setNodes(newNodes);
        setEdges(newEdges);
        setTableGroups(newTableGroups || []);

        // Persist only when something actually changed. Posted routes come from
        // newEdges, so cleanup can never be undone by re-extracting old edges.
        if (positionsChanged || routesChanged) {
          postLayoutSnapshot({ positions: cleanedPositions, routes: routesRef.current });
        }
      } catch (error) {
        console.error('Error transforming DBML data:', error);
      }
    }
  }, [dbmlData, fileId, edgeType, autoEndpointSide, relationshipMarkers, editableEdgeRouting, showCardinalityLabels, savedEdgeRoutes, tableChecks, setNodes, setEdges, setRoutes, postLayoutSnapshot, onRouteChange, onRouteCommit]);

  // Update edge styles based on selection state
  useEffect(() => {
    if (edges.length > 0) {
      const updatedEdges = edges.map(edge => {
        const isSelected = selectedEdgeIds.has(edge.id);
        const isHovered = hoveredEdgeId === edge.id;
        const isLatched = latchedEdgeId === edge.id;

        const currentStroke = edge.style?.stroke;
        const currentStrokeWidth = edge.style?.strokeWidth;
        const currentDashArray = edge.style?.strokeDasharray;
        const currentAnimated = edge.animated;
        const currentZIndex = edge.zIndex;
        const currentDataSelected = edge.data?.isSelected;
        const currentDataHovered = edge.data?.isHovered;
        const currentDataLatched = edge.data?.isLatched;

        // Hover (and the double-click editable latch) highlight the line with a
        // dashed, animated stroke to show it is selectable / being edited — no
        // handles appear on hover, only this highlight. Selection and editing
        // additionally thicken and recolour the stroke and raise it to the top.
        const baseStroke = edge.data?.refColor ? darkenHexColor(edge.data.refColor) : getThemeVar('chartsLines');
        const highlighted = isSelected || isHovered || isLatched;
        const emphasised = isSelected || isLatched;
        const expectedStroke = emphasised ? getThemeVar('focusBorder') : baseStroke;
        const expectedStrokeWidth = emphasised ? 3 : 2;
        const marching = (isHovered || isSelected) && !isLatched;
        const expectedDashArray = marching ? '5 5' : '0';
        const expectedAnimated = marching;
        const expectedZIndex = emphasised ? 1001 : (edgeHasRoute(edge) ? 11 : 0);

        // Only update if the style or interaction state has actually changed
        if (currentStroke !== expectedStroke || currentStrokeWidth !== expectedStrokeWidth || currentDashArray !== expectedDashArray || currentAnimated !== expectedAnimated || currentZIndex !== expectedZIndex || currentDataSelected !== isSelected || currentDataHovered !== isHovered || currentDataLatched !== isLatched) {
          return {
            ...edge,
            animated: expectedAnimated,
            zIndex: expectedZIndex,
            data: {
              ...edge.data,
              isSelected,
              isHovered,
              isLatched,
            },
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
  }, [selectedEdgeIds, hoveredEdgeId, latchedEdgeId, edges, setEdges]);

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
        onEdgeContextMenu={onEdgeContextMenu}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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

        {/* Handle legend — only in editable mode (a double-clicked edge), so it
            explains the handle kinds exactly when they are on screen and never
            clutters the canvas otherwise. */}
        {editableEdgeRouting && latchedEdgeId && (
          <Panel position="bottom-center">
            <div style={{
              background: getThemeVar('background'),
              color: getThemeVar('foreground'),
              border: `1px solid ${getThemeVar('panelBorder')}`,
              borderRadius: '4px',
              padding: '6px 10px',
              fontSize: '11px',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: 11, height: 11, borderRadius: '50%',
                  background: getThemeVar('foreground'),
                  border: '2px solid ' + getThemeVar('background'),
                  boxShadow: `0 0 0 1px ${getThemeVar('foreground')}`,
                  display: 'inline-block',
                }} />
                Segment — drag to slide it (merges when aligned)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'transparent',
                  border: `1.5px dashed ${getThemeVar('foreground')}`,
                  opacity: 0.6,
                  display: 'inline-block',
                }} />
                Split — drag to add a bend
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: 11, height: 11, borderRadius: 3,
                  background: getThemeVar('background'),
                  border: `2px solid ${getThemeVar('foreground')}`,
                  display: 'inline-block',
                }} />
                End — drag across a table to pick its side
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: 13, height: 13, borderRadius: '50%',
                  background: getThemeVar('background'),
                  border: `1.5px solid ${getThemeVar('foreground')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10,
                }}>⟳</span>
                Reset — back to the automatic route
              </span>
            </div>
          </Panel>
        )}

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

      {tableIndexesTooltipData && (
        <TableIndexesTooltip
          table={tableIndexesTooltipData.table}
          indexes={tableIndexesTooltipData.indexes}
          position={tableIndexesTooltipData.position}
          onClose={handleCloseTableIndexesTooltip}
        />
      )}

      {edgeMenu && (() => {
        const menuEdge = edges.find(e => e.id === edgeMenu.edgeId);
        const currentSource = menuEdge?.data?.sourceSide;
        const currentTarget = menuEdge?.data?.targetSide;
        const menuItemStyle = (active) => ({
          display: 'block',
          width: '100%',
          textAlign: 'left',
          background: active ? getThemeVar('buttonBackground') : 'transparent',
          color: active ? getThemeVar('buttonForeground') : getThemeVar('foreground'),
          border: 'none',
          padding: '4px 10px',
          fontSize: '12px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        });
        const sectionLabelStyle = {
          padding: '4px 10px 2px',
          fontSize: '10px',
          fontWeight: 700,
          color: getThemeVar('descriptionForeground'),
          textTransform: 'uppercase',
        };
        const rows = [
          { endpoint: 'source', label: 'Source', current: currentSource },
          { endpoint: 'target', label: 'Target', current: currentTarget },
        ];
        return (
          <div
            data-edge-menu="true"
            style={{
              position: 'fixed',
              left: edgeMenu.x,
              top: edgeMenu.y,
              zIndex: 2000,
              background: getThemeVar('background'),
              border: `1px solid ${getThemeVar('panelBorder')}`,
              borderRadius: '4px',
              padding: '4px 0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              minWidth: '140px',
            }}
          >
            {rows.map((row, rowIndex) => (
              <div key={row.endpoint} style={rowIndex > 0 ? { borderTop: `1px solid ${getThemeVar('panelBorder')}`, marginTop: '2px', paddingTop: '2px' } : undefined}>
                <div style={sectionLabelStyle}>{row.label}</div>
                <button style={menuItemStyle(!row.current)} onClick={() => applyEndpointSide(edgeMenu.edgeId, row.endpoint, undefined)}>Automatic</button>
                <button style={menuItemStyle(row.current === 'left')} onClick={() => applyEndpointSide(edgeMenu.edgeId, row.endpoint, 'left')}>Left</button>
                <button style={menuItemStyle(row.current === 'right')} onClick={() => applyEndpointSide(edgeMenu.edgeId, row.endpoint, 'right')}>Right</button>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default DBMLPreview;