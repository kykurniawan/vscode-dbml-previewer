/**
 * Enhanced DBML Error Parser Utility
 * Parses and enhances @dbml/core parser errors to provide detailed, actionable error messages
 */

/**
 * Common DBML syntax patterns and their descriptions
 */
const DBML_SYNTAX_HELP = {
  'table': {
    description: 'Tables define database table structures',
    syntax: 'Table table_name {\n  column_name data_type [settings]\n}',
    example: 'Table users {\n  id integer [primary key]\n  name varchar(255)\n}'
  },
  'enum': {
    description: 'Enums define a list of predefined values',
    syntax: 'Enum enum_name {\n  value1\n  value2\n}',
    example: 'Enum status {\n  active\n  inactive\n  pending\n}'
  },
  'ref': {
    description: 'References define relationships between tables',
    syntax: 'Ref: table1.column1 > table2.column2',
    example: 'Ref: users.id < posts.user_id'
  },
  'project': {
    description: 'Project settings define database metadata',
    syntax: 'Project project_name {\n  database_type: \'database\'\n}',
    example: 'Project ecommerce {\n  database_type: \'PostgreSQL\'\n}'
  },
  'tablegroup': {
    description: 'Table groups organize related tables',
    syntax: 'TableGroup group_name {\n  table1\n  table2\n}',
    example: 'TableGroup ecommerce {\n  users\n  products\n  orders\n}'
  }
};

/**
 * Common error patterns and their solutions
 */
const ERROR_PATTERNS = [
  {
    pattern: /line (\d+) column (\d+)/i,
    type: 'syntax',
    extract: (match) => ({
      line: parseInt(match[1]),
      column: parseInt(match[2])
    })
  },
  {
    pattern: /Expected ([^']+) but '([^']+)' found/i,
    type: 'expectation',
    extract: (match) => ({
      expected: match[1].split(', ').map(s => s.replace(/'/g, '').trim()),
      found: match[2]
    })
  },
  {
    pattern: /SyntaxError: (.+)/i,
    type: 'syntax',
    extract: (match) => ({
      details: match[1]
    })
  },
  {
    pattern: /You have a syntax error at line (\d+) column (\d+)/i,
    type: 'syntax',
    extract: (match) => ({
      line: parseInt(match[1]),
      column: parseInt(match[2])
    })
  }
];

/**
 * Common error types and their solutions
 */
const ERROR_SOLUTIONS = {
  'syntax': {
    title: 'Syntax Error',
    icon: '❌',
    color: 'var(--vscode-inputValidation-errorForeground)',
    suggestions: [
      'Check for missing or extra brackets, parentheses, or quotes',
      'Ensure proper DBML syntax structure',
      'Verify table, column, and relationship definitions'
    ]
  },
  'expectation': {
    title: 'Unexpected Token',
    icon: '⚠️',
    color: 'var(--vscode-inputValidation-warningForeground)',
    suggestions: [
      'Check the token at the specified position',
      'Ensure you\'re using valid DBML keywords',
      'Consider what the parser expected at this location'
    ]
  },
  'encoding': {
    title: 'Character Encoding Issue',
    icon: '📝',
    color: 'var(--vscode-inputValidation-warningForeground)',
    suggestions: [
      'Ensure your file is saved with UTF-8 encoding',
      'Remove any invisible characters or BOM markers',
      'Check for special characters that might cause issues'
    ]
  },
  'structure': {
    title: 'Invalid Structure',
    icon: '🏗️',
    color: 'var(--vscode-inputValidation-errorForeground)',
    suggestions: [
      'Verify your DBML structure follows the correct format',
      'Check for missing required elements',
      'Ensure proper nesting and organization'
    ]
  }
};

/**
 * Extract line context from content around the error position
 * @param {string} content - The DBML content
 * @param {number} line - Line number (1-based)
 * @param {number} column - Column number (1-based)
 * @param {number} contextLines - Number of context lines to show
 * @returns {Object} Context information
 */
const getErrorContext = (content, line, column, contextLines = 2) => {
  if (!content || !line) return null;

  const lines = content.split('\n');
  const errorLineIndex = line - 1; // Convert to 0-based
  
  if (errorLineIndex < 0 || errorLineIndex >= lines.length) {
    return null;
  }

  const startLine = Math.max(0, errorLineIndex - contextLines);
  const endLine = Math.min(lines.length - 1, errorLineIndex + contextLines);
  
  const contextLines_ = [];
  for (let i = startLine; i <= endLine; i++) {
    contextLines_.push({
      number: i + 1,
      content: lines[i] || '',
      isError: i === errorLineIndex,
      column: i === errorLineIndex ? column : null
    });
  }

  return {
    lines: contextLines_,
    errorLine: lines[errorLineIndex] || '',
    errorColumn: column
  };
};

/**
 * Generate suggestions based on the error context and expected tokens
 * @param {Object} errorInfo - Parsed error information
 * @returns {Array} Array of suggestion objects
 */
const generateSuggestions = (errorInfo) => {
  const suggestions = [];

  // Add general suggestions based on error type
  const errorType = ERROR_SOLUTIONS[errorInfo.type] || ERROR_SOLUTIONS.syntax;
  suggestions.push(...errorType.suggestions.map(text => ({ 
    type: 'general', 
    text,
    icon: '💡'
  })));

  // Add specific suggestions based on expected tokens
  if (errorInfo.expected && errorInfo.expected.length > 0) {
    const expectedTokens = errorInfo.expected.filter(token => 
      token && token !== 'end of input' && token !== 'whitespace'
    );
    
    if (expectedTokens.length > 0) {
      suggestions.push({
        type: 'expectation',
        text: `Expected one of: ${expectedTokens.join(', ')}`,
        icon: '🎯'
      });

      // Add syntax help for expected tokens
      expectedTokens.forEach(token => {
        const lowerToken = token.toLowerCase();
        if (DBML_SYNTAX_HELP[lowerToken]) {
          const help = DBML_SYNTAX_HELP[lowerToken];
          suggestions.push({
            type: 'syntax_help',
            text: `${help.description}`,
            example: help.example,
            syntax: help.syntax,
            icon: '📖'
          });
        }
      });
    }
  }

  // Add suggestions based on found token
  if (errorInfo.found) {
    const found = errorInfo.found;
    
    // Check for common mistakes
    if (found === '�' || found.charCodeAt(0) > 127) {
      suggestions.unshift({
        type: 'encoding',
        text: 'File appears to contain invalid characters. Check file encoding.',
        icon: '⚠️'
      });
    }
    
    if (found === '`') {
      suggestions.unshift({
        type: 'mysql',
        text: 'Backticks (`) are not supported in DBML. Use regular identifiers instead.',
        icon: '🔧'
      });
    }
    
    if (found === '--' || found === '/*') {
      suggestions.unshift({
        type: 'comments',
        text: 'Use "//" for single-line comments in DBML instead of SQL comment syntax.',
        icon: '💬'
      });
    }
  }

  return suggestions.slice(0, 6); // Limit to 6 suggestions to avoid clutter
};

/**
 * Serialize error object to readable string format
 * @param {Error|Object} error - Error object to serialize
 * @returns {Object} Serialized error information
 */
const serializeError = (error) => {
  if (!error) return { message: 'Unknown error', details: {} };
  
  // Extract basic error information
  const serialized = {
    message: '',
    name: error.name || 'Error',
    stack: error.stack || null,
    details: {},
    rawError: null
  };
  
  // Try multiple strategies to get the error message
  if (error.message && typeof error.message === 'string') {
    serialized.message = error.message;
  } else if (error.toString && typeof error.toString === 'function') {
    const stringified = error.toString();
    if (stringified !== '[object Object]') {
      serialized.message = stringified;
    }
  }
  
  // If we still don't have a message, try other properties
  if (!serialized.message) {
    if (error.error && typeof error.error === 'string') {
      serialized.message = error.error;
    } else if (error.description && typeof error.description === 'string') {
      serialized.message = error.description;
    } else if (error.text && typeof error.text === 'string') {
      serialized.message = error.text;
    } else {
      serialized.message = 'Failed to parse DBML content';
    }
  }
  
  // Extract all enumerable properties
  try {
    const details = {};
    for (const key in error) {
      if (error.hasOwnProperty(key) && key !== 'stack') {
        const value = error[key];
        if (value !== undefined && value !== null) {
          // Handle different types of values
          if (typeof value === 'function') {
            details[key] = '[Function]';
          } else if (typeof value === 'object') {
            try {
              details[key] = JSON.parse(JSON.stringify(value));
            } catch {
              details[key] = '[Object]';
            }
          } else {
            details[key] = value;
          }
        }
      }
    }
    serialized.details = details;
  } catch (serializationError) {
    serialized.details = { serializationError: 'Failed to serialize error properties' };
  }
  
  // Create a JSON representation of the entire error
  try {
    // Create a clean object for serialization, avoiding problematic toString methods
    const cleanError = {};
    
    // Copy properties safely
    for (const key in error) {
      if (error.hasOwnProperty(key)) {
        const value = error[key];
        if (key === 'stack') {
          cleanError[key] = '[Stack trace shown separately]';
        } else if (typeof value === 'function') {
          cleanError[key] = '[Function]';
        } else if (value instanceof Error) {
          cleanError[key] = value.message || value.toString();
        } else if (value === null) {
          cleanError[key] = null;
        } else if (value === undefined) {
          cleanError[key] = undefined;
        } else if (typeof value === 'object') {
          try {
            // Test if the object can be safely stringified
            JSON.stringify(value);
            cleanError[key] = value;
          } catch {
            cleanError[key] = '[Object - circular reference or unserializable]';
          }
        } else {
          cleanError[key] = value;
        }
      }
    }
    
    // Also add non-enumerable properties that are commonly useful
    if (error.name && !cleanError.name) cleanError.name = error.name;
    if (error.message && !cleanError.message) cleanError.message = error.message;
    
    serialized.rawError = JSON.stringify(cleanError, null, 2);
  } catch {
    serialized.rawError = 'Unable to stringify error object';
  }
  
  return serialized;
};

/**
 * Extract the most meaningful error message from various error formats
 * @param {Error|Object} error - Error object
 * @returns {string} The most relevant error message
 */
const extractErrorMessage = (error) => {
  const serialized = serializeError(error);
  return serialized.message;
};

/**
 * Determine error category based on the error message and context
 * @param {string} errorMessage - Original error message
 * @param {Object} parsedInfo - Parsed error information
 * @returns {string} Error category
 */
const categorizeError = (errorMessage, parsedInfo) => {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('encoding') || message.includes('character') || parsedInfo.found === '�') {
    return 'encoding';
  }
  
  if (message.includes('expected') || parsedInfo.expected) {
    return 'expectation';
  }
  
  if (message.includes('structure') || message.includes('invalid')) {
    return 'structure';
  }
  
  return 'syntax';
};

/**
 * Parse and enhance DBML parser errors
 * @param {Error} error - The original error from @dbml/core parser
 * @param {string} content - The DBML content that caused the error
 * @returns {Object} Enhanced error information
 */
export const parseDBMLError = (error, content = '') => {
  // Serialize the error object to get comprehensive information
  const serializedError = serializeError(error);
  const originalMessage = serializedError.message;
  
  // Extract information using patterns
  let parsedInfo = {
    line: null,
    column: null,
    expected: null,
    found: null,
    details: null
  };
  
  for (const pattern of ERROR_PATTERNS) {
    const match = originalMessage.match(pattern.pattern);
    if (match) {
      const extracted = pattern.extract(match);
      parsedInfo = { ...parsedInfo, ...extracted };
      break;
    }
  }
  
  // Determine error type/category
  const errorType = categorizeError(originalMessage, parsedInfo);
  const errorConfig = ERROR_SOLUTIONS[errorType] || ERROR_SOLUTIONS.syntax;
  
  // Get context around the error if line/column available
  const context = parsedInfo.line && parsedInfo.column 
    ? getErrorContext(content, parsedInfo.line, parsedInfo.column)
    : null;
  
  // Generate helpful suggestions
  const suggestions = generateSuggestions({ ...parsedInfo, type: errorType });
  
  return {
    // Original error info
    originalMessage,
    originalError: error,
    serializedError, // Add the full serialized error information
    
    // Parsed information
    type: errorType,
    line: parsedInfo.line,
    column: parsedInfo.column,
    expected: parsedInfo.expected,
    found: parsedInfo.found,
    details: parsedInfo.details,
    
    // Enhanced information
    title: errorConfig.title,
    icon: errorConfig.icon,
    color: errorConfig.color,
    context,
    suggestions,
    
    // Formatted messages
    shortMessage: parsedInfo.line && parsedInfo.column 
      ? `${errorConfig.title} at line ${parsedInfo.line}, column ${parsedInfo.column}`
      : errorConfig.title,
    
    formattedMessage: originalMessage
  };
};

/**
 * Format error information for display
 * @param {Object} errorInfo - Enhanced error information from parseDBMLError
 * @returns {Object} Formatted error display data
 */
export const formatErrorForDisplay = (errorInfo) => {
  return {
    ...errorInfo,
    
    // Create formatted context lines for display
    contextLines: errorInfo.context ? errorInfo.context.lines.map(line => ({
      ...line,
      displayText: `${line.number.toString().padStart(3, ' ')} | ${line.content}`,
      errorMarker: line.isError && line.column 
        ? ' '.repeat(line.column + 5) + '^' // +5 for line number and separator
        : null
    })) : null,
    
    // Create formatted suggestions
    formattedSuggestions: errorInfo.suggestions.map((suggestion, index) => ({
      ...suggestion,
      id: `suggestion-${index}`,
      displayText: `${suggestion.icon} ${suggestion.text}`
    }))
  };
};

export default {
  parseDBMLError,
  formatErrorForDisplay,
  DBML_SYNTAX_HELP,
  ERROR_SOLUTIONS
};