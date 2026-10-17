// Pure parse+validate for the sidecar; require()-able in plain Node unit tests.
function parseLayoutFile(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.version === 1 && parsed.positions && typeof parsed.positions === 'object') {
      return { positions: parsed.positions, edges: (parsed.edges && typeof parsed.edges === 'object') ? parsed.edges : {} };
    }
  } catch { /* fall through */ }
  return null;
}
// Resolve the routes to persist on a saveLayout message: an omitted edges field
// (undefined) means "unchanged" and keeps the currently pending routes; an
// explicit value (including {}) replaces them. This is what prevents a plain
// positions-only save from wiping saved routes.
function resolvePendingEdges(pending, incoming) {
  return incoming !== undefined ? incoming : pending;
}

module.exports = { parseLayoutFile, resolvePendingEdges };
