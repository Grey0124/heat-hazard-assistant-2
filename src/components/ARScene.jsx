import React, { useState, useCallback, useRef } from 'react';
import { useXRHitTest } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Reticle({ onSelect }) {
  const ref = useRef();
  useXRHitTest((hitMatrix) => {
    if (ref.current) {
      ref.current.visible = true;
      ref.current.matrix.fromArray(hitMatrix);
    }
  });

  return (
    <mesh ref={ref} onClick={onSelect} matrixAutoUpdate={false} visible={false}>
      <ringGeometry args={[0.05, 0.08, 32]} />
      <meshBasicMaterial color="white" opacity={0.8} transparent />
    </mesh>
  );
}

function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.2]} />
        <meshStandardMaterial color="brown" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.2, 0.4, 8]} />
        <meshStandardMaterial color="green" />
      </mesh>
    </group>
  );
}

function Roof({ position }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.4, 0.4]} />
      <meshStandardMaterial color="lightblue" opacity={0.7} transparent />
    </mesh>
  );
}

export default function ARScene({ selectedType }) {
  const [objects, setObjects] = useState([]);

  const handleReticleClick = useCallback((e) => {
    const position = e.object.getWorldPosition(new THREE.Vector3());
    setObjects((prev) => [...prev, { id: Date.now(), type: selectedType, position: position.toArray() }]);
  }, [selectedType]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[1, 2, 3]} intensity={1} />
      {objects.map(obj =>
        obj.type === 'tree' ? (
          <Tree key={obj.id} position={obj.position} />
        ) : (
          <Roof key={obj.id} position={obj.position} />
        )
      )}
      <Reticle onSelect={handleReticleClick} />
    </>
  );
}
