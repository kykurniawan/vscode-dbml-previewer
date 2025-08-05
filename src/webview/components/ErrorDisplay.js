import React, { useState } from 'react';

/**
 * Enhanced Error Display Component for DBML Parser Errors
 * Displays detailed, actionable error information with context and suggestions
 */
const ErrorDisplay = ({ errorInfo, onRetry }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showStackTrace, setShowStackTrace] = useState(false);
  const [showRawError, setShowRawError] = useState(false);

  if (!errorInfo) return null;

  const {
    title,
    icon,
    shortMessage,
    line,
    column,
    contextLines,
    formattedSuggestions,
    originalMessage,
    expected,
    found,
    type,
    serializedError
  } = errorInfo;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      backgroundColor: 'var(--vscode-editor-background)'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '0'
      }}>
        {/* Main Error Header */}
        <div style={{
          background: 'var(--vscode-inputValidation-errorBackground)',
          border: `1px solid var(--vscode-inputValidation-errorBorder)`,
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>{icon}</span>
            <div>
              <h2 style={{
                margin: '0',
                fontSize: '18px',
                color: 'var(--vscode-inputValidation-errorForeground)',
                fontWeight: '600'
              }}>
                {title}
              </h2>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                color: 'var(--vscode-inputValidation-errorForeground)',
                opacity: 0.9
              }}>
                {shortMessage}
              </p>
            </div>
          </div>

          {line && column && (
            <div style={{
              display: 'flex',
              gap: '16px',
              fontSize: '12px',
              color: 'var(--vscode-inputValidation-errorForeground)',
              opacity: 0.8,
              marginBottom: '12px'
            }}>
              <span>📍 Line {line}</span>
              <span>📌 Column {column}</span>
              {expected && <span>🎯 Expected: {Array.isArray(expected) ? expected.join(', ') : expected}</span>}
              {found && <span>❓ Found: "{found}"</span>}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={onRetry}
              style={{
                background: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'var(--vscode-button-hoverBackground)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'var(--vscode-button-background)';
              }}
            >
              🔄 Try Again
            </button>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: '1px solid var(--vscode-button-border)',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {showDetails ? '👁️ Hide Details' : '🔍 Show Details'}
            </button>
          </div>
        </div>

        {/* Context Section */}
        {contextLines && contextLines.length > 0 && (
          <div style={{
            background: 'var(--vscode-input-background)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '6px',
            marginBottom: '16px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--vscode-input-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--vscode-editor-background)'
            }}>
              <h3 style={{
                margin: '0',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--vscode-editor-foreground)'
              }}>
                📄 Error Context
              </h3>
              <button
                onClick={() => setShowContext(!showContext)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--vscode-textLink-foreground)',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showContext ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showContext && (
              <div style={{
                padding: '16px',
                fontFamily: 'var(--vscode-editor-font-family, "Courier New", monospace)',
                fontSize: '12px',
                lineHeight: '1.5',
                backgroundColor: 'var(--vscode-editor-background)',
                color: 'var(--vscode-editor-foreground)'
              }}>
                {contextLines.map((line, index) => (
                  <div key={index}>
                    <div style={{
                      backgroundColor: line.isError 
                        ? 'var(--vscode-inputValidation-errorBackground)' 
                        : 'transparent',
                      padding: '2px 8px',
                      margin: '1px 0',
                      borderRadius: '3px',
                      border: line.isError 
                        ? '1px solid var(--vscode-inputValidation-errorBorder)' 
                        : '1px solid transparent'
                    }}>
                      <span style={{
                        color: line.isError 
                          ? 'var(--vscode-inputValidation-errorForeground)' 
                          : 'var(--vscode-descriptionForeground)',
                        marginRight: '8px',
                        fontWeight: line.isError ? 'bold' : 'normal'
                      }}>
                        {line.displayText}
                      </span>
                    </div>
                    {line.errorMarker && (
                      <div style={{
                        color: 'var(--vscode-inputValidation-errorForeground)',
                        fontSize: '12px',
                        paddingLeft: '8px',
                        fontWeight: 'bold'
                      }}>
                        {line.errorMarker}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestions Section */}
        {formattedSuggestions && formattedSuggestions.length > 0 && (
          <div style={{
            background: 'var(--vscode-input-background)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '6px',
            marginBottom: '16px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--vscode-input-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--vscode-editor-background)'
            }}>
              <h3 style={{
                margin: '0',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--vscode-editor-foreground)'
              }}>
                💡 Suggestions
              </h3>
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--vscode-textLink-foreground)',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showSuggestions ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showSuggestions && (
              <div style={{ padding: '16px' }}>
                {formattedSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px',
                      marginBottom: index < formattedSuggestions.length - 1 ? '8px' : '0',
                      backgroundColor: 'var(--vscode-editor-background)',
                      border: '1px solid var(--vscode-panel-border)',
                      borderRadius: '4px'
                    }}
                  >
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>
                      {suggestion.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: '0 0 4px 0',
                        fontSize: '13px',
                        color: 'var(--vscode-editor-foreground)',
                        lineHeight: '1.4'
                      }}>
                        {suggestion.text}
                      </p>
                      
                      {suggestion.example && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: 'var(--vscode-textCodeBlock-background)',
                          border: '1px solid var(--vscode-input-border)',
                          borderRadius: '3px',
                          fontSize: '12px',
                          fontFamily: 'var(--vscode-editor-font-family, "Courier New", monospace)'
                        }}>
                          <div style={{
                            color: 'var(--vscode-descriptionForeground)',
                            marginBottom: '4px',
                            fontSize: '11px'
                          }}>
                            Example:
                          </div>
                          <pre style={{
                            margin: '0',
                            color: 'var(--vscode-editor-foreground)',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {suggestion.example}
                          </pre>
                        </div>
                      )}
                      
                      {suggestion.syntax && !suggestion.example && (
                        <div style={{
                          marginTop: '4px',
                          fontSize: '12px',
                          color: 'var(--vscode-descriptionForeground)',
                          fontFamily: 'var(--vscode-editor-font-family, "Courier New", monospace)'
                        }}>
                          Syntax: <code>{suggestion.syntax}</code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Technical Details (Collapsible) */}
        {showDetails && (
          <div style={{
            background: 'var(--vscode-input-background)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--vscode-input-border)',
              backgroundColor: 'var(--vscode-editor-background)'
            }}>
              <h3 style={{
                margin: '0',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--vscode-editor-foreground)'
              }}>
                🔧 Technical Details
              </h3>
            </div>
            <div style={{
              padding: '16px',
              fontFamily: 'var(--vscode-editor-font-family, "Courier New", monospace)',
              fontSize: '12px',
              lineHeight: '1.5',
              backgroundColor: 'var(--vscode-textCodeBlock-background)',
              color: 'var(--vscode-editor-foreground)',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {/* Error Type and Name */}
              <div style={{ marginBottom: '12px' }}>
                <strong>Error Type:</strong> {type}
              </div>
              {serializedError && serializedError.name && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>Error Name:</strong> {serializedError.name}
                </div>
              )}

              {/* Primary Error Message */}
              <div style={{ marginBottom: '12px' }}>
                <strong>Message:</strong>
              </div>
              <div style={{
                padding: '8px',
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '3px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: '16px'
              }}>
                {originalMessage}
              </div>

              {/* Error Properties (if any) */}
              {serializedError && serializedError.details && Object.keys(serializedError.details).length > 0 && (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Error Properties:</strong>
                  </div>
                  <div style={{
                    padding: '8px',
                    backgroundColor: 'var(--vscode-editor-background)',
                    border: '1px solid var(--vscode-input-border)',
                    borderRadius: '3px',
                    marginBottom: '16px',
                    maxHeight: '150px',
                    overflowY: 'auto'
                  }}>
                    <pre style={{
                      margin: '0',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '11px'
                    }}>
                      {JSON.stringify(serializedError.details, null, 2)}
                    </pre>
                  </div>
                </>
              )}

              {/* Stack Trace Section */}
              {serializedError && serializedError.stack && (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <strong>Stack Trace:</strong>
                    <button
                      onClick={() => setShowStackTrace(!showStackTrace)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--vscode-textLink-foreground)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        textDecoration: 'underline'
                      }}
                    >
                      {showStackTrace ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showStackTrace && (
                    <div style={{
                      padding: '8px',
                      backgroundColor: 'var(--vscode-editor-background)',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '3px',
                      marginBottom: '16px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      <pre style={{
                        margin: '0',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '10px',
                        lineHeight: '1.3'
                      }}>
                        {serializedError.stack}
                      </pre>
                    </div>
                  )}
                </>
              )}

              {/* Raw Error Object Section */}
              {serializedError && serializedError.rawError && (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <strong>Raw Error Object:</strong>
                    <button
                      onClick={() => setShowRawError(!showRawError)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--vscode-textLink-foreground)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        textDecoration: 'underline'
                      }}
                    >
                      {showRawError ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showRawError && (
                    <div style={{
                      padding: '8px',
                      backgroundColor: 'var(--vscode-editor-background)',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '3px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      <pre style={{
                        margin: '0',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '10px',
                        lineHeight: '1.3'
                      }}>
                        {serializedError.rawError}
                      </pre>
                    </div>
                  )}
                </>
              )}

              {/* Debug Information */}
              <div style={{
                marginTop: '16px',
                paddingTop: '8px',
                borderTop: '1px solid var(--vscode-input-border)',
                fontSize: '10px',
                color: 'var(--vscode-descriptionForeground)'
              }}>
                <strong>Debug Info:</strong> Error captured and enhanced by DBML Previewer error handler
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;