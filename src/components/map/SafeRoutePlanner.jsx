// src/components/map/SafeRoutePlanner.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../Navbar';
import { Link } from 'react-router-dom';
import { Loader } from '@googlemaps/js-api-loader';
import axios from 'axios';
import OpenAIService from '../../services/OpenAIService';
import { useTranslation } from 'react-i18next'; // Add this import for translations
import RouteHeatStrokeRisk from './RouteHeatStrokeRisk_fixed';

// Define libraries array outside the component to prevent unnecessary reloads
const GOOGLE_MAPS_LIBRARIES = ["visualization", "places", "routes"];

const SafeRoutePlanner = () => {
  const { t } = useTranslation(); // Initialize translation hook
  const { user } = useAuth();
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [currentHeatIndex, setCurrentHeatIndex] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [weatherData, setWeatherData] = useState(null);
  const [transitMode, setTransitMode] = useState('WALKING'); // 'WALKING', 'TRANSIT', or 'BOTH'
  
  // Heat stroke risk state variables
  const [showHeatStrokeRisk, setShowHeatStrokeRisk] = useState(true);
  const [routeHeatStrokeRisks, setRouteHeatStrokeRisks] = useState([]);

  const mapRef = useRef(null);
  const sourceAutocompleteRef = useRef(null);
  const destAutocompleteRef = useRef(null);

  // Google Maps API key - In production, you should store this in an environment variable
  const googleMapsApiKey = "AIzaSyD0pKwxjGQvmdWgTAMOUVb-qgqpoXTJ5P0";
  // OpenWeatherMap API key - For getting current weather conditions
  const weatherApiKey = "c7438fac71c1c9abdd58c30073620321";

  useEffect(() => {
    // Initialize Google Maps
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: googleMapsApiKey,
          version: "weekly",
          libraries: GOOGLE_MAPS_LIBRARIES // Use the static array defined outside the component
        });

        const google = await loader.load();
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: 40.7128, lng: -74.0060 }, // Default to New York City
          zoom: 12,
          mapTypeControl: false,
          styles: [
            {
              "featureType": "poi.park",
              "elementType": "geometry.fill",
              "stylers": [
                {
                  "color": "#a5b076"
                },
                {
                  "visibility": "on"
                }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry.fill",
              "stylers": [
                {
                  "visibility": "on"
                }
              ]
            }
          ]
        });

        // Initialize DirectionsService and DirectionsRenderer
        const dirService = new google.maps.DirectionsService();
        const dirRenderer = new google.maps.DirectionsRenderer({
          map: mapInstance,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#FF8C00',
            strokeWeight: 5
          }
        });

        // Initialize Autocomplete for source and destination inputs
        const sourceAutocomplete = new google.maps.places.Autocomplete(
          document.getElementById('source-input'),
          { types: ['geocode'] }
        );

        const destAutocomplete = new google.maps.places.Autocomplete(
          document.getElementById('destination-input'),
          { types: ['geocode'] }
        );

        sourceAutocomplete.addListener('place_changed', () => {
          const place = sourceAutocomplete.getPlace();
          setSource(place.formatted_address);

          // If we already have a destination, calculate the route
          if (destination && place.formatted_address) {
            calculateRoute(place.formatted_address, destination);
          }
        });

        destAutocomplete.addListener('place_changed', () => {
          const place = destAutocomplete.getPlace();
          setDestination(place.formatted_address);

          // If we already have a source, calculate the route
          if (source && place.formatted_address) {
            calculateRoute(source, place.formatted_address);
          }
        });

        setMap(mapInstance);
        setDirectionsService(dirService);
        setDirectionsRenderer(dirRenderer);
        sourceAutocompleteRef.current = sourceAutocomplete;
        destAutocompleteRef.current = destAutocomplete;

        // Try to get user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };

              mapInstance.setCenter(pos);

              // Reverse geocode to get address
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: pos }, (results, status) => {
                if (status === "OK" && results[0]) {
                  setSource(results[0].formatted_address);
                  document.getElementById('source-input').value = results[0].formatted_address;

                  // Fetch weather data for the current location
                  fetchWeatherData(position.coords.latitude, position.coords.longitude);
                }
              });
            },
            () => {
              setError("Error: The Geolocation service failed.");
            }
          );
        } else {
          setError("Error: Your browser doesn't support geolocation.");
        }

      } catch (err) {
        console.error("Error initializing map:", err);
        setError("Failed to load Google Maps. Please try again later.");
      }
    };

    initMap();
  }, []);

  // Function to fetch weather data
  const fetchWeatherData = async (lat, lng) => {
    try {
      // Use metric units directly in the API request
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${weatherApiKey}`
      );
      const data = response.data;
      setWeatherData(data);

      // Calculate heat index
      const temp = data.main.temp;
      const humidity = data.main.humidity;

      // Calculate heat index using the Celsius value
      const heatIndex = calculateHeatIndex(temp, humidity);
      setCurrentHeatIndex(heatIndex);

      // Generate recommendations based on heat index
      generateRecommendations(heatIndex);

    } catch (err) {
      console.error("Error fetching weather data:", err);
    }
  };

  // Calculate heat index (modified to work with Celsius)
  const calculateHeatIndex = (temperature, relativeHumidity) => {
    // Convert Celsius to Fahrenheit for the formula
    const tempF = (temperature * 9 / 5) + 32;

    // Simple heat index calculation (Fahrenheit)
    if (tempF < 80) return tempF;

    let heatIndex = 0.5 * (tempF + 61.0 + ((tempF - 68.0) * 1.2) + (relativeHumidity * 0.094));

    if (heatIndex > 80) {
      heatIndex = -42.379 + 2.04901523 * tempF + 10.14333127 * relativeHumidity
        - 0.22475541 * tempF * relativeHumidity - 0.00683783 * tempF * tempF
        - 0.05481717 * relativeHumidity * relativeHumidity + 0.00122874 * tempF * tempF * relativeHumidity
        + 0.00085282 * tempF * relativeHumidity * relativeHumidity - 0.00000199 * tempF * tempF * relativeHumidity * relativeHumidity;
    }

    return Math.round(heatIndex);
  };

  // Generate recommendations based on heat index and selected route
  const generateRecommendations = async (heatIndex, selectedRouteData) => {
    // Start with fallback recommendations
    let routeType = 'direct';
    let duration = 30; // default 30 minutes

    // If we have a selected route data provided, use it
    if (selectedRouteData) {
      routeType = selectedRouteData.shadeCoverage > 50 ? 'shaded' : 'direct';
      // Extract numeric duration in minutes from string like "25 mins"
      const durationMatch = selectedRouteData.duration.match(/(\d+)/);
      if (durationMatch) {
        duration = parseInt(durationMatch[1], 10);
      }
    }
    // Otherwise try to use the currently selected route
    else if (selectedRoute !== null && alternativeRoutes.length > 0) {
      const route = alternativeRoutes[selectedRoute];
      routeType = route.shadeCoverage > 50 ? 'shaded' : 'direct';
      // Extract numeric duration in minutes from string like "25 mins"
      const durationMatch = route.duration.match(/(\d+)/);
      if (durationMatch) {
        duration = parseInt(durationMatch[1], 10);
      }
    }

    // Get fallback recommendations in case API call fails
    const fallbackRecs = OpenAIService.getFallbackRecommendations(heatIndex, routeType, duration);
    setRecommendations(fallbackRecs);

    // Only call OpenAI API if we have enough data and a selected route
    if (weatherData && selectedRoute !== null && alternativeRoutes.length > 0) {
      try {
        setLoading(true);

        // Prepare data for API
        const routeData = selectedRouteData || alternativeRoutes[selectedRoute];
        const userData = user ? {
          // Get any user profile data that might be relevant
          age: user.age || null,
          healthConditions: user.healthConditions || []
        } : null;

        // Call OpenAI service
        const response = await OpenAIService.generateHeatSafetyRecommendations({
          user: userData,
          route: {
            distance: routeData.distance,
            duration: routeData.duration,
            shadeCoverage: routeData.shadeCoverage,
            heatExposureRisk: routeData.heatExposureRisk
          },
          weather: weatherData,
          heatIndex
        });

        if (response && response.recommendations && response.recommendations.length > 0) {
          setRecommendations(response.recommendations);
        }
      } catch (error) {
        console.error("Error getting AI recommendations:", error);
        // We'll keep the fallback recommendations already set
      } finally {
        setLoading(false);
      }
    }
  };

  // Function to calculate route with alternatives
  const calculateRoute = (start, end) => {
    if (!directionsService || !directionsRenderer) return;

    setLoading(true);
    setError('');

    // Reset alternative routes
    setAlternativeRoutes([]);

    // First, calculate the walking route if needed
    if (transitMode === 'WALKING' || transitMode === 'BOTH') {
      const walkingRequest = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.WALKING,
        provideRouteAlternatives: true,
        unitSystem: google.maps.UnitSystem.METRIC
      };

      directionsService.route(walkingRequest, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          // Only set directions if walking mode is active
          if (transitMode === 'WALKING') {
            setLoading(false);
            directionsRenderer.setDirections(result);
            directionsRenderer.setRouteIndex(0);
            setSelectedRoute(0);
          }

          // Process walking route alternatives
          if (result.routes && result.routes.length > 0) {
            const routes = result.routes.map((route, index) => {
              // Extract key information about the route
              const distance = route.legs[0].distance.text;
              const duration = route.legs[0].duration.text;

              // Your existing calculation for shade coverage
              const shadeCoverage = calculateSimulatedShadeCoverage(route);

              // Your existing calculation for heat exposure risk
              const heatExposureRisk = calculateHeatExposureRisk(route, shadeCoverage);

              return {
                type: 'WALKING',
                index,
                distance,
                duration,
                shadeCoverage,
                heatExposureRisk,
                steps: route.legs[0].steps,
                route: route,
                gmRoute: route
              };
            });

            setAlternativeRoutes(prevRoutes => [...prevRoutes, ...routes]);
          }
        } else {
          if (transitMode === 'WALKING') {
            setLoading(false);
            setError("Walking directions request failed due to " + status);
          }
        }
      });
    }

    // Then, calculate the transit route if needed
    if (transitMode === 'TRANSIT' || transitMode === 'BOTH') {
      const transitRequest = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.TRANSIT,
        transitOptions: {
          modes: [google.maps.TransitMode.SUBWAY, google.maps.TransitMode.RAIL, google.maps.TransitMode.BUS],
          routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
        },
        provideRouteAlternatives: true,
        unitSystem: google.maps.UnitSystem.METRIC
      };

      directionsService.route(transitRequest, (result, status) => {
        setLoading(false);

        if (status === google.maps.DirectionsStatus.OK) {
          // Only set directions if transit mode is active
          if (transitMode === 'TRANSIT') {
            directionsRenderer.setDirections(result);
            directionsRenderer.setRouteIndex(0);
            setSelectedRoute(0);
          }

          // Process transit route alternatives
          if (result.routes && result.routes.length > 0) {
            const routes = result.routes.map((route, index) => {
              // Extract key information about the route
              const distance = route.legs[0].distance.text;
              const duration = route.legs[0].duration.text;

              // For transit routes, extract transit specific information
              const transitSteps = route.legs[0].steps.filter(step => step.travel_mode === 'TRANSIT');
              const transitDetails = transitSteps.map(step => {
                return {
                  line: step.transit?.line?.name || '',
                  shortName: step.transit?.line?.short_name || '',
                  vehicle: step.transit?.line?.vehicle?.type || '',
                  icon: step.transit?.line?.vehicle?.icon || '',
                  color: step.transit?.line?.color || '#1976D2',
                  textColor: step.transit?.line?.text_color || '#FFFFFF',
                  departureStop: step.transit?.departure_stop?.name || '',
                  arrivalStop: step.transit?.arrival_stop?.name || '',
                  numStops: step.transit?.num_stops || 0,
                  departureTime: step.transit?.departure_time?.text || '',
                  arrivalTime: step.transit?.arrival_time?.text || '',
                  headsign: step.transit?.headsign || ''
                };
              });

              // Heat exposure risk is lower for transit routes
              // Buses have moderate shade, metro has full shade
              const hasMetro = transitSteps.some(step =>
                step.transit?.line?.vehicle?.type === 'SUBWAY' ||
                step.transit?.line?.vehicle?.type === 'RAIL'
              );

              const transportType = hasMetro ? 'METRO' : 'BUS';
              // Assign high shade coverage to metro, moderate to bus
              const shadeCoverage = hasMetro ? 90 : 70;
              // Heat risk is generally lower for transit
              const heatExposureRisk = hasMetro ? "Low" : "Moderate";

              return {
                type: 'TRANSIT',
                transitType: transportType,
                index,
                distance,
                duration,
                shadeCoverage,
                heatExposureRisk,
                steps: route.legs[0].steps,
                transitDetails,
                route: route,
                gmRoute: route
              };
            });

            setAlternativeRoutes(prevRoutes => [...prevRoutes, ...routes]);
          }
        } else {
          if (transitMode === 'TRANSIT') {
            setError("Transit directions request failed due to " + status);
          }
        }
      });
    }
  };

  // This function would ideally use real GIS data for tree canopy and building shadow coverage
  // For this prototype, we'll use a more sophisticated simulation that considers route factors
  const calculateSimulatedShadeCoverage = (route) => {
    // In a real implementation, you would:
    // 1. Use a tree canopy dataset from the city's GIS department
    // 2. Calculate sun position based on time of day
    // 3. Use building height data to estimate shadows
    // 4. Use satellite imagery analysis for vegetation coverage

    let baseShadeCoverage = 35; // Base value for an average urban area

    // Analyze route characteristics from Google's data
    if (route.legs && route.legs.length > 0) {
      const steps = route.legs[0].steps;

      // Look through steps for indicators of parks, tree-lined streets, etc.
      for (const step of steps) {
        const instructions = step.instructions.toLowerCase();

        // Increase shade score for parks and green areas
        if (instructions.includes('park') || instructions.includes('garden') || instructions.includes('trail')) {
          baseShadeCoverage += 15;
        }

        // Decrease for major roads which tend to have less shade
        if (instructions.includes('highway') || instructions.includes('major') ||
          instructions.includes('avenue') || instructions.includes('boulevard')) {
          baseShadeCoverage -= 10;
        }

        // Increase for residential areas which often have more trees
        if (instructions.includes('residential') || instructions.includes('neighborhood')) {
          baseShadeCoverage += 8;
        }

        // Downtown areas often have tall buildings (good for shadow, but less trees)
        if (instructions.includes('downtown') || instructions.includes('center')) {
          baseShadeCoverage += 5;
        }
      }
    }

    // Apply time-of-day factors - afternoon sun is strongest
    const currentHour = new Date().getHours();
    if (currentHour >= 10 && currentHour <= 14) {
      baseShadeCoverage -= 15; // Less effective shade during peak sun hours
    } else if (currentHour < 8 || currentHour > 18) {
      baseShadeCoverage += 20; // More effective shade during early morning/evening
    }

    // Ensure the final value is within reasonable bounds
    baseShadeCoverage = Math.max(5, Math.min(90, baseShadeCoverage));

    return Math.round(baseShadeCoverage);
  };

  // Calculate heat exposure risk based on route and shade coverage
  const calculateHeatExposureRisk = (route, shadeCoverage) => {
    // This is a simplified risk assessment
    // In a real app, you would factor in current temperature, humidity, UV index,
    // walking duration, shade, and potentially user health factors

    const distance = route.legs[0].distance.value; // Distance in meters
    const duration = route.legs[0].duration.value; // Duration in seconds

    // Risk increases with distance and decreases with shade
    let risk = (distance / 1000) * (1 - (shadeCoverage / 100));

    // Adjust risk based on current heat index if available
    if (currentHeatIndex) {
      if (currentHeatIndex >= 105) {
        risk *= 3;
      } else if (currentHeatIndex >= 90) {
        risk *= 2;
      } else if (currentHeatIndex >= 80) {
        risk *= 1.5;
      }
    }

    // Categorize risk
    if (risk < 0.5) return "Low";
    if (risk < 1.5) return "Moderate";
    if (risk < 3) return "High";
    return "Very High";
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (source && destination) {
      calculateRoute(source, destination);
    }
  };

  // Select a route and display it
  const selectRoute = (index) => {
    setSelectedRoute(index);

    if (directionsRenderer && alternativeRoutes[index]) {
      directionsRenderer.setDirections({ routes: [alternativeRoutes[index].route] });
      directionsRenderer.setRouteIndex(0);

      // Generate recommendations based on selected route
      generateRecommendations(currentHeatIndex, alternativeRoutes[index]);
    }
  };

  // Get heat risk color for UI elements
  const getHeatRiskColor = (risk) => {
    switch (risk) {
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      case "Moderate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Very High":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  return (
    <div className="min-h-screen bg-amber-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify mb-6">
          <Link
            to="/"
            className=" text-black font-semibold py-2 px-4 flex items-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-navy-900">Heat-Safe Route Planner</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Route Input and Weather Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-11 mb-6">
              <h2 className="text-xl font-semibold mb-4">Plan Your Route</h2>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="source-input" className="block text-sm font-medium text-gray-700 mb-1">
                    Starting Point
                  </label>
                  <input
                    id="source-input"
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Enter starting location"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="destination-input" className="block text-sm font-medium text-gray-700 mb-1">
                    Destination
                  </label>
                  <input
                    id="destination-input"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="Enter destination"
                    required
                  />
                </div>

                {/* Transit Mode Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transport Mode
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setTransitMode('WALKING')}
                      className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center ${transitMode === 'WALKING'
                          ? 'bg-amber-100 border-2 border-amber-500 text-amber-700'
                          : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M13 4v16M7 4v16M17 4v16" />
                      </svg>
                      Walking Routes
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransitMode('TRANSIT')}
                      className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center ${transitMode === 'TRANSIT'
                          ? 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                          : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 16v4.2a.8.8 0 0 0 .8.8h14.4a.8.8 0 0 0 .8-.8V16M4 12v-1.2a.8.8 0 0 1 .8-.8h14.4a.8.8 0 0 1 .8.8V12M2 12h20M10 16v4M14 16v4M10 2v10M14 2v10" />
                      </svg>
                      Metro/Bus Routes
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !source || !destination}
                  className={`w-full ${!loading && source && destination
                      ? 'bg-yellow-600 hover:bg-yellow-700'
                      : 'bg-gray-300 cursor-not-allowed'
                    } text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Finding Routes...
                    </>
                  ) : (
                    'Find Heat-Safe Routes'
                  )}
                </button>
              </form>
            </div>

            {/* Current Weather Information */}
            {weatherData && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">{t ? t('safeRoute.currentConditions.title') : 'Current Conditions'}</h2>

                <div className="flex items-center mb-4">
                  <img
                    src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`}
                    alt={weatherData.weather[0].description}
                    className="w-16 h-16 mr-2"
                  />
                  <div>
                    <p className="text-2xl font-bold">{Math.round(weatherData.main.temp)}°C</p>
                    <p className="text-gray-600 capitalize">{weatherData.weather[0].description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t ? t('safeRoute.currentConditions.feelsLike') : 'Feels Like'}</p>
                    <p className="font-medium">{Math.round(weatherData.main.feels_like)}°C</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t ? t('safeRoute.currentConditions.humidity') : 'Humidity'}</p>
                    <p className="font-medium">{weatherData.main.humidity}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t ? t('safeRoute.currentConditions.wind') : 'Wind'}</p>
                    <p className="font-medium">{Math.round(weatherData.wind.speed * 3.6)} km/h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t ? t('safeRoute.currentConditions.heatIndex') : 'Heat Index'}</p>
                    <p className="font-medium">{currentHeatIndex ? Math.round(currentHeatIndex) : "N/A"}°C</p>
                  </div>
                </div>

                {currentHeatIndex && (
                  <div className={`mt-4 p-3 rounded-lg border ${currentHeatIndex >= 105
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : currentHeatIndex >= 90
                        ? 'bg-orange-100 border-orange-300 text-orange-800'
                        : currentHeatIndex >= 80
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                          : 'bg-green-100 border-green-300 text-green-800'
                    }`}>
                    <p className="font-medium">
                      {currentHeatIndex >= 105
                        ? t ? t('safeRoute.currentConditions.danger') : 'Danger: Extreme heat conditions'
                        : currentHeatIndex >= 90
                          ? t ? t('safeRoute.currentConditions.warning') : 'Warning: High heat risk'
                          : currentHeatIndex >= 80
                            ? t ? t('safeRoute.currentConditions.caution') : 'Caution: Moderate heat risk'
                            : t ? t('safeRoute.currentConditions.low') : 'Low heat risk'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Heat Safety Recommendations */}
            {recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">{t ? t('safeRoute.tips.title') : 'Heat Safety Tips'}</h2>

                {/* Heat Risk Level Indicator */}
                {currentHeatIndex && (
                  <div className={`mb-4 p-3 rounded-lg border ${currentHeatIndex >= 105
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : currentHeatIndex >= 90
                        ? 'bg-orange-100 border-orange-300 text-orange-800'
                        : currentHeatIndex >= 80
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                          : 'bg-green-100 border-green-300 text-green-800'
                    }`}>
                    <p className="font-medium text-center">
                      {currentHeatIndex >= 105
                        ? t ? t('safeRoute.currentConditions.danger') : 'Danger: Extreme heat conditions'
                        : currentHeatIndex >= 90
                          ? t ? t('safeRoute.currentConditions.warning') : 'Warning: High heat risk'
                          : currentHeatIndex >= 80
                            ? t ? t('safeRoute.currentConditions.caution') : 'Caution: Moderate heat risk'
                            : t ? t('safeRoute.currentConditions.low') : 'Low heat risk'}
                    </p>
                  </div>
                )}

                {/* Organized Tips List */}
                <div className="grid grid-cols-1 gap-3">
                  {recommendations.map((tip, index) => (
                    <div key={index} className="flex items-start p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                      <div className="mr-3 mt-0.5 text-amber-600">
                        {index < 3 ? (
                          // Priority icon for first 3 tips
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : (
                          // Info icon for other tips
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <span className="text-gray-800">{tip}</span>
                    </div>
                  ))}
                </div>

                {/* Transit-specific tip for transit routes */}
                {selectedRoute !== null && alternativeRoutes[selectedRoute]?.type === 'TRANSIT' && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-blue-800 font-medium">
                      Transit routes offer better heat protection through air conditioning and reduced outdoor exposure.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Map and Routes */}
          <div className="lg:col-span-2">
            {/* Map Container */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div
                ref={mapRef}
                className="w-full h-96 rounded-lg"
                style={{ minHeight: "400px" }}
              ></div>
              
              {/* Heat Stroke Risk Overlay */}
              {map && weatherData && showHeatStrokeRisk && alternativeRoutes.length > 0 && (
                <RouteHeatStrokeRisk
                  routes={alternativeRoutes}
                  map={map}
                  weatherData={
                    weatherData
                      ? {
                          temp: weatherData.main?.temp,
                          tavg: (weatherData.main?.temp + weatherData.main?.feels_like) / 2,
                          tmin: weatherData.main?.temp_min,
                          humidity: weatherData.main?.humidity,
                          precipitation: weatherData.rain ? weatherData.rain['1h'] || 0 : 0,
                        }
                      : null
                  }
                  onRouteRiskCalculated={setRouteHeatStrokeRisks}
                />
              )}
            </div>

            {/* Route Alternatives */}
            {alternativeRoutes.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">{t ? t('safeRoute.routes.title') : 'Available Routes'}</h2>
                  <button
                    onClick={() => setShowHeatStrokeRisk(!showHeatStrokeRisk)}
                    className={`px-3 py-1 text-sm rounded-lg flex items-center ${
                      showHeatStrokeRisk 
                        ? 'bg-red-100 text-red-700 border border-red-300' 
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {showHeatStrokeRisk ? 'Hide' : 'Show'} Heat Stroke Risk
                  </button>
                </div>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {alternativeRoutes.map((route, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedRoute === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      onClick={() => selectRoute(index)}
                    >
                      {/* Route header with type icon */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium flex items-center">
                          {route.type === 'TRANSIT' && (
                            <span className="flex items-center mr-2">
                              {route.transitType === 'METRO' ? (
                                <svg className="w-5 h-5 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path d="M4 16v4.2a.8.8 0 0 0 .8.8h14.4a.8.8 0 0 0 .8-.8V16M4 12v-1.2a.8.8 0 0 1 .8-.8h14.4a.8.8 0 0 1 .8.8V12M2 12h20M10 16v4M14 16v4M10 2v10M14 2v10" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17h12m0 0l-4-4m4 4l-4 4" />
                                </svg>
                              )}
                              {route.transitType}
                            </span>
                          )}
                          Route {index + 1} {index === 0 ? ` (${route.type === 'WALKING' ? t ? t('safeRoute.routes.fastest') : "Fastest Walking" : "Fastest Transit"})` : ""}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getHeatRiskColor(route.heatExposureRisk)}`}>
                          {t ? t('safeRoute.routes.heatRisk') : 'Heat Risk'}: {route.heatExposureRisk}
                        </span>
                      </div>

                      {/* Route details grid */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div>
                          <p className="text-xs text-gray-500">{t ? t('safeRoute.routes.distance') : 'Distance'}</p>
                          <p className="font-medium">{route.distance}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t ? t('safeRoute.routes.time') : 'Est. Time'}</p>
                          <p className="font-medium">{route.duration}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{route.type === 'WALKING' ? t ? t('safeRoute.routes.shadeCoverage') : 'Shade Coverage' : 'Transit Type'}</p>
                          <p className="font-medium">
                            {route.type === 'WALKING' ? `${route.shadeCoverage}%` : route.transitType}
                          </p>
                        </div>
                      </div>

                      {/* Route details when selected */}
                      {selectedRoute === index && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium mb-2">{t ? t('safeRoute.routes.overview') : 'Route Overview'}:</p>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {route.type === 'TRANSIT' ? (
                              // Transit route details
                              route.transitDetails.map((transit, transitIndex) => (
                                <li key={transitIndex} className="flex items-start mb-3">
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5 text-white text-xs"
                                    style={{ backgroundColor: transit.color || '#1976D2' }}
                                  >
                                    {transitIndex + 1}
                                  </div>
                                  <div>
                                    <div className="font-medium" style={{ color: transit.color || '#1976D2' }}>
                                      {transit.line} {transit.shortName && `(${transit.shortName})`}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {transit.departureStop} ➝ {transit.arrivalStop} • {transit.numStops} stops
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Departs: {transit.departureTime} • Arrives: {transit.arrivalTime}
                                    </div>
                                  </div>
                                </li>
                              ))
                            ) : (
                              // Walking route details
                              route.steps.slice(0, 3).map((step, stepIndex) => (
                                <li key={stepIndex} className="flex items-start">
                                  <span className="inline-block bg-gray-200 text-gray-700 w-5 h-5 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">
                                    {stepIndex + 1}
                                  </span>
                                  <span dangerouslySetInnerHTML={{ __html: step.instructions }}></span>
                                </li>
                              ))
                            )}
                            {route.type === 'WALKING' && route.steps.length > 3 && (
                              <li className="text-xs text-gray-500 italic pl-7">
                                + {route.steps.length - 3} {t ? t('safeRoute.routes.moreSteps') : 'more steps'}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Heat Stroke Risk Analysis (separate section, margin for clarity) */}
            {routeHeatStrokeRisks.length > 0 && showHeatStrokeRisk && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Heat Stroke Risk Analysis
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  ML-powered predictions based on historical weather patterns and incident data
                </p>
                
                <div className="space-y-4">
                  {routeHeatStrokeRisks.map((routeRisk, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Route {routeRisk.routeIndex + 1}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 text-sm rounded-full ${
                            routeRisk.averageRisk < 0.3 ? 'bg-green-100 text-green-800' :
                            routeRisk.averageRisk < 0.6 ? 'bg-yellow-100 text-yellow-800' :
                            routeRisk.averageRisk < 0.8 ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {(routeRisk.averageRisk * 100).toFixed(1)}% Risk
                          </span>
                          <span className="text-sm text-gray-500">
                            {routeRisk.riskLevel.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Average Risk</p>
                          <p className="font-medium">{(routeRisk.averageRisk * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Maximum Risk</p>
                          <p className="font-medium">{(routeRisk.maxRisk * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                      
                      {routeRisk.highRiskSegments.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                          <div className="flex items-center mb-2">
                            <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-sm font-medium text-red-800">
                              {routeRisk.highRiskSegments.length} High-Risk Segments Detected
                            </span>
                          </div>
                          <p className="text-xs text-red-700">
                            These areas have historically shown higher rates of heat-related incidents
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Safety Recommendations:</h4>
                        <ul className="space-y-1">
                          {routeRisk.safetyRecommendations.slice(0, 3).map((rec, idx) => (
                            <li key={idx} className="flex items-start text-sm">
                              <span className="text-red-500 mr-2 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default SafeRoutePlanner;