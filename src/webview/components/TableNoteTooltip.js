import React, { useEffect, useRef } from 'react';
import { getThemeVar } from '../styles/themeManager.js';

const TableNoteTooltip = ({ table, position, onClose }) => {
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

  if (!table || !table.note || !position) {
    return null;
  }

  // Position tooltip to avoid going off screen
  const tooltipStyle = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320), // 320px is tooltip width
    top: Math.min(position.y, window.innerHeight - 150), // Estimate tooltip height
    zIndex: 1000,
    background: getThemeVar('editorBackground'),
    border: `1px solid ${getThemeVar('panelBorder')}`,
    borderRadius: '6px',
    padding: '12px',
    minWidth: '280px',
    maxWidth: '320px',
    fontSize: '12px',
    color: getThemeVar('foreground'),
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontFamily: getThemeVar('fontFamily')
  };

  return (
    <div ref={tooltipRef} style={tooltipStyle} data-tooltip="table-note">
      {/* Header with table name and close button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '12px',
        borderBottom: `1px solid ${getThemeVar('panelBorder')}`,
        paddingBottom: '8px'
      }}>
        <span style={{ fontSize: '14px' }}>
          📋
        </span>
        <span style={{ 
          fontWeight: 'bold', 
          fontSize: '14px',
          color: getThemeVar('foreground')
        }}>
          {table.name}
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
            borderRadius: '2px'
          }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Note content */}
      <div style={{ 
        color: getThemeVar('descriptionForeground'),
        fontWeight: '500',
        marginBottom: '8px'
      }}>
        Note:
      </div>
      <div style={{ 
        backgroundColor: getThemeVar('textCodeBlockBackground'),
        border: `1px solid ${getThemeVar('panelBorder')}`,
        borderRadius: '4px',
        padding: '8px',
        maxHeight: '200px',
        overflowY: 'auto',
        fontStyle: 'italic',
        color: getThemeVar('foreground'),
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap'
      }}>
        {table.note}
      </div>
    </div>
  );
};

export default TableNoteTooltip;