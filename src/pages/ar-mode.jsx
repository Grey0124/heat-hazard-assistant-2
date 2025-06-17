import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, useXR, Interactive, useXRHitTest } from '@react-three/xr';
import { OrbitControls } from '@react-three/drei';
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

// AR Button Component
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

// Real AR Scene with geolocation and hit-test
function ARSceneWithGeolocation({ selectedType, onInterventionAdded, originLat, originLng }) {
  const reticleRef = useRef();
  const [interventions, setInterventions] = useState([]);
  const [reticleVisible, setReticleVisible] = useState(false);
  const { isPresenting } = useXR();

  // Hit test for AR placement
  useXRHitTest((hitMatrix, hit) => {
    if (!reticleRef.current || !isPresenting) return;
    
    reticleRef.current.matrix.fromArray(hitMatrix);
    setReticleVisible(true);
  });

  // Place intervention with geolocation calculation
  const placeIntervention = (e) => {
    if (!isPresenting || !originLat || !originLng) return;
    
    const position = e.object.position.clone();
    
    // Convert hit-test position to real-world coordinates
    const northOffsetMeters = position.z;
    const eastOffsetMeters = position.x;
    
    const deltaLat = northOffsetMeters / 111111;
    const deltaLng = eastOffsetMeters / (111111 * Math.cos(originLat * Math.PI / 180));
    
    const placementLat = originLat + deltaLat;
    const placementLng = originLng + deltaLng;
    
    console.log('Placing intervention:', {
      type: selectedType,
      position: [position.x, position.y, position.z],
      lat: placementLat,
      lng: placementLng,
      originLat,
      originLng
    });

    const newIntervention = {
      id: Date.now(),
      type: selectedType,
      position: [position.x, position.y, position.z],
      metadata: {
        createdAt: new Date().toISOString(),
        placementLat,
        placementLng,
        originLat,
        originLng,
        temperature: calculateTemperatureReduction(selectedType, placementLat, placementLng),
        effectiveness: calculateEffectiveness(selectedType, placementLat, placementLng)
      }
    };
    
    setInterventions(prev => [...prev, newIntervention]);
    if (onInterventionAdded) {
      onInterventionAdded(newIntervention);
    }
  };

  // Calculate temperature reduction based on location and type
  const calculateTemperatureReduction = (type, lat, lng) => {
    const baseReduction = {
      tree: 3.5,
      roof: 2.8,
      shade: 2.2
    };
    
    // Adjust based on latitude (more effect near equator)
    const latitudeFactor = 1 + Math.abs(lat) / 90;
    
    // Adjust based on longitude (timezone effect)
    const longitudeFactor = 1 + Math.abs(lng) / 180;
    
    return Math.round((baseReduction[type] * latitudeFactor * longitudeFactor) * 10) / 10;
  };

  // Calculate effectiveness based on location and type
  const calculateEffectiveness = (type, lat, lng) => {
    const baseEffectiveness = {
      tree: 85,
      roof: 78,
      shade: 72
    };
    
    // Adjust based on climate zone
    const climateFactor = Math.abs(lat) < 30 ? 1.1 : Math.abs(lat) > 60 ? 0.9 : 1.0;
    
    return Math.round(baseEffectiveness[type] * climateFactor);
  };

  // Simple intervention models
  const Tree = ({ position, id, metadata }) => (
    <group position={position}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.2, 0.4, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
    </group>
  );

  const Roof = ({ position, id, metadata }) => (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshStandardMaterial color="#87CEEB" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.05, 0.2, 0.4]} />
        <meshStandardMaterial color="#696969" />
      </mesh>
    </group>
  );

  const Shade = ({ position, id, metadata }) => (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.05]} />
        <meshStandardMaterial color="#F5DEB3" />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  );

  const renderIntervention = ({ position, id, type, metadata }) => {
    switch (type) {
      case 'tree':
        return <Tree key={id} position={position} id={id} metadata={metadata} />;
      case 'roof':
        return <Roof key={id} position={position} id={id} metadata={metadata} />;
      case 'shade':
        return <Shade key={id} position={position} id={id} metadata={metadata} />;
      default:
        return <Tree key={id} position={position} id={id} metadata={metadata} />;
    }
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      
      {/* Show placed interventions in AR mode */}
      {isPresenting &&
        interventions.map((int) => {
          return renderIntervention(int);
        })}
      
      {/* AR Reticle for placement */}
      {isPresenting && reticleVisible && (
        <group onClick={placeIntervention}>
          <mesh ref={reticleRef} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.1, 0.25, 32]} />
            <meshStandardMaterial color="white" transparent opacity={0.8} />
          </mesh>
        </group>
      )}

      {/* Show preview in non-AR mode */}
      {!isPresenting && (
        <group position={[0, 0, -2]}>
          {renderIntervention({ position: [0, 0, 0], id: 'preview', type: selectedType })}
        </group>
      )}
    </>
  );
}

// Simple 3D Preview Scene (without XR) - preserved for fallback
function PreviewScene({ selectedType, onInterventionAdded }) {
  const [interventions, setInterventions] = useState([
    { id: 1, type: 'tree', position: [-1, 0, 0] },
    { id: 2, type: 'roof', position: [1, 0, 0] },
    { id: 3, type: 'shade', position: [0, 0, -1] }
  ]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const addIntervention = (position) => {
    console.log('Adding intervention of type:', selectedType, 'at position:', position);
    const newIntervention = {
      id: Date.now(),
      type: selectedType,
      position: position || [
        (Math.random() - 0.5) * 4,
        0,
        (Math.random() - 0.5) * 4
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        temperature: Math.floor(Math.random() * 10) + 20, // Random temp 20-30°C
        effectiveness: Math.floor(Math.random() * 30) + 70 // Random effectiveness 70-100%
      }
    };
    setInterventions(prev => [...prev, newIntervention]);
    if (onInterventionAdded) {
      onInterventionAdded(newIntervention);
    }
  };

  // Handle tap/click on scene
  const handleSceneClick = (event) => {
    if (isDragging) return;
    
    // Get intersection point
    const intersection = event.intersections[0];
    if (intersection) {
      const position = intersection.point;
      addIntervention([position.x, position.y, position.z]);
    }
  };

  // Handle object selection and dragging
  const handleObjectClick = (event, objectId) => {
    event.stopPropagation();
    setSelectedObject(objectId);
  };

  const handleDragStart = (event, objectId) => {
    event.stopPropagation();
    setIsDragging(true);
    setSelectedObject(objectId);
    setDragStart(event.point);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleDrag = (event) => {
    if (!isDragging || !selectedObject) return;
    
    const newPosition = event.point;
    setInterventions(prev => 
      prev.map(int => 
        int.id === selectedObject 
          ? { ...int, position: [newPosition.x, newPosition.y, newPosition.z] }
          : int
      )
    );
  };

  // Simple intervention models
  const Tree = ({ position, id, metadata }) => (
    <group 
      position={position}
      onClick={(e) => handleObjectClick(e, id)}
      onPointerDown={(e) => handleDragStart(e, id)}
      onPointerUp={handleDragEnd}
      onPointerMove={handleDrag}
    >
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.2, 0.4, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      {/* Selection indicator */}
      {selectedObject === id && (
        <mesh position={[0, 0.8, 0]}>
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshStandardMaterial color="yellow" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );

  const Roof = ({ position, id, metadata }) => (
    <group 
      position={position}
      onClick={(e) => handleObjectClick(e, id)}
      onPointerDown={(e) => handleDragStart(e, id)}
      onPointerUp={handleDragEnd}
      onPointerMove={handleDrag}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshStandardMaterial color="#87CEEB" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.05, 0.2, 0.4]} />
        <meshStandardMaterial color="#696969" />
      </mesh>
      {/* Selection indicator */}
      {selectedObject === id && (
        <mesh position={[0, 0.3, 0]}>
          <ringGeometry args={[0.25, 0.3, 32]} />
          <meshStandardMaterial color="yellow" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );

  const Shade = ({ position, id, metadata }) => (
    <group 
      position={position}
      onClick={(e) => handleObjectClick(e, id)}
      onPointerDown={(e) => handleDragStart(e, id)}
      onPointerUp={handleDragEnd}
      onPointerMove={handleDrag}
    >
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.05]} />
        <meshStandardMaterial color="#F5DEB3" />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Selection indicator */}
      {selectedObject === id && (
        <mesh position={[0, 0.5, 0]}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshStandardMaterial color="yellow" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );

  const renderIntervention = ({ position, id, type, metadata }) => {
    switch (type) {
      case 'tree':
        return <Tree key={id} position={position} id={id} metadata={metadata} />;
      case 'roof':
        return <Roof key={id} position={position} id={id} metadata={metadata} />;
      case 'shade':
        return <Shade key={id} position={position} id={id} metadata={metadata} />;
      default:
        return <Tree key={id} position={position} id={id} metadata={metadata} />;
    }
  };

  // Get button color based on selected type
  const getButtonColor = () => {
    switch (selectedType) {
      case 'tree':
        return '#228B22'; // Green for tree
      case 'roof':
        return '#87CEEB'; // Light blue for roof
      case 'shade':
        return '#F5DEB3'; // Tan for shade
      default:
        return '#2196f3'; // Default blue
    }
  };

  return (
    <>
      <OrbitControls />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      
      {/* Ground plane - clickable for placement */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.1, 0]}
        onClick={handleSceneClick}
      >
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      
      {interventions.map((int) => renderIntervention(int))}
      
      {/* Add intervention button - color changes based on selected type */}
      <mesh 
        position={[0, 0.1, 2]} 
        onClick={() => addIntervention()}
      >
        <boxGeometry args={[0.3, 0.1, 0.3]} />
        <meshStandardMaterial color={getButtonColor()} />
      </mesh>
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
          // Still allow AR to work without location
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
    return <ARFallback selectedType={selectedType} />;
  }

  return (
    <div className="ar-mode-container">
      {/* Three.js Canvas with AR and preview modes */}
      <ARErrorBoundary onFallback={handleFallback} onExit={handleExit}>
        <Suspense fallback={<CanvasLoader />}>
          <Canvas
            camera={{ position: [3, 2, 3], fov: 75 }}
            gl={{ 
              antialias: true,
              alpha: true,
              preserveDrawingBuffer: false,
              powerPreference: 'default',
              failIfMajorPerformanceCaveat: false,
              stencil: false,
              depth: true
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
              
              // Handle WebGL context loss
              const handleContextLost = () => {
                console.log('WebGL context lost, attempting recovery...');
              };
              
              const handleContextRestored = () => {
                console.log('WebGL context restored');
              };
              
              gl.canvas.addEventListener('webglcontextlost', handleContextLost, false);
              gl.canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
            }}
            onError={(error) => {
              console.error('Canvas error:', error);
              setHasError(true);
            }}
          >
            <XR>
              <ARSceneWithGeolocation 
                selectedType={selectedType} 
                onInterventionAdded={handleInterventionAdded}
                originLat={originLat}
                originLng={originLng}
              />
              <ARButton />
              <StatusIndicator />
            </XR>
          </Canvas>
        </Suspense>
      </ARErrorBoundary>

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
