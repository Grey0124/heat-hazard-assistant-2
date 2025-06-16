import React, { createContext, useContext, useState, useEffect } from 'react';

const ARContext = createContext();

export function ARProvider({ children }) {
  const [arState, setARState] = useState({
    isSupported: false,
    isChecking: true,
    isPresenting: false,
    features: {
      hitTest: false,
      lightEstimation: false,
      anchors: false,
      domOverlay: false
    },
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const checkARSupport = async () => {
      try {
        if (!navigator.xr) {
          throw new Error('WebXR not supported in this browser');
        }

        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!mounted) return;

        if (!supported) {
          throw new Error('AR not supported on this device');
        }

        // Check available features by requesting a temporary session
        const tempSession = await navigator.xr.requestSession('immersive-ar', {
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
          features,
          error: null
        });
      } catch (err) {
        console.error('AR Support Check Error:', err);
        if (!mounted) return;
        setARState(prev => ({
          ...prev,
          isSupported: false,
          isChecking: false,
          isPresenting: false,
          error: err.message || 'Failed to initialize AR'
        }));
      }
    };

    checkARSupport();

    return () => {
      mounted = false;
    };
  }, []);

  const setPresenting = (isPresenting) => {
    setARState(prev => ({ ...prev, isPresenting }));
  };

  const setError = (error) => {
    setARState(prev => ({ ...prev, error }));
  };

  return (
    <ARContext.Provider value={{ arState, setPresenting, setError }}>
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