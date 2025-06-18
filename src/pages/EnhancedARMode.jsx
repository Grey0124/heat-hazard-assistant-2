import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedARExperience from '../components/EnhancedARExperience';
import ARNavbar from '../components/ARNavbar';
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
      {/* AR Navbar */}
      <ARNavbar
        selectedType={selectedType}
        onTypeChange={handleTypeChange}
        placedInterventions={placedInterventions}
        onExit={handleExit}
        onGoToMap={handleGoToMap}
        locationStatus={locationStatus}
        calculateTotalEffectiveness={calculateTotalEffectiveness}
        calculateTotalTemperatureReduction={calculateTotalTemperatureReduction}
      />

      {/* Enhanced AR Experience Component */}
      <EnhancedARExperience 
        selectedType={selectedType}
        onInterventionAdded={handleInterventionAdded}
        originLat={originLat}
        originLng={originLng}
      />
    </div>
  );
} 