import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ARExperience({ selectedType, onInterventionAdded, originLat, originLng }) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const sessionRef = useRef(null);
  const hitTestSourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isARActive, setIsARActive] = useState(false);
  const [interventions, setInterventions] = useState([]);
  const [reticleVisible, setReticleVisible] = useState(false);
  const [reticlePosition, setReticlePosition] = useState(new THREE.Vector3());
  const [isSupported, setIsSupported] = useState(false);
  const [is3DPreviewActive, setIs3DPreviewActive] = useState(true);

  // Check AR support on mount
  useEffect(() => {
    const checkARSupport = async () => {
      if ('xr' in navigator) {
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        setIsSupported(supported);
        console.log('AR Support:', supported);
      }
    };
    checkARSupport();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: false
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.xr.enabled = true;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Add a ground plane for 3D preview
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xcccccc, 
      transparent: true, 
      opacity: 0.3 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    scene.add(ground);

    // Position camera for 3D preview
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);

    // Store references
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Start 3D preview render loop
    const animate = () => {
      if (!isARActive && is3DPreviewActive) {
        animationFrameRef.current = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
    };
  }, [isARActive, is3DPreviewActive]);

  // Start AR session
  const startARSession = async () => {
    try {
      if (!isSupported) {
        console.error('AR not supported');
        return;
      }

      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['light-estimation', 'anchors']
      });

      sessionRef.current = session;
      setIsARActive(true);
      setIs3DPreviewActive(false);

      // Set up the session
      await rendererRef.current.xr.setSession(session);

      // Try different reference space types
      let referenceSpace = null;
      const spaceTypes = ['viewer', 'local', 'local-floor', 'bounded-floor'];
      
      for (const spaceType of spaceTypes) {
        try {
          referenceSpace = await session.requestReferenceSpace(spaceType);
          console.log(`Using reference space: ${spaceType}`);
          break;
        } catch (error) {
          console.log(`Reference space ${spaceType} not supported:`, error);
        }
      }

      if (!referenceSpace) {
        console.error('No supported reference space found');
        endARSession();
        return;
      }

      // Set up hit testing
      const hitTestSource = await session.requestHitTestSource({ space: referenceSpace });
      hitTestSourceRef.current = hitTestSource;

      // Set up render loop
      const renderLoop = (time, frame) => {
        if (frame) {
          // Handle hit testing
          if (hitTestSourceRef.current) {
            const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
            if (hitTestResults.length > 0) {
              const hit = hitTestResults[0];
              const pose = hit.getPose(referenceSpace);
              if (pose) {
                const { transform } = pose;
                const position = new THREE.Vector3(
                  transform.matrix[12],
                  transform.matrix[13],
                  transform.matrix[14]
                );
                setReticlePosition(position);
                setReticleVisible(true);
              }
            } else {
              setReticleVisible(false);
            }
          }

          // Render the scene
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        // Continue the loop
        session.requestAnimationFrame(renderLoop);
      };

      session.requestAnimationFrame(renderLoop);

      // Handle session end
      session.addEventListener('end', () => {
        setIsARActive(false);
        setReticleVisible(false);
        setIs3DPreviewActive(true);
        sessionRef.current = null;
        hitTestSourceRef.current = null;
      });

      console.log('AR session started successfully');

    } catch (error) {
      console.error('Failed to start AR session:', error);
      setIsARActive(false);
      setIs3DPreviewActive(true);
    }
  };

  // End AR session
  const endARSession = () => {
    if (sessionRef.current) {
      sessionRef.current.end();
    }
  };

  // Add intervention
  const addIntervention = (position) => {
    console.log('Adding intervention:', selectedType, 'at position:', position);
    
    let metadata = {
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
      
      metadata = {
        ...metadata,
        placementLat,
        placementLng,
        originLat,
        originLng,
        temperature: calculateTemperatureReduction(selectedType, placementLat, placementLng),
        effectiveness: calculateEffectiveness(selectedType, placementLat, placementLng)
      };
    }

    const newIntervention = {
      id: Date.now(),
      type: selectedType,
      position: position.clone(),
      metadata
    };
    
    setInterventions(prev => [...prev, newIntervention]);
    
    // Add 3D object to scene
    addInterventionToScene(newIntervention);
    
    if (onInterventionAdded) {
      onInterventionAdded(newIntervention);
    }
  };

  // Add intervention object to Three.js scene
  const addInterventionToScene = (intervention) => {
    if (!sceneRef.current) return;

    let geometry, material, mesh;

    switch (intervention.type) {
      case 'tree':
        // Tree trunk
        geometry = new THREE.CylinderGeometry(0.05, 0.05, 0.2);
        material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(intervention.position);
        mesh.position.y += 0.25;
        
        // Tree foliage
        const foliageGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.copy(intervention.position);
        foliage.position.y += 0.5;
        
        sceneRef.current.add(mesh);
        sceneRef.current.add(foliage);
        break;

      case 'roof':
        // Roof base
        geometry = new THREE.PlaneGeometry(0.4, 0.4);
        material = new THREE.MeshStandardMaterial({ 
          color: 0x87CEEB, 
          transparent: true, 
          opacity: 0.8,
          side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(intervention.position);
        mesh.rotation.x = -Math.PI / 2;
        
        // Roof structure
        const structureGeometry = new THREE.BoxGeometry(0.05, 0.2, 0.4);
        const structureMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
        const structure = new THREE.Mesh(structureGeometry, structureMaterial);
        structure.position.copy(intervention.position);
        structure.position.y += 0.1;
        structure.rotation.z = Math.PI / 4;
        
        sceneRef.current.add(mesh);
        sceneRef.current.add(structure);
        break;

      case 'shade':
        // Shade top
        geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.05);
        material = new THREE.MeshStandardMaterial({ color: 0xF5DEB3 });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(intervention.position);
        mesh.position.y += 0.3;
        
        // Shade pole
        const poleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.copy(intervention.position);
        pole.position.y += 0.15;
        
        sceneRef.current.add(mesh);
        sceneRef.current.add(pole);
        break;
    }
  };

  // Calculate temperature reduction
  const calculateTemperatureReduction = (type, lat, lng) => {
    const baseReduction = {
      tree: 3.5,
      roof: 2.8,
      shade: 2.2
    };
    
    const latitudeFactor = 1 + Math.abs(lat) / 90;
    const longitudeFactor = 1 + Math.abs(lng) / 180;
    
    return Math.round((baseReduction[type] * latitudeFactor * longitudeFactor) * 10) / 10;
  };

  // Calculate effectiveness
  const calculateEffectiveness = (type, lat, lng) => {
    const baseEffectiveness = {
      tree: 85,
      roof: 78,
      shade: 72
    };
    
    const climateFactor = Math.abs(lat) < 30 ? 1.1 : Math.abs(lat) > 60 ? 0.9 : 1.0;
    
    return Math.round(baseEffectiveness[type] * climateFactor);
  };

  // Handle tap/click
  const handleCanvasClick = (event) => {
    if (isARActive && reticleVisible) {
      addIntervention(reticlePosition);
    } else if (!isARActive) {
      // In 3D preview mode, place at a fixed position
      const position = new THREE.Vector3(0, 0, 0);
      addIntervention(position);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* AR Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: isARActive ? 'transparent' : 'linear-gradient(135deg, #87CEEB 0%, #98FB98 100%)'
        }}
        onClick={handleCanvasClick}
      />

      {/* AR Controls */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '10px',
        zIndex: 1000
      }}>
        {!isARActive ? (
          <button
            onClick={startARSession}
            disabled={!isSupported}
            style={{
              padding: '12px 24px',
              background: isSupported ? '#2196f3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: isSupported ? 'pointer' : 'not-allowed'
            }}
          >
            {isSupported ? 'Start AR Experience' : 'AR Not Supported'}
          </button>
        ) : (
          <button
            onClick={endARSession}
            style={{
              padding: '12px 24px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            End AR Experience
          </button>
        )}
      </div>

      {/* AR Status */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '8px',
        fontSize: '14px',
        zIndex: 1000
      }}>
        <div>Mode: {isARActive ? 'AR Active' : '3D Preview'}</div>
        <div>Reticle: {reticleVisible ? 'Visible' : 'Hidden'}</div>
        <div>Objects Placed: {interventions.length}</div>
      </div>

      {/* Instructions */}
      {isARActive ? (
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
          <h3>AR Mode Active</h3>
          <p>Point your camera at surfaces to see the placement reticle</p>
          <p>Tap the screen to place a {selectedType}</p>
        </div>
      ) : (
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
          <h3>3D Preview Mode</h3>
          <p>Click anywhere to place a {selectedType}</p>
          <p>Click "Start AR Experience" to use real AR</p>
        </div>
      )}

      {/* Reticle (if not in AR mode) */}
      {!isARActive && reticleVisible && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          border: '2px solid white',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 100
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40px',
            height: '40px',
            border: '2px solid yellow',
            borderRadius: '50%'
          }} />
        </div>
      )}
    </div>
  );
} 