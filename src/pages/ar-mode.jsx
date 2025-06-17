import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import { useNavigate } from 'react-router-dom';
import ARScene from '../components/ARScene';
import ARFallback from '../components/ARFallback';
import ARButton from '../components/ARButton';
import { useAR } from '../contexts/ARContext';
import '../styles/ARMode.css';

export default function ARMode() {
  const navigate = useNavigate();
  const { arState, checkARSupport } = useAR();
  const [selectedType, setSelectedType] = useState('tree');
  const [error, setError] = useState(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const initAR = async () => {
      try {
        await checkARSupport();
      } catch (err) {
        setError(err.message);
        setUseFallback(true);
      }
    };
    initAR();
  }, [checkARSupport]);

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
    setError(error.message);
    setUseFallback(true);
  };

  // Loading state
  if (arState.isChecking && !useFallback) {
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
  if (useFallback || !arState.isSupported) {
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

      {/* Custom AR Button */}
      <ARButton
        className="ar-button"
        onError={handleARError}
      >
        Start AR Experience
      </ARButton>

      {/* Instructions overlay */}
      {!arState.isPresenting && (
        <div className="ar-instructions">
          <h2>AR Mitigation Planner</h2>
          <p>Click the AR button to start the AR experience.</p>
          <p>Point your camera at a flat surface to place interventions.</p>
          <p>Choose from different types of heat mitigation strategies.</p>
        </div>
      )}

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
      <div className="status-indicator">
        <div className={`status-dot ${arState.isPresenting ? 'active' : 'inactive'}`}></div>
        <span>{arState.isPresenting ? 'AR Active' : 'AR Ready'}</span>
      </div>
    </div>
  );
}
