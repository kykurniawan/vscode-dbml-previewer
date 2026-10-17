/**
 * Which side of a table an edge endpoint should attach to.
 *
 * Two callers:
 *  - dragging an endpoint handle across a table picks the side under the pointer;
 *  - committing a waypoint route re-reads the route and flips an endpoint when
 *    the user has clearly routed the line round to the other side.
 *
 * Pure and geometry-only, so both paths behave identically and can be tested
 * without a DOM.
 */

// How far past a table's edge a point must sit before it counts as "clearly on
// that side". Below this the intent is ambiguous and the current side stands.
export const SIDE_MARGIN = 28;

/**
 * Side of a table a given x coordinate clearly belongs to.
 * @param {number} x - x in flow coordinates
 * @param {{x:number,width:number}} table - table left edge and width
 * @param {number} [margin]
 * @returns {'left'|'right'|null} null when the point is not clearly either side
 */
export const sideForPoint = (x, table, margin = SIDE_MARGIN) => {
  if (!table || !Number.isFinite(x) || !Number.isFinite(table.x)) return null;
  const width = Number.isFinite(table.width) ? table.width : 0;
  const left = table.x;
  const right = table.x + width;
  if (x < left - margin) return 'left';
  if (x > right + margin) return 'right';
  return null;
};

/**
 * Side a point sits on relative to a table's horizontal centre. Unlike
 * sideForPoint this always commits to an answer, which is what an endpoint drag
 * needs: wherever the pointer is released, one of the two sides must win.
 * @param {number} x
 * @param {{x:number,width:number}} table
 * @returns {'left'|'right'|null} null only when the table is unknown
 */
export const nearestSide = (x, table) => {
  if (!table || !Number.isFinite(x) || !Number.isFinite(table.x)) return null;
  const width = Number.isFinite(table.width) ? table.width : 0;
  return x < table.x + width / 2 ? 'left' : 'right';
};

/**
 * Sides a saved route argues for, judged from the waypoints nearest each end.
 * Returns null for an endpoint whose route does not clearly favour a side, so
 * the caller leaves that endpoint alone.
 *
 * @param {Object} params
 * @param {Array<{x:number,y:number}>} params.checkPoints - ordered source -> target
 * @param {{x:number,width:number}} [params.sourceTable]
 * @param {{x:number,width:number}} [params.targetTable]
 * @param {number} [params.margin]
 * @returns {{sourceSide: 'left'|'right'|null, targetSide: 'left'|'right'|null}}
 */
export const sidesFavouredByRoute = ({ checkPoints, sourceTable, targetTable, margin = SIDE_MARGIN }) => {
  const pts = Array.isArray(checkPoints)
    ? checkPoints.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))
    : [];
  if (pts.length === 0) return { sourceSide: null, targetSide: null };

  // The waypoint closest to each end is the one that expresses where the user
  // wants the line to leave or arrive.
  return {
    sourceSide: sideForPoint(pts[0].x, sourceTable, margin),
    targetSide: sideForPoint(pts[pts.length - 1].x, targetTable, margin),
  };
};
