import React, { useEffect, useState, useRef } from 'react';
import heatHazardService from '../../services/heatHazardService';

const RouteHeatStrokeRisk = ({ 
  routes, 
  map, 
  weatherData, 
  onRouteRiskCalculated 
}) => {
  const [routeRisks, setRouteRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [riskMarkers, setRiskMarkers] = useState([]);
  const lastRisksRef = useRef();

  // Calculate heat stroke risk for routes when they change
  useEffect(() => {
    if (!routes || !routes.length || !map || !weatherData) {
      return;
    }

    const debounceTimeout = setTimeout(() => {
      const calculateRouteRisks = async () => {
        setLoading(true);
        setError(null);

        try {
          const risks = await Promise.all(
            routes.map(async (route, routeIndex) => {
              const routePoints = extractRoutePoints(route);
              
              if (routePoints.length === 0) {
                return {
                  routeIndex,
                  route,
                  pointRisks: [],
                  averageRisk: null,
                  maxRisk: null,
                  riskLevel: 'no_data',
                  highRiskSegments: [],
                  safetyRecommendations: []
                };
              }

              // Calculate risk for each point along the route
              const pointRisks = await Promise.all(
                routePoints.map(async (point, pointIndex) => {
                  try {
                    const prediction = await heatHazardService.predictHeatHazard(
                      point.lat,
                      point.lng,
                      new Date().toISOString().split('T')[0],
                      new Date().getHours(),
                      weatherData.temp,
                      weatherData.humidity,
                      weatherData.tmin || weatherData.temp - 5,
                      weatherData.precipitation || 0
                    );
                    
                    return {
                      ...prediction,
                      pointIndex,
                      lat: point.lat,
                      lng: point.lng
                    };
                  } catch (err) {
                    console.warn(`Failed to predict risk for point ${pointIndex}:`, err);
                    return null;
                  }
                })
              );

              // Filter out failed predictions
              const validRisks = pointRisks.filter(risk => risk !== null);
              
              const avgRisk = validRisks.length > 0
                ? validRisks.reduce((sum, pred) => sum + pred.risk_score, 0) / validRisks.length
                : null;
              const maxRisk = validRisks.length > 0
                ? Math.max(...validRisks.map(pred => pred.risk_score))
                : null;
              
              // Find high-risk segments
              const highRiskSegments = validRisks
                .map((pred, idx) => ({ ...pred, index: idx }))
                .filter(pred => pred.risk_score > 0.6);
              
              return {
                routeIndex,
                route,
                pointRisks: validRisks,
                averageRisk: avgRisk,
                maxRisk,
                riskLevel: avgRisk !== null ? getRiskLevel(avgRisk) : 'no_data',
                highRiskSegments,
                safetyRecommendations: heatHazardService.getSafetyRecommendations(avgRisk !== null ? getRiskLevel(avgRisk) : 'low')
              };
            })
          );

          setRouteRisks(risks);
          
          // Create visual annotations
          createRouteAnnotations(risks);
        } catch (err) {
          console.error('Failed to calculate route heat stroke risks:', err);
          setError('Failed to analyze route heat stroke risks');
        } finally {
          setLoading(false);
        }
      };
      calculateRouteRisks();
    }, 60000); // 60000ms = 1 minute debounce

    return () => clearTimeout(debounceTimeout);
  }, [routes, map, weatherData]);

  // Call onRouteRiskCalculated only when routeRisks changes
  useEffect(() => {
    if (onRouteRiskCalculated && routeRisks.length > 0) {
      onRouteRiskCalculated(routeRisks);
    }
    // eslint-disable-next-line
  }, [routeRisks]);

  // Extract route points from Google Maps route
  const extractRoutePoints = (route) => {
    const points = [];
    
    const getLat = (loc) => {
      if (typeof loc.lat === 'function') return loc.lat();
      return loc.lat;
    };
    
    const getLng = (loc) => {
      if (typeof loc.lng === 'function') return loc.lng();
      return loc.lng;
    };

    if (route.legs && route.legs.length > 0) {
      route.legs.forEach(leg => {
        if (leg.steps) {
          leg.steps.forEach(step => {
            if (step.path) {
              step.path.forEach(point => {
                points.push({
                  lat: getLat(point),
                  lng: getLng(point)
                });
              });
            }
          });
        }
      });
    }
    if (points.length === 0) {
      console.warn('No valid route points extracted. Route object:', route);
    }
    return points;
  };

  // Create visual annotations on the map
  const createRouteAnnotations = (risks) => {
    // Clear existing markers
    if (riskMarkers.length > 0) {
      riskMarkers.forEach(marker => marker.setMap(null));
    }

    const newMarkers = [];

    risks.forEach(routeRisk => {
      const { routeIndex, averageRisk, maxRisk, route, highRiskSegments } = routeRisk;
      
      // Add heat stroke risk annotation at the start of the route
      if (route.legs && route.legs.length > 0) {
        const startLocation = route.legs[0].start_location;
        
        const marker = new google.maps.Marker({
          position: startLocation,
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: getHeatStrokeColor(averageRisk),
            fillOpacity: 0.8,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          },
          title: `Route ${routeIndex + 1}: ${getRiskLevel(averageRisk)} Heat Stroke Risk`
        });

        // Create info window with heat stroke risk details
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-3">
              <h3 class="font-bold text-lg">Route ${routeIndex + 1}</h3>
              <div class="mt-2">
                <div class="flex items-center">
                  <span class="text-sm font-medium">Heat Stroke Risk:</span>
                  <span class="ml-2 px-2 py-1 text-xs rounded ${getHeatStrokeBadgeClass(averageRisk)}">
                    ${(averageRisk * 100).toFixed(1)}% - ${getRiskLevel(averageRisk)}
                  </span>
                </div>
                <div class="flex items-center mt-1">
                  <span class="text-sm font-medium">Max Risk:</span>
                  <span class="ml-2 px-2 py-1 text-xs rounded ${getHeatStrokeBadgeClass(maxRisk)}">
                    ${(maxRisk * 100).toFixed(1)}%
                  </span>
                </div>
                <div class="mt-2 text-xs text-gray-600">
                  Duration: ${route.legs[0].duration?.text || 'N/A'}<br/>
                  Distance: ${route.legs[0].distance?.text || 'N/A'}
                </div>
                ${highRiskSegments.length > 0 ? `
                  <div class="mt-2 text-xs text-red-600">
                    ⚠️ ${highRiskSegments.length} high-risk segments detected
                  </div>
                ` : ''}
              </div>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
      }

      // Add markers for high-risk segments
      highRiskSegments.slice(0, 3).forEach((segment, idx) => {
        const routePoints = extractRoutePoints(route);
        if (routePoints[segment.index]) {
          const highRiskMarker = new google.maps.Marker({
            position: new google.maps.LatLng(routePoints[segment.index].lat, routePoints[segment.index].lng),
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#FF0000',
              fillOpacity: 0.9,
              strokeWeight: 1,
              strokeColor: '#FFFFFF'
            },
            title: `High Heat Stroke Risk: ${(segment.risk_score * 100).toFixed(1)}%`
          });

          newMarkers.push(highRiskMarker);
        }
      });
    });

    setRiskMarkers(newMarkers);
  };

  // Get risk level based on score
  const getRiskLevel = (risk) => {
    if (risk < 0.3) return 'low';
    if (risk < 0.6) return 'medium';
    if (risk < 0.8) return 'high';
    return 'very_high';
  };

  // Get color based on heat stroke risk level
  const getHeatStrokeColor = (risk) => {
    if (risk < 0.3) return '#10B981'; // Green
    if (risk < 0.6) return '#F59E0B'; // Yellow
    if (risk < 0.8) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  // Get CSS class for heat stroke risk badge
  const getHeatStrokeBadgeClass = (risk) => {
    if (risk < 0.3) return 'bg-green-100 text-green-800';
    if (risk < 0.6) return 'bg-yellow-100 text-yellow-800';
    if (risk < 0.8) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (riskMarkers.length > 0) {
        riskMarkers.forEach(marker => marker.setMap(null));
      }
    };
  }, []);

  if (!routes || routes.length === 0) return null;

  return (
    <div className="route-heat-stroke-risk">
      {loading && (
        <div className="absolute top-20 left-4 bg-white p-2 rounded shadow z-20">
          <div className="text-sm text-gray-600">Analyzing heat stroke risks...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-20 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-20">
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Route Heat Stroke Risk Summary */}
      {routeRisks.length > 0 && (
        <div className="absolute top-20 right-4 bg-white p-4 rounded shadow max-w-sm z-20">
          <h3 className="font-semibold text-lg mb-3">Heat Stroke Risk Analysis</h3>
          <div className="space-y-2">
            {routeRisks.filter(risk => risk.averageRisk !== null).map((routeRisk, index) => (
              <div key={index} className="border-b pb-2 last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Route {routeRisk.routeIndex + 1}</span>
                  <span className={`px-2 py-1 text-xs rounded ${getHeatStrokeBadgeClass(routeRisk.averageRisk)}`}>
                    {routeRisk.averageRisk !== null ? (routeRisk.averageRisk * 100).toFixed(1) + '%' : 'No data'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {routeRisk.riskLevel} Risk • Max: {routeRisk.maxRisk !== null ? (routeRisk.maxRisk * 100).toFixed(1) + '%' : 'No data'}
                </div>
                {routeRisk.highRiskSegments.length > 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    ⚠️ {routeRisk.highRiskSegments.length} high-risk segments
                  </div>
                )}
              </div>
            ))}
            {routeRisks.every(risk => risk.averageRisk === null) && (
              <div className="text-gray-500 text-sm">No valid risk data available for these routes.</div>
            )}
          </div>
        </div>
      )}

      {/* Heat Stroke Safety Recommendations */}
      {routeRisks.length > 0 && (
        <div className="absolute bottom-20 right-4 bg-white p-4 rounded shadow max-w-sm z-20">
          <h4 className="font-semibold text-sm mb-2">Heat Stroke Prevention</h4>
          <div className="text-xs space-y-1">
            {routeRisks[0].safetyRecommendations.slice(0, 3).map((rec, idx) => (
              <div key={idx} className="flex items-start">
                <span className="text-red-500 mr-1">•</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Based on ML predictions from historical weather data
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteHeatStrokeRisk; 