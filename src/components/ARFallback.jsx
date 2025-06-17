import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

// Simple 3D models for preview mode
function PreviewIntervention({ type, position }) {
  const model = (() => {
    switch (type) {
      case 'tree':
        return (
          <group position={position}>
            {/* Tree trunk */}
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.2]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            {/* Tree foliage */}
            <mesh position={[0, 0.5, 0]}>
              <coneGeometry args={[0.2, 0.4, 8]} />
              <meshStandardMaterial color="#228B22" />
            </mesh>
          </group>
        );
      case 'roof':
        return (
          <group position={position}>
            {/* Roof base */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.4, 0.4]} />
              <meshStandardMaterial 
                color="#87CEEB" 
                transparent 
                opacity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Roof structure */}
            <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.05, 0.2, 0.4]} />
              <meshStandardMaterial color="#696969" />
            </mesh>
          </group>
        );
      case 'shade':
        return (
          <group position={position}>
            {/* Shade structure */}
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.05]} />
              <meshStandardMaterial color="#F5DEB3" />
            </mesh>
            {/* Support pole */}
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.3]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          </group>
        );
      default:
        return null;
    }
  })();

  return model;
}

// Ground plane for reference
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#f0f0f0" />
    </mesh>
  );
}

export default function ARFallback({ selectedType }) {
  const navigate = useNavigate();
  const [interventions, setInterventions] = useState([
    { id: 1, type: 'tree', position: [-1, 0, 0] },
    { id: 2, type: 'roof', position: [1, 0, 0] },
    { id: 3, type: 'shade', position: [0, 0, -1] }
  ]);

  const handleAddIntervention = () => {
    const newIntervention = {
      id: Date.now(),
      type: selectedType,
      position: [
        (Math.random() - 0.5) * 4,
        0,
        (Math.random() - 0.5) * 4
      ]
    };
    setInterventions(prev => [...prev, newIntervention]);
  };

  const handleRemoveIntervention = (id) => {
    setInterventions(prev => prev.filter(int => int.id !== id));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: '#f5f5f5'
    }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [3, 2, 3], fov: 75 }}
        style={{ background: '#87CEEB' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        
        <Ground />
        
        {interventions.map((int) => (
          <PreviewIntervention 
            key={int.id}
            type={int.type}
            position={int.position}
          />
        ))}
        
        <OrbitControls />
      </Canvas>

      {/* Controls overlay */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '12px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 100
      }}>
        <button
          onClick={handleAddIntervention}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            background: '#2196f3',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Add {selectedType}
        </button>
        <button
          onClick={() => navigate('/mitigation-planner')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            background: '#4caf50',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Go to Map
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            background: '#f44336',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Exit
        </button>
      </div>

      {/* Info overlay */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '16px',
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 100
      }}>
        <h3 style={{ margin: '0 0 8px', color: '#333' }}>
          3D Preview Mode
        </h3>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          AR not available. Use mouse to rotate and zoom the 3D view.
        </p>
      </div>
    </div>
  );
} 