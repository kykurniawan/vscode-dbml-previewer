// Guard: a production webview bundle must never contain jsxDEV call sites.
const fs = require('fs');
const path = require('path');
const bundle = path.join(__dirname, '..', 'dist', 'webview.js');
if (!fs.existsSync(bundle)) {
  console.error('check-no-jsxdev: dist/webview.js not found; run the build first.');
  process.exit(1);
}
if (fs.readFileSync(bundle, 'utf8').includes('jsxDEV')) {
  console.error('check-no-jsxdev: FAIL - dist/webview.js contains jsxDEV.');
  process.exit(1);
}
console.log('check-no-jsxdev: OK - no jsxDEV in production bundle.');
