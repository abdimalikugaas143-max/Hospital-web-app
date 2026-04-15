import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info.componentStack);
    this.setState({ errorInfo: info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f9fafb', padding: '24px',
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '480px',
            width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #fee2e2',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              The page encountered an error. Please try refreshing.
            </p>
            {this.state.error && (
              <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Error details:</p>
                <pre style={{
                  fontSize: '11px', color: '#ef4444', background: '#fef2f2',
                  padding: '12px', borderRadius: '8px', overflow: 'auto',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all', userSelect: 'all',
                  textAlign: 'left', maxHeight: '400px',
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo ? '\n\nComponent Stack:' + this.state.errorInfo.componentStack : ''}
                </pre>
              </div>
            )}
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
              style={{
                background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px',
                padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
