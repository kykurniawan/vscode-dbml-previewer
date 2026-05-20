import React, { useEffect, useRef } from 'react';
import { getThemeVar } from '../styles/themeManager.js';

const TableIndexesTooltip = ({ table, indexes, position, onClose }) => {
  const tooltipRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  if (!table || !indexes || indexes.length === 0 || !position) {
    return null;
  }

  const tooltipStyle = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 360),
    top: Math.min(position.y, window.innerHeight - 200),
    zIndex: 1000,
    background: getThemeVar('editorBackground'),
    border: `1px solid ${getThemeVar('panelBorder')}`,
    borderRadius: '6px',
    padding: '12px',
    minWidth: '300px',
    maxWidth: '360px',
    fontSize: '12px',
    color: getThemeVar('foreground'),
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontFamily: getThemeVar('fontFamily'),
  };

  const badgeStyle = {
    display: 'inline-block',
    fontSize: '9px',
    fontWeight: 'bold',
    padding: '1px 5px',
    borderRadius: '3px',
    marginRight: '4px',
    textTransform: 'uppercase',
  };

  const renderBadges = (index) => {
    const badges = [];
    if (index.pk) {
      badges.push(
        <span key="pk" style={{ ...badgeStyle, background: getThemeVar('inputValidationErrorBackground'), color: getThemeVar('inputValidationErrorForeground'), border: `1px solid ${getThemeVar('inputValidationErrorBorder')}` }}>
          PK
        </span>
      );
    }
    if (index.unique) {
      badges.push(
        <span key="unique" style={{ ...badgeStyle, background: getThemeVar('inputValidationInfoBackground'), color: getThemeVar('inputValidationInfoForeground'), border: `1px solid ${getThemeVar('inputValidationInfoBorder')}` }}>
          UNIQUE
        </span>
      );
    }
    if (index.type) {
      badges.push(
        <span key="type" style={{ ...badgeStyle, background: 'transparent', color: getThemeVar('descriptionForeground'), border: `1px solid ${getThemeVar('panelBorder')}` }}>
          {index.type}
        </span>
      );
    }
    return badges;
  };

  return (
    <div ref={tooltipRef} style={tooltipStyle} data-tooltip="table-indexes">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        borderBottom: `1px solid ${getThemeVar('panelBorder')}`,
        paddingBottom: '8px',
      }}>
        <span style={{ fontSize: '14px' }}>🔍</span>
        <span style={{
          fontWeight: 'bold',
          fontSize: '14px',
          color: getThemeVar('foreground'),
        }}>
          {table.name}
        </span>
        <span style={{
          fontSize: '11px',
          color: getThemeVar('descriptionForeground'),
          marginLeft: '2px',
        }}>
          — Indexes
        </span>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: getThemeVar('iconForeground'),
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px',
            borderRadius: '2px',
          }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Index items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {indexes.map((index, i) => {
          const columns = index.columns || [];
          const columnNames = columns
            .map(col => col.type === 'expression' ? `(${col.value})` : col.value)
            .join(', ');

          return (
            <div key={i} style={{
              borderLeft: `3px solid ${getThemeVar('panelBorder')}`,
              paddingLeft: '8px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '4px',
                marginBottom: '3px',
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: getThemeVar('foreground'),
                }}>
                  {index.name || `Unnamed Index`}
                </span>
                {renderBadges(index)}
              </div>
              <div style={{
                fontSize: '11px',
                color: getThemeVar('descriptionForeground'),
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}>
                {columnNames || '(no columns)'}
              </div>
              {index.note && (
                <div style={{
                  fontSize: '10px',
                  color: getThemeVar('descriptionForeground'),
                  marginTop: '2px',
                  fontStyle: 'italic',
                }}>
                  {index.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TableIndexesTooltip;
