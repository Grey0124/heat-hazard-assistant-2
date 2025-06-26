import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

export default function ARWebXRTest() {
  const [arSupported, setArSupported] = useState(null);
  const [arError, setArError] = useState('');
  const [arActive, setArActive] = useState(false);

  const rendererRef = useRef(null);
  const sessionRef = useRef(null);
  const hitTestSourceRef = useRef(null);
  const referenceSpaceRef = useRef(null);
  const reticleRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then(setArSupported);
    } else {
      setArSupported(false);
    }
  }, []);

  const startAR = async () => {
    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });
      sessionRef.current = session;
      setArActive(true);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local');
      document.body.appendChild(renderer.domElement);
      renderer.domElement.style.position = 'fixed';
      renderer.domElement.style.top = 0;
      renderer.domElement.style.left = 0;
      renderer.domElement.style.width = '100vw';
      renderer.domElement.style.height = '100vh';
      renderer.domElement.style.zIndex = '0';
      rendererRef.current = renderer;

      await renderer.xr.setSession(session);

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = renderer.xr.getCamera();

      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      scene.add(light);

      const geometry = new THREE.RingGeometry(0.05, 0.08, 32).rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const reticle = new THREE.Mesh(geometry, material);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);
      reticleRef.current = reticle;

      const referenceSpace = await session.requestReferenceSpace('local');
      referenceSpaceRef.current = referenceSpace;

      const viewerSpace = await session.requestReferenceSpace('viewer');
      const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
      hitTestSourceRef.current = hitTestSource;

      const onXRFrame = (time, frame) => {
        session.requestAnimationFrame(onXRFrame);
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const reticle = reticleRef.current;
        const refSpace = referenceSpaceRef.current;
        const hitTestSource = hitTestSourceRef.current;

        if (frame && hitTestSource && refSpace) {
          const hits = frame.getHitTestResults(hitTestSource);
          if (hits.length > 0) {
            const pose = hits[0].getPose(refSpace);
            if (pose) {
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
            }
          } else {
            reticle.visible = false;
          }
        }

        console.log("Rendering frame");
        renderer.render(scene, camera);
      };

      session.requestAnimationFrame(onXRFrame);

      session.addEventListener('end', () => {
        setArActive(false);
        if (rendererRef.current) {
          rendererRef.current.domElement.remove();
          rendererRef.current.dispose();
          rendererRef.current = null;
        }
      });
    } catch (err) {
      console.error(err);
      setArError('AR failed: ' + err.message);
    }
  };

  const endAR = () => {
    if (sessionRef.current) {
      sessionRef.current.end();
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
      {!isMobile() && (
        <div style={{ background: '#222', color: 'yellow', padding: 16, borderRadius: 8, marginBottom: 16, fontSize: 18 }}>
          This AR test is best experienced on a mobile device with WebXR support (e.g. Chrome on Android, iOS 16+).
        </div>
      )}
      {!arActive && (
        <>
          <h2 style={{ fontSize: 28 }}>WebXR AR Test</h2>
          <p>{arSupported === null ? 'Checking...' : arSupported ? 'AR Supported' : 'AR Not Supported'}</p>
          {arError && <p style={{ color: 'red' }}>{arError}</p>}
          <button onClick={startAR} disabled={!arSupported} style={{ marginTop: 20, padding: 16, fontSize: 20 }}>
            Start AR
          </button>
        </>
      )}
      {arActive && (
        <button onClick={endAR} style={{ position: 'fixed', bottom: 20, padding: 16, fontSize: 20 }}>
          End AR
        </button>
      )}
    </div>
  );
}
