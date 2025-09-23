import React from 'react';
import { getThemeVar } from '../styles/themeManager.js';

const ColumnTooltip = ({ column, enumDef, position, onClose }) => {
  if (!column || !position) {
    return null;
  }

  const getColumnIcon = (column) => {
    if (column.pk) return '🔑';
    if (column.unique) return '⚡';
    if (column.not_null) return '❗';
    return '';
  };

  const getColumnConstraints = (column) => {
    const constraints = [];
    if (column.pk) constraints.push('Primary Key');
    if (column.unique) constraints.push('Unique');
    if (column.not_null) constraints.push('Not Null');
    if (column.increment) constraints.push('Auto Increment');
    return constraints;
  };

  const getColumnType = (column) => {
    return column.type?.type_name || 'unknown';
  };

  const getDefaultValue = (column) => {
    if (column.dbdefault) {
      return column.dbdefault.value || column.dbdefault;
    }
    return null;
  };

  // Position tooltip to avoid going off screen
  const tooltipStyle = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320), // 320px is tooltip width
    top: Math.min(position.y, window.innerHeight - 200), // Estimate tooltip height
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
    <div style={tooltipStyle} data-tooltip="column">
      {/* Header with column name and icon */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '12px',
        borderBottom: `1px solid ${getThemeVar('panelBorder')}`,
        paddingBottom: '8px'
      }}>
        <span style={{ fontSize: '14px' }}>
          {getColumnIcon(column)}
        </span>
        <span style={{ 
          fontWeight: 'bold', 
          fontSize: '14px',
          color: column.pk ? getThemeVar('symbolIconKeywordForeground') : getThemeVar('foreground')
        }}>
          {column.name}
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

      {/* Column type */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ 
          color: getThemeVar('descriptionForeground'),
          fontWeight: '500'
        }}>
          Type: 
        </span>
        <span style={{ 
          marginLeft: '6px',
          fontFamily: 'monospace',
          backgroundColor: getThemeVar('textCodeBlockBackground'),
          padding: '2px 4px',
          borderRadius: '3px',
          fontSize: '11px'
        }}>
          {getColumnType(column)}
        </span>
      </div>

      {/* Constraints */}
      {getColumnConstraints(column).length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ 
            color: getThemeVar('descriptionForeground'),
            fontWeight: '500'
          }}>
            Constraints: 
          </span>
          <div style={{ marginTop: '4px' }}>
            {getColumnConstraints(column).map((constraint, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  backgroundColor: getThemeVar('badgeBackground'),
                  color: getThemeVar('badgeForeground'),
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  marginRight: '4px',
                  marginBottom: '2px'
                }}
              >
                {constraint}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Default value */}
      {getDefaultValue(column) && (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ 
            color: getThemeVar('descriptionForeground'),
            fontWeight: '500'
          }}>
            Default: 
          </span>
          <span style={{ 
            marginLeft: '6px',
            fontFamily: 'monospace',
            backgroundColor: getThemeVar('textCodeBlockBackground'),
            padding: '2px 4px',
            borderRadius: '3px',
            fontSize: '11px'
          }}>
            {getDefaultValue(column)}
          </span>
        </div>
      )}

      {/* Column note */}
      {column.note && (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ 
            color: getThemeVar('descriptionForeground'),
            fontWeight: '500'
          }}>
            Note: 
          </span>
          <span style={{ 
            marginLeft: '6px',
            fontStyle: 'italic',
            color: getThemeVar('descriptionForeground')
          }}>
            {column.note}
          </span>
        </div>
      )}

      {/* Enum values */}
      {enumDef && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ 
            color: getThemeVar('descriptionForeground'),
            fontWeight: '500',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>📋</span>
            <span>Enum Values ({enumDef.name}):</span>
          </div>
          <div style={{
            backgroundColor: getThemeVar('textCodeBlockBackground'),
            border: `1px solid ${getThemeVar('panelBorder')}`,
            borderRadius: '4px',
            padding: '8px',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            {enumDef.values.map((value, index) => (
              <div 
                key={index}
                style={{
                  padding: '4px 0',
                  borderBottom: index < enumDef.values.length - 1 ? `1px solid ${getThemeVar('panelBorder')}` : 'none'
                }}
              >
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: getThemeVar('symbolIconVariableForeground')
                }}>
                  {value.name}
                </div>
                {value.note && (
                  <div style={{
                    fontSize: '10px',
                    color: getThemeVar('descriptionForeground'),
                    fontStyle: 'italic',
                    marginTop: '2px',
                    paddingLeft: '8px'
                  }}>
                    {value.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnTooltip;