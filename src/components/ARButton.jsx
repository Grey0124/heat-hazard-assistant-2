import React, { useState, useEffect, useRef } from 'react';
import { ARButton as ThreeJSARButton } from 'three/examples/jsm/webxr/ARButton.js';

export default function ARButton({ 
  sessionInit = {}, 
  onUnsupported, 
  onSessionStart, 
  onSessionEnd,
  children,
  style = {}
}) {
  const buttonRef = useRef();
  const [isSupported, setIsSupported] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('unknown');

  useEffect(() => {
    const checkSupport = async () => {
      try {
        if ('xr' in navigator) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setIsSupported(supported);
          console.log('AR Support check completed:', supported);
          
          // Check camera permission status
          if (navigator.permissions) {
            try {
              const permission = await navigator.permissions.query({ name: 'camera' });
              setPermissionStatus(permission.state);
              console.log('Camera permission status:', permission.state);
              
              // Listen for permission changes
              permission.addEventListener('change', () => {
                setPermissionStatus(permission.state);
                console.log('Camera permission changed to:', permission.state);
              });
            } catch (permError) {
              console.log('Permission API not supported:', permError);
              setPermissionStatus('unknown');
            }
          }
        } else {
          setIsSupported(false);
          console.log('WebXR not available');
        }
      } catch (error) {
        console.error('AR support check failed:', error);
        setIsSupported(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkSupport();
  }, []);

  // Explicit camera permission request function
  const requestCameraPermission = async () => {
    try {
      // Try to get camera stream to trigger permission request
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      return true;
    } catch (error) {
      setPermissionStatus('denied');
      return false;
    }
  };

  const handleClick = async () => {
    if (!isSupported) {
      onUnsupported?.();
      return;
    }

    // Request camera permission first
    const cameraGranted = await requestCameraPermission();
    if (!cameraGranted) {
      alert('Camera permission is required for AR. Please allow camera access and try again.');
      onUnsupported?.();
      return;
    }

    try {
      console.log('Starting AR session...');
      
      // Request AR session immediately after user click (user activation requirement)
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'local-floor', 'light-estimation'],
        domOverlay: { root: document.body },
        ...sessionInit
      });

      console.log('AR session started successfully');
      onSessionStart?.(session);
      
      // Set up session event listeners
      session.addEventListener('end', () => {
        console.log('AR session ended');
        onSessionEnd?.();
      });

      session.addEventListener('visibilitychange', () => {
        console.log('AR session visibility changed:', session.visibilityState);
      });

      // Set up session for rendering
      session.addEventListener('select', () => {
        console.log('AR session select event');
      });

    } catch (error) {
      console.error('Failed to start AR session:', error);
      
      // Provide specific error messages
      if (error.message.includes('user activation')) {
        alert('AR session requires direct user interaction. Please click the button again.');
      } else if (error.message.includes('permission')) {
        alert('Camera permission is required for AR. Please allow camera access and try again.');
      } else if (error.message.includes('not supported')) {
        alert('AR is not supported on this device or browser.');
      } else {
        alert(`AR session failed: ${error.message}`);
      }
      
      onUnsupported?.();
    }
  };

  if (isChecking) {
    return (
      <button
        style={{
          padding: '12px 24px',
          background: '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'not-allowed',
          ...style
        }}
        disabled
        title="Checking AR and camera support..."
      >
        Checking AR Support...
      </button>
    );
  }

  const getButtonText = () => {
    if (!isSupported) return 'AR Not Supported';
    if (permissionStatus === 'denied') return 'Camera Permission Required';
    return children || 'Start AR Experience';
  };

  const getButtonStyle = () => {
    if (!isSupported) return { background: '#ccc', cursor: 'not-allowed' };
    if (permissionStatus === 'denied') return { background: '#f44336', cursor: 'not-allowed' };
    return { background: '#2196f3', cursor: 'pointer' };
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={!isSupported || permissionStatus === 'denied'}
      style={{
        padding: '12px 24px',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        ...getButtonStyle(),
        ...style
      }}
      title={
        !isSupported
          ? 'AR is not supported on this device or browser.'
          : permissionStatus === 'denied'
            ? 'Camera permission is required for AR. Please allow camera access in your browser settings.'
            : 'Start AR Experience'
      }
    >
      {getButtonText()}
    </button>
  );
} 