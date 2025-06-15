import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ARModeEntry = () => {
  const [isARSupported, setIsARSupported] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const checkARSupport = async () => {
      try {
        if (navigator.xr) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setIsARSupported(supported);
        } else {
          setIsARSupported(false);
        }
      } catch (error) {
        console.error('Error checking AR support:', error);
        setIsARSupported(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkARSupport();
  }, []);

  const handleEnterAR = () => {
    navigate('/ar-scene');
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">{t('ar.title', 'AR Mitigation Planner')}</h2>
      
      {isARSupported ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('ar.supported', 'AR mode is supported on your device. Experience the mitigation planner in augmented reality.')}
          </p>
          <button
            onClick={handleEnterAR}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
          >
            {t('ar.enterButton', 'Enter AR Mitigation Planner')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800">
              {t('ar.notSupported', 'AR mode is not supported on your device. Please try using Android Chrome or use the Map Mode instead.')}
            </p>
          </div>
          <button
            onClick={() => navigate('/mitigation-planner')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
          >
            {t('ar.useMapMode', 'Use Map Mode')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ARModeEntry; 