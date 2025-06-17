import React, { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Interactive, useXRHitTest, useXR } from '@react-three/xr';
import { OrbitControls } from '@react-three/drei';

// Simple intervention models
function Tree({ position }) {
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
}

function Roof({ position }) {
  return (
    <group position={position}>
      {/* Roof base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshStandardMaterial 
          color="#87CEEB" 
          transparent 
          opacity={0.8}
        />
      </mesh>
      {/* Roof structure */}
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.05, 0.2, 0.4]} />
        <meshStandardMaterial color="#696969" />
      </mesh>
    </group>
  );
}

function Shade({ position }) {
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
}

// Main AR Scene component
export default function ARScene({ selectedType }) {
  const reticleRef = useRef();
  const [interventions, setInterventions] = useState([]);
  const [reticleVisible, setReticleVisible] = useState(false);
  const { isPresenting } = useXR();

  // Set up camera for non-AR mode
  useThree(({ camera }) => {
    if (!isPresenting) {
      camera.position.z = 3;
    }
  });

  // Hit test for AR placement using useXRHitTest
  useXRHitTest((hitMatrix, hit) => {
    if (!reticleRef.current || !isPresenting) return;
    
    reticleRef.current.matrix.fromArray(hitMatrix);
    setReticleVisible(true);
  });

  // Place intervention
  const placeIntervention = (e) => {
    if (!isPresenting) return;
    
    const position = e.object.position.clone();
    const id = Date.now();
    setInterventions([...interventions, { position, id, type: selectedType }]);
  };

  // Render intervention based on type
  const renderIntervention = ({ position, id, type }) => {
    switch (type) {
      case 'tree':
        return <Tree key={id} position={position} />;
      case 'roof':
        return <Roof key={id} position={position} />;
      case 'shade':
        return <Shade key={id} position={position} />;
      default:
        return <Tree key={id} position={position} />;
    }
  };

  return (
    <>
      <OrbitControls />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      
      {/* Show placed interventions in AR mode */}
      {isPresenting &&
        interventions.map((intervention) => {
          return renderIntervention(intervention);
        })}
      
      {/* AR Reticle for placement */}
      {isPresenting && reticleVisible && (
        <Interactive onSelect={placeIntervention}>
          <mesh ref={reticleRef} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.1, 0.25, 32]} />
            <meshStandardMaterial color="white" transparent opacity={0.8} />
          </mesh>
        </Interactive>
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