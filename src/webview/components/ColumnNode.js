import React from 'react';
import { Handle, Position } from '@xyflow/react';

const ColumnNode = ({ data }) => {
  const { column, hasSourceHandle, hasTargetHandle, columnWidth = 196 } = data;

  const getColumnIcon = (column) => {
    if (column.pk) return '🔑';
    if (column.unique) return '⚡';
    if (column.not_null) return '❗';
    return '';
  };

  const getColumnType = (column) => {
    return column.type?.type_name || 'unknown';
  };

  return (
    <div style={{
      background: 'var(--vscode-editor-background)',
      border: '1px solid var(--vscode-panel-border)',
      borderRadius: '4px',
      width: `${columnWidth}px`, // Dynamic width based on content
      height: '28px', // Fixed height to match layout calculation
      padding: '4px 8px',
      fontSize: '12px',
      color: 'var(--vscode-editor-foreground)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
      boxSizing: 'border-box',
      backgroundColor: (hasSourceHandle || hasTargetHandle) ? 'var(--vscode-editor-inactiveSelectionBackground)' : 'transparent'
    }}>
      {/* Target Handle */}
      {hasTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          id="target"
          style={{
            left: '-4px',
            background: 'var(--vscode-charts-lines)',
            border: '2px solid var(--vscode-editor-background)',
            width: '6px',
            height: '6px',
            borderRadius: '50%'
          }}
        />
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
            color: 'var(--vscode-charts-lines)',
            fontWeight: 'bold',
            lineHeight: '1'
          }}>
            🔗
          </span>
        )}
      </div>

      {/* Column Type */}
      <span style={{ 
        color: 'var(--vscode-descriptionForeground)',
        fontSize: '10px',
        fontFamily: 'monospace',
        marginLeft: '8px'
      }}>
        {getColumnType(column)}
      </span>

      {/* Source Handle */}
      {hasSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="source"
          style={{
            right: '-4px',
            background: 'var(--vscode-charts-lines)',
            border: '2px solid var(--vscode-editor-background)',
            width: '6px',
            height: '6px',
            borderRadius: '50%'
          }}
        />
      )}
    </div>
  );
};

export default ColumnNode;