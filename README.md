# 🚀 DBML Previewer

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue)](https://marketplace.visualstudio.com/items?itemName=rizkykurniawan.dbml-previewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/kykurniawan/vscode-dbml-previewer)](https://github.com/kykurniawan/vscode-dbml-previewer/issues)
[![GitHub stars](https://img.shields.io/github/stars/kykurniawan/vscode-dbml-previewer)](https://github.com/kykurniawan/vscode-dbml-previewer/stargazers)

**Transform your DBML files into beautiful, interactive database diagrams instantly!** ✨

Perfect for database architects, developers, and anyone working with database schemas. Turn text-based DBML into visual understanding with just one click.

![DBML Previewer Demo](https://raw.githubusercontent.com/kykurniawan/assets/main/vscode-dbml-previewer/demo.gif)

## 🌟 What's New

### v1.0.0 - Major Configuration Release
- ⚙️ **Theme Configuration**: Choose between VS Code theme inheritance or clean light theme (default: light)
- 🔗 **Edge Type Options**: 4 relationship line styles - straight, step, smoothstep, and bezier
- 🎨 **Centralized Theming**: All components now use consistent, reliable styling
- ⚡ **Real-time Updates**: Configuration changes apply instantly without restart

### Previous Updates
- 📝 **Smart Table Notes**: Click note icons to view table notes in clean popup tooltips
- 🎯 **Enhanced UX**: No more broken layouts with long table notes
- 🔄 **Improved Performance**: Optimized rendering and interaction handling

## ⚡ Key Features

### 🎯 **Instant Visual Database Diagrams**
✅ **One-Click Preview** - Transform DBML files into interactive diagrams instantly  
✅ **Real-Time Updates** - See changes as you save your DBML files  
✅ **Drag & Drop Tables** - Customize layout with automatic position saving  
✅ **Smart Table Notes** - Clean popup tooltips for table documentation  

### 🔗 **Intelligent Relationship Mapping**
✅ **Visual Connections** - See foreign key relationships at a glance  
✅ **Interactive Tooltips** - Click relationships for detailed information  
✅ **Column-Level Precision** - Exact source and target column identification  
✅ **Cardinality Display** - Clear 1:1, 1:*, *:* relationship indicators  

### 📊 **Enterprise-Ready Schema Support**
✅ **Multi-Schema Files** - Handle complex databases with multiple schemas  
✅ **Table Grouping** - Visual organization with background containers  
✅ **Rich Column Details** - Types, constraints, keys, and enum support  
✅ **Full DBML Specification** - Complete support for all DBML features  

### 🎨 **Seamless VS Code Integration**
✅ **Flexible Theming** - Choose VS Code theme inheritance or clean light theme
✅ **Multiple Access Points** - Command palette, context menu, keyboard shortcuts
✅ **Side-by-Side Editing** - Preview alongside your DBML file
✅ **Quick Access** - `Ctrl+Shift+D` / `Cmd+Shift+D` keyboard shortcut  

## 🚀 Get Started in 30 Seconds

### 📦 **Quick Install**
```bash
# Install from command line
code --install-extension rizkykurniawan.dbml-previewer
```

**Or** search "DBML Previewer" in VS Code Extensions (`Ctrl+Shift+X`)

### ⚡ **Instant Usage**
1. 📁 **Open** any `.dbml` file in VS Code
2. ⌨️ **Press** `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (macOS)
3. 🎉 **Done!** Your database diagram appears instantly

**Alternative Methods:**
- Right-click file → "Preview DBML"
- Click preview button in editor title bar
- Command Palette → "DBML Previewer: Preview DBML"

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

The extension works out of the box with sensible defaults and includes the following configuration options:

### Theme Configuration
- **`diagram.inheritThemeStyle`** (boolean, default: `false`)
  - Controls whether diagrams inherit VS Code theme styling
  - When disabled, uses a clean light theme optimized for diagram readability
  - Prevents issues with poorly designed VS Code themes

### Edge Type Configuration
- **`diagram.edgeType`** (string, default: `"smoothstep"`)
  - Customizes the visual style of relationship connections
  - Available options:
    - `"straight"` - Direct straight lines between tables
    - `"step"` - Step-style edges with right angles
    - `"smoothstep"` - Smooth step edges with rounded corners (recommended)
    - `"bezier"` - Curved bezier edges for organic appearance

### How to Configure
1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "diagram" or "DBML Previewer"
3. Adjust settings to your preference
4. Changes apply immediately without restart

### Future Configuration Options
- Export settings and formats
- Performance optimization toggles
- Advanced layout algorithm options

## 🛠️ Development & Contributing

Want to contribute? Check out our [Contributing Guide](CONTRIBUTING.md) for detailed setup instructions, coding guidelines, and development workflow.

**Quick Development Setup:**
```bash
git clone https://github.com/kykurniawan/vscode-dbml-previewer.git
cd vscode-dbml-previewer
npm install && npm run build
```

**Architecture:** React + React Flow + DBML Core + Dagre Layout

## 💝 Contributing

**Love this extension?** Help make it even better!

- 🐛 **Report Bugs** - Found an issue? [Let us know!](https://github.com/kykurniawan/vscode-dbml-previewer/issues)
- 💡 **Request Features** - Have ideas? [Share them!](https://github.com/kykurniawan/vscode-dbml-previewer/issues)
- ⭐ **Star the Project** - Show your support!
- 🔧 **Code Contributions** - Check our [Contributing Guide](CONTRIBUTING.md)

**Quick Start:** Fork → Branch → Code → Test → Pull Request

## 🐛 Issues and Support

### Reporting Issues
If you encounter any problems:

1. **Check existing issues** on [GitHub Issues](https://github.com/kykurniawan/vscode-dbml-previewer/issues)
2. **Create a new issue** with:
   - Clear description of the problem
   - Steps to reproduce
   - Sample DBML file (if applicable)
   - VS Code version and OS information

### Getting Help
- 📖 Check our documentation and FAQ
- 💬 Join discussions in GitHub Issues
- 📧 Contact us at contact.rizkykurniawan@gmail.com

## 📋 System Requirements

- 💻 **VS Code**: 1.102.0+
- 📄 **File Format**: `.dbml` files (DBML v2 syntax)
- 🚀 **Zero Setup**: No additional dependencies required!

## 🛣️ What's Coming Next

### 🔜 **Coming Soon**
- 📤 **Export to PNG/SVG/PDF** - Save your diagrams
- 🔍 **Search & Filter** - Find tables instantly
- 🎨 **Custom Themes** - Personalize your diagrams
- 📏 **Minimap** - Navigate large schemas easily

### 🚀 **Future Vision**
- Database integration for live schema import
- Collaborative editing and sharing
- Advanced schema validation and migration tools
- Performance optimizations for enterprise databases

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Special Thanks

**Built with amazing open source tools:**
- 🎯 [DBML Community](https://dbml.dbdiagram.io/) - Database Markup Language specification
- ⚛️ [React Flow](https://reactflow.dev/) - Interactive diagram library
- 🔧 [VS Code API](https://code.visualstudio.com/api) - Robust extension platform

## 📊 Why Developers Love It

✅ **Zero Configuration** - Works instantly with any DBML file  
✅ **Lightning Fast** - Optimized for performance and responsiveness  
✅ **Professional Quality** - Production-ready with enterprise features  
✅ **Community Driven** - Built with real developer feedback  

---

<div align="center">

**⭐ Star this project if it helps you visualize databases better! ⭐**

**Made with ❤️ by [Rizky Kurniawan](https://github.com/kykurniawan)**

*"From DBML text to visual database understanding in seconds"*

</div>