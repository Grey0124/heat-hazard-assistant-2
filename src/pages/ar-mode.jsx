import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, useXR } from '@react-three/xr';
import { useNavigate } from 'react-router-dom';
import ARScene from '../components/ARScene';
import ARFallback from '../components/ARFallback';
import ARErrorBoundary from '../components/ARErrorBoundary';
import '../styles/ARMode.css';

// Loading component for Suspense
function CanvasLoader() {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: 'white',
      fontSize: '18px'
    }}>
      Loading AR Experience...
    </div>
  );
}

// AR Button Component that must be inside XR context
function ARButton() {
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
      } finally {
        setIsChecking(false);
      }
    };

    checkSupport();
  }, []);

  const handleClick = async () => {
    if (!isSupported || isPresenting) return;

    try {
      await store.enterXR('immersive-ar');
    } catch (error) {
      console.error('Failed to start AR session:', error);
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

// AR Scene with UI Components
function ARSceneWithUI({ selectedType }) {
  return (
    <>
      <ARScene selectedType={selectedType} />
      <ARButton />
      <StatusIndicator />
    </>
  );
}

export default function ARMode() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('tree');
  const [useFallback, setUseFallback] = useState(false);
  const [isARSupported, setIsARSupported] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const checkARSupport = async () => {
      try {
        setIsChecking(true);
        setHasError(false);
        
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
        setHasError(true);
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

  const handleFallback = () => {
    setUseFallback(true);
  };

  // Error state
  if (hasError) {
    return (
      <div className="ar-mode-container">
        <div className="error-overlay">
          <h2>AR Not Available</h2>
          <p>Your device or browser doesn't support AR features. You can still use the 3D preview mode.</p>
          <div className="error-buttons">
            <button onClick={handleFallback} className="map-button">
              Use 3D Preview
            </button>
            <button onClick={handleExit} className="exit-button">
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  // Use fallback if AR is not supported
  if (useFallback || !isARSupported) {
    return <ARFallback selectedType={selectedType} />;
  }

  return (
    <div className="ar-mode-container">
      {/* Three.js Canvas with error boundary */}
      <ARErrorBoundary onFallback={handleFallback} onExit={handleExit}>
        <Suspense fallback={<CanvasLoader />}>
          <Canvas
            camera={{ position: [0, 0, 3], fov: 75 }}
            gl={{ 
              antialias: true,
              alpha: true,
              preserveDrawingBuffer: true,
              powerPreference: 'default'
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'transparent'
            }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <XR>
              <ARSceneWithUI selectedType={selectedType} />
            </XR>
          </Canvas>
        </Suspense>
      </ARErrorBoundary>

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
    </div>
  );
}
