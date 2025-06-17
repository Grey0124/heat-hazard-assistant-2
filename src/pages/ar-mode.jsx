import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
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
      Loading 3D Experience...
    </div>
  );
}

// Simple 3D Preview Scene with tap detection and object management
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
      {/* Three.js Canvas with simple preview scene */}
      <ARErrorBoundary onFallback={handleFallback} onExit={handleExit}>
        <Suspense fallback={<CanvasLoader />}>
          <Canvas
            camera={{ position: [3, 2, 3], fov: 75 }}
            gl={{ 
              antialias: true,
              alpha: false,
              preserveDrawingBuffer: false
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: '#87CEEB'
            }}
          >
            <PreviewScene 
              selectedType={selectedType} 
              onInterventionAdded={handleInterventionAdded}
            />
          </Canvas>
        </Suspense>
      </ARErrorBoundary>

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
