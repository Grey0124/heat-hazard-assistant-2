import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, ARButton, XRControllerModel } from '@react-three/xr';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import ARScene from '../components/ARScene';

export default function ARMode() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('tree');
  const [arState, setARState] = useState({
    isSupported: false,
    isChecking: true,
    features: {
      hitTest: false,
      lightEstimation: false,
      anchors: false,
      domOverlay: false
    },
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const checkARSupport = async () => {
      try {
        if (!navigator.xr) {
          throw new Error('WebXR not supported in this browser');
        }

        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!mounted) return;

        if (!supported) {
          throw new Error('AR not supported on this device');
        }

        // Check available features by requesting a temporary session
        const tempSession = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['light-estimation', 'anchors', 'dom-overlay']
        });

        const features = {
          hitTest: tempSession.enabledFeatures.includes('hit-test'),
          lightEstimation: tempSession.enabledFeatures.includes('light-estimation'),
          anchors: tempSession.enabledFeatures.includes('anchors'),
          domOverlay: tempSession.enabledFeatures.includes('dom-overlay')
        };

        // End the temporary session
        await tempSession.end();

        setARState({
          isSupported: true,
          isChecking: false,
          features,
          error: null
        });
      } catch (err) {
        console.error('AR Support Check Error:', err);
        if (!mounted) return;
        setARState(prev => ({
          ...prev,
          isSupported: false,
          isChecking: false,
          error: err.message || 'Failed to initialize AR'
        }));
      }
    };

    checkARSupport();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSessionError = (error) => {
    console.error('AR Session Error:', error);
    setARState(prev => ({
      ...prev,
      error: 'Failed to start AR session. Please try again.'
    }));
  };

  const handleBack = () => {
    navigate('/mitigation-planner');
  };

  if (arState.isChecking) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </div>
    );
  }

  if (arState.error) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white/90 p-6 rounded-lg shadow-lg text-center max-w-md">
            <h3 className="text-lg font-semibold mb-2">AR Error</h3>
            <p className="text-gray-600 mb-4">{arState.error}</p>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
              <button 
                onClick={handleBack}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Mitigation Planner
              </button>
            </div>
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
              optionalFeatures: ['light-estimation', 'anchors', 'dom-overlay'],
              domOverlay: { root: document.body }
            }}
          >
            <XRControllerModel />
            <ARScene 
              selectedType={selectedType}
              features={arState.features}
            />
          </XR>
        </Canvas>

        <div className="absolute top-4 left-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-2">{t('ar.instructions', 'Instructions')}</h3>
          <p className="text-gray-600 whitespace-pre-line">
            {t(
              'ar.instructionsText',
              '1. Tap AR button to start\n2. Allow camera access when prompted\n3. Point camera at a flat surface\n4. Tap reticle to place intervention\n5. Use hand gestures or controllers to interact\n6. Use buttons below to switch types'
            )}
          </p>
          {arState.features.lightEstimation && (
            <p className="text-sm text-green-600 mt-2">
              {t('ar.lightEstimationEnabled', 'Light estimation enabled for better visuals')}
            </p>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t('ar.selectIntervention', 'Select Intervention Type')}</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back
              </button>
              <ARButton />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedType('tree')}
              className={`p-4 rounded-lg flex items-center justify-center space-x-2 ${
                selectedType === 'tree' ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}
            >
              <span className="text-xl">🌳</span>
              <span>{t('ar.tree', 'Tree')}</span>
            </button>
            <button
              onClick={() => setSelectedType('roof')}
              className={`p-4 rounded-lg flex items-center justify-center space-x-2 ${
                selectedType === 'roof' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              <span className="text-xl">🏠</span>
              <span>{t('ar.roof', 'Reflective Roof')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
