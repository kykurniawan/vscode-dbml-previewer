import React, { useEffect, useRef } from 'react';

const EdgeTooltip = ({ edge, position, onClose }) => {
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

  if (!edge || !position) {
    return null;
  }

  const getDirectionSymbol = (sourceRelation, targetRelation) => {
    if (sourceRelation === '1' && targetRelation === '*') {
      return '<'; // one-to-many
    } else if (sourceRelation === '*' && targetRelation === '1') {
      return '>'; // many-to-one
    } else if (sourceRelation === '1' && targetRelation === '1') {
      return '—'; // one-to-one
    } else if (sourceRelation === '*' && targetRelation === '*') {
      return '<>'; // many-to-many
    }
    return '—'; // fallback for other cases
  };

  const formatRelationshipText = () => {
    const { sourceTable, sourceColumn, targetTable, targetColumn, sourceRelation, targetRelation } = edge.data || {};

    if (!sourceTable || !sourceColumn || !targetTable || !targetColumn) {
      return `${edge.source} → ${edge.target}`;
    }

    const directionSymbol = getDirectionSymbol(sourceRelation, targetRelation);
    const cardinalityText = `${sourceRelation || '1'}:${targetRelation || '1'}`;

    return `${sourceTable}.${sourceColumn} ${directionSymbol} ${targetTable}.${targetColumn}`;
  };

  const relationshipInfo = formatRelationshipText();

  const tooltipStyle = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    background: 'var(--vscode-editor-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: '4px',
    padding: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    color: 'var(--vscode-editor-foreground)',
    fontSize: '12px',
    fontFamily: 'var(--vscode-font-family)',
    zIndex: 1000,
    maxWidth: '300px',
    minWidth: '200px',
    transform: 'translate(-50%, -100%)', // Center horizontally, appear above click point
    marginTop: '-8px' // Small gap from click point
  };

  const headerStyle = {
    fontWeight: 'bold',
    marginBottom: '8px',
    color: 'var(--vscode-textLink-foreground)',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const relationshipStyle = {
    fontFamily: 'var(--vscode-editor-font-family)',
    marginBottom: '6px',
    fontSize: '13px',
    wordBreak: 'break-all'
  };

  const cardinalityStyle = {
    fontSize: '11px',
    color: 'var(--vscode-descriptionForeground)',
    fontWeight: 'bold'
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: 'none',
    border: 'none',
    color: 'var(--vscode-icon-foreground)',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px',
    opacity: 0.7,
    lineHeight: '1'
  };

  return (
    <div ref={tooltipRef} style={tooltipStyle}>
      <button
        onClick={onClose}
        style={closeButtonStyle}
        onMouseOver={(e) => e.target.style.opacity = '1'}
        onMouseOut={(e) => e.target.style.opacity = '0.7'}
        title="Close (ESC)"
      >
        ×
      </button>

      <div style={headerStyle}>Relationship</div>
      <div style={relationshipStyle}>
        {relationshipInfo}
      </div>
    </div>
  );
};

export default EdgeTooltip;