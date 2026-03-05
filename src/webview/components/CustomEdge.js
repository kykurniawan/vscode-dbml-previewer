import React from 'react';
import {
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  getStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';

const getPathFunction = (pathStyle) => {
  switch (pathStyle) {
    case 'straight': return getStraightPath;
    case 'step': return getStepPath;
    case 'smoothstep': return getSmoothStepPath;
    case 'bezier':
    default: return getBezierPath;
  }
};

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
  markerEnd,
}) => {
  const pathFn = getPathFunction(data?.pathStyle);
  const [edgePath] = pathFn({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Position labels ~35% from each endpoint along the straight line
  const startLabelX = targetX + (sourceX - targetX) * 0.65;
  const startLabelY = targetY + (sourceY - targetY) * 0.65;
  const endLabelX = targetX + (sourceX - targetX) * 0.35;
  const endLabelY = targetY + (sourceY - targetY) * 0.35;

  const sourceLabel = data?.sourceRelation === '*' ? 'N' : (data?.sourceIsNullable ? '0' : '1');
  const targetLabel = data?.targetRelation === '*' ? 'N' : (data?.targetIsNullable ? '0' : '1');

  const labelColor = data?.refColor || style?.stroke;

  const labelStyle = {
    position: 'absolute',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'monospace',
    color: '#ffffff',
    background: labelColor,
    borderRadius: 4,
    padding: '1px 5px',
    lineHeight: '14px',
    pointerEvents: 'none',
    zIndex: data?.isSelected ? 1002 : 1,
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {data?.showCardinalityLabels && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${startLabelX}px, ${startLabelY}px)`,
              ...labelStyle,
            }}
            className="nodrag nopan"
          >
            {sourceLabel}
          </div>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${endLabelX}px, ${endLabelY}px)`,
              ...labelStyle,
            }}
            className="nodrag nopan"
          >
            {targetLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;
