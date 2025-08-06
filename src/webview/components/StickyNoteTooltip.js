import React, { useEffect, useRef } from 'react';

const StickyNoteTooltip = ({ note, position, onClose }) => {
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

  if (!note || !position) {
    return null;
  }

  // Position tooltip to avoid going off screen
  const tooltipStyle = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 350), // 350px is tooltip width
    top: Math.min(position.y, window.innerHeight - 200), // Estimate tooltip height
    zIndex: 1000,
    background: 'var(--vscode-editor-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: '6px',
    padding: '12px',
    minWidth: '300px',
    maxWidth: '350px',
    fontSize: '12px',
    color: 'var(--vscode-editor-foreground)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontFamily: 'var(--vscode-font-family)'
  };

  return (
    <div ref={tooltipRef} style={tooltipStyle} data-tooltip="sticky-note">
      {/* Header with note icon, name and close button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '12px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        paddingBottom: '8px'
      }}>
        <span style={{ fontSize: '14px' }}>
          📌
        </span>
        <span style={{ 
          fontWeight: 'bold', 
          fontSize: '14px',
          color: 'var(--vscode-editor-foreground)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {note.name}
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

      {/* Note type label */}
      <div style={{ 
        color: 'var(--vscode-descriptionForeground)',
        fontWeight: '500',
        marginBottom: '8px'
      }}>
        Sticky Note:
      </div>

      {/* Note content */}
      <div style={{ 
        backgroundColor: 'var(--vscode-textCodeBlock-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: '12px',
        maxHeight: '300px',
        overflowY: 'auto',
        color: 'var(--vscode-editor-foreground)',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap'
      }}>
        {note.content || 'No content'}
      </div>

      {/* Additional note metadata if available */}
      {note.token && (
        <div style={{
          marginTop: '8px',
          fontSize: '10px',
          color: 'var(--vscode-descriptionForeground)',
          borderTop: '1px solid var(--vscode-panel-border)',
          paddingTop: '8px'
        }}>
          <div>Position: Line {note.token.start.line}, Column {note.token.start.column}</div>
        </div>
      )}
    </div>
  );
};

export default StickyNoteTooltip;