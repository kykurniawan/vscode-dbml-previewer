import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { getThemeVar } from '../styles/themeManager.js';

// Routing handles are always mounted but visually transparent; the 🔗 column
// indicator and the row highlight remain the only visible "linked" cue.
const hiddenHandleStyle = (side) => ({
  [side]: '-1px',
  opacity: 0,
  pointerEvents: 'none',
  width: '1px',
  height: '1px',
  minWidth: '1px',
  minHeight: '1px',
  border: 'none',
  background: 'transparent',
});

const ColumnNode = ({ data }) => {
  const { column, hasSourceHandle, hasTargetHandle, columnWidth = 196, enumDef, onColumnClick } = data;

  const getColumnIcon = (column) => {
    if (column.pk) return '🔑';
    if (column.unique) return '⚡';
    if (column.not_null) return '❗';
    if (column.hasIndex) return '🔍';
    return '';
  };

  const getColumnType = (column) => {
    return column.type?.type_name || 'unknown';
  };

  const handleClick = (event) => {
    // Prevent React Flow from interfering with the click event
    event.stopPropagation();
    event.preventDefault();
    
    if (onColumnClick) {
      const rect = event.currentTarget.getBoundingClientRect();
      const position = {
        x: rect.right + 10, // Position tooltip to the right of the column
        y: rect.top
      };
      onColumnClick(column, enumDef, position);
    }
  };

  return (
    <div
      style={{
        background: getThemeVar('editorBackground'),
        border: `1px solid ${getThemeVar('panelBorder')}`,
        borderRadius: '4px',
        width: `${columnWidth}px`, // Dynamic width based on content
        height: '28px', // Fixed height to match layout calculation
        padding: '4px 8px',
        fontSize: '12px',
        color: getThemeVar('foreground'),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        boxSizing: 'border-box',
        backgroundColor: (hasSourceHandle || hasTargetHandle) ? getThemeVar('editorInactiveSelectionBackground') : 'transparent',
        cursor: 'pointer'
      }}
      onClick={handleClick}
      title={`Click to view details for ${column.name}${enumDef ? ' (enum)' : ''}`}
      data-column-node="true"
    >
      {/* Target Handles (both sides, transparent; the 🔗 indicator is the visible cue) */}
      {hasTargetHandle && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="target-left"
            style={hiddenHandleStyle('left')}
          />
          <Handle
            type="target"
            position={Position.Right}
            id="target-right"
            style={hiddenHandleStyle('right')}
          />
        </>
      )}

      {/* Column Content */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
        <span style={{ 
          fontSize: '12px',
          lineHeight: '1',
          display: 'inline-flex',
          alignItems: 'center',
          width: '12px',
          height: '12px',
          justifyContent: 'center'
        }}>
          {getColumnIcon(column)}
        </span>
        <span style={{ fontWeight: column.pk ? 'bold' : 'normal' }}>
          {column.name}
        </span>
        {(hasSourceHandle || hasTargetHandle) && (
          <span style={{ 
            fontSize: '10px', 
            color: getThemeVar('chartsLines'),
            fontWeight: 'bold',
            lineHeight: '1'
          }}>
            🔗
          </span>
        )}
      </div>

      {/* Column Type */}
      <span style={{ 
        color: getThemeVar('descriptionForeground'),
        fontSize: '10px',
        fontFamily: 'monospace',
        marginLeft: '8px'
      }}>
        {getColumnType(column)}
      </span>

      {/* Source Handles (both sides, transparent; the 🔗 indicator is the visible cue) */}
      {hasSourceHandle && (
        <>
          <Handle
            type="source"
            position={Position.Left}
            id="source-left"
            style={hiddenHandleStyle('left')}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="source-right"
            style={hiddenHandleStyle('right')}
          />
        </>
      )}
    </div>
  );
};

export default ColumnNode;