import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ARModeEntry = () => {
  const [supported, setSupported] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSupport = async () => {
      if (navigator.xr) {
        try {
          const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
          setSupported(isSupported);
        } catch {
          setSupported(false);
        }
      } else {
        setSupported(false);
      }
    };
    checkSupport();
  }, []);

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">AR Mitigation Planner</h2>
      {supported === null ? (
        <div className="animate-spin h-6 w-6 border-2 border-b-amber-600 rounded-full mx-auto"></div>
      ) : supported ? (
        <button
          onClick={() => navigate('/ar-scene')}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 px-4 rounded-lg"
        >
          Enter AR Mode
        </button>
      ) : (
        <>
          <p className="text-red-600 mb-3">AR not supported on this device.</p>
          <button
            onClick={() => navigate('/mitigation-planner')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg"
          >
            Use Map Mode Instead
          </button>
        </>
      )}
    </div>
  );
};

export default ARModeEntry;
