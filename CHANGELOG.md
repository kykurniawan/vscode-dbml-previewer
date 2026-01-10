# Change Log

All notable changes to the "dbml-previewer" extension will be documented in this file.

## 1.3.2

### Fixed
- **Open VSX Publishing Failure**: Fixed workflow failure caused by invalid `--no-yarn` flag
  - Removed unsupported `--no-yarn` option from `publish:ovsx` npm script
  - The ovsx CLI defaults to npm without any flag (only accepts `--yarn` to use Yarn explicitly)
  - Open VSX publishing now works correctly in automated GitHub Actions workflow

### Technical
- Updated `package.json` publish:ovsx script from `ovsx publish --no-yarn` to `ovsx publish`
- Updated workflow to use `OVSX_PAT` environment variable (ovsx CLI convention) instead of explicit token flag
- Fixed compatibility with ovsx CLI per official OpenVSX documentation

## 1.3.1

### Added
- **Open VSX Registry Support**: Extension is now available on Open VSX Registry for VSCodium and other VS Code compatible editors
  - Published to both VS Code Marketplace and Open VSX Registry
  - VSCodium users can now install the extension directly from Open VSX
  - Support for Eclipse Theia, Gitpod, and other VS Code compatible editors
  - Automated dual-marketplace publishing via GitHub Actions

### Improved
- **Installation Documentation**: Enhanced README with installation instructions for multiple editors
  - Added Open VSX badge and links
  - Installation commands for both VS Code and VSCodium
  - Listed all supported editors with marketplace links
- **Publishing Documentation**: Updated PUBLISHING.md with comprehensive Open VSX setup guide
  - Step-by-step token creation instructions
  - Troubleshooting guide for Open VSX-specific issues
  - Manual publishing commands for both marketplaces

### Technical
- Updated `.github/workflows/release.yml` with Open VSX publishing steps
  - Added `ovsx` CLI installation
  - Sequential publishing to both marketplaces with independent error handling
  - Publishing summary report showing status of both marketplaces
  - GitHub release notes now include links to both marketplaces
- Added `publish:ovsx` npm script for manual Open VSX publishing
- Enhanced GitHub Actions workflow with graceful error handling
  - Each marketplace publishes independently
  - Workflow succeeds if at least one marketplace publishes successfully
  - Clear status reporting for both marketplaces in GitHub Actions summary

## 1.3.0

### Added
- **Clickable Table Names in Relationship Tooltips**: Table names in relationship tooltips are now clickable for quick navigation
  - Click any table name in a relationship tooltip to instantly navigate to that table
  - Visual link styling with dotted underline and hover effects
  - Uses VS Code theme colors for consistent appearance
  - Tooltip shows "Click to navigate to this table" on hover

### Improved
- **Enhanced Navigation Zoom**: Increased zoom level from 1.0x to 1.5x when navigating to tables for better visibility
  - Applies to both dropdown table selection and relationship tooltip table clicks
  - Smoother navigation experience with larger, more readable tables
  - Better focus on the target table with appropriate zoom level

### Technical
- Added `EdgeNavigationProvider` component in `src/webview/components/DBMLPreview.js` for cross-component navigation
- Enhanced `src/webview/components/EdgeTooltip.js` with clickable table name functionality:
  - Added `handleTableClick()` function to handle table navigation
  - Extracts source and target table names from relationship data
  - Applies theme-aware link styling with hover states
  - Integrates with navigation system for smooth transitions
- Updated table navigation zoom level to 1.5x in both navigation paths
- Implemented proper event handling with preventDefault() for link clicks

## 1.2.0

### Added
- **Custom Table Header Colors**: Support for DBML `headercolor` property to customize individual table header colors
- **Custom Table Group Colors**: Support for DBML table group `color` property to customize table group styling
- **Automatic Text Contrast**: Smart text color calculation using WCAG luminance formula for optimal readability
  - Automatically chooses white or black text based on background brightness
  - Ensures accessible contrast ratios for all custom colors
- **Color Validation**: Hex color format validation with console warnings for invalid colors
- **Graceful Fallback**: Seamless fallback to theme colors when custom colors are not specified

### Improved
- **Visual Customization**: Tables and table groups can now have distinct colors for better visual organization
- **Accessibility**: Improved text readability on custom-colored headers through automatic contrast calculation
- **Theme Integration**: Custom colors work seamlessly with existing theme system and VS Code theme inheritance

### Technical
- Added `src/webview/utils/colorUtils.js` - Color utility functions for validation and contrast calculation
  - `isValidHexColor()` - Validates hex color format (#fff or #ffffff)
  - `getContrastColor()` - Calculates optimal text color using WCAG luminance formula
  - `parseHeaderColor()` - Validates and normalizes color values with warning logs
- Updated `src/webview/components/TableHeaderNode.js` - Apply custom header colors when available
- Updated `src/webview/components/TableGroupNode.js` - Apply custom group colors with proper transparency
- Color support for all table group states: normal (10%), hover (15%), and selected (20%) transparency

### DBML Syntax Examples
- **Table with custom header color**:
  ```dbml
  Table Users [headercolor: #27AE60] {
    id int [pk]
    username varchar
  }
  ```
- **Table group with custom color**:
  ```dbml
  TableGroup UserManagement [color: #ED9C6E] {
    Users
    Roles
  }
  ```

## 1.1.0

### Added
- **PNG Export**: Export diagrams as high-resolution PNG images (2x pixel ratio for crisp quality)
- **SVG Export**: Export diagrams as scalable vector graphics for presentations and documentation
- **Export Configuration Options**: Three new settings to customize export output:
  - `diagram.exportQuality` (0.1-1.0, default: 0.95) - PNG image quality control
  - `diagram.exportBackground` (boolean, default: true) - Toggle background inclusion for transparent exports
  - `diagram.exportPadding` (0-100px, default: 20) - Configurable padding around exported diagrams
- **Export Commands**: New VSCode commands accessible via Command Palette:
  - "Export Diagram to PNG" - Export current diagram as PNG image
  - "Export Diagram to SVG" - Export current diagram as SVG vector image
- **Export UI Buttons**: Convenient export buttons in the stats panel (top-right):
  - 📷 Export PNG button
  - 🖼️ Export SVG button
- **Smart Filename Generation**: Automatic timestamped filenames based on DBML file name

### Improved
- **Clean Export Output**: UI controls (minimap, panels, navigation) automatically hidden during export
- **Professional Image Quality**: High-resolution exports suitable for documentation and presentations
- **Transparent Background Support**: Option to export diagrams with transparent backgrounds for flexible use
- **Error Handling**: Graceful error recovery with automatic UI restoration if export fails

### Technical
- Added `html-to-image@1.11.11` dependency (recommended version per XY Flow documentation)
- Enhanced `DBMLPreview.js` with export handlers: `handleExportToPng()` and `handleExportToSvg()`
- Updated `extension.js` with export command registration and active panel tracking
- Implemented context management (`dbmlPreviewerActive`) for command availability
- Added temporary UI hiding during export with automatic restoration
- Configuration synchronization between extension and webview for export settings

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
- Export to PDF format
- Advanced search and filter functionality
- Custom theme creation and color schemes
- Schema comparison tools
- Performance optimizations for very large databases
- Column note tooltips enhancement
- Bulk table operations
- Diagram statistics and analytics