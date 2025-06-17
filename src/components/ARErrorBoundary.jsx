import React from 'react';

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
    
    // Log specific WebGL/XR errors
    if (error.message && error.message.includes('WebGL')) {
      console.error('WebGL context error detected');
    }
    
    if (error.message && error.message.includes('XR')) {
      console.error('XR/WebXR error detected');
    }
    
    if (error.message && error.message.includes('setWebXRManager')) {
      console.error('WebXR Manager setup error detected');
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleFallback = () => {
    if (this.props.onFallback) {
      this.props.onFallback();
    }
  };

  handleExit = () => {
    if (this.props.onExit) {
      this.props.onExit();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '30px',
            borderRadius: '15px',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
              AR Experience Error
            </h2>
            
            <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
              We encountered an issue with the AR experience. This could be due to:
            </p>
            
            <ul style={{ 
              textAlign: 'left', 
              marginBottom: '25px',
              lineHeight: '1.5'
            }}>
              <li>WebGL context issues</li>
              <li>WebXR compatibility problems</li>
              <li>Device performance limitations</li>
              <li>Browser security restrictions</li>
            </ul>

            {this.state.error && (
              <details style={{ 
                marginBottom: '20px',
                textAlign: 'left',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '10px',
                borderRadius: '5px'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '5px' }}>
                  Technical Details
                </summary>
                <code style={{ fontSize: '12px', wordBreak: 'break-word' }}>
                  {this.state.error.toString()}
                </code>
              </details>
            )}

            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '12px 24px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                🔄 Try Again
              </button>
              
              <button
                onClick={this.handleFallback}
                style={{
                  padding: '12px 24px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                📱 Use 3D Preview
              </button>
              
              <button
                onClick={this.handleExit}
                style={{
                  padding: '12px 24px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                ❌ Exit
              </button>
            </div>

            <div style={{
              marginTop: '20px',
              fontSize: '14px',
              opacity: 0.8
            }}>
              <p>💡 Tip: Try refreshing the page or using a different browser</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ARErrorBoundary; 