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
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 1000,
        maxWidth: '200px'
      }}>
        <span>{locationStatus}</span>
      </div>

      {/* Top-left UI overlay - only show when controls are visible */}
      {!isControlsMinimized && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          fontSize: '14px',
          zIndex: 1000,
          maxWidth: '300px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Placed Objects: {placedInterventions.length}</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {placedInterventions.length === 0 ? (
              <p style={{ margin: 0, opacity: 0.7 }}>No objects placed yet</p>
            ) : (
              placedInterventions.map((int, index) => (
                <div key={int.id} style={{
                  marginBottom: '8px',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '5px',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{index + 1}. {int.type}</div>
                  <div>Temp: {int.metadata?.temperature}°C</div>
                  <div>Effect: {int.metadata?.effectiveness}%</div>
                  {int.metadata?.placementLat && (
                    <div>Lat: {int.metadata.placementLat.toFixed(6)}</div>
                  )}
                  {int.metadata?.placementLng && (
                    <div>Lng: {int.metadata.placementLng.toFixed(6)}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Minimize/Maximize button */}
      <button 
        onClick={toggleControls}
        style={{
          position: 'fixed',
          top: '20px',
          right: isControlsMinimized ? '20px' : '240px',
          zIndex: 1001,
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'right 0.3s ease'
        }}
      >
        {isControlsMinimized ? '📋 Show Controls' : '📋 Hide Controls'}
      </button>

      {/* Intervention type controls - collapsible */}
      {!isControlsMinimized && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
          zIndex: 1000,
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '90vw'
        }}>
          <button
            style={{
              padding: '10px 20px',
              background: selectedType === 'tree' ? '#4CAF50' : 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: selectedType === 'tree' ? 'bold' : 'normal'
            }}
            onClick={() => handleTypeChange('tree')}
          >
            🌳 Tree
          </button>
          <button
            style={{
              padding: '10px 20px',
              background: selectedType === 'roof' ? '#2196F3' : 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: selectedType === 'roof' ? 'bold' : 'normal'
            }}
            onClick={() => handleTypeChange('roof')}
          >
            🏠 Roof
          </button>
          <button
            style={{
              padding: '10px 20px',
              background: selectedType === 'shade' ? '#FF9800' : 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: selectedType === 'shade' ? 'bold' : 'normal'
            }}
            onClick={() => handleTypeChange('shade')}
          >
            ☂️ Shade
          </button>
          <button 
            onClick={handleGoToMap} 
            style={{
              padding: '10px 20px',
              background: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🗺️ Go to Map
          </button>
          <button 
            onClick={handleExit} 
            style={{
              padding: '10px 20px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            ❌ Exit
          </button>
        </div>
      )}
    </div>
  );
}
