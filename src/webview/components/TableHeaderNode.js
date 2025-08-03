import React from 'react';

const TableHeaderNode = ({ data }) => {
  const { table, columnCount = 0, tableWidth = 200, hasMultipleSchema = false } = data;

  // Calculate dimensions based on content
  const headerHeight = 42; // Header section height
  const noteHeight = table.note ? 30 : 0; // Note section height if present
  const columnHeight = 30; // Height per column
  const tablePadding = 8; // Padding around column area
  const totalHeight = headerHeight + noteHeight + (columnCount * columnHeight) + (tablePadding * 2);
  let title = table.name;
  if (hasMultipleSchema && table.schemaName) {
    title = `${table.schemaName}.${table.name}`;
  }

  return (
    <div style={{
      background: 'var(--vscode-editor-background)',
      border: '2px solid var(--vscode-panel-border)',
      borderRadius: '8px',
      minWidth: `${tableWidth}px`,
      width: `${tableWidth}px`,
      height: `${totalHeight}px`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'visible',
      position: 'relative'
    }}>
      {/* Table Header */}
      <div style={{
        background: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        padding: '8px 12px',
        fontWeight: 'bold',
        fontSize: '14px',
        height: `${headerHeight}px`,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center'
      }}>
        📋 {title}
      </div>

      {/* Table Note (if exists) */}
      {table.note && (
        <div style={{
          padding: '6px 12px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          fontStyle: 'italic',
          background: 'var(--vscode-editor-inactiveSelectionBackground)',
          borderTop: '1px solid var(--vscode-panel-border)',
          height: `${noteHeight}px`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center'
        }}>
          {table.note}
        </div>
      )}

      {/* Column Area - Visual padding container */}
      {columnCount > 0 && (
        <div style={{
          padding: `${tablePadding}px`,
          borderTop: table.note ? 'none' : '1px solid var(--vscode-panel-border)',
          background: 'var(--vscode-editor-background)',
          height: `${columnCount * columnHeight + (tablePadding * 2)}px`,
          boxSizing: 'border-box'
        }}>
          {/* Column nodes will be positioned within this padded area */}
        </div>
      )}
    </div>
  );
};

export default TableHeaderNode;