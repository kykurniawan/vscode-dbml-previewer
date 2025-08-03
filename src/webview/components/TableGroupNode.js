import React, { useState } from 'react';

const TableGroupNode = ({ data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { tableGroup, tables } = data;
  
  if (!tableGroup) {
    return null;
  }

  const groupStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: selected 
      ? 'rgba(0, 122, 204, 0.2)' 
      : isHovered 
        ? 'rgba(0, 122, 204, 0.15)'
        : 'rgba(0, 122, 204, 0.1)',
    border: selected 
      ? '2px solid var(--vscode-focusBorder)' 
      : isHovered
        ? '1px solid rgba(0, 122, 204, 0.5)'
        : '1px solid rgba(0, 122, 204, 0.3)',
    borderRadius: '8px',
    zIndex: -1,
    transition: 'all 0.2s ease-in-out',
    cursor: 'move',
  };

  const titleStyle = {
    position: 'absolute',
    top: '8px',
    left: '12px',
    backgroundColor: 'rgba(0, 122, 204, 0.8)',
    color: 'white',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  };

  const noteStyle = {
    position: 'absolute',
    bottom: '8px',
    right: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    padding: '2px 6px',
    fontSize: '9px',
    borderRadius: '8px',
    border: 'none',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    opacity: 0.8,
  };

  return (
    <div 
      style={groupStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={titleStyle}>
        📦 {tableGroup.name}
      </div>
      
      {tableGroup.note && (
        <div style={noteStyle} title={tableGroup.note}>
          {tableGroup.note}
        </div>
      )}
    </div>
  );
};

export default TableGroupNode;