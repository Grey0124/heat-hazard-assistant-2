import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
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

// AR Session Manager Component
function ARSessionManager({ onARSessionStart, onARSessionEnd }) {
  const { gl, scene, camera } = useThree();
  const [arSession, setArSession] = useState(null);
  const [isARActive, setIsARActive] = useState(false);
  const [hitTestSource, setHitTestSource] = useState(null);
  const [viewerSpace, setViewerSpace] = useState(null);

  useEffect(() => {
    const startARSession = async () => {
      try {
        if (!('xr' in navigator)) {
          console.error('WebXR not supported');
          return;
        }

        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!supported) {
          console.error('AR not supported');
          return;
        }

        // Enable XR on the renderer
        gl.xr.enabled = true;
        gl.xr.setReferenceSpaceType('local');

        const session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['light-estimation', 'anchors']
        });

        setArSession(session);
        setIsARActive(true);

        // Set up the AR session
        await gl.xr.setSession(session);

        // Set up hit testing
        const refSpace = await session.requestReferenceSpace('viewer');
        const hitTestSource = await session.requestHitTestSource({ space: refSpace });
        
        setViewerSpace(refSpace);
        setHitTestSource(hitTestSource);

        // Set up the render loop
        const renderLoop = (time, frame) => {
          if (frame) {
            // Handle hit testing
            if (hitTestSource) {
              const hitTestResults = frame.getHitTestResults(hitTestSource);
              if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(refSpace);
                if (pose) {
                  // Update reticle position
                  const { transform } = pose;
                  const position = new THREE.Vector3(
                    transform.matrix[12],
                    transform.matrix[13],
                    transform.matrix[14]
                  );
                  
                  // Emit hit test result
                  if (onARSessionStart) {
                    onARSessionStart({ type: 'hit-test', position, pose });
                  }
                }
              }
            }
          }
          
          // Continue the render loop
          session.requestAnimationFrame(renderLoop);
        };

        session.requestAnimationFrame(renderLoop);

        session.addEventListener('end', () => {
          setIsARActive(false);
          setArSession(null);
          setHitTestSource(null);
          setViewerSpace(null);
          
          if (onARSessionEnd) {
            onARSessionEnd();
          }
        });

        if (onARSessionStart) {
          onARSessionStart({ type: 'session-start', session });
        }

        console.log('AR session started successfully');

      } catch (error) {
        console.error('Failed to start AR session:', error);
      }
    };

    // Start AR session when component mounts
    startARSession();

    return () => {
      if (arSession) {
        arSession.end();
      }
    };
  }, []);

  return null; // This component doesn't render anything
}

// Real AR Scene with camera access and hit-testing
function RealARScene({ selectedType, onInterventionAdded, originLat, originLng, isARMode }) {
  const [interventions, setInterventions] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [reticleVisible, setReticleVisible] = useState(false);
  const [reticlePosition, setReticlePosition] = useState([0, 0, 0]);
  const [reticleRotation, setReticleRotation] = useState([0, 0, 0]);
  const [isARActive, setIsARActive] = useState(false);

  const handleARSessionStart = (data) => {
    if (data.type === 'session-start') {
      setIsARActive(true);
      console.log('AR session active');
    } else if (data.type === 'hit-test') {
      setReticlePosition([data.position.x, data.position.y, data.position.z]);
      setReticleVisible(true);
    }
  };

  const handleARSessionEnd = () => {
    setIsARActive(false);
    setReticleVisible(false);
    console.log('AR session ended');
  };

  const addIntervention = (position) => {
    console.log('Adding intervention of type:', selectedType, 'at position:', position);
    
    let metadata = {
      createdAt: new Date().toISOString(),
      temperature: Math.floor(Math.random() * 10) + 20,
      effectiveness: Math.floor(Math.random() * 30) + 70
    };

    // Add geolocation data if available
    if (originLat && originLng && isARMode) {
      const northOffsetMeters = position[2] || 0;
      const eastOffsetMeters = position[0] || 0;
      
      const deltaLat = northOffsetMeters / 111111;
      const deltaLng = eastOffsetMeters / (111111 * Math.cos(originLat * Math.PI / 180));
      
      const placementLat = originLat + deltaLat;
      const placementLng = originLng + deltaLng;
      
      metadata = {
        ...metadata,
        placementLat,
        placementLng,
        originLat,
        originLng,
        temperature: calculateTemperatureReduction(selectedType, placementLat, placementLng),
        effectiveness: calculateEffectiveness(selectedType, placementLat, placementLng)
      };
    }

    const newIntervention = {
      id: Date.now(),
      type: selectedType,
      position: position || reticlePosition,
      metadata
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
    
    const latitudeFactor = 1 + Math.abs(lat) / 90;
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
    
    const climateFactor = Math.abs(lat) < 30 ? 1.1 : Math.abs(lat) > 60 ? 0.9 : 1.0;
    
    return Math.round(baseEffectiveness[type] * climateFactor);
  };

  // Handle tap/click on scene
  const handleSceneClick = (event) => {
    if (isDragging) return;
    
    if (isARActive && reticleVisible) {
      addIntervention(reticlePosition);
    } else {
      const intersection = event.intersections[0];
      if (intersection) {
        const position = intersection.point;
        addIntervention([position.x, position.y, position.z]);
      }
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

  // AR Reticle for placement
  const ARReticle = () => {
    if (!reticleVisible || !isARActive) return null;
    
    return (
      <group position={reticlePosition} rotation={reticleRotation}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.15, 32]} />
          <meshStandardMaterial color="white" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.05, 0.1, 32]} />
          <meshStandardMaterial color="yellow" transparent opacity={0.6} />
        </mesh>
      </group>
    );
  };

  return (
    <>
      {/* AR Session Manager */}
      {isARMode && (
        <ARSessionManager 
          onARSessionStart={handleARSessionStart}
          onARSessionEnd={handleARSessionEnd}
        />
      )}

      {/* AR Scene */}
      {isARActive ? (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />
          
          {/* AR Reticle */}
          <ARReticle />
          
          {/* Placed interventions */}
          {interventions.map((int) => renderIntervention(int))}
        </>
      ) : (
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
          
          {/* Add intervention button */}
          <mesh 
            position={[0, 0.1, 2]} 
            onClick={() => addIntervention()}
          >
            <boxGeometry args={[0.3, 0.1, 0.3]} />
            <meshStandardMaterial color="#2196f3" />
          </mesh>
        </>
      )}
    </>
  );
}

// Custom AR Button Component with proper WebXR handling
function CustomARButton({ onARStart }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isPresenting, setIsPresenting] = useState(false);

  useEffect(() => {
    const checkARSupport = async () => {
      try {
        setIsChecking(true);
        
        if ('xr' in navigator) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setIsSupported(supported);
          console.log('AR Support check result:', supported);
        } else {
          setIsSupported(false);
          console.log('WebXR not available in navigator');
        }
      } catch (error) {
        console.error('AR not supported:', error);
        setIsSupported(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkARSupport();
  }, []);

  const handleClick = async () => {
    if (!isSupported || isPresenting) return;

    try {
      setIsPresenting(true);
      
      // Request AR session with proper error handling
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['light-estimation', 'anchors']
      });

      console.log('AR session started successfully');
      if (onARStart) {
        onARStart(session);
      }
    } catch (error) {
      console.error('Failed to start AR session:', error);
      setIsPresenting(false);
    }
  };

  if (isChecking) {
    return null; // Don't render anything while checking
  }

  if (!isSupported) {
    return null;
  }

  return (
    <mesh
      position={[0, 0.1, -2]}
      onClick={handleClick}
    >
      <boxGeometry args={[0.8, 0.2, 0.3]} />
      <meshStandardMaterial color={isPresenting ? "#666" : "#2196f3"} />
    </mesh>
  );
}

// Status Indicator Component - moved outside Canvas
function StatusIndicator({ isPresenting }) {
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
  const [useFallback, setUseFallback] = useState(false);
  const [isARSupported, setIsARSupported] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isControlsMinimized, setIsControlsMinimized] = useState(false);
  const [placedInterventions, setPlacedInterventions] = useState([]);
  const [originLat, setOriginLat] = useState(null);
  const [originLng, setOriginLng] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Getting location...');
  const [isARMode, setIsARMode] = useState(false);

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

  const handleARStart = (session) => {
    console.log('AR session started:', session);
    setIsARMode(true);
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
      {/* Three.js Canvas with real AR scene */}
      <ARErrorBoundary onFallback={handleFallback} onExit={handleExit}>
        <Suspense fallback={<CanvasLoader />}>
          <Canvas
            camera={{ position: [3, 2, 3], fov: 75 }}
            gl={{ 
              antialias: true,
              alpha: true,
              preserveDrawingBuffer: false,
              powerPreference: 'default',
              failIfMajorPerformanceCaveat: false
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'transparent'
            }}
            onCreated={({ gl, scene, camera }) => {
              console.log('Canvas created successfully');
              gl.setClearColor(0x000000, 0);
              
              // Guard WebGL context loss
              if (gl.domElement) {
                gl.domElement.addEventListener("webglcontextlost", (event) => {
                  event.preventDefault();
                  console.warn("WebGL context lost. Attempting recovery...");
                });
                
                gl.domElement.addEventListener("webglcontextrestored", () => {
                  console.log("WebGL context restored");
                });
              }
            }}
            onError={(error) => {
              console.error('Canvas error:', error);
              setHasError(true);
            }}
          >
            <RealARScene 
              selectedType={selectedType} 
              onInterventionAdded={handleInterventionAdded}
              originLat={originLat}
              originLng={originLng}
              isARMode={isARMode}
            />
            <CustomARButton onARStart={handleARStart} />
          </Canvas>
        </Suspense>
      </ARErrorBoundary>

      {/* Status indicator outside Canvas */}
      <StatusIndicator isPresenting={isARMode} />

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

      {/* AR Instructions */}
      {isARMode && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '15px 20px',
          borderRadius: '10px',
          fontSize: '14px',
          textAlign: 'center',
          zIndex: 1000,
          maxWidth: '400px'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
            📱 AR Mode Instructions:
          </p>
          <p style={{ margin: '0', fontSize: '12px', lineHeight: '1.4' }}>
            • Point camera at surfaces to see placement reticle<br/>
            • Tap screen to place interventions in real world<br/>
            • Move device to explore and place more objects<br/>
            • Select intervention type from controls above
          </p>
        </div>
      )}
    </div>
  );
}
