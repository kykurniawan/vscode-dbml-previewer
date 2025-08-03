# DBML Previewer

A Visual Studio Code extension that provides interactive previews for DBML (Database Markup Language) files using React and React Flow.

## Features

- **Interactive Database Diagrams**: Visualize your database schema as interactive flow diagrams
- **Real-time Updates**: Preview updates automatically when you save your DBML files
- **VS Code Integration**: Seamlessly integrates with VS Code's interface and theming
- **Table Relationships**: Visual representation of foreign key relationships between tables
- **Auto-layout**: Automatically arranges tables for optimal viewing
- **Zoom & Pan**: Navigate large schemas with ease

## Usage

1. Open any `.dbml` file in VS Code
2. Use one of these methods to open the preview:
   - Press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (macOS)
   - Right-click the file and select "Preview DBML"
   - Use the preview button in the editor title bar
   - Open Command Palette (`Ctrl+Shift+P`) and run "DBML Previewer: Preview DBML"

## DBML Support

This extension supports DBML syntax including:
- Tables with columns, types, and constraints
- Primary keys, foreign keys, and unique constraints
- Table relationships and references
- Table notes and comments
- Indexes

## Example

See `example.dbml` in this repository for a sample DBML file to test the extension.

## Requirements

- VS Code 1.102.0 or higher
- Node.js (for development)

## Development

To develop this extension:

```bash
# Install dependencies
yarn install

# Build the React webview bundle
yarn build

# Run in development mode with file watching
yarn watch
```

## Release Notes

### 0.0.1

- Initial release with interactive DBML preview
- React Flow integration for interactive diagrams
- Auto-layout using Dagre
- VS Code theme integration
- Real-time file watching and updates

## License

MIT
