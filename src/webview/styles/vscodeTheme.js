// VS Code theme mapping system
// Maps our standardized theme variables to VS Code CSS variables

export const vscodeThemeMap = {
  // Background colors
  background: 'var(--vscode-editor-background)',
  panelBackground: 'var(--vscode-panel-background)',
  editorBackground: 'var(--vscode-editor-background)',

  // Text colors
  foreground: 'var(--vscode-editor-foreground)',
  descriptionForeground: 'var(--vscode-descriptionForeground)',

  // Border colors
  panelBorder: 'var(--vscode-panel-border)',
  inputBorder: 'var(--vscode-input-border)',
  focusBorder: 'var(--vscode-focusBorder)',

  // Button colors
  buttonBackground: 'var(--vscode-button-background)',
  buttonForeground: 'var(--vscode-button-foreground)',
  buttonBorder: 'var(--vscode-button-border)',
  buttonHoverBackground: 'var(--vscode-button-hoverBackground)',
  buttonSecondaryBackground: 'var(--vscode-button-secondaryBackground)',
  buttonSecondaryForeground: 'var(--vscode-button-secondaryForeground)',

  // Input colors
  inputBackground: 'var(--vscode-input-background)',
  inputForeground: 'var(--vscode-input-foreground)',

  // Dropdown colors
  dropdownBackground: 'var(--vscode-dropdown-background)',
  dropdownBorder: 'var(--vscode-dropdown-border)',
  dropdownForeground: 'var(--vscode-dropdown-foreground)',

  // List colors
  listHoverBackground: 'var(--vscode-list-hoverBackground)',
  listInactiveSelectionBackground: 'var(--vscode-list-inactiveSelectionBackground)',

  // Chart/diagram colors
  chartsLines: 'var(--vscode-charts-lines)',

  // Badge colors
  badgeBackground: 'var(--vscode-badge-background)',
  badgeForeground: 'var(--vscode-badge-foreground)',

  // Code block colors
  textCodeBlockBackground: 'var(--vscode-textCodeBlock-background)',

  // Selection colors
  editorInactiveSelectionBackground: 'var(--vscode-editor-inactiveSelectionBackground)',
  editorFindMatchHighlightBackground: 'var(--vscode-editor-findMatchHighlightBackground)',

  // Icon colors
  iconForeground: 'var(--vscode-icon-foreground)',

  // Symbol colors
  symbolIconKeywordForeground: 'var(--vscode-symbolIcon-keywordForeground)',
  symbolIconVariableForeground: 'var(--vscode-symbolIcon-variableForeground)',

  // Validation colors
  inputValidationErrorBackground: 'var(--vscode-inputValidation-errorBackground)',
  inputValidationErrorBorder: 'var(--vscode-inputValidation-errorBorder)',
  inputValidationErrorForeground: 'var(--vscode-inputValidation-errorForeground)',
  inputValidationWarningForeground: 'var(--vscode-inputValidation-warningForeground)',

  // Text link colors
  textLinkForeground: 'var(--vscode-textLink-foreground)',

  // Font family
  fontFamily: 'var(--vscode-font-family)',
  editorFontFamily: 'var(--vscode-editor-font-family)'
};

// Function to extract current VS Code theme values
export const extractVSCodeThemeValues = () => {
  const theme = {};
  const documentStyle = getComputedStyle(document.documentElement);

  // Extract each VS Code CSS variable and store its computed value
  Object.entries(vscodeThemeMap).forEach(([key, cssVar]) => {
    // Extract the CSS variable name from the var() expression
    const varName = cssVar.match(/var\((--vscode-[^)]+)\)/)?.[1];
    if (varName) {
      const value = documentStyle.getPropertyValue(varName).trim();
      if (value) {
        theme[key] = value;
      }
    }
  });

  return theme;
};

// Fallback values for VS Code variables that might not be defined
export const vscodeThemeFallbacks = {
  // These are commonly missing or undefined in some themes
  chartsLines: '#666666',
  symbolIconKeywordForeground: '#569cd6',
  symbolIconVariableForeground: '#9cdcfe',
  badgeBackground: '#007acc',
  badgeForeground: '#ffffff',
  textCodeBlockBackground: 'rgba(128, 128, 128, 0.1)',
  inputValidationErrorBackground: 'rgba(244, 67, 54, 0.1)',
  inputValidationErrorBorder: '#f44336',
  inputValidationWarningForeground: '#ff9800',
  editorFontFamily: 'Consolas, "Courier New", monospace'
};