import React from 'react';
import { getThemeVar } from '../styles/themeManager.js';
import { parseHeaderColor, getContrastColor } from '../utils/colorUtils.js';

const TableHeaderNode = ({ data }) => {
  const {
    table,
    columnCount = 0,
    tableWidth = 200,
    hasMultipleSchema = false,
    onTableNoteClick,
    onTableChecksClick,
  } = data;
  const checks = table.checks || [];

  // Calculate dimensions based on content
  const headerHeight = 42; // Header section height
  const columnHeight = 30; // Height per column
  const tablePadding = 8; // Padding around column area
  // Fixed-height footer for the "View Checks" button when checks are present
  const checksFooterHeight = checks.length > 0 ? 32 : 0;
  const totalHeight = headerHeight + (columnCount * columnHeight) + (tablePadding * 2) + checksFooterHeight;

  let title = table.name;
  if (hasMultipleSchema && table.schemaName) {
    title = `${table.schemaName}.${table.name}`;
  }

  // Determine header colors
  const customHeaderColor = parseHeaderColor(table.headerColor);
  const headerBackgroundColor = customHeaderColor || getThemeVar('buttonBackground');
  const headerTextColor = customHeaderColor
    ? getContrastColor(customHeaderColor)
    : getThemeVar('buttonForeground');

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
        background: headerBackgroundColor,
        color: headerTextColor,
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
              color: headerTextColor,
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
          borderBottom: checks.length > 0 ? 'none' : `2px solid ${getThemeVar('panelBorder')}`,
          borderRadius: checks.length > 0 ? '0' : '0 0 8px 8px',
          background: getThemeVar('editorBackground'),
          height: `${columnCount * columnHeight + (tablePadding * 2)}px`,
          boxSizing: 'border-box'
        }}>
          {/* Column nodes are positioned as children within this padded area */}
        </div>
      )}

      {/* Checks Footer — shows a compact button to open the checks tooltip */}
      {checks.length > 0 && (
        <div style={{
          borderLeft: `2px solid ${getThemeVar('panelBorder')}`,
          borderRight: `2px solid ${getThemeVar('panelBorder')}`,
          borderBottom: `2px solid ${getThemeVar('panelBorder')}`,
          borderTop: `1px solid ${getThemeVar('panelBorder')}`,
          borderRadius: '0 0 8px 8px',
          background: getThemeVar('editorBackground'),
          height: `${checksFooterHeight}px`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onTableChecksClick) {
                const rect = e.currentTarget.getBoundingClientRect();
                onTableChecksClick(table, checks, {
                  x: rect.right + 10,
                  y: rect.top,
                });
              }
            }}
            style={{
              background: 'none',
              border: `1px solid ${getThemeVar('panelBorder')}`,
              borderRadius: '4px',
              color: getThemeVar('descriptionForeground'),
              cursor: 'pointer',
              fontSize: '11px',
              padding: '3px 8px',
              width: '100%',
              textAlign: 'left',
            }}
            title="View check constraints"
          >
            ✓ View Checks ({checks.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default TableHeaderNode;
