// Segment-based orthogonal edge routing.
//
// A route is a chain of alternating horizontal / vertical segments running from
// the source connection point to the target connection point. THE PRIMITIVE IS
// THE SEGMENT, not the point: each interior segment is defined by a single
// number, its perpendicular offset (a vertical segment by its x, a horizontal
// one by its y). Points exist only as the corners where two segments meet.
//
// Because a route is always a strict alternation of axis-aligned segments, it
// can never double back over itself or carry a sub-pixel jog. Those states are
// structurally impossible, so there is no repair / normalisation layer — only a
// merge that collapses a redundant jog when a segment slides onto a neighbour.
//
// Storage stays the interior vertex list ("checkPoints"); the two endpoints are
// supplied by the tables. Midpoints and vertices are equivalent given the
// alternating rule, and a vertex list avoids reconstruction ambiguity, so the
// existing sidecar and content-derived refKey keep working unchanged.
//
// Pure geometry only: no React, no DOM.

// Two coordinates within this many px lie on the same axis line.
export const AXIS_EPS = 0.5;

// Rows within this many px count as the SAME line, so a default route between
// them collapses to a single straight segment rather than a zero-height jog
// (decision D8: differences up to and including 1px collapse).
export const SAME_LINE_TOL = 1;

// When sliding a segment brings it within this many px of the parallel segment
// two along, the short connector between them collapses and the two segments
// merge into one. A single named constant so the tolerance is tuned in one
// place (decision D4).
export const MERGE_TOL = 8;

// Minimum length of the fixed segment leaving each endpoint, so the default
// route always steps clear of the table before it turns.
export const STUB = 20;

const isFinitePoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);

// True when a segment is (near) vertical: y varies more than x. A route built
// by this module has one coordinate exactly shared, so the comparison is exact
// there; the tolerance only matters for legacy points on their way in.
const segIsVertical = (a, b) => Math.abs(a.x - b.x) <= Math.abs(a.y - b.y);

/**
 * The default interior corners of an automatic route: horizontal out of the
 * source, one vertical crossbar midway between the two CONNECTION POINTS in x,
 * horizontal into the target (an "S"/"Z", decision D7). When the two ends sit on
 * the same row (within SAME_LINE_TOL) the crossbar vanishes and the route is a
 * single straight horizontal segment (decision D8).
 * @returns {Array<{x:number,y:number}>}
 */
export const defaultInteriorPoints = ({ source, target }) => {
  if (Math.abs(source.y - target.y) <= SAME_LINE_TOL) return [];
  const midX = (source.x + target.x) / 2;
  return [{ x: midX, y: source.y }, { x: midX, y: target.y }];
};

/**
 * The full ordered vertex list of a route, endpoints included:
 * [source, ...interior, target]. Given clean interior corners (our own saved
 * routes, or the default) this is a strict axis-aligned alternation; legacy
 * corners are cleaned by toSegmentModel first so the same holds.
 * @returns {Array<{x:number,y:number}>}
 */
export const buildRouteVertices = (params) => {
  const { source, target } = params;
  const cps = Array.isArray(params.checkPoints) ? params.checkPoints.filter(isFinitePoint) : [];
  const interior = cps.length ? toSegmentModel(cps, params) : defaultInteriorPoints(params);
  return [{ x: source.x, y: source.y }, ...interior, { x: target.x, y: target.y }];
};

/** The interior corners of a full vertex list — what gets persisted. */
export const interiorOf = (vertices) => vertices.slice(1, -1).map((p) => ({ x: p.x, y: p.y }));

/**
 * Derive the logical segments of a full vertex list. Segment i joins
 * vertices[i] and vertices[i+1]. The first and last segments are PINNED: their
 * perpendicular offset is the endpoint's row, fixed by the table, so they can
 * only change length, never slide (decision D2). Every other segment is movable
 * (unless degenerate / zero length). A movable segment carries the axis it
 * slides on and the midpoint where its grab handle sits.
 * @returns {Array<{index:number,a:object,b:object,orientation:'v'|'h',axis:'x'|'y',offset:number,mid:{x:number,y:number},length:number,pinned:boolean,movable:boolean}>}
 */
export const deriveSegments = (vertices) => {
  const segs = [];
  const n = vertices.length;
  for (let i = 0; i < n - 1; i++) {
    const a = vertices[i];
    const b = vertices[i + 1];
    const vertical = segIsVertical(a, b);
    const pinned = i === 0 || i === n - 2;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({
      index: i,
      a: { x: a.x, y: a.y },
      b: { x: b.x, y: b.y },
      orientation: vertical ? 'v' : 'h',
      axis: vertical ? 'x' : 'y',
      offset: vertical ? a.x : a.y,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      length,
      pinned,
      movable: !pinned && length > AXIS_EPS,
    });
  }
  return segs;
};

/**
 * Slide one interior segment perpendicular to itself. ONLY the offset axis
 * changes — movement is one-axis, never free 2D — and the segment keeps its
 * length while the two adjacent (perpendicular) segments simply grow or shrink.
 *
 * The move is applied as a DELTA from where the pointer grabbed, not by snapping
 * the segment to the absolute cursor: newOffset = originalOffset + (cursorAxis -
 * grabAxis). So grabbing the handle a few px off the segment (or grabbing the
 * line) does not teleport the segment to the cursor — it moves by the distance
 * the pointer has travelled. `grab` is the flow-space point where the drag began
 * (pure — no module state). When omitted it defaults to the segment's own
 * offset, which reduces the formula to the absolute cursor (the prior behaviour).
 *
 * Returns a new full vertex list; no merge is applied here so the segment's
 * index stays stable during a live drag (merge runs on commit). The pinned first
 * AND last segments are rejected, not only filtered in the UI, so the primitive
 * can never move an endpoint (decision D2).
 */
export const slideSegment = (vertices, index, cursor, grab) => {
  const v = vertices.map((p) => ({ ...p }));
  if (index <= 0 || index >= v.length - 2) return v; // never a pinned end segment
  const g = grab || { x: v[index].x, y: v[index].y };
  const vertical = segIsVertical(v[index], v[index + 1]);
  if (vertical) {
    const nx = v[index].x + (cursor.x - g.x);
    v[index].x = nx;
    v[index + 1].x = nx;
  } else {
    const ny = v[index].y + (cursor.y - g.y);
    v[index].y = ny;
    v[index + 1].y = ny;
  }
  return v;
};

const clampBetween = (value, lo, hi) => Math.max(Math.min(lo, hi), Math.min(Math.max(lo, hi), value));

/**
 * Split a segment by dragging its soft point (decision D1). Two vertices are
 * inserted so the one segment becomes same-axis -> perpendicular -> same-axis.
 * The far end of the route stays connected — only the split segment's own free
 * corner shifts onto the new offset — so a split is a local change.
 *
 * Returns { vertices, index } where `index` names the sub-segment the gesture
 * must keep holding: the one PARALLEL to the segment that was grabbed (same
 * orientation), which is what continues to follow the pointer as the drag goes
 * on. Returning the perpendicular connector instead would leave the drag reading
 * the wrong axis, so a continued drag in the grab direction would stop tracking.
 * Pure.
 */
// Split a segment in half and hand back the half the user grabbed.
//
// The cut is ALWAYS at the segment's midpoint: the soft points at 25% and 75%
// are grab handles that say WHICH HALF to move, never where to cut. `half` is
// 'first' (the A-side) or 'second' (the B-side).
//
// Splitting inserts two vertices, so one segment becomes three: the untouched
// half, a perpendicular connector, and the grabbed half. The connector starts
// with zero length and gains it as the caller slides the grabbed half; if the
// user releases without moving, mergeRoute collapses it away again.
//
// A pinned end segment keeps its endpoint fixed, so only the half away from that
// endpoint may be grabbed; asking for the pinned half is refused unchanged.
export const splitSegment = (vertices, index, half = 'second') => {
  const v = vertices.map((p) => ({ ...p }));
  const n = v.length;
  if (index < 0 || index >= n - 1) return { vertices: v, index };

  const A = v[index];
  const B = v[index + 1];
  const firstPinned = index === 0;
  const lastPinned = index === n - 2;
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };

  // A run pinned at BOTH ends (an endpoint-to-endpoint segment) cannot move
  // either half without dragging a connection point off its column row. Cut a
  // notch instead: four inserted vertices leave a central movable segment,
  // centred on the midpoint so the bend still appears where the user aimed.
  if (firstPinned && lastPinned) {
    const q1 = { x: A.x + (B.x - A.x) * 0.25, y: A.y + (B.y - A.y) * 0.25 };
    const q3 = { x: A.x + (B.x - A.x) * 0.75, y: A.y + (B.y - A.y) * 0.75 };
    v.splice(index + 1, 0,
      { x: q1.x, y: q1.y }, { x: q1.x, y: q1.y },
      { x: q3.x, y: q3.y }, { x: q3.x, y: q3.y });
    return { vertices: v, index: index + 2 };
  }

  // The endpoint-side half of a pinned segment cannot move: refuse rather than
  // silently dragging the connection point off its column row.
  if (firstPinned && half === 'first') return { vertices: v, index };
  if (lastPinned && half === 'second') return { vertices: v, index };

  // Insert the midpoint twice. The connector between the copies is zero-length
  // until the caller slides the grabbed half off the original axis; if the user
  // releases without moving, mergeRoute collapses it away again.
  v.splice(index + 1, 0, { x: mid.x, y: mid.y }, { x: mid.x, y: mid.y });
  return { vertices: v, index: half === 'second' ? index + 2 : index };
};

// Which halves of a segment may be grabbed to split it. A pinned end segment
// offers only the half away from its endpoint.
export const splittableHalves = (vertices, index) => {
  const n = vertices.length;
  if (index < 0 || index >= n - 1) return [];
  if (index === 0) return ['second'];
  if (index === n - 2) return ['first'];
  return ['first', 'second'];
};

const dedupe = (v, eps) => {
  const out = [];
  for (const p of v) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) <= eps && Math.abs(last.y - p.y) <= eps) continue;
    out.push({ x: p.x, y: p.y });
  }
  return out;
};

// Drop a middle vertex whose two adjacent segments share an axis (a collinear
// point on a straight run). Endpoints are never dropped.
const dropCollinear = (v, eps) => {
  if (v.length < 3) return v.map((p) => ({ x: p.x, y: p.y }));
  const out = [{ x: v[0].x, y: v[0].y }];
  for (let i = 1; i < v.length - 1; i++) {
    const A = out[out.length - 1];
    const P = v[i];
    const C = v[i + 1];
    const sameX = Math.abs(A.x - P.x) <= eps && Math.abs(P.x - C.x) <= eps;
    const sameY = Math.abs(A.y - P.y) <= eps && Math.abs(P.y - C.y) <= eps;
    if (sameX || sameY) continue;
    out.push({ x: P.x, y: P.y });
  }
  out.push({ x: v[v.length - 1].x, y: v[v.length - 1].y });
  return out;
};

// Collapse one short connector between two parallel segments. For four
// consecutive vertices A,B,C,D where A->B and C->D are parallel and the
// connector B->C is shorter than tol, align the two onto one axis and drop B
// and C, merging A->B and C->D into a single A->D segment.
//
// Merging is ENDPOINT-AWARE (decision D2 / C2): a connection point (the first
// or last vertex) is immutable, so when D is the endpoint we slide the interior
// A side onto D's offset — never D toward the interior — and symmetrically when
// A is the endpoint we slide D. If both A and D are endpoints the jog cannot be
// collapsed without moving one, so it is left intact. Returns the collapsed
// list, or null when there is nothing to collapse.
const collapseOnce = (v, tol) => {
  const lastIdx = v.length - 1;
  for (let j = 1; j <= v.length - 3; j++) {
    const A = v[j - 1];
    const B = v[j];
    const C = v[j + 1];
    const D = v[j + 2];
    const abVertical = segIsVertical(A, B);
    const cdVertical = segIsVertical(C, D);
    if (abVertical !== cdVertical) continue; // A->B and C->D not parallel
    const connectorLen = Math.hypot(C.x - B.x, C.y - B.y);
    if (connectorLen > tol) continue;
    const aPinned = j - 1 === 0;
    const dPinned = j + 2 === lastIdx;
    if (aPinned && dPinned) continue; // cannot merge without moving an endpoint
    const out = v.map((p) => ({ x: p.x, y: p.y }));
    if (dPinned) {
      // D is a fixed endpoint: bring the interior A onto D's axis.
      if (abVertical) out[j - 1].x = D.x; else out[j - 1].y = D.y;
    } else {
      // Bring D onto A/B's axis; A stays put (endpoint or interior alike).
      if (abVertical) out[j + 2].x = B.x; else out[j + 2].y = B.y;
    }
    out.splice(j, 2); // remove B and C
    return out;
  }
  return null;
};

/**
 * Merge redundant jogs and drop collinear / coincident corners until stable
 * (decision D4). Bounded and idempotent, so a saved route re-loaded and
 * re-merged never drifts. Returns a new full vertex list.
 */
export const mergeRoute = (vertices, tol = MERGE_TOL) => {
  let cur = dropCollinear(dedupe(vertices, AXIS_EPS), AXIS_EPS);
  for (let guard = 0; guard < 64; guard++) {
    const collapsed = collapseOnce(cur, tol);
    if (!collapsed) break;
    cur = dropCollinear(dedupe(collapsed, AXIS_EPS), AXIS_EPS);
  }
  return cur;
};

// Turn an arbitrary vertex list into an axis-aligned alternation: for each
// diagonal gap insert one elbow. Endpoints sit on a table's left/right side, so
// the line must LEAVE the source and ENTER the target horizontally (decisions
// D2/C3). The first (and every middle) diagonal takes a horizontal-first elbow
// so the source leg is horizontal; the LAST diagonal takes the complementary
// vertical-first elbow so the target leg is horizontal. Snapping and merging
// then tidy the result.
const orthogonalize = (v, eps) => {
  const out = [{ x: v[0].x, y: v[0].y }];
  for (let i = 1; i < v.length; i++) {
    const A = out[out.length - 1];
    const B = v[i];
    const dx = Math.abs(B.x - A.x);
    const dy = Math.abs(B.y - A.y);
    if (dx <= eps || dy <= eps) {
      out.push({ x: B.x, y: B.y });
    } else if (i === v.length - 1) {
      out.push({ x: A.x, y: B.y }); // vertical-first: last leg enters horizontally
      out.push({ x: B.x, y: B.y });
    } else {
      out.push({ x: B.x, y: A.y }); // horizontal-first: leg leaves horizontally
      out.push({ x: B.x, y: B.y });
    }
  }
  return out;
};

// A leg is horizontal when its endpoints share a row and differ in x.
const legHorizontal = (a, b) => Math.abs(a.y - b.y) <= AXIS_EPS && Math.abs(a.x - b.x) > AXIS_EPS;

// Reroute a vertical FIRST leg into a horizontal one by moving the opening bend
// onto the next corner's column: source -> (v2.x, source.y) -> v2, dropping the
// old first corner. The source stays fixed.
const kneeFirst = (v) => (v.length < 3
  ? v
  : [{ x: v[0].x, y: v[0].y }, { x: v[2].x, y: v[0].y }, ...v.slice(2).map((p) => ({ x: p.x, y: p.y }))]);

// Mirror for a vertical LAST leg: ... -> v[n-3] -> (v[n-3].x, target.y) -> target.
const kneeLast = (v) => {
  const n = v.length;
  if (n < 3) return v;
  return [...v.slice(0, n - 2).map((p) => ({ x: p.x, y: p.y })),
    { x: v[n - 3].x, y: v[n - 1].y }, { x: v[n - 1].x, y: v[n - 1].y }];
};

/**
 * Convert a saved interior vertex list into clean segment-model interior
 * corners. Idempotent: a list already in the model (our own routes, or the
 * default) passes through unchanged. A legacy free-point route — near-parallel
 * jogs, sub-pixel diagonals, redundant vertices — is snapped onto axes and
 * reduced so it renders as a clean orthogonal route (section 5). Rendering
 * calls this every frame; it never persists, so opening a file produces no
 * diff — the converted form is written back only when the edge is next edited.
 *
 * The first and last legs MUST be horizontal: an endpoint attaches to a table's
 * left/right side, so its leg leaves/enters horizontally (D2). A legacy gap that
 * is already vertical is repaired here (a knee reroutes it); if the endpoints
 * cannot be made horizontal (a degenerate one-column corridor), the route falls
 * back to the automatic default rather than render a vertical endpoint leg.
 * @returns {Array<{x:number,y:number}>} interior corners (endpoints excluded)
 */
export function toSegmentModel(checkPoints, { source, target }) {
  const cps = Array.isArray(checkPoints) ? checkPoints.filter(isFinitePoint) : [];
  if (cps.length === 0) return [];
  const full = [{ x: source.x, y: source.y }, ...cps.map((p) => ({ x: p.x, y: p.y })), { x: target.x, y: target.y }];
  let out = mergeRoute(orthogonalize(full, AXIS_EPS), MERGE_TOL);

  const firstBad = (v) => v.length >= 2 && !legHorizontal(v[0], v[1]);
  const lastBad = (v) => v.length >= 2 && !legHorizontal(v[v.length - 2], v[v.length - 1]);
  for (let guard = 0; guard < 4 && (firstBad(out) || lastBad(out)); guard++) {
    if (firstBad(out)) out = mergeRoute(kneeFirst(out), MERGE_TOL);
    if (lastBad(out)) out = mergeRoute(kneeLast(out), MERGE_TOL);
  }
  if (firstBad(out) || lastBad(out)) {
    out = [{ x: source.x, y: source.y }, ...defaultInteriorPoints({ source, target }), { x: target.x, y: target.y }];
  }
  return interiorOf(out);
}

/**
 * Draw a rounded orthogonal polyline through the given vertices. Each interior
 * corner is rounded by up to `radius`, clamped to half the shorter adjacent
 * segment so a corner never overruns a segment. Returns { d } — the SVG path.
 */
export const buildRoundedPath = (vertices, radius = 8) => {
  const pts = vertices;
  if (pts.length === 0) return { d: '' };
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const A = pts[i - 1];
    const P = pts[i];
    const C = pts[i + 1];
    const dAP = Math.hypot(P.x - A.x, P.y - A.y);
    const dPC = Math.hypot(C.x - P.x, C.y - P.y);
    const r = Math.min(radius, dAP / 2, dPC / 2);
    if (r < 0.5) {
      d += ` L ${P.x},${P.y}`;
    } else {
      const beforeX = P.x - ((P.x - A.x) / (dAP || 1)) * r;
      const beforeY = P.y - ((P.y - A.y) / (dAP || 1)) * r;
      const afterX = P.x + ((C.x - P.x) / (dPC || 1)) * r;
      const afterY = P.y + ((C.y - P.y) / (dPC || 1)) * r;
      d += ` L ${beforeX},${beforeY} Q ${P.x},${P.y} ${afterX},${afterY}`;
    }
  }
  d += ` L ${pts[pts.length - 1].x},${pts[pts.length - 1].y}`;
  return { d };
};

/**
 * Reset an edge to its fully automatic route (decisions D5): the cleared data
 * patch that drops every segment corner AND any left/right endpoint-side
 * override. With this applied, buildRouteVertices falls back to the default
 * route and chooseEffectiveSides picks the sides automatically. The single
 * source of truth for what "reset" means, used by the per-edge reset control.
 * @returns {{sourceSide: undefined, targetSide: undefined, checkPoints: undefined}}
 */
export const resetRoute = () => ({ sourceSide: undefined, targetSide: undefined, checkPoints: undefined });
