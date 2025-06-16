import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR, useXRHitTest, Interactive } from '@react-three/xr';
import * as THREE from 'three';

function Reticle({ onSelect }) {
  const reticleRef = useRef();
  const [visible, setVisible] = useState(false);
  const { session } = useXR();

  useXRHitTest((hitMatrix, hit) => {
    if (!reticleRef.current) return;

    reticleRef.current.visible = true;
    reticleRef.current.matrix.fromArray(hitMatrix);
    setVisible(true);
  });

  return (
    <mesh ref={reticleRef} visible={visible} onClick={onSelect}>
      <ringGeometry args={[0.1, 0.15, 32]} />
      <meshBasicMaterial color="white" side={THREE.DoubleSide} transparent opacity={0.8} />
    </mesh>
  );
}

function Intervention({ type, position, onDragStart, onDragEnd }) {
  const meshRef = useRef();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((e) => {
    e.stopPropagation();
    setIsDragging(true);
    onDragStart?.(e);
  }, [onDragStart]);

  const handleDragEnd = useCallback((e) => {
    e.stopPropagation();
    setIsDragging(false);
    onDragEnd?.(e);
  }, [onDragEnd]);

  const model = (() => {
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
  })();

  return (
    <Interactive
      onSelectStart={handleDragStart}
      onSelectEnd={handleDragEnd}
    >
      <group ref={meshRef}>
        {model}
      </group>
    </Interactive>
  );
}

export default function ARScene({ selectedType, features }) {
  const { isPresenting } = useXR();
  const { gl } = useThree();
  const [interventions, setInterventions] = useState([]);
  const [draggedIntervention, setDraggedIntervention] = useState(null);
  const directionalLightRef = useRef();

  // Handle light estimation if available
  useEffect(() => {
    if (!features?.lightEstimation || !isPresenting) return;

    const session = gl.xr.getSession();
    if (!session) return;

    const lightEstimation = session.enabledFeatures.includes('light-estimation');
    if (!lightEstimation) return;

    const lightProbe = new THREE.LightProbe();
    const renderer = gl.getRenderer();
    renderer.xr.environmentEstimation = true;

    return () => {
      renderer.xr.environmentEstimation = false;
    };
  }, [features?.lightEstimation, isPresenting, gl]);

  // Update directional light based on light estimation
  useFrame((state) => {
    if (!directionalLightRef.current || !features?.lightEstimation) return;

    const frame = state.gl.xr.getFrame();
    if (!frame) return;

    const lightEstimate = frame.getLightEstimate();
    if (lightEstimate) {
      const { primaryLightDirection, primaryLightIntensity } = lightEstimate;
      if (primaryLightDirection && primaryLightIntensity) {
        directionalLightRef.current.position.set(
          primaryLightDirection.x,
          primaryLightDirection.y,
          primaryLightDirection.z
        );
        directionalLightRef.current.intensity = primaryLightIntensity;
      }
    }
  });

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

  const handleDragStart = useCallback((event) => {
    const interventionId = event.object.userData.id;
    setDraggedIntervention(interventionId);
  }, []);

  const handleDragEnd = useCallback((event) => {
    if (!draggedIntervention) return;

    const newPosition = event.object.position.clone();
    setInterventions((prev) =>
      prev.map((int) =>
        int.id === draggedIntervention
          ? { ...int, position: [newPosition.x, newPosition.y, newPosition.z] }
          : int
      )
    );
    setDraggedIntervention(null);
  }, [draggedIntervention]);

  return (
    <>
      <ambientLight intensity={0.5} />
      {features?.lightEstimation ? (
        <directionalLight
          ref={directionalLightRef}
          position={[0, 1, 0]}
          intensity={1}
        />
      ) : (
        <pointLight position={[10, 10, 10]} intensity={1} />
      )}
      {interventions.map((int) => (
        <Intervention 
          key={int.id}
          type={int.type}
          position={int.position}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          userData={{ id: int.id }}
        />
      ))}
      <Reticle onSelect={handleReticleClick} />
    </>
  );
} 