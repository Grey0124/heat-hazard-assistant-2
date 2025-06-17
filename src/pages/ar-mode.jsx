import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, useXR } from '@react-three/xr';
import { useNavigate } from 'react-router-dom';
import ARScene from '../components/ARScene';
import ARFallback from '../components/ARFallback';
import ModernARButton from '../components/ModernARButton';
import '../styles/ARMode.css';

// AR Button Component that uses the XR store
function ARButtonWrapper({ onError }) {
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
        className="ar-button" 
        disabled
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
      >
        Checking AR...
      </button>
    );
  }

  if (!isSupported) {
    return null;
  }

  return (
    <button
      className="ar-button"
      onClick={handleClick}
      disabled={isPresenting}
      style={{
        opacity: isPresenting ? 0.5 : 1,
        cursor: isPresenting ? 'not-allowed' : 'pointer'
      }}
    >
      {isPresenting ? 'AR Active' : 'Start AR Experience'}
    </button>
  );
}

// Status Indicator Component
function StatusIndicator() {
  const { isPresenting } = useXR();
  
  return (
    <div className="status-indicator">
      <div className={`status-dot ${isPresenting ? 'active' : 'inactive'}`}></div>
      <span>{isPresenting ? 'AR Active' : 'AR Ready'}</span>
    </div>
  );
}

export default function ARMode() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('tree');
  const [error, setError] = useState(null);
  const [useFallback, setUseFallback] = useState(false);
  const [isARSupported, setIsARSupported] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkARSupport = async () => {
      try {
        setIsChecking(true);
        
        // Simple AR support check - this was working before
        if (navigator.xr) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setIsARSupported(supported);
          if (!supported) {
            setUseFallback(true);
          }
        } else {
          setIsARSupported(false);
          setUseFallback(true);
        }
      } catch (err) {
        console.error('Error checking AR support:', err);
        setIsARSupported(false);
        setUseFallback(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkARSupport();
  }, []);

  const handleTypeChange = (type) => {
    setSelectedType(type);
  };

  const handleExit = () => {
    navigate('/');
  };

  const handleGoToMap = () => {
    navigate('/mitigation-planner');
  };

  const handleUseFallback = () => {
    setUseFallback(true);
  };

  const handleARError = (error) => {
    console.error('AR Error:', error);
    setError(error.message || 'AR session error');
    setUseFallback(true);
  };

  // Loading state
  if (isChecking) {
    return (
      <div className="ar-mode-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Checking AR support...</p>
        </div>
      </div>
    );
  }

  // Use fallback if AR is not supported or user chooses to
  if (useFallback || !isARSupported) {
    return <ARFallback selectedType={selectedType} />;
  }

  // Error state with option to use fallback
  if (error) {
    return (
      <div className="ar-mode-container">
        <div className="error-overlay">
          <h2>AR Not Available</h2>
          <p>{error}</p>
          <div className="error-buttons">
            <button onClick={handleUseFallback} className="map-button">
              Use 3D Preview
            </button>
            <button onClick={handleGoToMap} className="map-button">
              Go to Map Mode
            </button>
            <button onClick={handleExit} className="exit-button">
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-mode-container">
      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0, 0], fov: 75, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          xrCompatible: true
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'transparent'
        }}
      >
        <XR
          onSessionStart={() => setError(null)}
          onSessionEnd={() => setError('AR session ended')}
          onError={handleARError}
        >
          <ARScene selectedType={selectedType} />
        </XR>
      </Canvas>

      {/* Modern AR Button */}
      <ARButtonWrapper onError={handleARError} />

      {/* Instructions overlay */}
      <div className="ar-instructions">
        <h2>AR Mitigation Planner</h2>
        <p>Click the AR button to start the AR experience.</p>
        <p>Point your camera at a flat surface to place interventions.</p>
        <p>Choose from different types of heat mitigation strategies.</p>
      </div>

      {/* Intervention type controls */}
      <div className="intervention-controls">
        <button
          className={`intervention-button ${selectedType === 'tree' ? 'active' : ''}`}
          onClick={() => handleTypeChange('tree')}
        >
          🌳 Tree
        </button>
        <button
          className={`intervention-button ${selectedType === 'roof' ? 'active' : ''}`}
          onClick={() => handleTypeChange('roof')}
        >
          🏠 Roof
        </button>
        <button
          className={`intervention-button ${selectedType === 'shade' ? 'active' : ''}`}
          onClick={() => handleTypeChange('shade')}
        >
          ☂️ Shade
        </button>
        <button onClick={handleExit} className="exit-button">
          Exit AR
        </button>
      </div>

      {/* Status indicator */}
      <StatusIndicator />
    </div>
  );
}
