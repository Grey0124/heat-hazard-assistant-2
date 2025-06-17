import React, { useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import arSessionManager from '../utils/ARSessionManager';

export default function ARButton({ className, onError, children }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { gl } = useThree();
  const { isPresenting, setIsPresenting } = useXR();

  useEffect(() => {
    const checkSupport = async () => {
      try {
        setIsChecking(true);
        await arSessionManager.checkSupport();
        setIsSupported(true);
      } catch (error) {
        console.error('AR not supported:', error);
        setIsSupported(false);
        if (onError) {
          onError(error);
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkSupport();
  }, [onError]);

  const handleClick = async () => {
    if (!isSupported || isPresenting) return;

    try {
      // Set up callbacks
      arSessionManager.setCallbacks({
        onSessionStart: (session) => {
          setIsPresenting(true);
        },
        onSessionEnd: () => {
          setIsPresenting(false);
        },
        onError: (error) => {
          console.error('AR Session Error:', error);
          setIsPresenting(false);
          if (onError) {
            onError(error);
          }
        }
      });

      // Start the session
      await arSessionManager.startSession(gl.getRenderer());
    } catch (error) {
      console.error('Failed to start AR session:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  if (isChecking) {
    return (
      <button 
        className={className} 
        disabled
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
      >
        Checking AR...
      </button>
    );
  }

  if (!isSupported) {
    return null; // Don't show button if AR is not supported
  }

  return (
    <button
      className={className}
      onClick={handleClick}
      disabled={isPresenting}
      style={{
        opacity: isPresenting ? 0.5 : 1,
        cursor: isPresenting ? 'not-allowed' : 'pointer'
      }}
    >
      {children || (isPresenting ? 'AR Active' : 'Start AR')}
    </button>
  );
} 