import React, { useState, useRef, useEffect } from 'react';
import { NodeResizer } from '@xyflow/react';

const StickyNote = ({ data, selected }) => {
  const { note, savedDimensions } = data;
  const [dimensions, setDimensions] = useState({
    width: savedDimensions?.width || 250,
    height: savedDimensions?.height || 180
  });

  // Calculate minimum size based on content
  const minWidth = Math.max(200, (note.name?.length || 0) * 8 + 40);
  const minHeight = Math.max(120, 60 + ((note.content?.split('\n').length || 1) * 16));

  return (
    <>
      <NodeResizer 
        isVisible={selected}
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={500}
        maxHeight={400}
        keepAspectRatio={false}
        onResize={(event, { width, height }) => {
          setDimensions({ width, height });
        }}
      />
      
      <div 
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
          border: selected ? '2px solid #007acc' : '1px solid #d4a574',
          borderRadius: '8px',
          boxShadow: selected 
            ? '0 4px 16px rgba(0, 122, 204, 0.3)' 
            : '2px 2px 8px rgba(0, 0, 0, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: selected ? 'default' : 'grab'
        }}
      >
        {/* Sticky note folded corner effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '20px',
          height: '20px',
          background: 'linear-gradient(225deg, #d4a574 0%, #b8956b 100%)',
          clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)',
          borderBottomLeftRadius: '2px',
          zIndex: 1
        }} />

        {/* Note header */}
        <div style={{
          padding: '12px 12px 8px 12px',
          borderBottom: '1px solid rgba(212, 165, 116, 0.3)',
          flexShrink: 0
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#8b6914',
            lineHeight: '1.2',
            paddingRight: '25px', // Space for folded corner
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            📌 {note.name}
          </div>
        </div>

        {/* Note content */}
        <div style={{
          flex: 1,
          padding: '8px 12px 12px 12px',
          overflow: 'auto',
          fontSize: '12px',
          color: '#6b5b00',
          lineHeight: '1.4',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}>
          {note.content || 'No content'}
        </div>

        {/* Resize handle visual indicator when selected */}
        {selected && (
          <div style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: '12px',
            height: '12px',
            background: 'rgba(0, 122, 204, 0.3)',
            borderRadius: '2px',
            pointerEvents: 'none'
          }} />
        )}
      </div>
    </>
  );
};

export default StickyNote;