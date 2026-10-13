import React, { useRef, useState, useEffect, useMemo, useLayoutEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  getStraightPath,
  useReactFlow,
  useStore,
} from '@xyflow/react';
import {
  buildRouteVertices,
  buildRoundedPath,
  deriveSegments,
  slideSegment,
  splitSegment,
  splittableHalves,
  mergeRoute,
  interiorOf,
} from '../utils/edgeSegments';

// Corner radius used when the orthogonal router draws the path: sharp corners
// for 'straight', rounded otherwise.
const cornerRadiusFor = (pathStyle) => (pathStyle === 'straight' ? 0 : 8);

// diagram.edgeType values that are a shape of their own rather than a corner
// style, and the stock path function each one means.
const STOCK_PATHS = {
  bezier: getBezierPath,
  straight: getStraightPath,
};

const positionForSide = (side) => (side === 'left' ? Position.Left : Position.Right);

// True when two interior corner lists are point-for-point equal.
const sameCheckList = (a, b) => {
  const x = a || [];
  const y = b || [];
  if (x.length !== y.length) return false;
  return x.every((p, i) => p.x === y[i].x && p.y === y[i].y);
};

// How far along the path from the endpoint the CENTRE of a symbol box sits.
// The box is 20x20 and centred on that point, so its outward half reaches 10px
// and the crow's foot, which opens outward to x=17, reaches 7px — 8px with the
// 2px round cap. Insetting by exactly that reach puts the open end of the foot
// flush against the table border, which is where the notation belongs: at the
// entity it qualifies. Anything larger leaves the symbol floating in open space
// short of the table. Safely inside STUB, so this stretch of path is straight
// and the symbol's rotation matches the line it sits on.
const SYMBOL_INSET = 8;
// Optional cardinality text sits further in than the symbols, so the two never
// collide when a user turns the labels on.
const LABEL_INSET = 52;
// Pointer travel (screen px) below which a press-release counts as a click, not
// a drag. A zero-movement press never mutates the route.
const DRAG_SLOP = 4;
// How near the pointer must be (flow px, perpendicular to a segment) before that
// segment's single soft split point is offered.
const SOFT_SHOW_RADIUS = 40;   // screen px
// Within this distance (flow px) of a segment's hard point the intent is read as
// "move this whole segment", so no split handle is offered there. Past it, on
// either half, the intent is "split and move that half".
const HARD_POINT_RADIUS = 18;  // screen px
// How far off the line the reset control sits, perpendicular to the path at its
// midpoint. Far enough not to collide with the segment's hard point, close
// enough to read as belonging to this edge.
const RESET_OFFSET = 30;       // screen px

// Relationship symbols, drawn in a 20x20 box whose +x axis points OUTWARD along
// the path (towards the nearer endpoint). "many" is a crow's foot opening
// outward; "one" is a single bar across the line.
const SYMBOL_PATHS = {
  many: ['M4,10 L17,3', 'M4,10 L17,10', 'M4,10 L17,17'],
  one: ['M10,3 L10,17'],
};

const RelationshipSymbol = ({ kind, x, y, angle, color }) => (
  <div
    className="nodrag nopan dbml-edge-symbol"
    style={{
      position: 'absolute',
      transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle}deg)`,
      pointerEvents: 'none',
      lineHeight: 0,
      zIndex: 1002,
    }}
  >
    <svg width="20" height="20" viewBox="0 0 20 20">
      {SYMBOL_PATHS[kind].map((d, i) => (
        <path key={i} d={d} stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      ))}
    </svg>
  </div>
);

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}) => {
  const { screenToFlowPosition } = useReactFlow();
  // Current zoom, so the proximity radii and the reset offset stay the same size
  // on screen at any zoom level. In flow units they would shrink to nothing on a
  // zoomed-out diagram, piling the controls on top of each other.
  const zoom = useStore((st) => st.transform[2]) || 1;

  // Read synchronously during render. The isDragging *state* is declared below
  // the geometry effect, so it cannot be named here without a temporal-dead-zone
  // crash — a ref carries the flag up instead. While a segment is being dragged
  // we draw from the raw working corners; when idle we draw the clean route.
  const isDraggingRef = useRef(false);

  // Effective endpoint sides, needed to draw the connector and to reproduce the
  // stub direction for the default route.
  const effSourceSide = data?.sourceSide ?? (sourcePosition === Position.Left ? 'left' : 'right');
  const effTargetSide = data?.targetSide ?? (targetPosition === Position.Left ? 'left' : 'right');

  // Hand-edited corners only mean something to the orthogonal router, so an edge
  // that has them is always drawn by it. An edge that has none is free to take
  // the shape diagram.edgeType asks for: 'bezier' stays a real curve and
  // 'straight' a real direct line, as that setting has always promised, while
  // 'smoothstep' — the default — is the orthogonal route this feature edits.
  const hasCustomRoute = Array.isArray(data?.checkPoints) && data.checkPoints.length > 0;
  const stockPathFn = hasCustomRoute ? null : STOCK_PATHS[data?.pathStyle];

  // Editable mode is entered only by clicking the edge (data.isLatched) while
  // the routing feature is on (data.isEditable). Handles and the reset control
  // appear ONLY in this mode; hover merely highlights the line. They are also
  // withheld from a stock-path edge: every handle is positioned on the
  // orthogonal vertex list, which a curve or a diagonal does not follow, so the
  // grips would float off the line the user can see.
  const editing = !!data?.isEditable && !!data?.isLatched && !stockPathFn;

  const geom = {
    source: { x: sourceX, y: sourceY },
    target: { x: targetX, y: targetY },
    sourceSide: effSourceSide,
    targetSide: effTargetSide,
  };
  let vertices;
  // During a drag the live working corners are drawn verbatim (no merge /
  // conversion) so the grabbed segment tracks the cursor and its index stays
  // stable. Idle, the route is built through the segment model — the default
  // route when empty, a cleaned route otherwise — so a handle always sits on
  // the drawn line and a legacy route renders clean without being persisted.
  if (isDraggingRef.current && Array.isArray(data?.checkPoints)) {
    vertices = [{ x: sourceX, y: sourceY }, ...data.checkPoints.map((p) => ({ x: p.x, y: p.y })), { x: targetX, y: targetY }];
  } else {
    vertices = buildRouteVertices({ ...geom, checkPoints: data?.checkPoints });
  }
  let edgePath;
  if (stockPathFn) {
    [edgePath] = stockPathFn({
      sourceX,
      sourceY,
      sourcePosition: positionForSide(effSourceSide),
      targetX,
      targetY,
      targetPosition: positionForSide(effTargetSide),
    });
  } else {
    edgePath = buildRoundedPath(vertices, cornerRadiusFor(data?.pathStyle)).d;
  }

  const segments = useMemo(() => deriveSegments(vertices), [edgePath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Everything positional for the symbols/labels is measured off the real
  // rendered <path>, by id, so it is correct for any shape.
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const [geometry, setGeometry] = useState(null);
  useLayoutEffect(() => {
    const el = document.getElementById(id);
    if (!el || typeof el.getTotalLength !== 'function') { setGeometry(null); return; }
    const L = el.getTotalLength();
    if (!Number.isFinite(L) || L <= 0) { setGeometry(null); return; }

    const at = (len) => el.getPointAtLength(Math.max(0, Math.min(L, len)));
    const inset = Math.min(SYMBOL_INSET, L / 2);
    const angleBetween = (from, to) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
    const startAnchor = at(inset);
    const endAnchor = at(L - inset);

    setGeometry({
      start: { x: startAnchor.x, y: startAnchor.y, angle: angleBetween(startAnchor, at(0)) },
      end: { x: endAnchor.x, y: endAnchor.y, angle: angleBetween(endAnchor, at(L)) },
      // Midpoint of the drawn path plus its perpendicular normal, used to park
      // the reset control beside the middle of the line where it is actually
      // noticed — at an endpoint it sits against the table and gets missed.
      reset: (() => {
        const m = at(L / 2);
        const m2 = at(Math.min(L, L / 2 + 6));
        const ang = Math.atan2(m2.y - m.y, m2.x - m.x);
        const off = RESET_OFFSET / (zoomRef.current || 1);
        return { x: m.x + Math.sin(ang) * off, y: m.y - Math.cos(ang) * off };
      })(),
      labels: (() => {
        const li = Math.min(LABEL_INSET, L * 0.35);
        const a = at(li), b = at(L - li);
        return { start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y } };
      })(),
    });
  }, [edgePath, sourceX, sourceY, targetX, targetY, zoom]);

  const strokeColor = data?.refColor || style?.stroke;

  const [isDragging, setIsDragging] = useState(false);
  // Pointer position in flow coordinates while editing, used to place the one
  // soft split point on the half-segment nearest the pointer.
  const [pointer, setPointer] = useState(null);

  const dragRef = useRef({ active: false });
  const cleanupRef = useRef(null);
  useEffect(() => () => { if (cleanupRef.current) cleanupRef.current(); }, []);

  // Track the pointer only while editing and idle, so the soft point can follow
  // the hovered half-segment. Cleared the moment editing ends.
  useEffect(() => {
    if (!editing) { setPointer(null); return undefined; }
    const onMove = (ev) => {
      if (dragRef.current.active) return;
      setPointer(screenToFlowPosition({ x: ev.clientX, y: ev.clientY }));
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [editing, screenToFlowPosition]);

  // The single soft point: on the segment whose line is nearest the pointer,
  // placed at the midpoint of the half the pointer is over (decision: at most
  // ONE soft point, on the half-segment nearest the pointer). Shown only when
  // the pointer is close to that segment.
  // Intent by proximity. Near a segment's hard point the user means "move this
  // whole segment", so no split handle is offered. Further along either half,
  // they mean "split here and move that half": one soft point appears at the
  // middle of the half nearest the pointer. It is only a grab handle — the cut
  // itself always happens at the segment's midpoint.
  const softPoint = useMemo(() => {
    if (!editing || isDragging || !pointer || segments.length === 0) return null;
    let best = null;
    segments.forEach((seg) => {
      const allowed = splittableHalves(vertices, seg.index);
      if (allowed.length === 0) return;
      const vx = seg.b.x - seg.a.x;
      const vy = seg.b.y - seg.a.y;
      const len2 = vx * vx + vy * vy || 1;
      let t = ((pointer.x - seg.a.x) * vx + (pointer.y - seg.a.y) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const dist = Math.hypot(pointer.x - (seg.a.x + t * vx), pointer.y - (seg.a.y + t * vy));
      // Close to the hard point at the middle => the user is reaching for the
      // move handle, not a split.
      if (Math.hypot(pointer.x - seg.mid.x, pointer.y - seg.mid.y) <= HARD_POINT_RADIUS / zoom) return;
      const half = t < 0.5 ? 'first' : 'second';
      if (!allowed.includes(half)) return;
      const at = half === 'first' ? 0.25 : 0.75; // grab handle sits mid-half
      if (!best || dist < best.dist) {
        best = { x: seg.a.x + at * vx, y: seg.a.y + at * vy, dist, segIndex: seg.index, half };
      }
    });
    return best && best.dist <= SOFT_SHOW_RADIUS / zoom ? best : null;
  }, [editing, isDragging, pointer, segments, vertices, zoom]);

  // Persist the segment-model conversion when an endpoint side flips — flipping
  // an endpoint is one of the edit operations, so like a move or split it writes
  // the converted vertices back. A side change moves an endpoint, so the saved
  // (possibly legacy free-point) route is re-derived against the new geometry and
  // committed, keeping saved == drawn. Guarded so it never fires on mount (open)
  // or on merely entering editable mode — only on an actual side change.
  const sideSigRef = useRef(null);
  useEffect(() => {
    const sig = `${effSourceSide}|${effTargetSide}`;
    if (sideSigRef.current === null) { sideSigRef.current = sig; return; }
    if (sideSigRef.current === sig) return;
    sideSigRef.current = sig;
    if (isDraggingRef.current) return;
    const saved = data?.checkPoints;
    if (!Array.isArray(saved) || saved.length === 0) return;
    const converted = interiorOf(buildRouteVertices({
      source: { x: sourceX, y: sourceY },
      target: { x: targetX, y: targetY },
      sourceSide: effSourceSide,
      targetSide: effTargetSide,
      checkPoints: saved,
    }));
    if (!sameCheckList(converted, saved)) data?.onRouteConvert?.(data.refKey, converted);
  }, [effSourceSide, effTargetSide]); // eslint-disable-line react-hooks/exhaustive-deps

  // Commit the final route as the merged interior corner list. Merge collapses
  // any jog a slide brought into alignment (D4); the same corners are what the
  // idle line will draw, so saved can never drift from drawn.
  const commit = (workingVertices) => {
    const merged = mergeRoute(workingVertices);
    data?.onRouteCommit?.(data.refKey, interiorOf(merged));
  };

  // Shared pointer-driven gesture for sliding an interior segment or dragging a
  // soft point into a split. Driven off window events (not pointer capture) so a
  // re-render that replaces the handle element cannot strand the drag.
  const beginSegmentGesture = (e, segIndex, kind, half) => {
    e.stopPropagation();
    e.preventDefault();
    const baseVertices = vertices.map((p) => ({ x: p.x, y: p.y }));
    dragRef.current = {
      active: true,
      kind, half,
      segIndex,
      baseVertices,
      // The flow-space point where the drag began. Slides apply as a delta from
      // here, so grabbing the handle a few px off the segment does not teleport
      // it to the cursor.
      grab: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
    };
    isDraggingRef.current = true;
    setIsDragging(true);

    const move = (ev) => {
      const st = dragRef.current;
      if (!st.active) return;
      const cursor = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      if (!st.moved) {
        if (Math.hypot(ev.clientX - st.startX, ev.clientY - st.startY) < DRAG_SLOP) return;
        st.moved = true;
        if (st.kind === 'split') {
          // Materialise the split on the first real movement. The split places
          // the parallel sub-segment at the cursor, so reset the grab reference
          // to this cursor: from here the delta keeps that segment on the pointer.
          // The cut is always at the segment's midpoint; the grabbed soft point
          // only says which half follows the pointer.
          const res = splitSegment(st.baseVertices, st.segIndex, st.half);
          st.baseVertices = res.vertices;
          st.segIndex = res.index;
          st.grab = cursor;
        }
      }
      const working = slideSegment(st.baseVertices, st.segIndex, cursor, st.grab);
      st.working = working;
      data?.onRouteChange?.(data.refKey, interiorOf(working));
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      cleanupRef.current = null;
      const st = dragRef.current;
      if (st.active && st.moved && st.working) commit(st.working);
      dragRef.current = { active: false };
      isDraggingRef.current = false;
      setIsDragging(false);
    };

    cleanupRef.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  };

  // Drag an endpoint across its table to force the side the line leaves from.
  const beginEndpointDrag = (e, endpoint) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);

    const move = (ev) => {
      const fp = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      data?.onEndpointDrag?.(data.refKey, endpoint, fp, false);
    };
    const end = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      cleanupRef.current = null;
      const fp = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      data?.onEndpointDrag?.(data.refKey, endpoint, fp, true);
      setIsDragging(false);
    };

    cleanupRef.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  };

  // A hard point sits at the midpoint of an interior segment; dragging it slides
  // that whole segment along its perpendicular axis (never free 2D).
  const dotStyle = {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: strokeColor,
    border: '2px solid #ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
    cursor: 'grab',
    pointerEvents: 'all',
    zIndex: 1003,
  };
  // The one soft point is a faint ghost: hollow, dashed, half-opaque, so it can
  // never be mistaken for a saved hard point — one is data, one is an offer.
  const softStyle = {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#ffffff',
    border: `1.5px dashed ${strokeColor}`,
    opacity: 0.55,
    cursor: 'crosshair',
    pointerEvents: 'all',
    zIndex: 1003,
  };
  // The endpoint side handle is a square, so it can never be mistaken for a
  // round segment handle: squares mark the two ends, circles mark the bends.
  const endpointStyle = {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 3,
    background: '#ffffff',
    border: `2.5px solid ${strokeColor}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
    cursor: 'ew-resize',
    pointerEvents: 'all',
    zIndex: 1004,
  };
  // The reset control sits above the source endpoint, clear of every drag
  // handle so it can never be hit mid-edit (D6). Its class is on the export
  // hide-list so it never appears in an exported PNG/SVG.
  const resetStyle = {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#ffffff',
    color: strokeColor,
    border: `1.5px solid ${strokeColor}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
    fontSize: 12,
    lineHeight: '16px',
    fontWeight: 700,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    pointerEvents: 'all',
    zIndex: 1006,
  };

  const showSymbols = data?.showMarkers !== false && !!geometry;
  const showLabels = !!data?.showCardinalityLabels && !!geometry;
  const labelStyle = {
    position: 'absolute',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'monospace',
    color: '#ffffff',
    background: strokeColor,
    borderRadius: 4,
    padding: '1px 5px',
    lineHeight: '14px',
    pointerEvents: 'none',
    zIndex: 1002,
  };
  const sourceKind = data?.sourceRelation === '*' ? 'many' : 'one';
  const targetKind = data?.targetRelation === '*' ? 'many' : 'one';

  const movableSegments = segments.filter((s) => s.movable);

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />

      {(showSymbols || showLabels || editing) && (
        <EdgeLabelRenderer>
          {showSymbols && (
            <>
              <RelationshipSymbol kind={sourceKind} x={geometry.start.x} y={geometry.start.y} angle={geometry.start.angle} color={strokeColor} />
              <RelationshipSymbol kind={targetKind} x={geometry.end.x} y={geometry.end.y} angle={geometry.end.angle} color={strokeColor} />
            </>
          )}

          {showLabels && (
            <>
              <div className="nodrag nopan" style={{ ...labelStyle, transform: `translate(-50%, -50%) translate(${geometry.labels.start.x}px, ${geometry.labels.start.y}px)` }}>
                {data?.sourceRelation === '*' ? '*' : '1'}
              </div>
              <div className="nodrag nopan" style={{ ...labelStyle, transform: `translate(-50%, -50%) translate(${geometry.labels.end.x}px, ${geometry.labels.end.y}px)` }}>
                {data?.targetRelation === '*' ? '*' : '1'}
              </div>
            </>
          )}

          {editing && (
            <>
              <div
                className="nodrag nopan dbml-endpoint-handle"
                title="Drag across the table to choose which side this end leaves from"
                style={{ ...endpointStyle, transform: `translate(-50%, -50%) translate(${sourceX}px, ${sourceY}px)` }}
                onPointerDown={(e) => beginEndpointDrag(e, 'source')}
              />
              <div
                className="nodrag nopan dbml-endpoint-handle"
                title="Drag across the table to choose which side this end arrives at"
                style={{ ...endpointStyle, transform: `translate(-50%, -50%) translate(${targetX}px, ${targetY}px)` }}
                onPointerDown={(e) => beginEndpointDrag(e, 'target')}
              />

              {movableSegments.map((seg) => (
                <div
                  key={`seg-${seg.index}`}
                  className="nodrag nopan dbml-waypoint-dot"
                  title="Drag to move this segment"
                  style={{
                    ...dotStyle,
                    cursor: seg.orientation === 'v' ? 'ew-resize' : 'ns-resize',
                    transform: `translate(-50%, -50%) translate(${seg.mid.x}px, ${seg.mid.y}px)`,
                  }}
                  onPointerDown={(e) => beginSegmentGesture(e, seg.index, 'move')}
                />
              ))}

              {softPoint && (
                <div
                  className="nodrag nopan dbml-waypoint-seg"
                  title="Drag to split this segment"
                  style={{ ...softStyle, transform: `translate(-50%, -50%) translate(${softPoint.x}px, ${softPoint.y}px)` }}
                  onPointerDown={(e) => beginSegmentGesture(e, softPoint.segIndex, 'split', softPoint.half)}
                />
              )}

              <div
                className="nodrag nopan dbml-edge-reset"
                title="Reset this relationship to its default route"
                style={{ ...resetStyle, transform: `translate(-50%, -50%) translate(${(geometry?.reset?.x ?? sourceX)}px, ${(geometry?.reset?.y ?? sourceY)}px)` }}
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); data?.onResetEdge?.(data.refKey); }}
              >
                ⟳
              </div>
            </>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;
