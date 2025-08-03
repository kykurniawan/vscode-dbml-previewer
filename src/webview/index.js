import React from 'react';
import { createRoot } from 'react-dom/client';
import DBMLPreview from './components/DBMLPreview';

console.log('Webview script loaded');

// Get VS Code API once at module level to avoid multiple acquisitions
const vscode = acquireVsCodeApi();
console.log('VS Code API acquired:', vscode);

// Make vscode API available globally
window.vscode = vscode;

const container = document.getElementById('root');
console.log('Container found:', container);

if (!container) {
  console.error('Root container not found!');
} else {
  const root = createRoot(container);
  console.log('React root created');

  function App() {
    const initialContent = window.initialContent;
    console.log('Initial content:', initialContent);
    return <DBMLPreview initialContent={initialContent} />;
  }

  console.log('Rendering React app...');
  root.render(<App />);
  console.log('React app rendered');
}