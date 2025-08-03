# DBML Previewer

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue)](https://marketplace.visualstudio.com/items?itemName=openframebox.dbml-previewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/openframebox/vscode-dbml-previewer)](https://github.com/openframebox/vscode-dbml-previewer/issues)
[![GitHub stars](https://img.shields.io/github/stars/openframebox/vscode-dbml-previewer)](https://github.com/openframebox/vscode-dbml-previewer/stargazers)

A powerful Visual Studio Code extension that transforms DBML (Database Markup Language) files into interactive, visual database diagrams. Perfect for database architects, developers, and anyone working with database schemas.

![DBML Previewer Demo](https://raw.githubusercontent.com/openframebox/vscode-dbml-previewer/main/assets/demo.gif)

## ✨ Features

### 🎯 Interactive Database Diagrams
- **Visual Schema Representation**: Transform text-based DBML into interactive flow diagrams
- **Real-time Updates**: Automatically refresh preview when you save your DBML files
- **Smart Auto-layout**: Intelligent table positioning using advanced graph algorithms
- **Manual Positioning**: Drag tables to customize layout - positions are automatically saved per file

### 🔗 Relationship Visualization
- **Connection Lines**: Visual representation of foreign key relationships
- **Cardinality Indicators**: Clear 1:1, 1:*, and *:* relationship labeling
- **Interactive Edges**: Click on relationship lines to view detailed connection information
- **Column-level Connections**: Precise source and target column identification

### 📊 Advanced Schema Support
- **Multi-Schema Files**: Support for complex DBML files with multiple schemas
- **Table Grouping**: Visual grouping of related tables with background containers
- **Column Details**: Rich column information including types, constraints, and keys
- **Schema Navigation**: Easy navigation through large database schemas

### 🎨 VS Code Integration
- **Native Theme Support**: Automatically adapts to your VS Code theme (dark/light)
- **Multiple Access Points**: Open preview via command palette, context menu, or keyboard shortcuts
- **Side-by-side View**: Preview opens alongside your DBML file for easy editing
- **Keyboard Shortcuts**: Quick access with `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (macOS)

## 🚀 Quick Start

### Installation

1. **From VS Code Marketplace**:
   - Open VS Code
   - Go to Extensions (`Ctrl+Shift+X`)
   - Search for "DBML Previewer"
   - Click Install

2. **From Command Line**:
   ```bash
   code --install-extension openframebox.dbml-previewer
   ```

### Usage

1. **Open any `.dbml` file** in VS Code
2. **Use one of these methods** to open the preview:
   - Press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (macOS)
   - Right-click the file and select "Preview DBML"
   - Use the preview button in the editor title bar
   - Open Command Palette (`Ctrl+Shift+P`) and run "DBML Previewer: Preview DBML"

### Example DBML File

Create a `.dbml` file with this sample content to try the extension:

```dbml
Project sample_project {
  database_type: 'PostgreSQL'
  Note: 'Sample e-commerce database schema'
}

Table users {
  id integer [primary key, increment]
  username varchar(50) [not null, unique]
  email varchar(100) [not null, unique]
  created_at timestamp [default: `now()`]
  
  Note: 'User accounts table'
}

Table orders {
  id integer [primary key, increment]
  user_id integer [not null, ref: > users.id]
  total decimal(10,2) [not null]
  status varchar(20) [default: 'pending']
  created_at timestamp [default: `now()`]
  
  Note: 'Customer orders'
}

Table order_items {
  order_id integer [ref: > orders.id]
  product_id integer [not null]
  quantity integer [not null]
  price decimal(10,2) [not null]
  
  indexes {
    (order_id, product_id) [pk]
  }
}
```

## 📖 DBML Support

This extension supports the full DBML specification including:

- ✅ **Tables** with columns, types, and constraints
- ✅ **Primary Keys** and **Foreign Keys** with visual indicators
- ✅ **Relationships** (`>`, `<`, `-`) with proper cardinality display
- ✅ **Unique Constraints** and **Not Null** constraints
- ✅ **Table Notes**
- ✅ **Indexes** (simple and composite)
- ✅ **Table Groups** for schema organization
- ✅ **Multi-schema** database support
- ✅ **Default Values** and **Auto-increment** fields

## 🎛️ Controls and Navigation

### Diagram Controls
- **Zoom**: Mouse wheel or zoom controls in bottom-left
- **Pan**: Click and drag empty space to move around
- **Fit View**: Reset zoom to fit entire diagram

### Table Interaction
- **Drag Tables**: Click and drag table headers to reposition
- **Group Movement**: Drag table groups to move all contained tables
- **Relationship Details**: Click relationship lines for detailed information

### Keyboard Shortcuts
- `Ctrl+Shift+D` / `Cmd+Shift+D`: Open DBML preview
- Mouse wheel: Zoom in/out
- Space + drag: Pan diagram
- Escape: Close relationship tooltips

## ⚙️ Configuration

The extension works out of the box with sensible defaults. Future versions will include:

- Custom theme colors
- Layout algorithm options
- Export settings
- Performance optimizations

## 🔧 Development

### Prerequisites
- Node.js 22.16+ and npm/yarn
- Visual Studio Code 1.102.0+

### Setup
```bash
# Clone the repository
git clone https://github.com/openframebox/vscode-dbml-previewer.git
cd vscode-dbml-previewer

# Install dependencies
yarn install

# Build the extension
yarn build

# Run in development mode
yarn watch
```

### Testing
```bash
# Run linting
yarn lint

# Run tests
yarn test
```

### Project Structure
```
├── extension.js           # Main extension entry point
├── src/webview/          # React-based preview interface
│   ├── components/       # React components
│   ├── utils/           # Utility functions
│   └── index.js         # Webview entry point
├── dist/                # Built webview bundle
└── test/               # Test files
```

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

### Ways to Contribute
- 🐛 **Bug Reports**: Found an issue? Let us know!
- 💡 **Feature Requests**: Have an idea? We'd love to hear it!
- 🔧 **Code Contributions**: Submit pull requests with improvements
- 📚 **Documentation**: Help improve our documentation
- 🌍 **Translations**: Help us support more languages

### Quick Contribution Steps
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 🐛 Issues and Support

### Reporting Issues
If you encounter any problems:

1. **Check existing issues** on [GitHub Issues](https://github.com/openframebox/vscode-dbml-previewer/issues)
2. **Create a new issue** with:
   - Clear description of the problem
   - Steps to reproduce
   - Sample DBML file (if applicable)
   - VS Code version and OS information

### Getting Help
- 📖 Check our documentation and FAQ
- 💬 Join discussions in GitHub Issues
- 📧 Contact us at openframebox@gmail.com

## 📋 Requirements

- **VS Code**: Version 1.102.0 or higher
- **Node.js**: 22.16+ (for development only)
- **File Format**: `.dbml` files using DBML v2 syntax

## 🛣️ Roadmap

### Upcoming Features
- 📤 **Export Options**: PNG, SVG, PDF export functionality
- 🔍 **Search & Filter**: Find tables and columns quickly
- 🎨 **Theme Customization**: Custom colors and styling options
- 📏 **Minimap**: Overview for large schemas
- 🔄 **Schema Comparison**: Compare different versions of schemas
- 🚀 **Performance**: Optimizations for very large databases

### Long-term Goals
- Integration with popular databases
- Collaborative editing features
- Advanced schema validation
- Migration planning tools

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **DBML Community**: For creating and maintaining the DBML specification
- **React Flow**: For the excellent diagram visualization library
- **VS Code Team**: For the robust extension API
- **Contributors**: Everyone who helps make this project better

## 📈 Stats

- ⭐ **GitHub Stars**: Show your support!
- 🔧 **Active Development**: Regularly updated and maintained
- 🌟 **Community Driven**: Built with feedback from users
- 🚀 **Production Ready**: Used by developers worldwide

---

**Made with ❤️ by [Open Framebox](https://github.com/openframebox)**

*Transform your database schemas from text to visual understanding*