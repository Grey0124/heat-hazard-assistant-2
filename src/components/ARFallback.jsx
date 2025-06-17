import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import '../styles/ARMode.css';

// Simple 3D Preview Scene (without XR)
function PreviewScene({ selectedType, onInterventionAdded }) {
  const [interventions, setInterventions] = useState([
    { id: 1, type: 'tree', position: [-1, 0, 0] },
    { id: 2, type: 'roof', position: [1, 0, 0] },
    { id: 3, type: 'shade', position: [0, 0, -1] }
  ]);
  const [selectedObject, setSelectedObject] = useState(null);

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
        temperature: Math.floor(Math.random() * 10) + 20,
        effectiveness: Math.floor(Math.random() * 30) + 70
      }
    };
    setInterventions(prev => [...prev, newIntervention]);
    if (onInterventionAdded) {
      onInterventionAdded(newIntervention);
    }
  };

  // Handle tap/click on scene
  const handleSceneClick = (event) => {
    const intersection = event.intersections[0];
    if (intersection) {
      const position = intersection.point;
      addIntervention([position.x, position.y, position.z]);
    }
  };

  // Handle object selection
  const handleObjectClick = (event, objectId) => {
    event.stopPropagation();
    setSelectedObject(objectId);
  };

  // Simple intervention models
  const Tree = ({ position, id, metadata }) => (
    <group 
      position={position}
      onClick={(e) => handleObjectClick(e, id)}
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

  // Get button color based on selected type
  const getButtonColor = () => {
    switch (selectedType) {
      case 'tree':
        return '#228B22';
      case 'roof':
        return '#87CEEB';
      case 'shade':
        return '#F5DEB3';
      default:
        return '#2196f3';
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

export default function ARFallback({ selectedType, onTypeChange }) {
  const navigate = useNavigate();
  const [placedInterventions, setPlacedInterventions] = useState([]);
  const [isControlsMinimized, setIsControlsMinimized] = useState(false);

  const handleExit = () => {
    navigate('/');
  };

  const handleGoToMap = () => {
    navigate('/mitigation-planner');
  };

  const handleInterventionAdded = (intervention) => {
    setPlacedInterventions(prev => [...prev, intervention]);
  };

  const toggleControls = () => {
    setIsControlsMinimized(!isControlsMinimized);
  };

  return (
    <div className="ar-mode-container">
      {/* Three.js Canvas for 3D preview */}
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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
        onCreated={({ gl, scene, camera }) => {
          console.log('Fallback Canvas created successfully');
          gl.setClearColor(0x000000, 0);
          
          // Guard WebGL context loss
          if (gl.domElement) {
            gl.domElement.addEventListener("webglcontextlost", (event) => {
              event.preventDefault();
              console.warn("WebGL context lost in fallback mode");
            });
            
            gl.domElement.addEventListener("webglcontextrestored", () => {
              console.log("WebGL context restored in fallback mode");
            });
          }
        }}
        onError={(error) => {
          console.error('Fallback Canvas error:', error);
        }}
      >
        <PreviewScene 
          selectedType={selectedType} 
          onInterventionAdded={handleInterventionAdded}
        />
      </Canvas>

      {/* Fallback mode indicator */}
      <div className="fallback-indicator">
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'rgba(255, 193, 7, 0.9)',
          color: '#000',
          padding: '10px 15px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000
        }}>
          📱 3D Preview Mode
        </div>
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
            onClick={() => onTypeChange && onTypeChange('tree')}
          >
            🌳 Tree
          </button>
          <button
            className={`intervention-button ${selectedType === 'roof' ? 'active' : ''}`}
            onClick={() => onTypeChange && onTypeChange('roof')}
          >
            🏠 Roof
          </button>
          <button
            className={`intervention-button ${selectedType === 'shade' ? 'active' : ''}`}
            onClick={() => onTypeChange && onTypeChange('shade')}
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

      {/* Instructions overlay */}
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
          💡 3D Preview Mode Instructions:
        </p>
        <p style={{ margin: '0', fontSize: '12px', lineHeight: '1.4' }}>
          • Click on the ground to place interventions<br/>
          • Use mouse to rotate, scroll to zoom<br/>
          • Select intervention type from controls above<br/>
          • Click on placed objects to select them
        </p>
      </div>
    </div>
  );
} 