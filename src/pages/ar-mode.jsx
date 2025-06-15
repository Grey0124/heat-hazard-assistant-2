import React, { useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { XR, ARButton, useXR } from '@react-three/xr';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import Navbar from '../components/Navbar';

function Reticle({ onSelect, selectedType, setInterventions }) {
  const ref = useRef();
  const hitTestSourceRef = useRef(null);
  const viewerSpaceRef = useRef(null);
  const { session } = useXR();
  const [visible, setVisible] = useState(false);

  useFrame((_, delta) => {
    if (!session) return;

    const xrFrame = session?.requestAnimationFrame ? session : null;
    if (!xrFrame || !hitTestSourceRef.current || !viewerSpaceRef.current) return;

    session.requestAnimationFrame((time, frame) => {
      const referenceSpace = viewerSpaceRef.current;
      const hitTestSource = hitTestSourceRef.current;

      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);

        ref.current.visible = true;
        ref.current.position.set(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );
        setVisible(true);
      } else {
        ref.current.visible = false;
        setVisible(false);
      }
    });
  });

  React.useEffect(() => {
    if (!session) return;

    // Request reference space and hit test source
    session.requestReferenceSpace('viewer').then((space) => {
      viewerSpaceRef.current = space;
      session.requestHitTestSource({ space }).then((source) => {
        hitTestSourceRef.current = source;
      }).catch(err => {
        console.error('Error getting hit test source:', err);
      });
    }).catch(err => {
      console.error('Error getting reference space:', err);
    });

    return () => {
      if (hitTestSourceRef.current) {
        hitTestSourceRef.current.cancel();
        hitTestSourceRef.current = null;
      }
    };
  }, [session]);

  const handleSelect = () => {
    if (!ref.current || !ref.current.visible) return;

    const pos = ref.current.position;
    setInterventions((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: selectedType,
        position: [pos.x, pos.y, pos.z],
      },
    ]);
  };

  return (
    <mesh ref={ref} onClick={handleSelect} visible={visible}>
      <ringGeometry args={[0.1, 0.15, 32]} />
      <meshBasicMaterial color="white" side={THREE.DoubleSide} />
    </mesh>
  );
}

function ARScene({ selectedType }) {
  const [interventions, setInterventions] = useState([]);
  const { isPresenting, isSupported } = useXR();

  const renderIntervention = (int) => {
    const pos = int.position;
    switch (int.type) {
      case 'tree':
        return (
          <group key={int.id} position={pos}>
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
          <mesh key={int.id} position={pos}>
            <boxGeometry args={[0.4, 0.05, 0.4]} />
            <meshStandardMaterial color="#90caf9" />
          </mesh>
        );
      case 'building':
        return (
          <mesh key={int.id} position={pos}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#f44336" />
          </mesh>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} />
      {interventions.map(renderIntervention)}
      <Reticle selectedType={selectedType} setInterventions={setInterventions} />
    </>
  );
}

export default function ARMode() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState('tree');
  const [isARSupported, setIsARSupported] = useState(true);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    // Check if WebXR is supported
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        setIsARSupported(supported);
        if (!supported) {
          setError('AR is not supported on your device');
        }
      }).catch(err => {
        console.error('Error checking AR support:', err);
        setError('Error checking AR support');
      });
    } else {
      setIsARSupported(false);
      setError('WebXR is not supported in your browser');
    }
  }, []);

  const handleSessionError = (error) => {
    console.error('AR Session Error:', error);
    setError('Failed to start AR session. Please try again.');
  };

  if (error) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white/90 p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-lg font-semibold mb-2">AR Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 relative">
        <Canvas>
          <XR
            onError={handleSessionError}
            sessionInit={{
              requiredFeatures: ['hit-test'],
              optionalFeatures: ['dom-overlay'],
              domOverlay: { root: document.body },
            }}
          >
            <ARScene selectedType={selectedType} />
          </XR>
        </Canvas>

        <div className="absolute bottom-4 left-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t('ar.selectIntervention', 'Select Intervention Type')}</h3>
            <ARButton />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['tree', 'roof', 'building'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`p-3 rounded-lg ${
                  selectedType === type ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                {t(`ar.${type}`, type)}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute top-4 left-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-2">{t('ar.instructions', 'Instructions')}</h3>
          <p className="text-gray-600 whitespace-pre-line">
            {t(
              'ar.instructionsText',
              '1. Tap AR button to start\n2. Point camera at a flat surface\n3. Tap reticle to place intervention\n4. Use bottom buttons to switch types'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
