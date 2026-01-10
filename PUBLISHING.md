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

### 3. Get Open VSX Registry Personal Access Token

1. Go to [Open VSX Registry](https://open-vsx.org/)
2. Sign in with your GitHub account
3. Go to your user settings (click profile icon → Settings)
4. Navigate to "Access Tokens" section
5. Click "Generate New Token"
6. Enter token name: `vscode-extension-publish`
7. Copy the token (store it securely!)

### 4. Add Open VSX Secret to GitHub Repository

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add secret:
   - **Name**: `OVSX_TOKEN`
   - **Value**: Paste your Open VSX token from step 3

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
- ✅ Publish to Open VSX Registry

**Note:** Both marketplaces are published independently. If one fails, the other will still be attempted. The GitHub release will include a link to the specific version section in CHANGELOG.md, so make sure your changelog is updated before pushing the tag.

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

# Publish to VS Code Marketplace only
npm run publish

# Publish to Open VSX only
npm run publish:ovsx
```

**Prerequisites for manual publishing:**
- Set `VSCE_PAT` environment variable for VS Code Marketplace
- Set `OVSX_TOKEN` environment variable for Open VSX Registry

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

4. **Open VSX: "Publisher not found" error**
   - Create a namespace on Open VSX matching publisher name: `rizkykurniawan`
   - Go to https://open-vsx.org/user-settings/namespaces
   - Request namespace if it doesn't exist

5. **Open VSX: Token permission denied**
   - Verify OVSX_TOKEN secret is set correctly in GitHub
   - Regenerate token if necessary

### Getting Help

- Check workflow logs in GitHub Actions tab
- VS Code Extension documentation: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- vsce CLI documentation: https://github.com/microsoft/vscode-vsce
- Open VSX documentation: https://github.com/eclipse/openvsx/wiki/Publishing-Extensions