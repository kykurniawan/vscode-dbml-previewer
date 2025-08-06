import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';

const TableNavigationDropdown = ({ dbmlData, onTableSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Helper function to highlight search matches
  const highlightMatch = useCallback((text, query) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return (
          <span key={index} style={{ 
            backgroundColor: 'var(--vscode-editor-findMatchHighlightBackground)',
            color: 'var(--vscode-editor-foreground)',
            fontWeight: 'bold'
          }}>
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);

  // Extract and organize tables from DBML data
  const allTableOptions = useMemo(() => {
    if (!dbmlData?.schemas || dbmlData.schemas.length === 0) {
      return [];
    }

    const hasMultipleSchemas = dbmlData.schemas.length > 1;
    const options = [];

    dbmlData.schemas.forEach(schema => {
      if (schema.tables && schema.tables.length > 0) {
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

  // Filter and organize tables based on search query
  const filteredTableOptions = useMemo(() => {
    if (!allTableOptions.length) return [];

    const hasMultipleSchemas = dbmlData?.schemas?.length > 1;
    let filtered = allTableOptions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = allTableOptions.filter(option => 
        option.label.toLowerCase().includes(query) ||
        option.table.name.toLowerCase().includes(query)
      );
    }

    // Group by schema if multiple schemas exist
    if (hasMultipleSchemas) {
      const grouped = [];
      const schemaGroups = {};

      filtered.forEach(option => {
        if (!schemaGroups[option.schemaName]) {
          schemaGroups[option.schemaName] = [];
        }
        schemaGroups[option.schemaName].push(option);
      });

      // Add schema headers and tables
      Object.keys(schemaGroups).forEach(schemaName => {
        if (schemaGroups[schemaName].length > 0) {
          grouped.push({
            type: 'header',
            label: schemaName,
            value: `schema-${schemaName}`
          });
          grouped.push(...schemaGroups[schemaName]);
        }
      });

      return grouped;
    }

    return filtered;
  }, [allTableOptions, searchQuery, dbmlData]);

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Clear search when opening dropdown
      setSearchQuery('');
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure the dropdown is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleTableSelect = useCallback((option) => {
    if (option.type === 'table') {
      setSelectedValue(option.label);
      setIsOpen(false);
      setSearchQuery('');
      onTableSelect(option);
    }
  }, [onTableSelect]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      // Select first table result if available
      const firstTable = filteredTableOptions.find(option => option.type === 'table');
      if (firstTable) {
        handleTableSelect(firstTable);
      }
    }
  }, [filteredTableOptions, handleTableSelect]);

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

  if (allTableOptions.length === 0) {
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
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
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
            maxHeight: '320px',
            overflowY: 'auto',
            zIndex: 1001,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          {/* Search Input */}
          <div style={{
            position: 'sticky',
            top: 0,
            background: 'var(--vscode-dropdown-background)',
            borderBottom: '1px solid var(--vscode-dropdown-border)',
            padding: '8px',
            zIndex: 1002
          }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tables..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              style={{
                width: '100%',
                background: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '2px',
                padding: '4px 8px',
                fontSize: '12px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--vscode-focusBorder)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--vscode-input-border)';
              }}
            />
          </div>

          {/* Search Results Info */}
          {searchQuery.trim() && (
            <div style={{
              padding: '4px 8px',
              fontSize: '10px',
              zIndex: 1000,
              color: 'var(--vscode-descriptionForeground)',
              borderBottom: '1px solid var(--vscode-dropdown-border)',
              background: 'var(--vscode-list-inactiveSelectionBackground)'
            }}>
              {filteredTableOptions.filter(opt => opt.type === 'table').length} results
            </div>
          )}

          {/* Table Options */}
          {filteredTableOptions.length === 0 && searchQuery.trim() ? (
            <div style={{
              padding: '12px',
              textAlign: 'center',
              color: 'var(--vscode-descriptionForeground)',
              fontSize: '12px',
              fontStyle: 'italic'
            }}>
              No tables found for "{searchQuery}"
            </div>
          ) : (
            filteredTableOptions.map((option) => {
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
                  {highlightMatch(option.label, searchQuery)}
                </span>
              </button>
            );
          })
        )}
        </div>
      )}
    </div>
  );
};

export default TableNavigationDropdown;