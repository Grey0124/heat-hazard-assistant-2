import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR, useXRHitTest, Interactive } from '@react-three/xr';
import * as THREE from 'three';
import { useAR } from '../contexts/ARContext';

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

export default function ARScene({ selectedType }) {
  const { isPresenting, session } = useXR();
  const { gl, camera, scene } = useThree();
  const { arState, setPresenting } = useAR();
  const [interventions, setInterventions] = useState([]);
  const [draggedIntervention, setDraggedIntervention] = useState(null);
  const directionalLightRef = useRef();
  const sessionRef = useRef(null);

  // Set up camera for non-AR mode
  useEffect(() => {
    if (!isPresenting) {
      camera.position.z = 3;
    }
  }, [isPresenting, camera]);

  // Initialize AR session
  useEffect(() => {
    if (!isPresenting || !session) return;

    sessionRef.current = session;
    setPresenting(true);

    // Set up camera for AR
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);

    // Set up WebGL renderer for AR
    const renderer = gl.getRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // Set up AR session
    const xrLayer = new window.XRWebGLLayer(session, renderer.getContext());
    session.updateRenderState({ baseLayer: xrLayer });

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Set up light estimation if available
    if (arState.features?.lightEstimation) {
      renderer.xr.environmentEstimation = true;
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sessionRef.current) {
        sessionRef.current.updateRenderState({ baseLayer: null });
      }
      renderer.xr.enabled = false;
      renderer.xr.environmentEstimation = false;
      setPresenting(false);
    };
  }, [isPresenting, session, camera, gl, arState.features?.lightEstimation, setPresenting]);

  // Update directional light based on light estimation
  useFrame((state) => {
    if (!directionalLightRef.current || !arState.features?.lightEstimation || !session) return;

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
      {arState.features?.lightEstimation ? (
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