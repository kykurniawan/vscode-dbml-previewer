import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Parser } from '@dbml/core';
import TableNode from './TableNode';
import { transformDBMLToNodes } from '../utils/dbmlTransformer';

const nodeTypes = {
  table: TableNode,
};

const DBMLPreview = ({ initialContent }) => {
  console.log('DBMLPreview component rendering with:', initialContent);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [dbmlData, setDbmlData] = useState(null);
  const [dbmlContent, setDbmlContent] = useState(initialContent || '');
  const [parseError, setParseError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Disabled manual connections for preview-only mode
  const onConnect = useCallback(() => {
    // No-op: Manual connections are disabled in preview mode
  }, []);

  // Parse DBML content
  const parseDBML = useCallback(async (content) => {
    if (!content || content.trim() === '') {
      setDbmlData(null);
      setParseError(null);
      return;
    }

    setIsLoading(true);
    setParseError(null);
    
    try {
      const parser = new Parser();
      const parsed = parser.parse(content, 'dbmlv2');
      setDbmlData(parsed);
    } catch (error) {
      console.error('DBML Parse Error:', error);
      setParseError(error.message || 'Failed to parse DBML content');
      setDbmlData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Parse initial content
  useEffect(() => {
    if (dbmlContent) {
      parseDBML(dbmlContent);
    }
  }, [dbmlContent, parseDBML]);

  // Listen for messages from VS Code extension
  useEffect(() => {
    const vscode = window.vscode;
    
    const messageListener = (event) => {
      const message = event.data;
      
      switch (message.type) {
        case 'updateContent':
          setDbmlContent(message.content || '');
          break;
      }
    };

    window.addEventListener('message', messageListener);
    
    // Request initial data
    vscode.postMessage({ type: 'ready' });
    
    return () => {
      window.removeEventListener('message', messageListener);
    };
  }, []);

  // Transform DBML data to nodes and edges when data changes
  useEffect(() => {
    if (dbmlData) {
      const { nodes: newNodes, edges: newEdges } = transformDBMLToNodes(dbmlData);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [dbmlData, setNodes, setEdges]);

  // Show error state
  if (parseError) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: 'var(--vscode-inputValidation-errorBackground)',
          border: '1px solid var(--vscode-inputValidation-errorBorder)',
          color: 'var(--vscode-inputValidation-errorForeground)',
          padding: '16px',
          borderRadius: '4px',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>❌ DBML Parse Error</h3>
          <p style={{ margin: '0', fontSize: '14px', fontFamily: 'monospace' }}>
            {parseError}
          </p>
        </div>
        <button
          onClick={() => parseDBML(dbmlContent)}
          style={{
            background: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        >
          Retry Parse
        </button>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          color: 'var(--vscode-editor-foreground)',
          fontSize: '16px'
        }}>
          ⏳ Parsing DBML...
        </div>
      </div>
    );
  }

  // Show empty state
  if (!dbmlData || !dbmlData.schemas?.[0]?.tables?.length) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ 
          color: 'var(--vscode-descriptionForeground)',
          fontSize: '16px'
        }}>
          📄 No tables found in DBML
        </div>
        <div style={{ 
          color: 'var(--vscode-descriptionForeground)',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          Make sure your DBML file contains table definitions
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        connectionMode="loose"
        elementsSelectable={true}
        nodesConnectable={false}
        nodesDraggable={true}
        panOnDrag={true}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
      >
        <Controls />
        <Background />
        <Panel position="top-right">
          <div style={{ 
            background: 'var(--vscode-editor-background)', 
            color: 'var(--vscode-editor-foreground)',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <strong>✅ DBML Preview</strong>
            <div style={{ fontSize: '12px' }}>
              {dbmlData.schemas?.[0]?.tables?.length || 0} tables
            </div>
            <div style={{ fontSize: '12px' }}>
              {dbmlData.schemas?.[0]?.refs?.length || 0} relationships
            </div>
            <button
              onClick={() => {
                const vscode = window.vscode;
                vscode.postMessage({ type: 'export', format: 'png' });
              }}
              style={{
                background: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '2px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              Export
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default DBMLPreview;