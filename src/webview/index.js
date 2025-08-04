import React from 'react';
import { createRoot } from 'react-dom/client';
import DBMLPreview from './components/DBMLPreview';

try {
  // Get VS Code API once at module level to avoid multiple acquisitions
  const vscode = acquireVsCodeApi();

  // Make vscode API available globally
  window.vscode = vscode;

  const container = document.getElementById('root');

  if (!container) {
    console.error('Root container not found!');
  } else {
    try {
      const root = createRoot(container);

      function App() {
        const initialContent = window.initialContent;
        
        try {
          return <DBMLPreview initialContent={initialContent} />;
        } catch (error) {
          console.error('Error in DBMLPreview component:', error);
          return <div style={{color: 'red', padding: '20px'}}>Error: {error.message}</div>;
        }
      }

      root.render(<App />);
      
      // Send ready message to VS Code
      setTimeout(() => {
        vscode.postMessage({ type: 'ready' });
      }, 100);
      
    } catch (error) {
      console.error('Error creating React root or rendering:', error);
      container.innerHTML = `<div style="color: red; padding: 20px;">React Error: ${error.message}</div>`;
    }
  }
} catch (error) {
  console.error('Critical error in webview script:', error);
  document.body.innerHTML = `<div style="color: red; padding: 20px;">Critical Error: ${error.message}</div>`;
}