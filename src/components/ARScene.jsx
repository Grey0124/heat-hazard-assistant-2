import React, { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import * as THREE from 'three';

function Reticle({ onSelect }) {
  const reticleRef = useRef();
  const [visible, setVisible] = useState(false);
  const { session } = useXR();

  useFrame((state, delta) => {
    if (!session || !reticleRef.current) return;

    const frame = state.gl.xr.getFrame();
    const referenceSpace = session.renderState.baseReferenceSpace;
    
    if (!frame || !referenceSpace) return;

    const hitTestResults = frame.getHitTestResults(session.hitTestSource);
    
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(referenceSpace);
      
      if (pose) {
        reticleRef.current.visible = true;
        reticleRef.current.matrix.fromArray(pose.transform.matrix);
        setVisible(true);
      }
    } else {
      reticleRef.current.visible = false;
      setVisible(false);
    }
  });

  React.useEffect(() => {
    if (!session) return;

    const setupHitTest = async () => {
      try {
        const viewerSpace = await session.requestReferenceSpace('viewer');
        const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        session.hitTestSource = hitTestSource;
      } catch (err) {
        console.error('Error setting up hit test:', err);
      }
    };

    setupHitTest();

    return () => {
      if (session.hitTestSource) {
        session.hitTestSource.cancel();
        session.hitTestSource = null;
      }
    };
  }, [session]);

  return (
    <mesh ref={reticleRef} visible={visible} onClick={onSelect}>
      <ringGeometry args={[0.1, 0.15, 32]} />
      <meshBasicMaterial color="white" side={THREE.DoubleSide} />
    </mesh>
  );
}

function Intervention({ type, position }) {
  switch (type) {
    case 'tree':
      return (
        <group position={position}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.2]} />
            <meshStandardMaterial color="brown" />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <coneGeometry args={[0.2, 0.4, 8]} />
            <meshStandardMaterial color="#2e7d32" />
          </mesh>
        </group>
      );
    case 'roof':
      return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.4, 0.4]} />
          <meshStandardMaterial 
            color="#90caf9" 
            transparent 
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    default:
      return null;
  }
}

export default function ARScene() {
  const { isPresenting } = useXR();
  const [interventions, setInterventions] = useState([]);
  const [selectedType, setSelectedType] = useState('tree');

  const handleReticleClick = useCallback((event) => {
    if (!isPresenting) return;

    const position = event.object.position.clone();
    const newIntervention = {
      id: Date.now(),
      type: selectedType,
      position: [position.x, position.y, position.z],
      metadata: {
        placedAt: new Date().toISOString(),
        type: selectedType,
      }
    };

    setInterventions((prev) => [...prev, newIntervention]);
  }, [isPresenting, selectedType]);

  return (
    <>
      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} />
      {interventions.map((int) => (
        <Intervention 
          key={int.id} 
          type={int.type} 
          position={int.position} 
        />
      ))}
      <Reticle onSelect={handleReticleClick} />
    </>
  );
} 