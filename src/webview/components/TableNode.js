import React from 'react';
import { Handle, Position } from '@xyflow/react';

const TableNode = ({ data }) => {
  const { table, columnHandles = {}, onTableNoteClick } = data;

  const getColumnIcon = (column) => {
    if (column.pk) return '🔑';
    if (column.unique) return '⚡';
    if (column.not_null) return '❗';
    return ''; // Remove the bullet point
  };

  const hasColumnHandle = (columnName) => {
    return columnHandles[columnName];
  };

  const getColumnHandleInfo = (columnName) => {
    return columnHandles[columnName] || null;
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
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Table Header */}
      <div style={{
        background: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        padding: '8px 12px',
        fontWeight: 'bold',
        fontSize: '14px',
        boxSizing: 'border-box',
        borderBottom: '1px solid var(--vscode-panel-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>📋 {table.name}</span>
        {table.note && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onTableNoteClick) {
                const rect = e.currentTarget.getBoundingClientRect();
                onTableNoteClick(table, {
                  x: rect.right + 10,
                  y: rect.top
                });
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--vscode-button-foreground)',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '2px 4px',
              borderRadius: '2px',
              opacity: 0.8
            }}
            title="View table note"
          >
            📝
          </button>
        )}
      </div>

      {/* Columns */}
      <div style={{ padding: '4px 0', position: 'relative', boxSizing: 'border-box' }}>
        {table.fields?.map((column, index) => {
          const handleInfo = getColumnHandleInfo(column.name);
          return (
            <div
              key={index}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                color: 'var(--vscode-editor-foreground)',
                borderBottom: index < table.fields.length - 1 ? '1px solid var(--vscode-panel-border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                backgroundColor: hasColumnHandle(column.name) ? 'var(--vscode-editor-inactiveSelectionBackground)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                {hasColumnHandle(column.name) && (
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
              <span style={{ 
                color: 'var(--vscode-descriptionForeground)',
                fontSize: '10px',
                fontFamily: 'monospace'
              }}>
                {getColumnType(column)}
              </span>

              {/* Column-specific handles */}
              {handleInfo && handleInfo.isSource && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${column.name}`}
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
        })}
      </div>


      {/* Generic table handles for fallback connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="table-target"
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
        id="table-source"
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