import React, { useState, useEffect } from 'react';

export default function ARTest() {
  const [isSupported, setIsSupported] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('Checking AR support...');
  const [errorDetails, setErrorDetails] = useState('');

  useEffect(() => {
    checkARSupport();
  }, []);

  const checkARSupport = async () => {
    try {
      setIsChecking(true);
      setStatus('Checking AR support...');
      setErrorDetails('');

      if (!('xr' in navigator)) {
        setStatus('WebXR not available in this browser');
        setIsSupported(false);
        return;
      }

      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      setIsSupported(supported);
      
      if (supported) {
        setStatus('AR is supported! Click "Start AR" to begin.');
      } else {
        setStatus('AR is not supported on this device/browser');
      }
    } catch (error) {
      console.error('Error checking AR support:', error);
      setStatus(`Error: ${error.message}`);
      setErrorDetails(error.toString());
      setIsSupported(false);
    } finally {
      setIsChecking(false);
    }
  };

  const startAR = async () => {
    try {
      setStatus('Requesting AR session...');
      setErrorDetails('');
      
      const arSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['light-estimation', 'anchors']
      });

      setSession(arSession);
      setStatus('AR session started! Camera should be active.');

      // Test reference spaces
      const spaceTypes = ['viewer', 'local', 'local-floor', 'bounded-floor'];
      let supportedSpaces = [];
      
      for (const spaceType of spaceTypes) {
        try {
          await arSession.requestReferenceSpace(spaceType);
          supportedSpaces.push(spaceType);
        } catch (error) {
          console.log(`Reference space ${spaceType} not supported:`, error);
        }
      }

      if (supportedSpaces.length > 0) {
        setErrorDetails(`Supported reference spaces: ${supportedSpaces.join(', ')}`);
      } else {
        setErrorDetails('No reference spaces supported - this may cause issues');
      }

      // Set up session end handler
      arSession.addEventListener('end', () => {
        setSession(null);
        setStatus('AR session ended. Click "Start AR" to begin again.');
        setErrorDetails('');
      });

      console.log('AR session started successfully:', arSession);

    } catch (error) {
      console.error('Failed to start AR session:', error);
      setStatus(`Failed to start AR: ${error.message}`);
      setErrorDetails(error.toString());
    }
  };

  const endAR = () => {
    if (session) {
      session.end();
    }
  };

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
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '30px',
        borderRadius: '15px',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <h1 style={{ marginBottom: '20px' }}>AR Test</h1>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>Status:</h3>
          <p>{status}</p>
          {errorDetails && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              background: 'rgba(255, 0, 0, 0.2)',
              borderRadius: '5px',
              fontSize: '12px',
              textAlign: 'left'
            }}>
              <strong>Details:</strong> {errorDetails}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {!session ? (
            <button
              onClick={startAR}
              disabled={!isSupported || isChecking}
              style={{
                padding: '15px 30px',
                background: isSupported && !isChecking ? '#4CAF50' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: isSupported && !isChecking ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              {isChecking ? 'Checking...' : isSupported ? 'Start AR' : 'AR Not Supported'}
            </button>
          ) : (
            <button
              onClick={endAR}
              style={{
                padding: '15px 30px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              End AR Session
            </button>
          )}

          <button
            onClick={checkARSupport}
            style={{
              padding: '15px 30px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Recheck Support
          </button>
        </div>

        {session && (
          <div style={{
            marginTop: '20px',
            background: 'rgba(76, 175, 80, 0.2)',
            padding: '15px',
            borderRadius: '8px',
            border: '2px solid #4CAF50'
          }}>
            <h3>✅ AR Session Active</h3>
            <p>Your camera should now be active and showing the real world!</p>
            <p>If you see the camera feed, AR is working correctly.</p>
          </div>
        )}

        <div style={{
          marginTop: '20px',
          fontSize: '14px',
          opacity: 0.8
        }}>
          <h4>Requirements for AR:</h4>
          <ul style={{ textAlign: 'left' }}>
            <li>HTTPS connection (secure context)</li>
            <li>WebXR-compatible browser (Chrome, Safari, Edge)</li>
            <li>AR-capable device (smartphone/tablet)</li>
            <li>Camera permission granted</li>
            <li>Device supports at least one reference space type</li>
          </ul>
          
          <h4>Common Issues:</h4>
          <ul style={{ textAlign: 'left' }}>
            <li><strong>Reference Space Error:</strong> Device doesn't support the requested space type</li>
            <li><strong>Camera Not Accessing:</strong> Camera permissions denied</li>
            <li><strong>No AR Support:</strong> Device or browser doesn't support WebXR AR</li>
            <li><strong>HTTPS Required:</strong> WebXR needs secure context</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 