const { Parser } = require('@dbml/core');

/**
 * Parse DBML content and return a syntax tree
 * @param {string} content 
 * @returns {object}
 */
function parseDbmlContent(content) {
    const parser = new Parser();
    return parser.parse(content, 'dbmlv2');
}

module.exports = {
    parseDbmlContent
}