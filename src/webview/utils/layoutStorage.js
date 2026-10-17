/**
 * Layout Storage Utility
 * Manages persistence of table positions in the DBML preview
 */

const LAYOUT_STORAGE_KEY = 'dbml-preview-layout';

/**
 * Save table positions to browser storage
 * @param {string} fileId - Unique identifier for the DBML file 
 * @param {Object} positions - Object mapping table IDs to positions
 */
export const saveLayout = (fileId, positions) => {
  try {
    const existingLayouts = getStoredLayouts();
    existingLayouts[fileId] = {
      positions,
      timestamp: Date.now()
    };
    
    // Store in sessionStorage for webview persistence
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(existingLayouts));
    } else {
      console.warn('sessionStorage not available');
    }
  } catch (error) {
    console.warn('Failed to save layout:', error);
  }
};

/**
 * Load table positions from browser storage
 * @param {string} fileId - Unique identifier for the DBML file
 * @returns {Object} Object mapping table IDs to positions, or empty object
 */
export const loadLayout = (fileId) => {
  try {
    const existingLayouts = getStoredLayouts();
    const fileLayout = existingLayouts[fileId];
    
    if (fileLayout && fileLayout.positions) {
      return fileLayout.positions;
    }
  } catch (error) {
    console.warn('Failed to load layout:', error);
  }
  
  return {};
};

/**
 * Clear saved layout for a specific file
 * @param {string} fileId - Unique identifier for the DBML file
 */
export const clearLayout = (fileId) => {
  try {
    const existingLayouts = getStoredLayouts();
    delete existingLayouts[fileId];
    
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(existingLayouts));
    }
    
  } catch (error) {
    console.warn('Failed to clear layout:', error);
  }
};

/**
 * Get all stored layouts
 * @returns {Object} All stored layouts
 */
const getStoredLayouts = () => {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem(LAYOUT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    }
  } catch (error) {
    console.warn('Failed to parse stored layouts:', error);
  }
  
  return {};
};

/**
 * Generate a unique file identifier based on file path
 * @param {string} filePath - Full path to the DBML file
 * @returns {string} File identifier
 */
export const generateFileId = (filePath) => {
  // Use the file path directly as ID, normalizing path separators
  const normalizedPath = filePath.replace(/\\/g, '/'); // Normalize Windows paths
  return normalizedPath;
};

/**
 * Extract table positions from React Flow nodes
 * @param {Array} nodes - React Flow nodes array
 * @returns {Object} Object mapping table IDs to positions
 */
export const extractTablePositions = (nodes) => {
  const positions = {};
  
  nodes.forEach(node => {
    // Save positions for table header nodes and sticky note nodes
    if (node.type === 'tableHeader' && node.position) {
      positions[node.id] = {
        x: node.position.x,
        y: node.position.y
      };
    } else if (node.type === 'stickyNote' && node.position) {
      // For sticky notes, also save dimensions if available
      positions[node.id] = {
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width || node.style?.width || 250,
        height: node.measured?.height || node.style?.height || 180
      };
    }
  });
  
  return positions;
};

/**
 * Seed sessionStorage with positions loaded from the layout file.
 * Called once on init when window.initialLayout is available.
 * @param {string} fileId
 * @param {Object} positions
 */
export const applyPersistedLayout = (fileId, positions) => {
  try {
    const existingLayouts = getStoredLayouts();
    existingLayouts[fileId] = { positions, timestamp: Date.now() };
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(existingLayouts));
    }
  } catch (error) {
    console.warn('Failed to apply persisted layout:', error);
  }
};

/**
 * Clean up obsolete positions that no longer exist in current schema
 * @param {Object} savedPositions - Previously saved positions
 * @param {Array} currentNodeIds - Array of current node IDs (tables and sticky notes)
 * @returns {Object} Cleaned positions object
 */
export const cleanupObsoletePositions = (savedPositions, currentNodeIds) => {
  const cleanedPositions = {};
  const currentIds = new Set(currentNodeIds);

  Object.keys(savedPositions).forEach(nodeId => {
    if (currentIds.has(nodeId)) {
      cleanedPositions[nodeId] = savedPositions[nodeId];
    }
  });

  return cleanedPositions;
};

/**
 * Extract per-edge routes (side overrides and waypoints) from React Flow edges,
 * keyed by each edge's stable refKey. Only edges that actually carry a side
 * override or a non-empty checkpoint list produce an entry; empty routes are
 * omitted so the sidecar stays minimal.
 * @param {Array} edges - React Flow edges array
 * @returns {Object} Object mapping refKey to a route descriptor
 */
export const extractEdgeRoutes = (edges) => {
  const routes = {};

  (edges || []).forEach(edge => {
    const key = edge?.data?.refKey;
    if (!key) return;

    const sourceSide = edge.data.sourceSide;
    const targetSide = edge.data.targetSide;
    const checkPoints = Array.isArray(edge.data.checkPoints) ? edge.data.checkPoints : [];

    const hasSourceSide = sourceSide === 'left' || sourceSide === 'right';
    const hasTargetSide = targetSide === 'left' || targetSide === 'right';
    const hasCheckPoints = checkPoints.length > 0;

    if (!hasSourceSide && !hasTargetSide && !hasCheckPoints) return;

    const route = {};
    if (hasSourceSide) route.sourceSide = sourceSide;
    if (hasTargetSide) route.targetSide = targetSide;
    if (hasCheckPoints) route.checkPoints = checkPoints.map(p => ({ x: p.x, y: p.y }));
    routes[key] = route;
  });

  return routes;
};

/**
 * Compute the route fields to seed onto a freshly transformed edge from a saved
 * route, applying the escape hatches: ignore the route entirely when the edge's
 * endpoints no longer resolve, only accept 'left'/'right' side overrides, and
 * drop any non-finite checkpoint.
 * @param {Object|undefined} savedRoute - The persisted route for this edge, if any
 * @param {boolean} endpointsResolve - Whether both endpoint columns still exist
 * @returns {{ sourceSide: (string|undefined), targetSide: (string|undefined), checkPoints: (Array|undefined) }}
 */
export const applySavedRoute = (savedRoute, endpointsResolve) => {
  const result = { sourceSide: undefined, targetSide: undefined, checkPoints: undefined };
  if (!savedRoute || !endpointsResolve) return result;

  if (savedRoute.sourceSide === 'left' || savedRoute.sourceSide === 'right') {
    result.sourceSide = savedRoute.sourceSide;
  }
  if (savedRoute.targetSide === 'left' || savedRoute.targetSide === 'right') {
    result.targetSide = savedRoute.targetSide;
  }
  if (Array.isArray(savedRoute.checkPoints)) {
    const pts = savedRoute.checkPoints
      .filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))
      .map(p => ({ x: p.x, y: p.y }));
    if (pts.length > 0) result.checkPoints = pts;
  }
  return result;
};

/**
 * Translate the checkpoints of every edge whose BOTH endpoint tables are in the
 * moved set by (dx, dy), returning explicit next edges and next routes so the
 * caller can apply them outside any state updater (no in-updater assembly).
 * @param {Array} edges - Current React Flow edges
 * @param {Object} routes - Current saved routes keyed by refKey
 * @param {Set<string>} movedTableIds - Set of moved table node ids (`table-...`)
 * @param {number} dx
 * @param {number} dy
 * @returns {{ nextEdges: Array, nextRoutes: Object, edgesChanged: boolean }}
 */
export const translateEdgeRoutesForMove = (edges, routes, movedTableIds, dx, dy) => {
  const nextRoutes = { ...(routes || {}) };
  let edgesChanged = false;

  const nextEdges = (edges || []).map(edge => {
    const cps = edge?.data?.checkPoints;
    if (!Array.isArray(cps) || cps.length === 0) return edge;
    const bothMoved = movedTableIds.has(`table-${edge.data.sourceTable}`)
      && movedTableIds.has(`table-${edge.data.targetTable}`);
    if (!bothMoved) return edge;

    edgesChanged = true;
    const translated = cps.map(p => ({ x: p.x + dx, y: p.y + dy }));
    const key = edge.data.refKey;
    if (key) {
      nextRoutes[key] = { ...(nextRoutes[key] || {}), checkPoints: translated };
    }
    return { ...edge, data: { ...edge.data, checkPoints: translated } };
  });

  return { nextEdges, nextRoutes, edgesChanged };
};

/**
 * Clean up obsolete edge routes whose refKey no longer exists in the current
 * transformed edge set.
 * @param {Object} savedEdges - Previously saved routes keyed by refKey
 * @param {Array} currentRefKeys - Array of refKeys present in the current edges
 * @returns {Object} Cleaned routes object
 */
export const cleanupObsoleteEdgeRoutes = (savedEdges, currentRefKeys) => {
  const cleanedRoutes = {};
  const currentKeys = new Set(currentRefKeys);

  Object.keys(savedEdges || {}).forEach(refKey => {
    if (currentKeys.has(refKey)) {
      cleanedRoutes[refKey] = savedEdges[refKey];
    }
  });

  return cleanedRoutes;
};