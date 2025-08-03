import React from 'react';
import { Handle, Position } from '@xyflow/react';

const TableNode = ({ data }) => {
  const { table } = data;

  const getColumnIcon = (column) => {
    if (column.pk) return '🔑';
    if (column.unique) return '⚡';
    if (column.not_null) return '❗';
    return '◦';
  };

  const getColumnType = (column) => {
    return column.type?.type_name || 'unknown';
  };

  return (
    <div style={{
      background: 'var(--vscode-editor-background)',
      border: '2px solid var(--vscode-panel-border)',
      borderRadius: '8px',
      minWidth: '200px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>
      {/* Table Header */}
      <div style={{
        background: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        padding: '8px 12px',
        fontWeight: 'bold',
        fontSize: '14px',
        borderBottom: '1px solid var(--vscode-panel-border)'
      }}>
        📋 {table.name}
      </div>

      {/* Columns */}
      <div style={{ padding: '4px 0' }}>
        {table.fields?.map((column, index) => (
          <div
            key={index}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              color: 'var(--vscode-editor-foreground)',
              borderBottom: index < table.fields.length - 1 ? '1px solid var(--vscode-panel-border)' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{getColumnIcon(column)}</span>
              <span style={{ fontWeight: column.pk ? 'bold' : 'normal' }}>
                {column.name}
              </span>
            </div>
            <span style={{ 
              color: 'var(--vscode-descriptionForeground)',
              fontSize: '10px',
              fontFamily: 'monospace'
            }}>
              {getColumnType(column)}
            </span>
          </div>
        ))}
      </div>

      {/* Table Note */}
      {table.note && (
        <div style={{
          padding: '8px 12px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          borderTop: '1px solid var(--vscode-panel-border)',
          fontStyle: 'italic',
          background: 'var(--vscode-editor-inactiveSelectionBackground)'
        }}>
          {table.note}
        </div>
      )}

      {/* Handles for connections */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: 'var(--vscode-button-background)',
          border: '2px solid var(--vscode-button-foreground)',
          width: '8px',
          height: '8px'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: 'var(--vscode-button-background)',
          border: '2px solid var(--vscode-button-foreground)',
          width: '8px',
          height: '8px'
        }}
      />
    </div>
  );
};

export default TableNode;