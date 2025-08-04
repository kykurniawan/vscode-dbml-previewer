# Contributing to DBML Previewer

Thank you for your interest in contributing to DBML Previewer! We welcome contributions from the community and are grateful for any help you can provide.

## 🤝 Ways to Contribute

### 🐛 Bug Reports
Found a bug? Help us improve by reporting it:
- Use the [issue tracker](https://github.com/kykurniawan/vscode-dbml-previewer/issues)
- Include a clear description of the problem
- Provide steps to reproduce the issue
- Share the DBML file that causes the problem (if applicable)
- Include your VS Code version and operating system

### 💡 Feature Requests
Have an idea for a new feature?
- Check existing [issues](https://github.com/kykurniawan/vscode-dbml-previewer/issues) first
- Open a new issue with the "enhancement" label
- Describe the feature and why it would be useful
- Include mockups or examples if possible

### 🔧 Code Contributions
Ready to contribute code? Awesome!
- Check the [good first issue](https://github.com/kykurniawan/vscode-dbml-previewer/labels/good%20first%20issue) label
- Follow the development setup below
- Read our coding guidelines
- Submit a pull request

### 📚 Documentation
Help improve our documentation:
- Fix typos or unclear explanations
- Add examples or tutorials
- Improve code comments
- Update README or wiki

## 🚀 Development Setup

### Prerequisites
- **Node.js**: Version 16 or higher
- **npm**: Package manager
- **VS Code**: Version 1.102.0 or higher
- **Git**: For version control

### Getting Started

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/vscode-dbml-previewer.git
   cd vscode-dbml-previewer
   ```

2. **Install Dependencies**
   ```bash
   # Install dependencies
   npm install
   ```

3. **Build the Extension**
   ```bash
   # Build for development
   npm run build
   
   # Or build and watch for changes
   npm run watch
   ```

4. **Test the Extension**
   - Press `F5` in VS Code to open a new Extension Development Host
   - Open a `.dbml` file and test the preview functionality
   - Make changes and test again

5. **Run Tests**
   ```bash
   # Run all tests
   npm test
   
   # Run linting
   npm run lint
   ```

## 📝 Coding Guidelines

### Code Style
- **JavaScript/React**: Follow the existing code style
- **Indentation**: 2 spaces (configured in `.editorconfig`)
- **Semicolons**: Use semicolons consistently
- **Quotes**: Prefer single quotes for strings
- **ESLint**: Follow the configured rules

### Project Structure
```
├── extension.js           # Main extension entry point
├── package.json          # Extension manifest and dependencies
├── src/webview/          # React application for preview
│   ├── components/       # React components
│   │   ├── DBMLPreview.js      # Main preview component
│   │   ├── TableHeaderNode.js  # Table header component
│   │   ├── ColumnNode.js       # Column display component
│   │   ├── TableGroupNode.js   # Table group component
│   │   └── EdgeTooltip.js      # Relationship tooltip
│   ├── utils/           # Utility functions
│   │   ├── dbmlTransformer.js  # DBML to React Flow conversion
│   │   └── layoutStorage.js    # Position persistence
│   └── index.js         # Webview entry point
├── dist/                # Built webview bundle
├── test/               # Test files
└── webpack.config.js    # Build configuration
```

### Naming Conventions
- **Files**: Use camelCase for JavaScript files
- **Components**: Use PascalCase for React components
- **Functions**: Use camelCase for function names
- **Constants**: Use UPPER_SNAKE_CASE for constants
- **Variables**: Use camelCase for variables

### React Guidelines
- Use functional components with hooks
- Prefer `useCallback` and `useMemo` for performance
- Keep components small and focused
- Use proper PropTypes or TypeScript types
- Handle loading and error states appropriately

### Git Workflow
- **Branches**: Create feature branches from `main`
- **Commits**: Write clear, descriptive commit messages
- **Pull Requests**: Keep PRs focused and small
- **History**: Squash commits before merging if needed

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test test/extension.test.js
```

### Writing Tests
- Write unit tests for utility functions
- Test React components with React Testing Library
- Include integration tests for critical workflows
- Mock external dependencies appropriately

### Test Structure
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup code
  });

  it('should do something specific', () => {
    // Test implementation
    expect(result).toBe(expected);
  });

  afterEach(() => {
    // Cleanup code
  });
});
```

## 📋 Pull Request Process

1. **Before You Start**
   - Check existing issues and PRs
   - Discuss large changes in an issue first
   - Ensure you have the right to contribute the code

2. **Making Changes**
   - Create a feature branch: `git checkout -b feature/amazing-feature`
   - Make your changes in small, logical commits
   - Write or update tests as needed
   - Update documentation if required

3. **Before Submitting**
   - Run tests: `npm test`
   - Run linting: `npm run lint`
   - Test the extension manually
   - Update CHANGELOG.md if needed

4. **Submitting the PR**
   - Push your branch: `git push origin feature/amazing-feature`
   - Create a pull request on GitHub
   - Fill out the PR template completely
   - Link to any related issues

5. **PR Review Process**
   - Maintainers will review your code
   - Address any feedback or requested changes
   - Keep the PR updated with main branch
   - PR will be merged once approved

### PR Template
When creating a pull request, include:

```markdown
## Description
Brief description of what this PR does.

## Changes Made
- List of specific changes
- Any new features or bug fixes

## Testing
- How you tested the changes
- Any new test cases added

## Screenshots
Include screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or documented)
```

## 🐛 Bug Reports

### Before Reporting
- Search existing issues for duplicates
- Try the latest version of the extension
- Test with a minimal DBML file to isolate the issue

### Bug Report Template
```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Step 1
2. Step 2
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**DBML File**
```dbml
// Include the DBML file that causes the issue
```

**Environment**
- VS Code version:
- Extension version:
- Operating System:
- Node.js version (if relevant):

**Additional Context**
Any other context about the problem.
```

## 💡 Feature Requests

### Before Requesting
- Check if the feature already exists
- Look at existing feature requests
- Consider if it fits the project scope

### Feature Request Template
```markdown
**Feature Description**
A clear description of the feature you'd like.

**Use Case**
Describe the problem this feature would solve.

**Proposed Solution**
Your ideas on how it could be implemented.

**Alternatives Considered**
Other solutions you've considered.

**Additional Context**
Any other context, mockups, or examples.
```

## 📜 Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards
Examples of behavior that contributes to creating a positive environment:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Unacceptable Behavior
- Harassment of any form
- Discriminatory language or behavior
- Personal attacks or trolling
- Public or private harassment
- Publishing others' private information without permission

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at contact.rizkykurniawan@gmail.com. All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances.

## 🏷️ Issue Labels

We use the following labels to organize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `documentation` - Improvements or additions to documentation
- `question` - Further information is requested
- `wontfix` - This will not be worked on
- `duplicate` - This issue or pull request already exists

## 📞 Getting Help

### Community Support
- 🐛 **Issues**: For bugs and feature requests
- 💬 **Discussions**: For questions and general discussion
- 📧 **Email**: contact.rizkykurniawan@gmail.com for private matters

### Development Help
If you're stuck while contributing:
1. Check the documentation and existing issues
2. Ask questions in your PR or issue
3. Reach out to maintainers for guidance

## 🎉 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors page

## 📄 License

By contributing to DBML Previewer, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to DBML Previewer! Your help makes this project better for everyone. 🚀