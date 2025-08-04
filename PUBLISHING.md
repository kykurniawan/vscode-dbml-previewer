# Publishing Guide

This extension uses automated publishing via GitHub Actions. When you push a version tag, it automatically builds, packages, and publishes to both GitHub Releases and VS Code Marketplace.

## Setup (One-time)

### 1. Get VS Code Marketplace Personal Access Token

1. Go to [Azure DevOps](https://dev.azure.com/)
2. Sign in with your Microsoft account
3. Go to User settings → Personal access tokens
4. Create new token with these settings:
   - **Name**: `vscode-marketplace-publish`
   - **Organization**: All accessible organizations
   - **Scopes**: Custom defined → **Marketplace** → **Manage**
5. Copy the token (you won't see it again!)

### 2. Add Secret to GitHub Repository

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add secret:
   - **Name**: `VSCE_PAT`
   - **Value**: Paste your Personal Access Token from step 1

## Publishing a Release

### 1. Update CHANGELOG.md
Before releasing, make sure to update `CHANGELOG.md` with the new version:
```markdown
## 0.0.2

### Added
- New feature descriptions

### Fixed
- Bug fix descriptions

### Changed
- Any changes to existing functionality
```

### 2. Update Version
```bash
# Update version in package.json (e.g., from 0.0.1 to 0.0.2)
npm version patch  # for bug fixes
npm version minor  # for new features  
npm version major  # for breaking changes
```

### 3. Push Version Tag
```bash
# Push the version tag created by npm version
git push origin main
git push origin --tags
```

### 4. Automated Process
GitHub Actions will automatically:
- ✅ Install dependencies
- ✅ Run linting and tests
- ✅ Build the React webview
- ✅ Package the extension (.vsix file)
- ✅ Create GitHub Release with link to changelog
- ✅ Upload .vsix file to GitHub Release
- ✅ Publish to VS Code Marketplace

**Note:** The GitHub release will include a link to the specific version section in CHANGELOG.md, so make sure your changelog is updated before pushing the tag.

### 5. Monitor Progress
- Check the **Actions** tab in your GitHub repository
- The workflow takes ~3-5 minutes to complete
- You'll receive notifications if the workflow fails

## Manual Publishing (Alternative)

If you prefer manual control:

```bash
# Build and package
npm run build
npm run package

# Publish manually
npm run publish
```

## Troubleshooting

### Common Issues

1. **"Permission denied" error**
   - Check that `VSCE_PAT` secret is set correctly
   - Verify token has "Marketplace Manage" permissions

2. **"Extension already exists" error**
   - Make sure you've updated the version number in package.json
   - Each version can only be published once

3. **Build failures**
   - Ensure all dependencies are properly listed in package.json
   - Check that webpack builds successfully locally first

### Getting Help

- Check workflow logs in GitHub Actions tab
- VS Code Extension documentation: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- vsce CLI documentation: https://github.com/microsoft/vscode-vsce