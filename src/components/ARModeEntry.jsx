//ARModeentry
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
        setIsChecking(true);
        
        // Simple AR support check - this was working before
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

  const handleEnterEnhancedAR = () => {
    navigate('/enhanced-ar');
  };

  const handleGoToMap = () => {
    navigate('/mitigation-planner');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('ar.checking', 'Checking AR Support')}
          </h2>
          <p className="text-gray-600">
            {t('ar.checkingDesc', 'Verifying if your device supports AR features...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🌍</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {t('ar.title', 'AR Mitigation Planner')}
          </h1>
          <p className="text-gray-600">
            {t('ar.subtitle', 'Experience heat mitigation strategies in augmented reality')}
          </p>
        </div>
        
        {isARSupported ? (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-green-600 text-xl mr-3">✅</div>
                <div>
                  <h3 className="font-semibold text-green-800">
                    {t('ar.supported', 'AR Supported')}
                  </h3>
                  <p className="text-green-700 text-sm">
                    {t('ar.supportedDesc', 'Your device supports AR features. You can experience the mitigation planner in augmented reality.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                {t('ar.instructions', 'How to use AR mode:')}
              </h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• {t('ar.step1', 'Point your camera at a flat surface')}</li>
                <li>• {t('ar.step2', 'Tap to place heat mitigation objects')}</li>
                <li>• {t('ar.step3', 'Choose from trees, roofs, and shade structures')}</li>
                <li>• {t('ar.step4', 'Tap placed objects to remove them')}</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleEnterEnhancedAR}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-300 text-lg shadow-lg"
              >
                🚀 Enhanced AR Experience (Recommended)
              </button>
              
              <button
                onClick={handleEnterAR}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
              >
                📱 Classic AR Experience
              </button>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h4 className="font-semibold text-purple-800 mb-1 text-sm">Enhanced Features:</h4>
              <ul className="text-purple-700 text-xs space-y-1">
                <li>• Better 3D preview with orbit controls</li>
                <li>• Collapsible UI panels</li>
                <li>• Improved object placement</li>
                <li>• Real-time statistics</li>
                <li>• Enhanced visual effects</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-amber-600 text-xl mr-3">⚠️</div>
                <div>
                  <h3 className="font-semibold text-amber-800">
                    {t('ar.notSupported', 'AR Not Available')}
                  </h3>
                  <p className="text-amber-700 text-sm">
                    {t('ar.notSupportedDesc', 'Your device does not support AR features. This could be due to browser limitations or device compatibility.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                {t('ar.alternatives', 'Alternative options:')}
              </h3>
              <ul className="text-gray-700 text-sm space-y-1">
                <li>• {t('ar.alternative1', 'Use the 2D map mode for planning')}</li>
                <li>• {t('ar.alternative2', 'Try on a different device with AR support')}</li>
                <li>• {t('ar.alternative3', 'Use Chrome on Android for best AR experience')}</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGoToMap}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
              >
                {t('ar.useMapMode', '🗺️ Use Map Mode')}
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
              >
                {t('ar.goBack', '← Go Back')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ARModeEntry;