import React from 'react';

const StickyNote = ({ data }) => {
  const { note, onNoteClick } = data;

  // Calculate note dimensions based on content
  const baseWidth = 200;
  const baseHeight = 120;
  const maxWidth = 300;
  const maxHeight = 200;

  // Estimate width based on note name length
  const nameWidth = Math.min(note.name.length * 8 + 40, maxWidth);
  const noteWidth = Math.max(baseWidth, nameWidth);
  
  // Estimate height based on content length
  const contentLines = note.content ? Math.ceil(note.content.length / 40) : 1;
  const noteHeight = Math.min(baseHeight + (contentLines * 16), maxHeight);

  return (
    <div 
      style={{
        width: `${noteWidth}px`,
        height: `${noteHeight}px`,
        background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
        border: '1px solid #d4a574',
        borderRadius: '8px',
        boxShadow: '2px 2px 8px rgba(0, 0, 0, 0.15)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
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
        borderBottomLeftRadius: '2px'
      }} />

      {/* Note content container */}
      <div style={{
        padding: '12px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Note title */}
        <div style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#8b6914',
          marginBottom: '8px',
          lineHeight: '1.2',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {note.name}
        </div>

        {/* Note content */}
        <div style={{
          fontSize: '12px',
          color: '#6b5b00',
          lineHeight: '1.3',
          flex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: contentLines > 6 ? 6 : contentLines,
          WebkitBoxOrient: 'vertical',
          textOverflow: 'ellipsis'
        }}>
          {note.content}
        </div>

        {/* Show "click to expand" hint if content is truncated */}
        {note.content && note.content.length > 200 && (
          <div style={{
            fontSize: '10px',
            color: '#8b6914',
            fontStyle: 'italic',
            marginTop: '4px',
            textAlign: 'right'
          }}>
            Click to view full...
          </div>
        )}
      </div>
    </div>
  );
};

export default StickyNote;