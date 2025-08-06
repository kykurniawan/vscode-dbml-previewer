import React, { useState, useCallback, useMemo } from 'react';

const TableNavigationDropdown = ({ dbmlData, onTableSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');

  // Extract and organize tables from DBML data
  const tableOptions = useMemo(() => {
    if (!dbmlData?.schemas || dbmlData.schemas.length === 0) {
      return [];
    }

    const hasMultipleSchemas = dbmlData.schemas.length > 1;
    const options = [];

    dbmlData.schemas.forEach(schema => {
      if (schema.tables && schema.tables.length > 0) {
        // Add schema header if multiple schemas exist
        if (hasMultipleSchemas) {
          options.push({
            type: 'header',
            label: schema.name || 'public',
            value: `schema-${schema.name || 'public'}`
          });
        }

        // Add tables for this schema
        schema.tables.forEach(table => {
          const displayName = hasMultipleSchemas && schema.name 
            ? `${schema.name}.${table.name}`
            : table.name;
          
          const fullName = hasMultipleSchemas && schema.name 
            ? `${schema.name}.${table.name}`
            : table.name;

          options.push({
            type: 'table',
            label: displayName,
            value: fullName,
            table: table,
            schemaName: schema.name || 'public'
          });
        });
      }
    });

    return options;
  }, [dbmlData]);

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleTableSelect = useCallback((option) => {
    if (option.type === 'table') {
      setSelectedValue(option.label);
      setIsOpen(false);
      onTableSelect(option);
    }
  }, [onTableSelect]);

  const handleClickOutside = useCallback((e) => {
    // Close dropdown when clicking outside
    if (!e.target.closest('[data-table-dropdown]')) {
      setIsOpen(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  if (tableOptions.length === 0) {
    return null;
  }

  return (
    <div 
      data-table-dropdown
      style={{
        position: 'relative',
        minWidth: '200px',
        maxWidth: '300px',
        zIndex: 1000
      }}
    >
      {/* Dropdown Button */}
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          background: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: '2px',
          padding: '6px 8px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left'
        }}
        title="Navigate to table"
      >
        <span style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          flex: 1
        }}>
          {selectedValue || 'Select a table...'}
        </span>
        <span style={{ 
          marginLeft: '4px',
          fontSize: '10px',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--vscode-dropdown-background)',
            border: '1px solid var(--vscode-dropdown-border)',
            borderTop: 'none',
            borderRadius: '0 0 2px 2px',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1001,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          {tableOptions.map((option) => {
            if (option.type === 'header') {
              return (
                <div
                  key={option.value}
                  style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: 'var(--vscode-descriptionForeground)',
                    backgroundColor: 'var(--vscode-list-inactiveSelectionBackground)',
                    borderBottom: '1px solid var(--vscode-list-inactiveSelectionBackground)',
                    textTransform: 'uppercase'
                  }}
                >
                  {option.label}
                </div>
              );
            }

            return (
              <button
                key={option.value}
                onClick={() => handleTableSelect(option)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: 'var(--vscode-dropdown-foreground)',
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
                title={`Navigate to ${option.label}`}
              >
                <span style={{ 
                  marginRight: '6px',
                  fontSize: '10px',
                  opacity: 0.7
                }}>
                  📋
                </span>
                <span style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap'
                }}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TableNavigationDropdown;