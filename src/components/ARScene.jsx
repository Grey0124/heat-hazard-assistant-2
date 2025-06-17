import React, { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR, useXRHitTest, Interactive } from '@react-three/xr';
import * as THREE from 'three';

// Simple reticle component for AR placement
function Reticle({ onSelect }) {
  const reticleRef = useRef();
  const [visible, setVisible] = useState(false);
  const { isPresenting } = useXR();

  useXRHitTest((hitMatrix, hit) => {
    if (!reticleRef.current || !isPresenting) return;

    reticleRef.current.visible = true;
    reticleRef.current.matrix.fromArray(hitMatrix);
    setVisible(true);
  });

  if (!isPresenting || !visible) return null;

  return (
    <Interactive onSelect={onSelect}>
      <mesh ref={reticleRef} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.1, 0.25, 32]} />
        <meshStandardMaterial color="white" transparent opacity={0.8} />
      </mesh>
    </Interactive>
  );
}

// Simple intervention models
function Intervention({ type, position, onRemove }) {
  const meshRef = useRef();

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

  return (
    <Interactive onSelect={onRemove}>
      <group ref={meshRef}>
        {model}
      </group>
    </Interactive>
  );
}

// Main AR Scene component
export default function ARScene({ selectedType }) {
  const { isPresenting } = useXR();
  const { camera } = useThree();
  const [interventions, setInterventions] = useState([]);
  const [showInstructions, setShowInstructions] = useState(true);

  // Set up camera for non-AR mode
  React.useEffect(() => {
    if (!isPresenting) {
      camera.position.z = 3;
    }
  }, [isPresenting, camera]);

  // Hide instructions after a delay
  React.useEffect(() => {
    if (isPresenting) {
      const timer = setTimeout(() => setShowInstructions(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowInstructions(true);
    }
  }, [isPresenting]);

  const handleReticleClick = useCallback((event) => {
    if (!isPresenting) return;

    const position = event.object.position.clone();
    const newIntervention = {
      id: Date.now(),
      type: selectedType,
      position: [position.x, position.y, position.z]
    };

    setInterventions((prev) => [...prev, newIntervention]);
  }, [isPresenting, selectedType]);

  const handleRemoveIntervention = useCallback((event) => {
    const interventionId = event.object.userData?.id;
    if (interventionId) {
      setInterventions((prev) => prev.filter(int => int.id !== interventionId));
    }
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      
      {/* Interventions */}
      {interventions.map((int) => (
        <Intervention 
          key={int.id}
          type={int.type}
          position={int.position}
          onRemove={handleRemoveIntervention}
          userData={{ id: int.id }}
        />
      ))}
      
      {/* AR Reticle */}
      <Reticle onSelect={handleReticleClick} />
      
      {/* Instructions overlay */}
      {showInstructions && isPresenting && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          zIndex: 1000,
          maxWidth: '300px'
        }}>
          <h3>AR Instructions</h3>
          <p>Point your camera at a flat surface</p>
          <p>Tap the reticle to place {selectedType}</p>
          <p>Tap placed objects to remove them</p>
        </div>
      )}
    </>
  );
} 