import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ARContext = createContext();

export function ARProvider({ children }) {
  const [arState, setARState] = useState({
    isSupported: false,
    isChecking: true,
    isPresenting: false,
    session: null,
    error: null,
    features: {
      hitTest: false,
      lightEstimation: false,
      anchors: false,
      domOverlay: false
    }
  });

  const checkARSupport = useCallback(async () => {
    try {
      setARState(prev => ({ ...prev, isChecking: true, error: null }));

      // Simple AR support check - this was working before
      if (!navigator.xr) {
        throw new Error('WebXR not supported in this browser');
      }

      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) {
        throw new Error('AR not supported on this device');
      }

      // Set supported without trying to create a temporary session
      setARState({
        isSupported: true,
        isChecking: false,
        isPresenting: false,
        session: null,
        error: null,
        features: {
          hitTest: true, // Assume basic features are available
          lightEstimation: false,
          anchors: false,
          domOverlay: false
        }
      });
    } catch (error) {
      console.error('AR Support Check Error:', error);
      setARState({
        isSupported: false,
        isChecking: false,
        isPresenting: false,
        session: null,
        error: error.message,
        features: {
          hitTest: false,
          lightEstimation: false,
          anchors: false,
          domOverlay: false
        }
      });
    }
  }, []);

  const startARSession = useCallback(async () => {
    try {
      if (!arState.isSupported) {
        throw new Error('AR not supported');
      }

      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['light-estimation', 'anchors', 'dom-overlay']
      });

      setARState(prev => ({
        ...prev,
        session,
        isPresenting: true,
        error: null
      }));

      return session;
    } catch (error) {
      console.error('Failed to start AR session:', error);
      setARState(prev => ({
        ...prev,
        error: error.message,
        isPresenting: false
      }));
      throw error;
    }
  }, [arState.isSupported]);

  const endARSession = useCallback(async () => {
    try {
      if (arState.session) {
        await arState.session.end();
      }
    } catch (error) {
      console.error('Error ending AR session:', error);
    } finally {
      setARState(prev => ({
        ...prev,
        session: null,
        isPresenting: false
      }));
    }
  }, [arState.session]);

  useEffect(() => {
    checkARSupport();
  }, [checkARSupport]);

  const value = {
    arState,
    checkARSupport,
    startARSession,
    endARSession,
    setError: (error) => setARState(prev => ({ ...prev, error }))
  };

  return (
    <ARContext.Provider value={value}>
      {children}
    </ARContext.Provider>
  );
}

export function useAR() {
  const context = useContext(ARContext);
  if (!context) {
    throw new Error('useAR must be used within an ARProvider');
  }
  return context;
} 