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
  const [arSupported, setARSupported] = useState(null);

  useEffect(() => {
    const checkSupport = async () => {
      if (navigator.xr) {
        try {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setARSupported(supported);
        } catch {
          setARSupported(false);
        }
      } else {
        setARSupported(false);
      }
    };
    checkSupport();
  }, []);

  const handleBack = () => navigate('/mitigation-planner');

  if (arSupported === null) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </div>
    );
  }

  if (!arSupported) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-2">AR Not Supported</h2>
            <p className="text-gray-600 mb-4">
              AR is not supported on this device or browser.
            </p>
            <button
              onClick={handleBack}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg"
            >
              Back to Planner
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
            sessionInit={{
              requiredFeatures: ['hit-test'],
              optionalFeatures: ['dom-overlay', 'light-estimation', 'anchors'],
              domOverlay: { root: document.body }
            }}
          >
            <ARScene selectedType={selectedType} />
          </XR>
        </Canvas>

        <div className="absolute top-4 left-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold">{t('ar.instructions', 'Instructions')}</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">
            1. Tap "Start AR"\n2. Allow camera access\n3. Point to flat surface\n4. Tap to place object
          </p>
        </div>

        <div className="absolute bottom-4 left-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-medium">Select Intervention</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleBack}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg"
              >
                Back
              </button>
              <ARButton />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedType('tree')}
              className={`p-3 rounded-lg ${selectedType === 'tree' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            >
              🌳 Tree
            </button>
            <button
              onClick={() => setSelectedType('roof')}
              className={`p-3 rounded-lg ${selectedType === 'roof' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              🏠 Roof
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
