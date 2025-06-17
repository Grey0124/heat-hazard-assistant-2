import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ARExperience from '../components/ARExperience';
import ARFallback from '../components/ARFallback';
import '../styles/ARMode.css';

export default function ARMode() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('tree');
  const [useFallback, setUseFallback] = useState(false);
  const [isARSupported, setIsARSupported] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isControlsMinimized, setIsControlsMinimized] = useState(false);
  const [placedInterventions, setPlacedInterventions] = useState([]);
  const [originLat, setOriginLat] = useState(null);
  const [originLng, setOriginLng] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Getting location...');

  useEffect(() => {
    const checkARSupport = async () => {
      try {
        setIsChecking(true);
        setHasError(false);
        
        if ('xr' in navigator) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setIsARSupported(supported);
          console.log('AR Support check completed:', supported);
        } else {
          setIsARSupported(false);
          console.log('WebXR not available');
        }
      } catch (err) {
        console.error('Error checking AR support:', err);
        setIsARSupported(false);
        setHasError(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkARSupport();
  }, []);

  // Get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setOriginLat(latitude);
          setOriginLng(longitude);
          setLocationStatus(`Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          console.log('User location obtained:', { latitude, longitude });
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationStatus('Location unavailable');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setLocationStatus('Geolocation not supported');
    }
  }, []);

  const handleTypeChange = (type) => {
    console.log('Type changed to:', type);
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

  const handleInterventionAdded = (intervention) => {
    setPlacedInterventions(prev => [...prev, intervention]);
  };

  const toggleControls = () => {
    setIsControlsMinimized(!isControlsMinimized);
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
    return <ARFallback selectedType={selectedType} onTypeChange={handleTypeChange} />;
  }

  return (
    <div className="ar-mode-container">
      {/* AR Experience Component */}
      <ARExperience 
        selectedType={selectedType}
        onInterventionAdded={handleInterventionAdded}
        originLat={originLat}
        originLng={originLng}
      />

      {/* Location status */}
      <div className="location-status">
        <span>{locationStatus}</span>
      </div>

      {/* Top-left UI overlay */}
      <div className="top-ui-overlay">
        <div className="intervention-counter">
          <h3>Placed Objects: {placedInterventions.length}</h3>
          <div className="intervention-list">
            {placedInterventions.map((int, index) => (
              <div key={int.id} className="intervention-item">
                <span>{index + 1}. {int.type}</span>
                <span>Temp: {int.metadata?.temperature}°C</span>
                <span>Effect: {int.metadata?.effectiveness}%</span>
                {int.metadata?.placementLat && (
                  <span>Lat: {int.metadata.placementLat.toFixed(6)}</span>
                )}
                {int.metadata?.placementLng && (
                  <span>Lng: {int.metadata.placementLng.toFixed(6)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Minimize/Maximize button */}
      <button 
        className="minimize-button"
        onClick={toggleControls}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {isControlsMinimized ? '📋 Show Controls' : '📋 Hide Controls'}
      </button>

      {/* Intervention type controls - collapsible */}
      {!isControlsMinimized && (
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
          <button onClick={handleGoToMap} className="map-button">
            Go to Map
          </button>
          <button onClick={handleExit} className="exit-button">
            Exit
          </button>
        </div>
      )}
    </div>
  );
}
