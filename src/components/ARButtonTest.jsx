import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';
import * as THREE from 'three';
import ARButton from './ARButton';

export default function ARButtonTest() {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionInfo, setSessionInfo] = useState('');

  const handleSessionStart = (session) => {
    console.log('AR session started in test:', session);
    setSessionActive(true);
    setSessionInfo('AR session is active! Camera should be visible.');
    
    session.addEventListener('end', () => {
      console.log('AR session ended in test');
      setSessionActive(false);
      setSessionInfo('AR session ended.');
    });
  };

  const handleSessionEnd = () => {
    console.log('AR session ended callback');
    setSessionActive(false);
    setSessionInfo('AR session ended.');
  };

  const handleUnsupported = () => {
    console.log('AR not supported in test');
    setSessionInfo('AR is not supported on this device/browser.');
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Status Display */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '10px',
        zIndex: 1000,
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <h3>AR Button Test</h3>
        <p><strong>Status:</strong> {sessionActive ? '🟢 Active' : '🔴 Inactive'}</p>
        <p>{sessionInfo || 'Click the AR button below to start AR session'}</p>
      </div>

      {/* AR Canvas */}
      <Canvas
        camera={{ position: [0, 1.6, 3] }}
        gl={{ 
          antialias: true, 
          alpha: true,
          xrCompatible: true
        }}
        onCreated={({ gl }) => {
          gl.xr.enabled = true;
          console.log('WebGL context created with XR enabled');
        }}
      >
        <XR>
          {/* Simple AR scene */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />
          
          {/* Test cube */}
          <mesh position={[0, 0, -2]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="red" />
          </mesh>
          
          {/* Ground plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#cccccc" transparent opacity={0.3} />
          </mesh>
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
            optionalFeatures: ['dom-overlay', 'local-floor']
          }}
          onUnsupported={handleUnsupported}
          onSessionStart={handleSessionStart}
          onSessionEnd={handleSessionEnd}
        >
          Start AR Test
        </ARButton>
      </div>

      {/* Instructions */}
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
        <h3>AR Button Test</h3>
        <p>This is a simple test of the AR session.</p>
        <p>Click the AR button to start an AR session.</p>
        <p>You should see the camera feed and a red cube.</p>
      </div>
    </div>
  );
} 