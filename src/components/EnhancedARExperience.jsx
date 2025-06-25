import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Environment,
  OrbitControls,
  Float
} from '@react-three/drei';
import { XR, useXR, useXRHitTest, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import ARButton from './ARButton';

// Create XR store
const xrStore = createXRStore();

// AR Intervention Object Component
function ARIntervention({ type, position, metadata, onRemove }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  const getInterventionGeometry = () => {
    switch (type) {
      case 'tree':
        return (
          <group>
            {/* Tree trunk */}
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.2]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            {/* Tree foliage */}
            <mesh position={[0, 0.4, 0]}>
              <coneGeometry args={[0.2, 0.4, 8]} />
              <meshStandardMaterial color="#228B22" />
            </mesh>
          </group>
        );
      
      case 'roof':
        return (
          <group>
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
          <group>
            {/* Shade top */}
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.05]} />
              <meshStandardMaterial color="#F5DEB3" />
            </mesh>
            {/* Shade pole */}
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.3]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          </group>
        );
      
      default:
        return (
          <mesh>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        );
    }
  };

  return (
    <group 
      ref={meshRef} 
      position={position}
      scale={hovered ? 1.1 : 1}
      onClick={() => onRemove && onRemove()}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {getInterventionGeometry()}
      
      {/* Info label - simplified without Text3D */}
      {hovered && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.3, 0.1, 0.05]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </Float>
      )}
    </group>
  );
}

// AR Hit Test Component using useXRHitTest
function ARHitTest({ onHitTest, children }) {
  const [hitTestPosition, setHitTestPosition] = useState(new THREE.Vector3(0, 0, 0));

  useXRHitTest((hitTestResults) => {
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const position = new THREE.Vector3();
      hit.getWorldMatrix(position);
      setHitTestPosition(position);
      onHitTest(position);
    }
  });

  return children;
}

// 3D Preview Scene Component
function PreviewScene({ interventions, onAddIntervention, selectedType }) {
  const { camera } = useThree();
  const [previewPosition, setPreviewPosition] = useState(new THREE.Vector3(0, 0, 0));

  // Handle click to add intervention in preview mode
  const handleCanvasClick = useCallback((event) => {
    event.stopPropagation();
    const point = new THREE.Vector3();
    const mouse = new THREE.Vector2();
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Simple raycasting to ground plane
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    raycaster.ray.intersectPlane(groundPlane, point);
    
    if (point) {
      setPreviewPosition(point);
      onAddIntervention(point);
    }
  }, [camera, onAddIntervention]);

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
      return () => canvas.removeEventListener('click', handleCanvasClick);
    }
  }, [handleCanvasClick]);

  return (
    <>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial 
          color="#cccccc" 
          transparent 
          opacity={0.3}
        />
      </mesh>
      
      {/* Grid helper */}
      <gridHelper args={[20, 20, 0x888888, 0xcccccc]} position={[0, -0.09, 0]} />
      
      {/* Preview reticle */}
      <mesh position={previewPosition}>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshStandardMaterial color="yellow" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Existing interventions */}
      {interventions.map((intervention) => (
        <ARIntervention
          key={intervention.id}
          type={intervention.type}
          position={intervention.position}
          metadata={intervention.metadata}
        />
      ))}
    </>
  );
}

// AR Scene Component
function ARScene({ interventions, onAddIntervention, selectedType }) {
  const { session } = useXR();
  const [hitTestPosition, setHitTestPosition] = useState(new THREE.Vector3(0, 0, 0));
  const [showReticle, setShowReticle] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  const handleHitTest = useCallback((position) => {
    setHitTestPosition(position);
    setShowReticle(true);
  }, []);

  const handleTap = useCallback(() => {
    if (showReticle) {
      onAddIntervention(hitTestPosition.clone());
    }
  }, [showReticle, hitTestPosition, onAddIntervention]);

  useEffect(() => {
    if (session) {
      setSessionActive(true);
      console.log('AR session active in ARScene');
      
      const handleClick = () => handleTap();
      session.addEventListener('select', handleClick);
      
      // Listen for session end
      const handleSessionEnd = () => {
        setSessionActive(false);
        console.log('AR session ended in ARScene');
      };
      session.addEventListener('end', handleSessionEnd);
      
      return () => {
        session.removeEventListener('select', handleClick);
        session.removeEventListener('end', handleSessionEnd);
      };
    } else {
      setSessionActive(false);
    }
  }, [session, handleTap]);

  return (
    <>
      <ARHitTest onHitTest={handleHitTest}>
        {/* AR Reticle */}
        {showReticle && (
          <mesh position={hitTestPosition}>
            <ringGeometry args={[0.05, 0.08, 32]} />
            <meshStandardMaterial color="yellow" side={THREE.DoubleSide} />
          </mesh>
        )}
      </ARHitTest>
      
      {/* Existing interventions */}
      {interventions.map((intervention) => (
        <ARIntervention
          key={intervention.id}
          type={intervention.type}
          position={intervention.position}
          metadata={intervention.metadata}
        />
      ))}
      
      {/* Session status indicator */}
      {sessionActive && (
        <mesh position={[0, 0, -2]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="green" />
        </mesh>
      )}
    </>
  );
}

// Main Enhanced AR Experience Component
export default function EnhancedARExperience({ 
  selectedType, 
  onInterventionAdded, 
  originLat, 
  originLng 
}) {
  const [interventions, setInterventions] = useState([]);
  const [isARActive, setIsARActive] = useState(false);
  const [cameraDistance, setCameraDistance] = useState(5);
  const [arSession, setArSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('inactive');

  const addIntervention = useCallback((position) => {
    const metadata = {
      createdAt: new Date().toISOString(),
      temperature: Math.floor(Math.random() * 10) + 20,
      effectiveness: Math.floor(Math.random() * 30) + 70
    };

    // Add geolocation data if available
    if (originLat && originLng) {
      const northOffsetMeters = position.z || 0;
      const eastOffsetMeters = position.x || 0;
      
      const deltaLat = northOffsetMeters / 111111;
      const deltaLng = eastOffsetMeters / (111111 * Math.cos(originLat * Math.PI / 180));
      
      const placementLat = originLat + deltaLat;
      const placementLng = originLng + deltaLng;
      
      metadata.placementLat = placementLat;
      metadata.placementLng = placementLng;
      metadata.originLat = originLat;
      metadata.originLng = originLng;
    }

    const newIntervention = {
      id: Date.now(),
      type: selectedType,
      position: position.clone(),
      metadata
    };
    
    setInterventions(prev => [...prev, newIntervention]);
    
    if (onInterventionAdded) {
      onInterventionAdded(newIntervention);
    }
  }, [selectedType, originLat, originLng, onInterventionAdded]);

  const removeIntervention = useCallback((id) => {
    setInterventions(prev => prev.filter(int => int.id !== id));
  }, []);

  const handleZoomIn = () => setCameraDistance(prev => Math.max(1, prev - 1));
  const handleZoomOut = () => setCameraDistance(prev => Math.min(20, prev + 1));

  const handleARSessionStart = useCallback((session) => {
    console.log('AR session started, setting active state');
    setArSession(session);
    setIsARActive(true);
    setSessionStatus('active');
    
    // Ensure the session is properly configured for camera access
    session.addEventListener('visibilitychange', () => {
      console.log('AR session visibility changed:', session.visibilityState);
      if (session.visibilityState === 'visible') {
        setSessionStatus('active');
      } else {
        setSessionStatus('hidden');
      }
    });
    
    session.addEventListener('end', () => {
      console.log('AR session ended from main component');
      setArSession(null);
      setIsARActive(false);
      setSessionStatus('inactive');
    });
  }, []);

  const handleARSessionEnd = useCallback(() => {
    console.log('AR session ended, setting inactive state');
    setArSession(null);
    setIsARActive(false);
    setSessionStatus('inactive');
  }, []);

  // Listen for XR session changes
  useEffect(() => {
    const checkSessionStatus = () => {
      if (arSession) {
        setIsARActive(true);
        setSessionStatus('active');
      } else {
        setIsARActive(false);
        setSessionStatus('inactive');
      }
    };

    checkSessionStatus();
  }, [arSession]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', paddingTop: '60px' }}>
      {/* AR Canvas */}
      <Canvas
        camera={{ 
          position: [0, 2, cameraDistance], 
          near: 0.01, 
          far: 1000,
          fov: 75
        }}
        gl={{ 
          antialias: true, 
          alpha: true,
          preserveDrawingBuffer: false,
          xrCompatible: true
        }}
        onCreated={({ gl }) => {
          gl.xr.enabled = true;
          console.log('WebGL context created with XR enabled');
        }}
      >
        <XR store={xrStore} session={arSession}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={0.8}
            castShadow
          />
          
          {/* Environment - only show in 3D preview, not AR */}
          {!isARActive && <Environment preset="sunset" />}
          
          {/* Controls for 3D preview */}
          {!isARActive && (
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              maxDistance={20}
              minDistance={1}
            />
          )}
          
          {/* Scene content */}
          {isARActive ? (
            <ARScene 
              interventions={interventions}
              onAddIntervention={addIntervention}
              selectedType={selectedType}
            />
          ) : (
            <PreviewScene 
              interventions={interventions}
              onAddIntervention={addIntervention}
              selectedType={selectedType}
            />
          )}
        </XR>
      </Canvas>

      {/* AR Button */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000
      }}>
        <ARButton 
          sessionInit={{
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay', 'local-floor', 'light-estimation'],
            domOverlay: { root: document.body }
          }}
          onUnsupported={() => {
            console.log('AR not supported');
            alert('AR is not supported on this device or browser.');
          }}
          onSessionStart={(session) => {
            console.log('AR session started via ARButton');
            handleARSessionStart(session);
          }}
          onSessionEnd={() => {
            console.log('AR session ended via ARButton');
            handleARSessionEnd();
          }}
        />
      </div>

      {/* Zoom Controls (3D Preview only) */}
      {!isARActive && (
        <div style={{
          position: 'fixed',
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 1000
        }}>
          <button
            onClick={handleZoomIn}
            style={{
              width: '50px',
              height: '50px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            style={{
              width: '50px',
              height: '50px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            −
          </button>
        </div>
      )}

      {/* AR Status Indicator */}
      {isARActive && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          zIndex: 1000
        }}>
          🟢 AR Active - Point camera at surfaces
        </div>
      )}

      {/* Session Status */}
      {sessionStatus !== 'inactive' && (
        <div style={{
          position: 'fixed',
          top: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          Session: {sessionStatus}
        </div>
      )}

      {/* Instructions - Fixed positioning to avoid overlap */}
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
        zIndex: 999,
        maxWidth: '300px',
        pointerEvents: 'none'
      }}>
        <h3>{isARActive ? 'AR Mode Active' : '3D Preview Mode'}</h3>
        <p>{isARActive ? 
          'Point camera at surfaces and tap to place objects' : 
          'Click anywhere to place objects. Use AR button for real AR experience'
        }</p>
        {isARActive && (
          <p style={{ fontSize: '12px', marginTop: '10px' }}>
            If you don't see the camera feed, check camera permissions
          </p>
        )}
      </div>
    </div>
  );
} 