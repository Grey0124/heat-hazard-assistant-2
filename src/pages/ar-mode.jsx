import React, { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { ARButton, XR, Controllers, useHitTest, Interactive } from '@react-three/xr';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import * as THREE from 'three';
import { BoxGeometry, ConeGeometry } from 'three';

// AR Scene Component
const ARScene = () => {
  const { t } = useTranslation();
  const [interventions, setInterventions] = useState([]);
  const [selectedType, setSelectedType] = useState('tree');

  // Handle hit test results
  useHitTest((hitMatrix, hit) => {
    // Create a new intervention at the hit point
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(hitMatrix);
    
    const newIntervention = {
      id: Date.now(),
      position: [position.x, position.y, position.z],
      type: selectedType,
      size: 0.5, // Default size in meters
    };
    
    setInterventions(prev => [...prev, newIntervention]);
  });

  // Render intervention based on type
  const renderIntervention = (intervention) => {
    const color = intervention.type === 'tree' ? '#00AA00' : 
                 intervention.type === 'roof' ? '#0000FF' : '#AA0000';
    
    return (
      <Interactive key={intervention.id}>
        <mesh position={intervention.position}>
          {intervention.type === 'tree' ? (
            <ConeGeometry args={[0.2, 0.5, 8]} />
          ) : (
            <BoxGeometry args={[0.5, 0.1, 0.5]} />
          )}
          <meshStandardMaterial color={color} />
        </mesh>
      </Interactive>
    );
  };

  return (
    <>
      {/* AR Content */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      {/* Render all placed interventions */}
      {interventions.map(renderIntervention)}
      
      {/* Reticle for placement */}
      <mesh>
        <ringGeometry args={[0.15, 0.2, 32]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </>
  );
};

// Main AR Mode Page
const ARMode = () => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState('tree');

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          {t('ar.title', 'AR Mitigation Planner')}
        </h1>

        {/* Controls Panel */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('mitigationPlanner.interventionType')}
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="tree">{t('mitigationPlanner.tree')}</option>
                <option value="roof">{t('mitigationPlanner.reflectiveRoof')}</option>
                <option value="building">{t('mitigationPlanner.heatIntensiveStructure')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* AR Canvas */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
          <Canvas>
            <XR>
              <ARScene />
              <Controllers />
            </XR>
          </Canvas>
          <ARButton 
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
            sessionInit={{
              requiredFeatures: ['hit-test'],
              optionalFeatures: ['dom-overlay'],
              domOverlay: { root: document.body }
            }}
          />
        </div>

        {/* Instructions */}
        <div className="mt-4 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-2">
            {t('ar.instructions', 'How to Use')}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>{t('ar.instruction1', 'Tap the screen to place interventions')}</li>
            <li>{t('ar.instruction2', 'Move around to view from different angles')}</li>
            <li>{t('ar.instruction3', 'Select different intervention types from the control panel')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ARMode; 