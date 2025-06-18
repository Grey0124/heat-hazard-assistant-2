import React, { useState } from 'react';

export default function ARNavbar({ 
  selectedType, 
  onTypeChange, 
  placedInterventions, 
  onExit, 
  onGoToMap,
  locationStatus,
  calculateTotalEffectiveness,
  calculateTotalTemperatureReduction
}) {
  const [activeTab, setActiveTab] = useState('types');
  const [isExpanded, setIsExpanded] = useState(true);

  const tabs = [
    { id: 'types', label: '🎯 Types', icon: '🎯' },
    { id: 'stats', label: '📊 Stats', icon: '📊' },
    { id: 'location', label: '📍 Location', icon: '📍' },
    { id: 'controls', label: '⚙️ Controls', icon: '⚙️' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'types':
        return (
          <div style={{ padding: '10px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Object Types</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                style={{
                  padding: '8px 16px',
                  background: selectedType === 'tree' ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: selectedType === 'tree' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => onTypeChange('tree')}
              >
                🌳 Tree
              </button>
              <button
                style={{
                  padding: '8px 16px',
                  background: selectedType === 'roof' ? '#2196F3' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: selectedType === 'roof' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => onTypeChange('roof')}
              >
                🏠 Roof
              </button>
              <button
                style={{
                  padding: '8px 16px',
                  background: selectedType === 'shade' ? '#FF9800' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: selectedType === 'shade' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => onTypeChange('shade')}
              >
                ☂️ Shade
              </button>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div style={{ padding: '10px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Statistics</h3>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Total Objects:</span>
                <span style={{ fontWeight: 'bold' }}>{placedInterventions.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Avg Effectiveness:</span>
                <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>{calculateTotalEffectiveness()}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Temp Reduction:</span>
                <span style={{ fontWeight: 'bold', color: '#FF9800' }}>{calculateTotalTemperatureReduction()}°C</span>
              </div>
            </div>

            {placedInterventions.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Placed Objects:</h4>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {placedInterventions.map((int, index) => (
                    <div key={int.id} style={{
                      marginBottom: '6px',
                      padding: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 'bold' }}>{index + 1}. {int.type}</span>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>
                          {new Date(int.metadata?.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Temp: {int.metadata?.temperature}°C</span>
                        <span>Effect: {int.metadata?.effectiveness}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'location':
        return (
          <div style={{ padding: '10px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Location</h3>
            <div style={{ fontSize: '12px' }}>
              <span>{locationStatus}</span>
            </div>
          </div>
        );

      case 'controls':
        return (
          <div style={{ padding: '10px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Controls</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => window.open('/camera-test', '_blank')}
                style={{
                  padding: '8px 16px',
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                📷 Camera Test
              </button>
              <button 
                onClick={onGoToMap} 
                style={{
                  padding: '8px 16px',
                  background: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                🗺️ Go to Map
              </button>
              <button 
                onClick={onExit} 
                style={{
                  padding: '8px 16px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                ❌ Exit
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ar-navbar">
      {/* Top bar with expand/collapse and quick info */}
      <div className="ar-navbar-top">
        <div className="ar-navbar-quick-info">
          <button
            className="ar-navbar-expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
          <span style={{ fontWeight: 'bold' }}>
            Selected: <span style={{ color: '#4CAF50' }}>{selectedType}</span>
          </span>
          <span>
            Objects: <span style={{ fontWeight: 'bold' }}>{placedInterventions.length}</span>
          </span>
          <span>
            Effect: <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{calculateTotalEffectiveness()}%</span>
          </span>
        </div>
      </div>

      {/* Tab navigation */}
      {isExpanded && (
        <>
          <div className="ar-navbar-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`ar-navbar-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="ar-navbar-content">
            {renderTabContent()}
          </div>
        </>
      )}
    </div>
  );
} 