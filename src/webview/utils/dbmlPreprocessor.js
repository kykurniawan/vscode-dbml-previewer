/**
 * DBML Preprocessor Utility
 * Handles DBML syntax that is not yet supported by @dbml/core:
 * - Table-level `checks { ... }` blocks
 * - Column-level `check: `expr`` inside column settings brackets
 */

/**
 * Parses the inner content of a `checks { ... }` block.
 * Each check item is a backtick-quoted expression with an optional [name: '...'] setting.
 * @param {string} content - The content between the checks braces
 * @returns {Array<{expression: string, name: string|null, column: null}>}
 */
const parseChecksContent = (content) => {
  const checks = [];
  const checkRegex = /`([^`]*)`(?:\s*\[([^\]]*)\])?/g;
  let match;
  while ((match = checkRegex.exec(content)) !== null) {
    const expression = match[1].trim();
    const settings = match[2] || '';
    const nameMatch = settings.match(/name\s*:\s*['"]([^'"]+)['"]/);
    checks.push({
      expression,
      name: nameMatch ? nameMatch[1] : null,
      column: null, // table-level check, not tied to a specific column
    });
  }
  return checks;
};

/**
 * Extracts the base table name from a full table identifier.
 * Handles schemas (public.users), quoted names ("my table"), and combinations.
 */
const extractBaseTableName = (rawName) => {
  const unquoted = rawName.replace(/^"(.*)"$/, '$1');
  const parts = unquoted.split('.');
  return parts[parts.length - 1].replace(/^"(.*)"$/, '$1');
};

/**
 * Finds the name of the LAST Table declaration that appears before a given position.
 * Uses matchAll to avoid the .match() pitfall of returning the first occurrence.
 */
const findLastTableName = (contentBefore) => {
  const matches = [
    ...contentBefore.matchAll(
      /\bTable\s+(?:"[^"]*"\.)?"?([\w$]+)"?[^{]*\{/gi
    ),
  ];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1];
};

/**
 * Pre-processes a DBML string to extract and remove unsupported check constraint
 * syntax before passing to the @dbml/core parser.
 *
 * Handles two forms:
 *   1. Table-level: `checks { `expr` [name: '...'] }`
 *   2. Column-level: `columnName type [not null, check: `expr`]`
 *
 * @param {string} dbmlContent - Raw DBML content from the editor
 * @returns {{ cleanedContent: string, tableChecks: Object }}
 *   - cleanedContent: DBML with check syntax removed, safe to pass to parser
 *   - tableChecks: { [tableName]: Array<{expression, name, column}> }
 */
export const preprocessChecks = (dbmlContent) => {
  const tableChecks = {};

  // Pass 1: Strip table-level `checks { ... }` blocks.
  // Uses matchAll-based lookback to correctly find the LAST Table declaration
  // before each checks block (avoids matching the first table when multiple exist).
  let cleanedContent = dbmlContent.replace(
    /\bchecks\s*\{([\s\S]*?)\}/g,
    (match, checksBody, offset) => {
      const before = dbmlContent.substring(0, offset);
      const tableName = findLastTableName(before);

      if (tableName) {
        const checks = parseChecksContent(checksBody);
        if (checks.length > 0) {
          tableChecks[tableName] = [...(tableChecks[tableName] || []), ...checks];
        }
      }

      return '';
    }
  );

  // Pass 2: Strip column-level `check: `expr`` from column settings brackets.
  // Operates on cleanedContent (after pass 1) so offsets are consistent.
  cleanedContent = cleanedContent.replace(
    /\[([^\]]*\bcheck\s*:\s*`[^`]*`[^\]]*)\]/g,
    (match, settings, offset) => {
      const checkMatch = settings.match(/\bcheck\s*:\s*`([^`]*)`/);
      if (!checkMatch) return match;

      const expression = checkMatch[1].trim();
      const tableName = findLastTableName(cleanedContent.substring(0, offset));

      if (tableName) {
        // Determine the column name by looking for "colName dataType [" before this bracket
        const beforeBracket = cleanedContent.substring(0, offset);
        const colMatch = beforeBracket.match(/(?:"([^"]+)"|(\w+))\s+[\w$()[\]]+\s*$/);
        const columnName = colMatch ? (colMatch[1] || colMatch[2]) : null;

        if (!tableChecks[tableName]) tableChecks[tableName] = [];
        tableChecks[tableName].push({ expression, name: null, column: columnName });
      }

      // Remove `check: `expr`` from settings, handling surrounding commas
      const cleanedSettings = settings
        .replace(/,\s*\bcheck\s*:\s*`[^`]*`|\bcheck\s*:\s*`[^`]*`\s*(?:,\s*)?/g, '')
        .trim();
      return cleanedSettings ? `[${cleanedSettings}]` : '';
    }
  );

  return { cleanedContent, tableChecks };
};

export default { preprocessChecks };
