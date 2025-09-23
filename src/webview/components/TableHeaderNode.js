import React from 'react';
import { getThemeVar } from '../styles/themeManager.js';

const TableHeaderNode = ({ data }) => {
  const { table, columnCount = 0, tableWidth = 200, hasMultipleSchema = false, onTableNoteClick } = data;

  // Calculate dimensions based on content
  const headerHeight = 42; // Header section height
  const columnHeight = 30; // Height per column
  const tablePadding = 8; // Padding around column area
  const totalHeight = headerHeight + (columnCount * columnHeight) + (tablePadding * 2);
  let title = table.name;
  if (hasMultipleSchema && table.schemaName) {
    title = `${table.schemaName}.${table.name}`;
  }

  return (
    <div style={{
      background: getThemeVar('editorBackground'),
      borderRadius: '8px',
      minWidth: `${tableWidth}px`,
      width: `${tableWidth}px`,
      height: `${totalHeight}px`,
      overflow: 'visible',
      position: 'relative'
    }}>
      {/* Table Header */}
      <div style={{
        borderTop: `2px solid ${getThemeVar('panelBorder')}`,
        borderLeft: `2px solid ${getThemeVar('panelBorder')}`,
        borderRight: `2px solid ${getThemeVar('panelBorder')}`,
        background: getThemeVar('buttonBackground'),
        color: getThemeVar('buttonForeground'),
        padding: '8px 12px',
        fontWeight: 'bold',
        fontSize: '14px',
        height: `${headerHeight}px`,
        borderRadius: '8px 8px 0 0',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>{title}</span>
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
              color: getThemeVar('buttonForeground'),
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


      {/* Column Area - Visual padding container */}
      {columnCount > 0 && (
        <div style={{
          padding: `${tablePadding}px`,
          borderTop: `1px solid ${getThemeVar('panelBorder')}`,
          borderLeft: `2px solid ${getThemeVar('panelBorder')}`,
          borderRight: `2px solid ${getThemeVar('panelBorder')}`,
          borderBottom: `2px solid ${getThemeVar('panelBorder')}`,
          borderRadius: '0 0 8px 8px',
          background: getThemeVar('editorBackground'),
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