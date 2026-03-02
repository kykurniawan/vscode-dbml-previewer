import React, { useEffect, useRef } from 'react';
import { getThemeVar } from '../styles/themeManager.js';

const TableChecksTooltip = ({ table, checks, position, onClose }) => {
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

  if (!table || !checks || checks.length === 0 || !position) {
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

  return (
    <div ref={tooltipRef} style={tooltipStyle} data-tooltip="table-checks">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        borderBottom: `1px solid ${getThemeVar('panelBorder')}`,
        paddingBottom: '8px',
      }}>
        <span style={{ fontSize: '14px' }}>✓</span>
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
          — Checks
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

      {/* Check items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {checks.map((check, i) => (
          <div key={i} style={{
            borderLeft: `3px solid ${getThemeVar('panelBorder')}`,
            paddingLeft: '8px',
          }}>
            {(check.name || check.column) && (
              <div style={{
                fontSize: '11px',
                color: getThemeVar('descriptionForeground'),
                fontWeight: 'bold',
                marginBottom: '2px',
              }}>
                {check.name || check.column}
              </div>
            )}
            <span style={{
              fontSize: '12px',
              color: getThemeVar('foreground'),
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}>
              {`\`${check.expression}\``}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableChecksTooltip;
