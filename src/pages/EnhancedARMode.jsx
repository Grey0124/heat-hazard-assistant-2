import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedARExperience from '../components/EnhancedARExperience';
import '../styles/ARMode.css';

export default function EnhancedARMode() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('tree');
  const [isARSupported, setIsARSupported] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [placedInterventions, setPlacedInterventions] = useState([]);
  const [originLat, setOriginLat] = useState(null);
  const [originLng, setOriginLng] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Getting location...');
  
  // UI State for collapsible panels
  const [isTypeSelectorVisible, setIsTypeSelectorVisible] = useState(true);
  const [isStatsPanelVisible, setIsStatsPanelVisible] = useState(true);
  const [isLocationPanelVisible, setIsLocationPanelVisible] = useState(true);
  const [isControlsPanelVisible, setIsControlsPanelVisible] = useState(true);

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

  const handleInterventionAdded = (intervention) => {
    setPlacedInterventions(prev => [...prev, intervention]);
  };

  const calculateTotalEffectiveness = () => {
    if (placedInterventions.length === 0) return 0;
    const total = placedInterventions.reduce((sum, int) => sum + (int.metadata?.effectiveness || 0), 0);
    return Math.round(total / placedInterventions.length);
  };

  const calculateTotalTemperatureReduction = () => {
    if (placedInterventions.length === 0) return 0;
    const total = placedInterventions.reduce((sum, int) => sum + (int.metadata?.temperature || 0), 0);
    return Math.round(total / placedInterventions.length);
  };

  // Error state
  if (hasError) {
    return (
      <div className="ar-mode-container">
        <div className="error-overlay">
          <h2>AR Not Available</h2>
          <p>Your device or browser doesn't support AR features. You can still use the 3D preview mode.</p>
          <div className="error-buttons">
            <button onClick={() => setIsARSupported(false)} className="map-button">
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

  return (
    <div className="ar-mode-container">
      {/* Enhanced AR Experience Component */}
      <EnhancedARExperience 
        selectedType={selectedType}
        onInterventionAdded={handleInterventionAdded}
        originLat={originLat}
        originLng={originLng}
      />

      {/* Location Panel - Collapsible */}
      {isLocationPanelVisible && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px',
          borderRadius: '10px',
          fontSize: '12px',
          zIndex: 1000,
          maxWidth: '250px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>📍 Location</span>
            <button
              onClick={() => setIsLocationPanelVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
          <span>{locationStatus}</span>
        </div>
      )}

      {/* Show Location Panel Button */}
      {!isLocationPanelVisible && (
        <button
          onClick={() => setIsLocationPanelVisible(true)}
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
          📍 Show Location
        </button>
      )}

      {/* Stats Panel - Collapsible */}
      {isStatsPanelVisible && (
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>📊 Statistics</h3>
            <button
              onClick={() => setIsStatsPanelVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Total Objects:</span>
              <span style={{ fontWeight: 'bold' }}>{placedInterventions.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Avg Effectiveness:</span>
              <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>{calculateTotalEffectiveness()}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Temp Reduction:</span>
              <span style={{ fontWeight: 'bold', color: '#FF9800' }}>{calculateTotalTemperatureReduction()}°C</span>
            </div>
          </div>

          {/* Interventions list */}
          {placedInterventions.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Placed Objects:</h4>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {placedInterventions.map((int, index) => (
                  <div key={int.id} style={{
                    marginBottom: '8px',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '5px',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold' }}>{index + 1}. {int.type}</span>
                      <span style={{ fontSize: '10px', opacity: 0.7 }}>
                        {new Date(int.metadata?.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Temp: {int.metadata?.temperature}°C</span>
                      <span>Effect: {int.metadata?.effectiveness}%</span>
                    </div>
                    {int.metadata?.placementLat && (
                      <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
                        Lat: {int.metadata.placementLat.toFixed(6)}
                      </div>
                    )}
                    {int.metadata?.placementLng && (
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>
                        Lng: {int.metadata.placementLng.toFixed(6)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show Stats Panel Button */}
      {!isStatsPanelVisible && (
        <button
          onClick={() => setIsStatsPanelVisible(true)}
          style={{
            position: 'fixed',
            top: '80px',
            left: '20px',
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
          📊 Show Stats
        </button>
      )}

      {/* Type Selector Panel - Collapsible */}
      {isTypeSelectorVisible && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          fontSize: '14px',
          zIndex: 1000,
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '90vw'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>🎯 Object Types</h3>
            <button
              onClick={() => setIsTypeSelectorVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ×
            </button>
          </div>
          
          <button
            style={{
              padding: '10px 20px',
              background: selectedType === 'tree' ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: selectedType === 'tree' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
            onClick={() => handleTypeChange('tree')}
          >
            🌳 Tree
          </button>
          <button
            style={{
              padding: '10px 20px',
              background: selectedType === 'roof' ? '#2196F3' : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: selectedType === 'roof' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
            onClick={() => handleTypeChange('roof')}
          >
            🏠 Roof
          </button>
          <button
            style={{
              padding: '10px 20px',
              background: selectedType === 'shade' ? '#FF9800' : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: selectedType === 'shade' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
            onClick={() => handleTypeChange('shade')}
          >
            ☂️ Shade
          </button>
        </div>
      )}

      {/* Show Type Selector Button */}
      {!isTypeSelectorVisible && (
        <button
          onClick={() => setIsTypeSelectorVisible(true)}
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
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
          🎯 Show Types
        </button>
      )}

      {/* Controls Panel - Collapsible */}
      {isControlsPanelVisible && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          fontSize: '14px',
          zIndex: 1000,
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '90vw'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>⚙️ Controls</h3>
            <button
              onClick={() => setIsControlsPanelVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ×
            </button>
          </div>
          
          <button 
            onClick={handleGoToMap} 
            style={{
              padding: '10px 20px',
              background: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
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
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            ❌ Exit
          </button>
        </div>
      )}

      {/* Show Controls Panel Button */}
      {!isControlsPanelVisible && (
        <button
          onClick={() => setIsControlsPanelVisible(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
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
          ⚙️ Show Controls
        </button>
      )}

      {/* Quick Actions Panel - Always visible but minimal */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '12px',
        zIndex: 1000,
        display: 'flex',
        gap: '15px',
        alignItems: 'center'
      }}>
        <span>Selected: <strong>{selectedType}</strong></span>
        <span>Objects: <strong>{placedInterventions.length}</strong></span>
        <span>Effect: <strong style={{ color: '#4CAF50' }}>{calculateTotalEffectiveness()}%</strong></span>
      </div>
    </div>
  );
} 