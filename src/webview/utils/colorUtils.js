/**
 * Color utility functions for table header customization
 */

/**
 * Validates if a string is a valid hex color
 * Supports both short (#fff) and long (#ffffff) formats
 * @param {string} color - Color string to validate
 * @returns {boolean} - True if valid hex color
 */
export const isValidHexColor = (color) => {
  if (!color || typeof color !== 'string') {
    return false;
  }
  // Match #fff or #ffffff format
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);
};

/**
 * Converts a hex color to RGB values
 * @param {string} hex - Hex color string (e.g., "#E74C3C" or "#fff")
 * @returns {{r: number, g: number, b: number}} - RGB values (0-255)
 */
const hexToRgb = (hex) => {
  // Remove the # if present
  const cleanHex = hex.replace('#', '');

  // Handle short format (#fff -> #ffffff)
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  return { r, g, b };
};

/**
 * Calculates the relative luminance of a color
 * Based on WCAG 2.0 formula: https://www.w3.org/TR/WCAG20/#relativeluminancedef
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {number} - Relative luminance (0-1)
 */
const getLuminance = (r, g, b) => {
  // Convert to 0-1 range
  const [rs, gs, bs] = [r, g, b].map(val => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  // Calculate luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Determines the best contrasting text color (white or black) for a given background color
 * Uses WCAG luminance calculation for accessibility
 * @param {string} hexColor - Background color in hex format
 * @returns {string} - Either '#ffffff' (white) or '#000000' (black)
 */
export const getContrastColor = (hexColor) => {
  if (!isValidHexColor(hexColor)) {
    return '#ffffff'; // Default to white for invalid colors
  }

  const { r, g, b } = hexToRgb(hexColor);
  const luminance = getLuminance(r, g, b);

  // If luminance is greater than 0.5, the color is light, so use black text
  // Otherwise use white text
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

/**
 * Validates and normalizes a header color value
 * Logs a warning if the color is invalid
 * @param {string} headerColor - Color value from DBML
 * @returns {string|null} - Normalized color or null if invalid
 */
export const parseHeaderColor = (headerColor) => {
  if (!headerColor) {
    return null;
  }

  if (!isValidHexColor(headerColor)) {
    console.warn(`[DBML Previewer] Invalid header color: "${headerColor}". Expected hex format (e.g., #E74C3C). Falling back to theme color.`);
    return null;
  }

  return headerColor;
};

/**
 * Darkens a hex color by reducing each RGB channel by a given factor
 * @param {string} hex - Hex color string (e.g., "#E74C3C")
 * @param {number} amount - Amount to darken (0-1, default 0.15)
 * @returns {string} - Darkened hex color, or original if invalid
 */
export const darkenHexColor = (hex, amount = 0.15) => {
  if (!isValidHexColor(hex)) {
    return hex;
  }
  const { r, g, b } = hexToRgb(hex);
  const darken = (channel) => Math.max(0, Math.round(channel * (1 - amount)));
  const toHex = (channel) => darken(channel).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
