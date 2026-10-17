// Base identity of a whole Ref: schema ALWAYS present (default 'public'),
// COMPLETE ordered fieldNames arrays for both endpoints, invariant across
// single->multi-schema and Ref reordering. `occurrence` (>0) disambiguates
// byte-identical duplicate Refs as a documented best-effort policy.
export const refBaseKey = ({ srcSchema, srcTable, srcFields, tgtSchema, tgtTable, tgtFields, occurrence = 0 }) => {
  const s = `${srcSchema || 'public'}.${srcTable}(${(srcFields || []).join(',')})`;
  const t = `${tgtSchema || 'public'}.${tgtTable}(${(tgtFields || []).join(',')})`;
  const base = `${s}->${t}`;
  return occurrence > 0 ? `${base}#${occurrence}` : base;
};

// Per-rendered-line key: base + the specific field pair for this line.
export const refKey = (base, srcField, tgtField) => `${base}::${srcField}->${tgtField}`;

// Deterministic occurrence counter, called ONCE per Ref (not per field pair).
export const makeOccurrenceCounter = () => {
  const seen = new Map();
  return (bareBase) => { const n = seen.get(bareBase) || 0; seen.set(bareBase, n + 1); return n; };
};

// Current keys present in a freshly transformed edge set (for cleanup).
export const currentRefKeysFromEdges = (edges) =>
  edges.map((e) => e && e.data && e.data.refKey).filter(Boolean);
