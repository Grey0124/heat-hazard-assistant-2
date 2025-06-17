import React from 'react';
import { useNavigate } from 'react-router-dom';

class ARErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AR Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#f44336', marginBottom: '16px' }}>
            AR Experience Error
          </h2>
          <p style={{ color: '#666', marginBottom: '24px', maxWidth: '400px' }}>
            There was an issue loading the AR experience. This might be due to WebGL compatibility or device limitations.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                background: '#2196f3',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => this.props.onFallback()}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                background: '#4caf50',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Use 3D Preview
            </button>
            <button
              onClick={() => this.props.onExit()}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                background: '#f44336',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Exit
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ARErrorBoundary; 