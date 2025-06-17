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

      // Check if WebXR is available
      if (!navigator.xr) {
        throw new Error('WebXR not supported in this browser');
      }

      // Check if AR is supported
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) {
        throw new Error('AR not supported on this device');
      }

      // Try to get a temporary session to check features
      let tempSession = null;
      try {
        tempSession = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['light-estimation', 'anchors', 'dom-overlay']
        });

        const features = {
          hitTest: tempSession.enabledFeatures.includes('hit-test'),
          lightEstimation: tempSession.enabledFeatures.includes('light-estimation'),
          anchors: tempSession.enabledFeatures.includes('anchors'),
          domOverlay: tempSession.enabledFeatures.includes('dom-overlay')
        };

        // End the temporary session
        await tempSession.end();

        setARState({
          isSupported: true,
          isChecking: false,
          isPresenting: false,
          session: null,
          error: null,
          features
        });
      } catch (sessionError) {
        if (tempSession) {
          await tempSession.end();
        }
        throw new Error(`AR session failed: ${sessionError.message}`);
      }
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