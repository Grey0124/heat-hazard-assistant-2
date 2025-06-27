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
  const [isOpen, setIsOpen] = useState(true);

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
              // Use gmRoute if present, otherwise fallback to route
              const routeObj = route.gmRoute ? route.gmRoute : route;
              // Extract route points
              const routePoints = extractRoutePoints(routeObj);
              
              // Defensive: fill missing tavg/tmin if not present, and fallback for temp
              let temp = weatherData.temp;
              let tavg = weatherData.tavg;
              let tmin = weatherData.tmin;
              if (typeof temp !== 'number') temp = 38; // fallback hot value
              if (typeof tavg !== 'number') tavg = temp - 2;
              if (typeof tmin !== 'number') tmin = temp - 5;
              // For debugging: log the payload
              const debugPayload = {
                lat: routePoints[0]?.lat,
                lon: routePoints[0]?.lng,
                date: new Date().toISOString().split('T')[0],
                hour: new Date().getHours(),
                temp,
                tavg,
                tmin,
                prcp: weatherData.precipitation || 0
              };
              console.log('Predicting heat risk for first point:', debugPayload);
              // Calculate heat stroke risk for each point along the route
              const pointRisks = await heatHazardService.predictRouteHazards(
                routePoints,
                { ...weatherData, temp, tavg, tmin },
                new Date() // Start time
              );
              console.log('Route point risks:', pointRisks);
              
              // Only keep valid risk scores
              const validRisks = pointRisks.filter(p => typeof p.risk_score === 'number' && !isNaN(p.risk_score));
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
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceTimeout);
  }, [routes, map, weatherData]);

  // Call onRouteRiskCalculated only when routeRisks changes
  useEffect(() => {
    if (onRouteRiskCalculated && routeRisks.length > 0) {
      onRouteRiskCalculated(routeRisks);
    }
    // eslint-disable-next-line
  }, [routeRisks]);

  // Extract points from Google Maps route
  const extractRoutePoints = (route) => {
    const points = [];
    const getLat = (loc) => {
      if (!loc) return undefined;
      if (typeof loc.lat === 'function') return loc.lat();
      if (typeof loc.lat === 'number') return loc.lat;
      return undefined;
    };
    const getLng = (loc) => {
      if (!loc) return undefined;
      if (typeof loc.lng === 'function') return loc.lng();
      if (typeof loc.lng === 'number') return loc.lng;
      return undefined;
    };
    if (route.legs && route.legs.length > 0) {
      route.legs.forEach(leg => {
        if (leg.steps && leg.steps.length > 0) {
          leg.steps.forEach(step => {
            if (step.start_location) {
              const lat = getLat(step.start_location);
              const lng = getLng(step.start_location);
              if (typeof lat === 'number' && typeof lng === 'number') {
                points.push({ lat, lng });
              }
            }
            if (step.end_location) {
              const lat = getLat(step.end_location);
              const lng = getLng(step.end_location);
              if (typeof lat === 'number' && typeof lng === 'number') {
                points.push({ lat, lng });
              }
            }
          });
        } else {
          // Fallback: use leg start/end location if steps missing
          if (leg.start_location) {
            const lat = getLat(leg.start_location);
            const lng = getLng(leg.start_location);
            if (typeof lat === 'number' && typeof lng === 'number') {
              points.push({ lat, lng });
            }
          }
          if (leg.end_location) {
            const lat = getLat(leg.end_location);
            const lng = getLng(leg.end_location);
            if (typeof lat === 'number' && typeof lng === 'number') {
              points.push({ lat, lng });
            }
          }
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
      {routeRisks.length > 0 && (
        <div className="absolute top-20 right-4 bg-white p-4 rounded shadow max-w-sm z-20">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <h3 className="font-semibold text-lg mb-3">Heat Stroke Risk Analysis</h3>
            <button className="ml-2 focus:outline-none" aria-label="Toggle Heat Stroke Risk Analysis">
              <svg className={`w-5 h-5 transition-transform ${isOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {isOpen && (
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
          )}
        </div>
      )}
    </div>
  );
};

export default RouteHeatStrokeRisk; 