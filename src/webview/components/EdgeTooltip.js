import React, { useEffect, useRef } from 'react';
import { getThemeVar } from '../styles/themeManager.js';

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

  const getRelationType = (relation) => {
    if (relation === '1') {
      return 'one';
    }

    if (relation === '*') {
      return 'many';
    }

    return 'unknown';
  }

  const formatRelationshipText = () => {
    const { sourceTable, sourceColumn, targetTable, targetColumn, sourceRelation, targetRelation } = edge.data || {};

    if (!sourceTable || !sourceColumn || !targetTable || !targetColumn) {
      return {
        source: edge.source,
        target: edge.target
      }
    }

    return {
      source: `${sourceTable}.${sourceColumn} = ${getRelationType(sourceRelation)}`,
      target: `${targetTable}.${targetColumn} = ${getRelationType(targetRelation)}`
    }
  };

  const relationshipInfo = formatRelationshipText();

  const tooltipStyle = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    background: getThemeVar('editorBackground'),
    border: `1px solid ${getThemeVar('panelBorder')}`,
    borderRadius: '4px',
    padding: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    color: getThemeVar('foreground'),
    fontSize: '12px',
    fontFamily: getThemeVar('fontFamily'),
    zIndex: 1000,
    maxWidth: '300px',
    minWidth: '200px',
    transform: 'translate(-50%, -100%)', // Center horizontally, appear above click point
    marginTop: '-8px' // Small gap from click point
  };

  const headerStyle = {
    fontWeight: 'bold',
    marginBottom: '8px',
    color: getThemeVar('textLinkForeground'),
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const relationshipStyle = {
    fontFamily: getThemeVar('editorFontFamily'),
    marginBottom: '6px',
    fontSize: '13px',
    wordBreak: 'break-all'
  };

  const cardinalityStyle = {
    fontSize: '11px',
    color: getThemeVar('descriptionForeground'),
    fontWeight: 'bold'
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: 'none',
    border: 'none',
    color: getThemeVar('iconForeground'),
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px',
    opacity: 0.7,
    lineHeight: '1'
  };

  return (
    <div ref={tooltipRef} style={tooltipStyle} data-tooltip="edge">
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
        <div>{relationshipInfo.source}</div>
        <div>{relationshipInfo.target}</div>
      </div>
    </div>
  );
};

export default EdgeTooltip;