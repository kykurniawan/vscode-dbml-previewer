import React, { useState } from 'react';

const TableGroupNode = ({ data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { tableGroup, tables } = data;

  if (!tableGroup) {
    return null;
  }

  const groupStyle = {
    boxSizing: 'border-box',
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: selected
      ? 'rgba(0, 122, 204, 0.2)'
      : isHovered
        ? 'rgba(0, 122, 204, 0.15)'
        : 'rgba(0, 122, 204, 0.1)',
    border: 'none',
    borderRadius: '8px',
    zIndex: -1,
    transition: 'all 0.2s ease-in-out',
    cursor: 'move',
  };

  const titleStyle = {
    boxSizing: 'border-box',
    position: 'absolute',
    top: '0',
    left: '0',
    transform: 'translate(0, -110%)',
    backgroundColor: 'rgba(0, 122, 204, 0.8)',
    color: 'white',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: 'none',
    width: '100%',
  };

  const noteStyle = {
    boxSizing: 'border-box',
    color: 'white',
    marginTop: '10px',
    fontSize: '7px',
    fontStyle: 'italic',
    fontWeight: 'normal',
    border: 'none',
    maxWidth: '200px',
    overflow: 'hidden',
  };

  return (
    <div
      style={groupStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={titleStyle}>
        {tableGroup.name}
        {tableGroup.note && (
          <div style={noteStyle}>
            {tableGroup.note}
          </div>
        )}
      </div>

    </div>
  );
};

export default TableGroupNode;