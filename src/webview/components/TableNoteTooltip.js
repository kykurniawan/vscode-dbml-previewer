import React, { useEffect, useRef } from 'react';

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
    background: 'var(--vscode-editor-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: '6px',
    padding: '12px',
    minWidth: '280px',
    maxWidth: '320px',
    fontSize: '12px',
    color: 'var(--vscode-editor-foreground)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontFamily: 'var(--vscode-font-family)'
  };

  return (
    <div ref={tooltipRef} style={tooltipStyle} data-tooltip="table-note">
      {/* Header with table name and close button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '12px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        paddingBottom: '8px'
      }}>
        <span style={{ fontSize: '14px' }}>
          📋
        </span>
        <span style={{ 
          fontWeight: 'bold', 
          fontSize: '14px',
          color: 'var(--vscode-editor-foreground)'
        }}>
          {table.name}
        </span>
        <button 
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--vscode-icon-foreground)',
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
        color: 'var(--vscode-descriptionForeground)',
        fontWeight: '500',
        marginBottom: '8px'
      }}>
        Note:
      </div>
      <div style={{ 
        backgroundColor: 'var(--vscode-textCodeBlock-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: '8px',
        maxHeight: '200px',
        overflowY: 'auto',
        fontStyle: 'italic',
        color: 'var(--vscode-editor-foreground)',
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap'
      }}>
        {table.note}
      </div>
    </div>
  );
};

export default TableNoteTooltip;