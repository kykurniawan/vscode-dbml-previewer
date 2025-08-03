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
      console.log('💾 Layout SAVED successfully for file:', fileId);
      console.log('💾 Positions saved:', positions);
      console.log('💾 All stored layouts:', existingLayouts);
    } else {
      console.warn('⚠️ sessionStorage not available');
    }
  } catch (error) {
    console.warn('❌ Failed to save layout:', error);
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
    console.log('🔍 All stored layouts:', existingLayouts);
    console.log('🔍 Looking for file ID:', fileId);
    
    const fileLayout = existingLayouts[fileId];
    
    if (fileLayout && fileLayout.positions) {
      console.log('✅ Layout FOUND for file:', fileId, fileLayout.positions);
      return fileLayout.positions;
    } else {
      console.log('❌ No layout found for file:', fileId);
      console.log('❌ Available file IDs:', Object.keys(existingLayouts));
    }
  } catch (error) {
    console.warn('❌ Failed to load layout:', error);
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
    
    console.log('Layout cleared for file:', fileId);
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
  console.log('🆔 Using file path as ID:', normalizedPath);
  return normalizedPath;
};

/**
 * Extract table positions from React Flow nodes
 * @param {Array} nodes - React Flow nodes array
 * @returns {Object} Object mapping table IDs to positions
 */
export const extractTablePositions = (nodes) => {
  const positions = {};
  
  console.log('📊 Extracting positions from', nodes.length, 'nodes');
  
  nodes.forEach(node => {
    if (node.type === 'tableHeader' && node.position) {
      positions[node.id] = {
        x: node.position.x,
        y: node.position.y
      };
      console.log('📊 Extracted position for', node.id, ':', node.position);
    }
  });
  
  console.log('📊 Total positions extracted:', Object.keys(positions).length);
  return positions;
};

/**
 * Clean up obsolete table positions that no longer exist in current schema
 * @param {Object} savedPositions - Previously saved positions
 * @param {Array} currentTableIds - Array of current table IDs
 * @returns {Object} Cleaned positions object
 */
export const cleanupObsoletePositions = (savedPositions, currentTableIds) => {
  const cleanedPositions = {};
  const currentIds = new Set(currentTableIds);
  
  Object.keys(savedPositions).forEach(tableId => {
    if (currentIds.has(tableId)) {
      cleanedPositions[tableId] = savedPositions[tableId];
    }
  });
  
  return cleanedPositions;
};