import { defaultTheme, defaultDarkTheme } from './defaultTheme.js';
import { vscodeThemeMap, extractVSCodeThemeValues, vscodeThemeFallbacks } from './vscodeTheme.js';

class ThemeManager {
  constructor() {
    this.currentTheme = {};
    this.inheritThemeStyle = true;
    this.listeners = new Set();
  }

  // Initialize the theme system
  initialize(inheritThemeStyle = true) {
    this.inheritThemeStyle = inheritThemeStyle;
    this.updateTheme();

    // Listen for VS Code theme changes if inheriting
    if (this.inheritThemeStyle) {
      this.setupVSCodeThemeListener();
    }
  }

  // Set whether to inherit theme from VS Code
  setInheritThemeStyle(inherit) {
    this.inheritThemeStyle = inherit;
    this.updateTheme();

    if (inherit) {
      this.setupVSCodeThemeListener();
    } else {
      this.removeVSCodeThemeListener();
    }
  }

  // Get the current theme object
  getTheme() {
    return this.currentTheme;
  }

  // Get a specific theme variable
  getThemeVar(variable) {
    return this.currentTheme[variable] || '';
  }

  // Update the current theme based on settings
  updateTheme() {
    if (this.inheritThemeStyle) {
      this.currentTheme = this.createVSCodeTheme();
    } else {
      this.currentTheme = this.createDefaultTheme();
    }

    this.applyThemeToDOM();
    this.notifyListeners();
  }

  // Create theme from VS Code variables
  createVSCodeTheme() {
    const extractedTheme = extractVSCodeThemeValues();
    const theme = {};

    // Use extracted values or fallbacks
    Object.keys(vscodeThemeMap).forEach(key => {
      theme[key] = extractedTheme[key] || vscodeThemeFallbacks[key] || vscodeThemeMap[key];
    });

    return theme;
  }

  // Create default theme (always use light theme when not inheriting)
  createDefaultTheme() {
    // Always return light theme when user chooses not to inherit VS Code theme
    return defaultTheme;
  }

  // Detect if VS Code is in dark mode
  detectDarkMode() {
    // Try to get VS Code's background color to determine dark/light
    const documentStyle = getComputedStyle(document.documentElement);
    const bgColor = documentStyle.getPropertyValue('--vscode-editor-background').trim();

    if (bgColor) {
      // Simple heuristic: if the background is dark, we're in dark mode
      // Convert to RGB and check brightness
      const rgb = this.hexToRgb(bgColor) || this.cssColorToRgb(bgColor);
      if (rgb) {
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness < 128;
      }
    }

    // Fallback: check system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Helper to convert hex color to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Helper to convert CSS color to RGB
  cssColorToRgb(color) {
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const computedColor = window.getComputedStyle(div).color;
    document.body.removeChild(div);

    const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    return match ? {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    } : null;
  }

  // Apply theme to DOM by setting CSS custom properties
  applyThemeToDOM() {
    const root = document.documentElement;

    // Set custom properties for our theme variables
    Object.entries(this.currentTheme).forEach(([key, value]) => {
      root.style.setProperty(`--dbml-${key}`, value);
    });
  }

  // Set up listener for VS Code theme changes
  setupVSCodeThemeListener() {
    // VS Code theme changes are reflected in CSS variable changes
    // We'll use MutationObserver to watch for style changes
    if (this.vscodeObserver) {
      this.removeVSCodeThemeListener();
    }

    this.vscodeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          // Theme change detected, update our theme
          setTimeout(() => this.updateTheme(), 100);
        }
      });
    });

    this.vscodeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  // Remove VS Code theme listener
  removeVSCodeThemeListener() {
    if (this.vscodeObserver) {
      this.vscodeObserver.disconnect();
      this.vscodeObserver = null;
    }
  }

  // Add listener for theme changes
  addListener(callback) {
    this.listeners.add(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners of theme change
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentTheme);
      } catch (error) {
        console.error('Error in theme change listener:', error);
      }
    });
  }

  // Clean up
  destroy() {
    this.removeVSCodeThemeListener();
    this.listeners.clear();
  }
}

// Create singleton instance
const themeManager = new ThemeManager();

export default themeManager;

// Helper function to get theme variables for components
export const getThemeVar = (variable) => {
  return `var(--dbml-${variable})`;
};

// Helper function to get the current theme object
export const getCurrentTheme = () => {
  return themeManager.getTheme();
};