import React, { useState, useEffect } from 'react';

export default function CameraPermissionTest() {
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [cameraStream, setCameraStream] = useState(null);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'camera' });
        setPermissionStatus(permission.state);
        
        permission.addEventListener('change', () => {
          setPermissionStatus(permission.state);
        });
      } catch (error) {
        console.log('Permission API not supported:', error);
        setPermissionStatus('unknown');
      }
    }
  };

  const testCameraAccess = async () => {
    setIsTesting(true);
    setTestResult('');
    
    try {
      console.log('Testing camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setCameraStream(stream);
      setTestResult('✅ Camera access successful!');
      console.log('Camera stream obtained:', stream);
      
      // Check if we can get video tracks
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const track = videoTracks[0];
        console.log('Video track settings:', track.getSettings());
        console.log('Video track capabilities:', track.getCapabilities());
      }
      
    } catch (error) {
      console.error('Camera access failed:', error);
      setTestResult(`❌ Camera access failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const stopCameraTest = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setTestResult('Camera test stopped');
    }
  };

  const testARSupport = async () => {
    try {
      if (!('xr' in navigator)) {
        setTestResult('❌ WebXR not available');
        return;
      }
      
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (supported) {
        setTestResult('✅ AR is supported on this device');
      } else {
        setTestResult('❌ AR is not supported on this device');
      }
    } catch (error) {
      setTestResult(`❌ AR support check failed: ${error.message}`);
    }
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Camera Permission Test</h2>
      
      <div style={{
        background: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>Current Status</h3>
        <p><strong>Camera Permission:</strong> {permissionStatus}</p>
        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
        <p><strong>HTTPS:</strong> {window.location.protocol === 'https:' ? '✅ Yes' : '❌ No'}</p>
        <p><strong>WebXR Available:</strong> {'xr' in navigator ? '✅ Yes' : '❌ No'}</p>
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={testCameraAccess}
          disabled={isTesting}
          style={{
            padding: '10px 20px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isTesting ? 'not-allowed' : 'pointer'
          }}
        >
          {isTesting ? 'Testing...' : 'Test Camera Access'}
        </button>
        
        <button
          onClick={stopCameraTest}
          disabled={!cameraStream}
          style={{
            padding: '10px 20px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: cameraStream ? 'pointer' : 'not-allowed'
          }}
        >
          Stop Camera Test
        </button>
        
        <button
          onClick={testARSupport}
          style={{
            padding: '10px 20px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test AR Support
        </button>
      </div>

      {testResult && (
        <div style={{
          background: testResult.includes('✅') ? '#e8f5e8' : '#ffe8e8',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4>Test Result:</h4>
          <p>{testResult}</p>
        </div>
      )}

      {cameraStream && (
        <div style={{
          background: '#f0f0f0',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4>Camera Stream Active</h4>
          <p>Camera is currently active. You should see camera permissions granted.</p>
          <p><strong>Track Count:</strong> {cameraStream.getTracks().length}</p>
        </div>
      )}

      <div style={{
        background: '#fff3cd',
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid #ffeaa7'
      }}>
        <h4>Instructions:</h4>
        <ol style={{ textAlign: 'left' }}>
          <li>Click "Test Camera Access" to request camera permissions</li>
          <li>Allow camera access when prompted by the browser</li>
          <li>If successful, the camera stream will be active</li>
          <li>Click "Test AR Support" to check if AR is available</li>
          <li>If both tests pass, AR should work in the main app</li>
        </ol>
      </div>

      <div style={{
        background: '#e3f2fd',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h4>Troubleshooting:</h4>
        <ul style={{ textAlign: 'left' }}>
          <li><strong>Permission Denied:</strong> Check browser settings and allow camera access</li>
          <li><strong>No HTTPS:</strong> WebXR requires secure context (HTTPS or localhost)</li>
          <li><strong>No WebXR:</strong> Use a compatible browser (Chrome, Safari, Edge)</li>
          <li><strong>No AR Support:</strong> Device may not support AR features</li>
        </ul>
      </div>
    </div>
  );
} 