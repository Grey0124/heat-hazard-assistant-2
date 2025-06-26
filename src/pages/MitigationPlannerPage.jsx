import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polygon, Circle } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { computeCoolingEffect } from '../utils/coolingCalculator';
import * as turf from '@turf/turf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 64px)',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

const MitigationPlannerPage = () => {
  const { t } = useTranslation();
  const [interventions, setInterventions] = useState([]);
  const [coolingEffect, setCoolingEffect] = useState(0);
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [map, setMap] = useState(null);
  const [zoom, setZoom] = useState(13);
  const centerUpdateTimeout = useRef(null);
  const forecastTimeout = useRef(null);

  const [selectedType, setSelectedType] = useState('tree');
  const [size, setSize] = useState(50);
  const [terrainType, setTerrainType] = useState('commercial');
  const [neighborhoodRadius, setNeighborhoodRadius] = useState(100);
  const [coeffTree, setCoeffTree] = useState(0.02);
  const [coeffRoof, setCoeffRoof] = useState(0.015);
  const [buildingCoverage, setBuildingCoverage] = useState(30);
  const [bufferPaths, setBufferPaths] = useState([]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const handleMapClick = useCallback(
    (event) => {
      const newIntervention = {
        id: Date.now(),
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
        type: selectedType,
        size: size,
      };
      setInterventions((prev) => [...prev, newIntervention]);
    },
    [selectedType, size]
  );

  useEffect(() => {
    const cooling = computeCoolingEffect(interventions, {
      neighborhoodRadiusMeters: neighborhoodRadius,
      coolingCoefficients: {
        tree: coeffTree,
        roof: coeffRoof,
      },
      terrainType: terrainType,
      buildingCoveragePercent: buildingCoverage,
      maxCooling: 5,
    });
    setCoolingEffect(cooling);
  }, [interventions, neighborhoodRadius, coeffTree, coeffRoof, terrainType, buildingCoverage]);

  useEffect(() => {
    if (!interventions || interventions.length === 0) {
      setBufferPaths([]);
      return;
    }
    try {
      const buffers = interventions.map((i) => {
        const pt = turf.point([i.lng, i.lat]);
        return turf.buffer(pt, neighborhoodRadius / 1000, { units: 'kilometers' });
      });
      let unioned = buffers[0];
      const pathsArr = [];
      for (let idx = 1; idx < buffers.length; idx++) {
        try {
          const next = turf.union(unioned, buffers[idx]);
          if (next) {
            unioned = next;
          } else {
            unioned = null;
            break;
          }
        } catch {
          unioned = null;
          break;
        }
      }
      if (unioned) {
        const geom = unioned.geometry;
        if (geom.type === 'Polygon') {
          const ring = geom.coordinates[0];
          const path = ring.map(([lng, lat]) => ({ lat, lng }));
          pathsArr.push(path);
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach((polyCoords) => {
            const ring = polyCoords[0];
            const path = ring.map(([lng, lat]) => ({ lat, lng }));
            pathsArr.push(path);
          });
        }
      } else {
        buffers.forEach((buf) => {
          const geom = buf.geometry;
          if (geom.type === 'Polygon') {
            const ring = geom.coordinates[0];
            const path = ring.map(([lng, lat]) => ({ lat, lng }));
            pathsArr.push(path);
          } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach((polyCoords) => {
              const ring = polyCoords[0];
              const path = ring.map(([lng, lat]) => ({ lat, lng }));
              pathsArr.push(path);
            });
          }
        });
      }
      setBufferPaths(pathsArr);
    } catch (e) {
      console.error('Error computing buffer polygon:', e);
      setBufferPaths([]);
    }
  }, [interventions, neighborhoodRadius]);

  const handleDeleteIntervention = (id) => {
    setInterventions((prev) => prev.filter((i) => i.id !== id));
  };

  const fetchForecast = useCallback(async (lat, lng) => {
    // Clear any existing forecast timeout
    if (forecastTimeout.current) {
      clearTimeout(forecastTimeout.current);
    }

    // Set a new timeout to fetch forecast
    forecastTimeout.current = setTimeout(async () => {
      setForecastLoading(true);
      setForecastError(null);
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max&timezone=auto`
        );
        if (!response.ok) throw new Error('Failed to fetch forecast');
        const data = await response.json();
        
        // Process the forecast data with fixed decimal places
        const processedData = data.daily.time.map((date, index) => ({
          date: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
          baseline: Number(data.daily.temperature_2m_max[index].toFixed(2)),
          postIntervention: Number((data.daily.temperature_2m_max[index] - coolingEffect).toFixed(2))
        }));
        
        setForecastData(processedData);
      } catch (error) {
        console.error('Error fetching forecast:', error);
        setForecastError('Failed to load forecast data');
      } finally {
        setForecastLoading(false);
      }
    }, 500); // 500ms debounce for forecast fetching
  }, [coolingEffect]);

  // Fetch forecast when map center or interventions change
  useEffect(() => {
    if (mapCenter) {
      fetchForecast(mapCenter.lat, mapCenter.lng);
    }
  }, [mapCenter, fetchForecast]);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onZoomChanged = useCallback(() => {
    if (map) {
      setZoom(map.getZoom());
    }
  }, [map]);

  const handleCenterChanged = useCallback(() => {
    if (map) {
      // Clear any existing timeout
      if (centerUpdateTimeout.current) {
        clearTimeout(centerUpdateTimeout.current);
      }

      // Set a new timeout to update the center
      centerUpdateTimeout.current = setTimeout(() => {
        const center = map.getCenter();
        setMapCenter({ lat: center.lat(), lng: center.lng() });
      }, 300); // 300ms debounce
    }
  }, [map]);

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          Mitigation Planner
        </h1>

        {/* Controls Panel */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intervention Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="tree">Tree</option>
                <option value="roof">Reflective Roof</option>
                <option value="building">Heat-Intensive Structure</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size (m²)
              </label>
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terrain Type
              </label>
              <select
                value={terrainType}
                onChange={(e) => setTerrainType(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="forest">Forest</option>
                <option value="park">Park</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building Coverage (%)
              </label>
              <input
                type="number"
                value={buildingCoverage}
                onChange={(e) => setBuildingCoverage(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Cooling
              </label>
              <div className="text-2xl font-bold text-blue-600">
                {coolingEffect.toFixed(2)}°C
              </div>
            </div>
          </div>

          {/* AR Mode Link */}
          <div className="mt-4">
            <button
              onClick={() => window.open('https://ar-mitigation.vercel.app/', '_blank')}
              className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Try AR Mode
            </button>
          </div>

          {/* Additional controls for radius and coefficients */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Neighborhood Radius (m)
              </label>
              <input
                type="number"
                value={neighborhoodRadius}
                onChange={(e) => setNeighborhoodRadius(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
                min="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tree Coefficient (°C per 1% area)
              </label>
              <input
                type="number"
                step="0.005"
                value={coeffTree}
                onChange={(e) => setCoeffTree(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roof Coefficient (°C per 1% area)
              </label>
              <input
                type="number"
                step="0.005"
                value={coeffRoof}
                onChange={(e) => setCoeffRoof(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
          </div>

          {/* Forecast Chart */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Forecast</h3>
            {forecastLoading ? (
              <div className="text-gray-500">Loading forecast...</div>
            ) : forecastError ? (
              <div className="text-red-500">{forecastError}</div>
            ) : forecastData ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis 
                      label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
                      domain={['dataMin - 1', 'dataMax + 1']}
                      tickFormatter={(value) => value.toFixed(2)}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value.toFixed(2)}°C`, '']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="baseline" name="Baseline" fill="#8884d8" />
                    <Bar dataKey="postIntervention" name="Post-Intervention" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-gray-500">No forecast data available.</div>
            )}
          </div>

          <p className="text-sm text-gray-500">
            Info: This planner estimates the cooling effect of interventions on local temperature. Results are for educational purposes only.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={zoom}
            onClick={handleMapClick}
            onLoad={onLoad}
            onZoomChanged={onZoomChanged}
            onCenterChanged={handleCenterChanged}
            options={{
              minZoom: 3,
              maxZoom: 18,
              gestureHandling: 'greedy',
              zoomControl: true,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false
            }}
          >
            {interventions.map((intervention) => {
              const footprintRadius = Math.sqrt(intervention.size / Math.PI);
              const color = intervention.type === 'tree' ? '#00AA00' : intervention.type === 'roof' ? '#0000FF' : '#AA0000';
              const iconUrl = intervention.type === 'tree' ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                : intervention.type === 'roof' ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
              return (
                <React.Fragment key={intervention.id}>
                  <Marker
                    position={{ lat: intervention.lat, lng: intervention.lng }}
                    onClick={() => handleDeleteIntervention(intervention.id)}
                    icon={{
                      url: iconUrl,
                      scaledSize: new window.google.maps.Size(32, 32),
                    }}
                  />
                  <Circle
                    center={{ lat: intervention.lat, lng: intervention.lng }}
                    radius={footprintRadius}
                    options={{
                      fillColor: color,
                      fillOpacity: 0.2,
                      strokeColor: color,
                      strokeOpacity: 0.5,
                      strokeWeight: 1,
                      clickable: false,
                    }}
                  />
                </React.Fragment>
              );
            })}

            {bufferPaths.map((path, idx) => (
              <Polygon
                key={idx}
                paths={path}
                options={{
                  fillColor: '#0000FF',
                  fillOpacity: 0.2,
                  strokeColor: '#0000FF',
                  strokeOpacity: 0.5,
                  strokeWeight: 1,
                  clickable: false,
                  draggable: false,
                  editable: false,
                }}
              />
            ))}
          </GoogleMap>
        </div>

        <div className="mt-4 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4">Placed Interventions</h2>
          <div className="space-y-2">
            {interventions.map((intervention) => (
              <div
                key={intervention.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div>
                  <span className="font-medium">
                    {intervention.type === 'tree'
                      ? 'Tree'
                      : intervention.type === 'roof'
                      ? 'Reflective Roof'
                      : 'Heat-Intensive Structure'}
                  </span>
                  <span className="text-gray-600 ml-2">({intervention.size} m²)</span>
                </div>
                <button
                  onClick={() => handleDeleteIntervention(intervention.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
            {interventions.length === 0 && (
              <p className="text-gray-500">No interventions placed yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MitigationPlannerPage;
