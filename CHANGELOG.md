# Change Log

All notable changes to the "dbml-previewer" extension will be documented in this file.

## 1.0.0

### Added
- **Theme Configuration**: New `diagram.inheritThemeStyle` setting to control VS Code theme inheritance (default: false)
- **Edge Type Configuration**: New `diagram.edgeType` setting with 4 edge types: straight, step, smoothstep, and bezier (default: smoothstep)
- **Centralized Theme System**: Complete theme management system with light theme optimized for diagram readability
- **Real-time Configuration Updates**: Theme and edge type changes apply immediately without extension restart

### Improved
- **Theme Independence**: Clean light theme used by default instead of VS Code theme to prevent styling issues with poorly designed themes
- **Visual Consistency**: All components (tooltips, dropdowns, backgrounds) now use centralized theming
- **Edge Customization**: Users can choose from 4 React Flow edge types for different visual preferences
- **Configuration Experience**: Comprehensive settings with detailed descriptions and enum options

### Technical
- Added `src/webview/styles/themeManager.js` - Core theme management system
- Added `src/webview/styles/defaultTheme.js` - Clean light theme definition
- Added `src/webview/styles/vscodeTheme.js` - VS Code theme variable mapping
- Updated all components to use `getThemeVar()` helper function for centralized theming
- Enhanced `extension.js` to handle configuration changes and pass settings to webview
- Updated `package.json` with new configuration options and detailed descriptions

### Configuration Options
- **Theme Inheritance** (`diagram.inheritThemeStyle`):
  - Type: boolean (default: false)
  - Description: Whether to inherit styling from VS Code theme or use clean light theme
- **Edge Type** (`diagram.edgeType`):
  - Type: enum (default: "smoothstep")
  - Options: straight, step, smoothstep, bezier
  - Description: Visual style for table relationship connections

## 0.0.5

### Fixed
- **Relationship For Same Table Name With Different Schema**: Fixed issue where relationships were not properly drawn for tables with the same name but in different schemas

## 0.0.4

### Added
- **Advanced Navigation System**: Comprehensive table navigation with searchable dropdown menu for quick table location
- **Interactive Minimap**: Visual minimap for easy navigation across large database schemas with VS Code theme integration
- **Sticky Notes Support**: Resizable sticky notes functionality for documentation and annotations within diagrams
- **Enhanced Zoom Controls**: Improved zoom capabilities with extended zoom-out range for viewing very large schemas

### Fixed
- **Large Schema Navigation**: Fixed zoom out limitations by extending minimum zoom to 0.05x, allowing complete overview of extensive database designs
- **Navigation UX**: Resolved navigation challenges in complex multi-table environments with dedicated navigation tools

### Improved
- **Search and Discovery**: Real-time table search with highlight matching and keyboard navigation support
- **Navigation Experience**: Smooth animated transitions when navigating to tables with automatic centering and appropriate zoom levels

### Features Detail
- **Table Navigation Dropdown**: 
  - Searchable dropdown with fuzzy matching and result highlighting
  - Schema grouping for multi-schema databases with proper organization
  - Keyboard navigation support (Enter to select, Escape to close)
  - Auto-focus search input for immediate typing
  - Table count indicators and grouped results display
- **Interactive Minimap**:
  - Positioned bottom-right with pannable functionality
  - VS Code theme variables integration for consistent appearance
  - Border and shadow styling matching editor aesthetics
  - Node visualization with proper stroke and fill colors
- **Resizable Sticky Notes**:
  - Drag-and-drop positioning with automatic layout persistence
  - Resizable dimensions with minimum/maximum size constraints
  - Sticky note visual styling with folded corner effects
  - Content overflow handling with scrollable text areas
- **Enhanced Zoom System**:
  - Extended zoom range from 0.05x to 2x (previously limited zoom out)
  - Smooth zoom transitions with proper focal point handling
  - Improved performance for large schema rendering at low zoom levels

### Technical
- Updated `src/webview/components/DBMLPreview.js` with MiniMap component integration and enhanced zoom controls
- Added `src/webview/components/TableNavigationDropdown.js` for advanced table search and navigation
- Added `src/webview/components/StickyNote.js` with NodeResizer integration for resizable note functionality  
- Enhanced ReactFlow configuration with `minZoom={0.05}` and `maxZoom={2}` for improved zoom range
- Integrated Panel-based UI components for better user experience and consistent positioning
- Added search highlighting functionality with regex-based matching and visual emphasis
- Implemented automatic table centering with duration-based smooth animations using `setCenter()` API

## 0.0.3

### Fixed
- **Table Header Width Overflow**: Fixed issue where tables with very long names would cause header text to overlap or overflow
- **Automatic Width Calculation**: Table width now automatically adjusts based on table name length to prevent text truncation
- **Schema-Prefixed Table Names**: Proper width calculation for multi-schema databases where table names include schema prefixes

### Improved
- **Cleaner User Interface**: Removed table header emoji (📋) for a more professional and streamlined appearance
- **Header Layout Algorithm**: Enhanced `calculateTableWidth()` function to consider both column content and header text requirements
- **Multi-Schema Support**: Better handling of table name display width in multi-schema environments

### Technical
- Added `calculateHeaderWidth()` function in `src/webview/utils/dbmlTransformer.js` for precise header width calculation
- Updated `calculateTableWidth()` function to use `Math.max()` between header width, column width, and minimum width requirements
- Modified `TableNode.js` and `TableHeaderNode.js` components to remove emoji icons
- Enhanced width calculation logic to account for table notes button when present

## 0.0.2

### Added
- **Enhanced Error Handling System**: Comprehensive DBML parser error display with detailed technical information
- **Smart Error Parser**: Intelligent extraction of line numbers, column positions, and error context
- **Rich Error Display Component**: Professional UI with collapsible sections for context, suggestions, and technical details
- **Actionable Error Suggestions**: Context-aware suggestions with DBML syntax examples and common fix patterns
- **Error Categorization**: Automatic classification of errors into types (syntax, encoding, expectation, structure)
- **Code Context Display**: Shows error location with syntax highlighting and surrounding code lines
- **Comprehensive Error Serialization**: Complete error object information with stack traces and property details

### Fixed
- **"[object Object]" Display Issue**: Technical error details now show readable information instead of `[object Object]`
- **Error Message Extraction**: Improved handling of various error object formats and fallback scenarios
- **Circular Reference Handling**: Safe serialization of complex error objects with circular references
- **Function Property Display**: Proper handling of error objects containing function properties

### Improved
- **Error User Experience**: Professional error display similar to modern IDEs with clear visual hierarchy
- **Debugging Workflow**: Precise error locations with line/column numbers and code context
- **Error Recovery**: Better retry functionality with enhanced error analysis
- **Technical Details**: Expandable sections for stack traces, raw error objects, and debug information

### Technical
- Added `src/webview/utils/errorParser.js` - Core error parsing and enhancement utility
- Added `src/webview/components/ErrorDisplay.js` - Rich error display component
- Updated `src/webview/components/DBMLPreview.js` - Integration with enhanced error handling
- Updated `eslint.config.mjs` - Improved React JSX support configuration
- Enhanced error serialization with multi-strategy message extraction
- Comprehensive test coverage for various error object formats

## 0.0.1

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