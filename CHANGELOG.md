# Change Log

All notable changes to the "dbml-previewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.1] - 2025-01-04

### Added
- Interactive DBML file preview with visual database diagrams
- Real-time updates when DBML files are saved
- Smart auto-layout using advanced graph algorithms
- Manual table positioning with automatic position persistence
- Support for relationships with cardinality indicators (1:1, 1:*, *:*)
- Multi-schema DBML file support
- Table grouping with visual background containers
- Column details with types, constraints, and keys
- Relationship tooltips with detailed connection information
- Column tooltips showing detailed field information
- Native VS Code theme support (dark/light mode)
- Multiple access methods: command palette, context menu, keyboard shortcuts
- Keyboard shortcut: `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (macOS)
- Zoom and pan controls for large diagrams
- DBML language configuration for syntax support

### Features
- Full DBML specification support including:
  - Tables with columns, types, and constraints
  - Primary keys and foreign keys with visual indicators
  - Relationships (`>`, `<`, `-`) with proper cardinality display
  - Unique constraints and not null constraints
  - Table notes with interactive popup tooltips
  - Indexes (simple and composite)
  - Table groups for schema organization
  - Multi-schema database support
  - Default values and auto-increment fields
  - Enum support with column tooltips

### Technical
- Built with React 18 and React Flow for diagram visualization
- Uses @dbml/core for DBML parsing
- Dagre algorithm for automatic layout
- Webpack build system for extension packaging
- ESLint configuration for code quality
- Comprehensive test suite

## [Unreleased]

### Planned Features
- Export options (PNG, SVG, PDF)
- Search and filter functionality
- Theme customization options
- Minimap for large schemas
- Schema comparison tools
- Performance optimizations for very large databases
- Column note tooltips enhancement
- Bulk table operations