import React, { useState } from 'react';
import { getThemeVar } from '../styles/themeManager.js';

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
      ? `color-mix(in srgb, ${getThemeVar('buttonBackground')} 20%, transparent)`
      : isHovered
        ? `color-mix(in srgb, ${getThemeVar('buttonBackground')} 15%, transparent)`
        : `color-mix(in srgb, ${getThemeVar('buttonBackground')} 10%, transparent)`,
    border: `2px solid ${getThemeVar('buttonBackground')}`,
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
    transform: 'translate(0, -120%)',
    backgroundColor: getThemeVar('buttonBackground'),
    color: getThemeVar('buttonForeground'),
    padding: '16px 12px',
    border: `2px solid ${getThemeVar('buttonBackground')}`,
    fontSize: '14px',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: 'none',
    width: '100%',
  };

  const noteStyle = {
    boxSizing: 'border-box',
    color: getThemeVar('buttonForeground'),
    marginTop: '10px',
    fontSize: '9px',
    fontStyle: 'italic',
    fontWeight: 'normal',
    border: 'none',
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