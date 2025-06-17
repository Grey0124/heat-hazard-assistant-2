import React, { useState, useEffect } from 'react';
import { useXR } from '@react-three/xr';

export default function ModernARButton({ className, onError, children }) {
  const { store, isPresenting } = useXR();
  const [isSupported, setIsSupported] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSupport = async () => {
      try {
        setIsChecking(true);
        
        if (navigator.xr) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setIsSupported(supported);
        } else {
          setIsSupported(false);
        }
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
      await store.enterXR('immersive-ar');
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