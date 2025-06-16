import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { ARButton, XR } from '@react-three/xr';
import { useNavigate } from 'react-router-dom';
import ARScene from '../components/ARScene';
import { useAR } from '../contexts/ARContext';
import '../styles/ARMode.css';

export default function ARMode() {
  const navigate = useNavigate();
  const { arState, checkARSupport } = useAR();
  const [selectedType, setSelectedType] = useState('tree');
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAR = async () => {
      try {
        await checkARSupport();
      } catch (err) {
        setError(err.message);
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

  if (arState.isChecking) {
    return (
      <div className="ar-mode-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Checking AR support...</p>
        </div>
      </div>
    );
  }

  if (error || !arState.isSupported) {
    return (
      <div className="ar-mode-container">
        <div className="error-overlay">
          <h2>AR Not Available</h2>
          <p>{error || 'Your device does not support AR features.'}</p>
          <button onClick={() => navigate('/map')} className="map-button">
            Go to Map Mode
          </button>
          <button onClick={handleExit} className="exit-button">
            Exit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-mode-container">
      <ARButton
        className="ar-button"
        onError={(error) => setError(error.message)}
      />
      
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
          onError={(error) => setError(error.message)}
        >
          <ARScene selectedType={selectedType} />
        </XR>
      </Canvas>

      {!arState.isPresenting && (
        <div className="ar-instructions">
          <h2>AR Mode</h2>
          <p>Click the AR button to start the AR experience.</p>
          <p>Point your camera at a flat surface to place interventions.</p>
        </div>
      )}

      <div className="intervention-controls">
        <button
          className={`intervention-button ${selectedType === 'tree' ? 'active' : ''}`}
          onClick={() => handleTypeChange('tree')}
        >
          Tree
        </button>
        <button
          className={`intervention-button ${selectedType === 'roof' ? 'active' : ''}`}
          onClick={() => handleTypeChange('roof')}
        >
          Roof
        </button>
        <button onClick={handleExit} className="exit-button">
          Exit AR
        </button>
      </div>
    </div>
  );
}
