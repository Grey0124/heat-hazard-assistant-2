import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, ARButton } from '@react-three/xr';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import ARScene from '../components/ARScene';

export default function ARMode() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('tree');
  const [isARSupported, setIsARSupported] = useState(true);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkARSupport = async () => {
      try {
        if (navigator.xr) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          if (!mounted) return;
          setIsARSupported(supported);
          if (!supported) {
            setError('AR is not supported on your device');
          }
        } else {
          if (!mounted) return;
          setIsARSupported(false);
          setError('WebXR is not supported in your browser');
        }
      } catch (err) {
        console.error('Error checking AR support:', err);
        if (!mounted) return;
        setError('Error checking AR support');
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    checkARSupport();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSessionError = (error) => {
    console.error('AR Session Error:', error);
    setError('Failed to start AR session. Please try again.');
  };

  const handleBack = () => {
    navigate('/mitigation-planner');
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white/90 p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-lg font-semibold mb-2">AR Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
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
              optionalFeatures: ['dom-overlay'],
              domOverlay: { root: document.body },
            }}
          >
            <ARScene selectedType={selectedType} />
          </XR>
        </Canvas>

        <div className="absolute top-4 left-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-2">{t('ar.instructions', 'Instructions')}</h3>
          <p className="text-gray-600 whitespace-pre-line">
            {t(
              'ar.instructionsText',
              '1. Tap AR button to start\n2. Point camera at a flat surface\n3. Tap reticle to place intervention\n4. Use buttons below to switch types'
            )}
          </p>
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
