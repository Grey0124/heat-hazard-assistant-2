import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, HeatmapLayer, Marker, InfoWindow, StandaloneSearchBox } from '@react-google-maps/api';
import axios from 'axios';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem'
};

// Center coordinates for India
const indiaCenter = { lat: 20.5937, lng: 78.9629 };

// Define libraries array outside component to prevent reloads
const GOOGLE_MAPS_LIBRARIES = ['visualization', 'places', 'routes'];

// Major cities in India with their coordinates
const indianCities = [
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Surat', lat: 21.1702, lng: 72.8311 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
  { name: 'Indore', lat: 22.7196, lng: 75.8577 },
  { name: 'Thane', lat: 19.2183, lng: 72.9781 },
  { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
  { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
  { name: 'Patna', lat: 25.5941, lng: 85.1376 },
  { name: 'Vadodara', lat: 22.3072, lng: 73.1812 },
  { name: 'Ghaziabad', lat: 28.6692, lng: 77.4538 },
  { name: 'Ludhiana', lat: 30.9010, lng: 75.8573 },
  { name: 'Agra', lat: 27.1767, lng: 78.0081 },
  { name: 'Nashik', lat: 19.9975, lng: 73.7898 },
  { name: 'Ranchi', lat: 23.3441, lng: 85.3096 },
  { name: 'Faridabad', lat: 28.4089, lng: 77.3178 },
  { name: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
  { name: 'Srinagar', lat: 34.0837, lng: 74.7973 },
  { name: 'Amritsar', lat: 31.6340, lng: 74.8723 },
  { name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366 },
  { name: 'Guwahati', lat: 26.1445, lng: 91.7362 }
];

const HeatMapDisplay = ({ currentLocation, heatIndex, weatherData }) => {
  const [map, setMap] = useState(null);
  const [heatMapData, setHeatMapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityWeatherData, setCityWeatherData] = useState({});
  const [selectedFilter, setSelectedFilter] = useState('temperature'); // 'temperature', 'humidity', 'heatIndex'
  const [coolingCenters, setCoolingCenters] = useState([]);
  const [searchBox, setSearchBox] = useState(null);
  const [searchResult, setSearchResult] = useState(null);

  // Get API key from environment variables or use a default for development
  const apiKey = "AIzaSyD0pKwxjGQvmdWgTAMOUVb-qgqpoXTJ5P0"; // Replace with your actual API key or env variable
  const weatherApiKey = "c7438fac71c1c9abdd58c30073620321"; // Replace with your actual API key

  // Load the Google Maps JS API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  // Fetch real-time weather data for major cities
  useEffect(() => {
    if (!isLoaded) return;

    const fetchWeatherData = async () => {
      setIsLoading(true);
      const weatherResults = {};
      const weatherPromises = indianCities.slice(0, 15).map(async (city) => {
        try {
          const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lng}&units=metric&appid=${weatherApiKey}`
          );

          weatherResults[city.name] = {
            temperature: response.data.main.temp,
            humidity: response.data.main.humidity,
            feelsLike: response.data.main.feels_like,
            description: response.data.weather[0].description,
            icon: response.data.weather[0].icon,
            windSpeed: response.data.wind.speed,
            // Calculate heat index - simplified version
            heatIndex: calculateHeatIndex(response.data.main.temp, response.data.main.humidity)
          };
        } catch (error) {
          console.error(`Error fetching weather for ${city.name}:`, error);
        }
      });

      // Wait for all API calls to complete
      await Promise.all(weatherPromises);
      setCityWeatherData(weatherResults);

      // Generate heat map data based on actual weather data
      generateHeatMapData(weatherResults);
    };

    // Fetch initial data
    fetchWeatherData();

    // Set up interval to refresh data every 30 minutes
    const intervalId = setInterval(() => {
      fetchWeatherData();
    }, 30 * 60 * 1000); // 30 minutes

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [isLoaded, weatherApiKey, selectedFilter]);

  // Calculate heat index based on temperature and humidity
  const calculateHeatIndex = (temperature, humidity) => {
    // Simple heat index calculation formula
    if (temperature < 27) return temperature; // Below 27°C, heat index equals temperature

    // Simplified heat index formula (Celsius)
    const T = temperature;
    const RH = humidity;

    let heatIndex = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094));

    if (heatIndex > 25) {
      // More accurate formula for higher temperatures
      heatIndex = -8.784695 + 1.61139411 * T + 2.338549 * RH - 0.14611605 * T * RH
        - 0.012308094 * T * T - 0.016424828 * RH * RH
        + 0.002211732 * T * T * RH + 0.00072546 * T * RH * RH
        - 0.000003582 * T * T * RH * RH;
    }

    return Math.round(heatIndex * 10) / 10; // Round to 1 decimal place
  };

  // Generate heat map data based on weather data
  const generateHeatMapData = (weatherResults) => {
    if (Object.keys(weatherResults).length === 0) {
      // If no real data available, fallback to simulation
      generateSimulatedHeatMapData();
      return;
    }

    const points = [];

    // Add points for cities with real data
    indianCities.forEach(city => {
      const cityData = weatherResults[city.name];

      if (cityData) {
        // Use actual data from API
        let weightValue;

        switch (selectedFilter) {
          case 'humidity':
            // Scale humidity (0-100%) to our weight range (0-10)
            weightValue = cityData.humidity / 10;
            break;
          case 'heatIndex':
            // Scale heat index (typically 15-50°C) to our weight range
            weightValue = (cityData.heatIndex - 15) / 35 * 10;
            break;
          case 'temperature':
          default:
            // Scale temperature (typically 15-45°C) to our weight range
            weightValue = (cityData.temperature - 15) / 30 * 10;
            break;
        }

        // Ensure weight is in valid range
        weightValue = Math.max(0, Math.min(10, weightValue));

        points.push({
          location: new window.google.maps.LatLng(city.lat, city.lng),
          weight: weightValue
        });

        // Add additional points around the city for smoother heat map
        for (let i = 0; i < 5; i++) {
          const radiusKm = 30 + (Math.random() * 30); // 30-60km
          const angle = Math.random() * Math.PI * 2; // Random angle

          // Calculate offset
          const latOffset = (radiusKm / 111) * Math.cos(angle);
          const lngOffset = (radiusKm / (111 * Math.cos(city.lat * Math.PI / 180))) * Math.sin(angle);

          // Small variation in value
          const variation = (Math.random() * 1.0) - 0.5; // -0.5 to +0.5

          points.push({
            location: new window.google.maps.LatLng(city.lat + latOffset, city.lng + lngOffset),
            weight: Math.max(0, Math.min(10, weightValue + variation))
          });
        }
      } else {
        // Fallback for cities without real data
        // Estimate based on latitude and neighboring cities with data
        const nearestCitiesWithData = Object.keys(weatherResults)
          .map(cityName => {
            const cityWithData = indianCities.find(c => c.name === cityName);
            if (!cityWithData) return null;

            const distance = Math.sqrt(
              Math.pow(city.lat - cityWithData.lat, 2) +
              Math.pow(city.lng - cityWithData.lng, 2)
            );

            return { name: cityName, distance };
          })
          .filter(Boolean)
          .sort((a, b) => a.distance - b.distance);

        if (nearestCitiesWithData.length > 0) {
          // Use weighted average of 3 nearest cities
          const nearestCity = weatherResults[nearestCitiesWithData[0].name];

          let weightValue;
          switch (selectedFilter) {
            case 'humidity':
              weightValue = nearestCity.humidity / 10;
              break;
            case 'heatIndex':
              weightValue = (nearestCity.heatIndex - 15) / 35 * 10;
              break;
            case 'temperature':
            default:
              weightValue = (nearestCity.temperature - 15) / 30 * 10;
              break;
          }

          // Add variation based on latitude difference
          const latDiff = city.lat - indianCities.find(c => c.name === nearestCitiesWithData[0].name).lat;
          // Adjust by latitude (north is generally cooler)
          weightValue -= latDiff * 0.3;

          // Ensure weight is in valid range
          weightValue = Math.max(0, Math.min(10, weightValue));

          points.push({
            location: new window.google.maps.LatLng(city.lat, city.lng),
            weight: weightValue
          });
        }
      }
    });

    // Add more interpolated points across India for better coverage
    for (let i = 0; i < 200; i++) {
      // Random coordinates within India's approximate bounds
      const lat = 8 + (Math.random() * 26); // 8N to 34N
      const lng = 68 + (Math.random() * 20); // 68E to 88E

      // Simple check to roughly stay within India's land mass
      if (
        (lat < 15 && lng < 74) || // Exclude Arabian Sea
        (lat > 32 && lng > 78) || // Exclude Himalayas/Tibet
        (lat < 10 && lng > 85)    // Exclude Bay of Bengal
      ) {
        continue; // Skip this point
      }

      // Find 3 nearest cities with data for interpolation
      const distances = indianCities.map(city => ({
        city,
        distance: Math.sqrt(Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2))
      })).sort((a, b) => a.distance - b.distance).slice(0, 3);

      // Calculate weighted average based on inverse distance
      let totalWeight = 0;
      let valueSum = 0;

      distances.forEach(({ city, distance }) => {
        if (weatherResults[city.name]) {
          const inverseDistance = 1 / Math.max(0.01, distance);
          totalWeight += inverseDistance;

          let value;
          switch (selectedFilter) {
            case 'humidity':
              value = weatherResults[city.name].humidity / 10;
              break;
            case 'heatIndex':
              value = (weatherResults[city.name].heatIndex - 15) / 35 * 10;
              break;
            case 'temperature':
            default:
              value = (weatherResults[city.name].temperature - 15) / 30 * 10;
              break;
          }

          valueSum += value * inverseDistance;
        }
      });

      if (totalWeight > 0) {
        const interpolatedValue = valueSum / totalWeight;

        // Add small random variation
        const variation = (Math.random() * 0.6) - 0.3; // -0.3 to +0.3

        points.push({
          location: new window.google.maps.LatLng(lat, lng),
          weight: Math.max(0, Math.min(10, interpolatedValue + variation))
        });
      }
    }

    setHeatMapData(points);
    setIsLoading(false);

    // Generate cooling centers based on areas with high heat index
    generateCoolingCenters(points, weatherResults);
  };

  // Fallback to simulated data if real data isn't available
  const generateSimulatedHeatMapData = () => {
    const points = [];
    const month = new Date().getMonth(); // 0-11 (Jan-Dec)
    const isSummer = month >= 3 && month <= 8; // Apr-Sep

    // Generate heat data for major cities
    indianCities.forEach(city => {
      // Base temperature calculation (southern cities are hotter)
      let baseTemp = 35 - (city.lat - 8) * 0.5; // Ranges roughly from 20°C to 40°C

      // Seasonal adjustment
      if (isSummer) {
        baseTemp += 5; // Hotter in summer
      } else {
        baseTemp -= 5; // Cooler in winter
      }

      // Geographic adjustments
      // Coastal cities are cooler
      const isCoastal = (
        city.name === 'Mumbai' ||
        city.name === 'Chennai' ||
        city.name === 'Visakhapatnam' ||
        city.name === 'Thiruvananthapuram' ||
        city.name === 'Surat'
      );

      // Mountain cities are cooler
      const isMountain = (
        city.name === 'Srinagar' ||
        city.name === 'Shimla' ||
        city.name === 'Dehradun'
      );

      if (isCoastal) baseTemp -= 3;
      if (isMountain) baseTemp -= 8;

      // Add slight randomness
      baseTemp += (Math.random() * 6) - 3;

      // Ensure temperature is in a reasonable range
      baseTemp = Math.max(15, Math.min(48, baseTemp));

      // Calculate heat intensity (weight)
      const heatIntensity = (baseTemp - 15) / 30 * 10; // Scale to 0-10 range

      points.push({
        location: new window.google.maps.LatLng(city.lat, city.lng),
        weight: heatIntensity
      });

      // Add data points around major cities
      for (let i = 0; i < 5; i++) {
        const radiusKm = 50 + (Math.random() * 50); // 50-100km
        const angle = Math.random() * Math.PI * 2; // Random angle

        // Calculate offset (approximate)
        const latOffset = (radiusKm / 111) * Math.cos(angle);
        const lngOffset = (radiusKm / (111 * Math.cos(city.lat * Math.PI / 180))) * Math.sin(angle);

        // Small variation in temperature
        const tempVariation = (Math.random() * 2) - 1; // -1 to +1
        const surroundingHeatIntensity = heatIntensity + tempVariation;

        points.push({
          location: new window.google.maps.LatLng(city.lat + latOffset, city.lng + lngOffset),
          weight: Math.max(0, surroundingHeatIntensity)
        });
      }
    });

    // Add more random points across India for better coverage
    for (let i = 0; i < 150; i++) {
      // Random coordinates within India's approximate bounds
      const lat = 8 + (Math.random() * 26); // 8N to 34N
      const lng = 68 + (Math.random() * 20); // 68E to 88E

      // Simple check to roughly stay within India's land mass
      if (
        (lat < 15 && lng < 74) || // Exclude Arabian Sea
        (lat > 32 && lng > 78) || // Exclude Himalayas/Tibet
        (lat < 10 && lng > 85)    // Exclude Bay of Bengal
      ) {
        continue; // Skip this point
      }

      // Base temperature calculation
      let baseTemp = 35 - (lat - 8) * 0.5;

      // Seasonal adjustment
      if (isSummer) {
        baseTemp += 5;
      } else {
        baseTemp -= 5;
      }

      // Add randomness
      baseTemp += (Math.random() * 8) - 4;

      // Calculate heat intensity
      const heatIntensity = Math.max(0, (baseTemp - 15) / 30 * 10);

      points.push({
        location: new window.google.maps.LatLng(lat, lng),
        weight: heatIntensity
      });
    }

    setHeatMapData(points);
    setIsLoading(false);
  };

  // Generate cooling centers based on heat data
  const generateCoolingCenters = (heatPoints, weatherData) => {
    // Find areas with high heat index to place cooling centers
    const highHeatAreas = heatPoints
      .filter(point => point.weight > 7) // Only consider points with high heat values
      .slice(0, 15); // Limit to maximum 15 cooling centers

    // Generate cooling centers based on high heat points but offset slightly
    const centers = highHeatAreas.map((point, index) => {
      // Extract coordinates from the LatLng object
      const lat = point.location.lat();
      const lng = point.location.lng();

      // Find nearest city for naming
      const distances = indianCities.map(city => ({
        city,
        distance: Math.sqrt(Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2))
      })).sort((a, b) => a.distance - b.distance);

      const nearestCity = distances[0].city;

      // Get either actual or estimated temperature for this location
      let temperature = 30; // Default fallback
      if (weatherData[nearestCity.name]) {
        temperature = weatherData[nearestCity.name].temperature;
      }

      // Slightly offset the cooling center location from the heat point
      const offsetLat = lat + (Math.random() * 0.04) - 0.02;
      const offsetLng = lng + (Math.random() * 0.04) - 0.02;

      return {
        id: `cooling-center-${index}`,
        position: { lat: offsetLat, lng: offsetLng },
        name: `${nearestCity.name} Cooling Center`,
        address: `Near ${nearestCity.name} Central Area`,
        temperature: temperature,
        facilities: [
          'Air Conditioning',
          'Drinking Water',
          'Medical Assistance',
          'Resting Area'
        ].filter(() => Math.random() > 0.3), // Randomly include facilities
        hours: '9:00 AM - 8:00 PM',
        isFree: true
      };
    });

    setCoolingCenters(centers);
  };

  // Initialize search box functionality
  const onLoadSearchBox = (ref) => {
    setSearchBox(ref);
  };

  // Handle place selection from search box
  const onPlacesChanged = () => {
    if (searchBox) {
      const places = searchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];

        if (place.geometry && place.geometry.location) {
          // Center map on search result
          if (map) {
            map.panTo({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            });
            map.setZoom(13);
          }

          // Save search result for display
          setSearchResult({
            name: place.name,
            address: place.formatted_address,
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            }
          });

          // Find nearest Indian city to search location
          const distances = indianCities.map(city => ({
            city,
            distance: Math.sqrt(
              Math.pow(place.geometry.location.lat() - city.lat, 2) +
              Math.pow(place.geometry.location.lng() - city.lng, 2)
            )
          })).sort((a, b) => a.distance - b.distance);

          // If we have weather data for the nearest city, select it
          if (distances.length > 0 && cityWeatherData[distances[0].city.name]) {
            setSelectedCity({
              ...distances[0].city,
              ...cityWeatherData[distances[0].city.name]
            });
          }
        }
      }
    }
  };

  // Set up map when loaded
  const onLoad = useCallback(function callback(map) {
    // Set map bounds to cover all of India
    const indiaBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(8.0, 68.0),  // SW corner
      new window.google.maps.LatLng(37.0, 97.0)  // NE corner
    );
    map.fitBounds(indiaBounds);
    setMap(map);
  }, []);

  // Clean up on unmount
  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  // Get color gradient based on selected filter
  const getGradient = () => {
    switch (selectedFilter) {
      case 'humidity':
        // Humidity gradient (blues)
        return [
          'rgba(0, 255, 255, 0)',   // transparent
          'rgba(240, 248, 255, 0.3)', // aliceblue (low)
          'rgba(173, 216, 230, 0.5)', // lightblue
          'rgba(135, 206, 235, 0.6)', // skyblue
          'rgba(0, 191, 255, 0.7)',   // deepskyblue
          'rgba(30, 144, 255, 0.8)',  // dodgerblue
          'rgba(0, 0, 255, 0.9)',     // blue
          'rgba(0, 0, 139, 1.0)'      // darkblue (high)
        ];
      case 'heatIndex':
        // Heat index gradient (reds, oranges, yellows - more pronounced)
        return [
          'rgba(0, 255, 255, 0)',   // transparent
          'rgba(255, 255, 224, 0.3)', // lightyellow
          'rgba(255, 255, 0, 0.5)',   // yellow
          'rgba(255, 165, 0, 0.6)',   // orange
          'rgba(255, 69, 0, 0.7)',    // orangered
          'rgba(255, 0, 0, 0.8)',     // red
          'rgba(139, 0, 0, 0.9)',     // darkred
          'rgba(128, 0, 0, 1.0)'      // maroon (very high)
        ];
      case 'temperature':
      default:
        // Temperature gradient
        const month = new Date().getMonth();
        const isSummer = month >= 3 && month <= 8;

        if (isSummer) {
          // Summer gradient (more reds and oranges)
          return [
            'rgba(0, 255, 255, 0)',   // transparent
            'rgba(0, 255, 128, 0.3)', // light green (cool)
            'rgba(173, 255, 47, 0.5)', // greenyellow
            'rgba(255, 255, 0, 0.6)', // yellow (moderate)
            'rgba(255, 165, 0, 0.7)', // orange (warm)
            'rgba(255, 69, 0, 0.8)',  // orangered
            'rgba(255, 0, 0, 0.9)',   // red (hot)
            'rgba(139, 0, 0, 1.0)'    // darkred (very hot)
          ];
        } else {
          // Winter gradient (more blues and greens)
          return [
            'rgba(0, 255, 255, 0)',   // transparent
            'rgba(0, 0, 255, 0.3)',   // blue (cold)
            'rgba(0, 191, 255, 0.5)', // deepskyblue
            'rgba(0, 255, 255, 0.6)', // cyan
            'rgba(0, 255, 128, 0.7)', // springgreen
            'rgba(173, 255, 47, 0.8)', // greenyellow
            'rgba(255, 255, 0, 0.9)', // yellow (warm)
            'rgba(255, 165, 0, 1.0)'  // orange (hot for winter)
          ];
        }
    }
  };

  // Function to add current location marker if available
  const renderCurrentLocationMarker = () => {
    if (!currentLocation) return null;

    return (
      <Marker
        position={{
          lat: currentLocation.latitude,
          lng: currentLocation.longitude
        }}
        title="Your Location"
        icon={{
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        }}
      />
    );
  };

  // Render markers for each city with temperature data
  const renderCityMarkers = () => {
    return indianCities.filter(city => cityWeatherData[city.name]).map(city => {
      const data = cityWeatherData[city.name];
      const isSelected = selectedCity && selectedCity.name === city.name;

      // Skip rendering this marker if selectedCity is this city
      // This avoids having both a regular marker and an info window marker
      if (isSelected) return null;

      return (
        <Marker
          key={`marker-${city.name}`}
          position={{ lat: city.lat, lng: city.lng }}
          title={city.name}
          icon={{
            url: `https://openweathermap.org/img/wn/${data.icon}.png`,
            scaledSize: new window.google.maps.Size(30, 30)
          }}
          onClick={() => setSelectedCity({ ...city, ...data })}
        />
      );
    });
  };

  // Render cooling center markers
  const renderCoolingCenters = () => {
    return coolingCenters.map(center => (
      <Marker
        key={center.id}
        position={center.position}
        title={center.name}
        icon={{
          path: "M19.649,5.286L14,8.548V2.025h-4v6.523L4.351,5.286L2,8.196l7,4.9v8.879h6v-8.879l7-4.9L19.649,5.286z",
          fillColor: '#03A9F4',
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 1,
          scale: 1.2,
          anchor: new window.google.maps.Point(12, 24)
        }}
        onClick={() => setSelectedCity({
          name: center.name,
          lat: center.position.lat,
          lng: center.position.lng,
          isCoolingCenter: true,
          ...center
        })}
      />
    ));
  };

  // Loading indicator
  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Search Box */}
      <div className="absolute top-2 right-14 z-10 w-64">
        {isLoaded && (
          <StandaloneSearchBox
            onLoad={onLoadSearchBox}
            onPlacesChanged={onPlacesChanged}
          >
            <input
              type="text"
              placeholder="Search location..."
              className="w-full p-3 text-sm focus:outline-none bg-white rounded-lg shadow-md"
            />
          </StandaloneSearchBox>
        )}
      </div>

      {/* Filter Controls */}
      {/* <div className="absolute top-3 right-14 z-10 bg-white rounded-lg shadow-md p-2 flex gap-2">
        <button
          onClick={() => setSelectedFilter('temperature')}
          className={`px-3 py-1 text-xs rounded-full ${selectedFilter === 'temperature'
            ? 'bg-orange-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Temperature
        </button>
        <button
          onClick={() => setSelectedFilter('humidity')}
          className={`px-3 py-1 text-xs rounded-full ${selectedFilter === 'humidity'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Humidity
        </button>
        <button
          onClick={() => setSelectedFilter('heatIndex')}
          className={`px-3 py-1 text-xs rounded-full ${selectedFilter === 'heatIndex'
            ? 'bg-red-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Heat Index
        </button>
      </div> */}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={indiaCenter}
        zoom={5}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            // Custom map styles to enhance visualization
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#e9e9e9" }, { lightness: 17 }]
            },
            {
              featureType: "landscape",
              elementType: "geometry",
              stylers: [{ color: "#f5f5f5" }, { lightness: 20 }]
            },
            {
              featureType: "poi.park",
              elementType: "geometry",
              stylers: [{ color: "#BDEAC3" }, { lightness: 21 }]
            }
          ]
        }}
      >
        {/* Heat map layer */}
        {heatMapData.length > 0 && (
          <HeatmapLayer
            data={heatMapData}
            options={{
              radius: 45,
              opacity: 0.7,
              maxIntensity: 10,
              gradient: getGradient(),
              dissipating: true
            }}
          />
        )}

        {/* City markers with weather data */}
        {renderCityMarkers()}

        {/* Cooling center markers */}
        {renderCoolingCenters()}

        {/* Current location marker */}
        {renderCurrentLocationMarker()}

        {/* Search result marker */}
        {searchResult && (
          <Marker
            position={searchResult.location}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#673AB7',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2
            }}
            title={searchResult.name}
          />
        )}

        {/* Selected city info window */}
        {selectedCity && (
          <InfoWindow
            position={{ lat: selectedCity.lat, lng: selectedCity.lng }}
            onCloseClick={() => setSelectedCity(null)}
          >
            <div className="w-lg p-4 bg-white rounded-lg shadow-md">
              {selectedCity.isCoolingCenter ? (
                <div>
                  <h3 className="font-semibold text-lg text-blue-600">{selectedCity.name}</h3>
                  <p className="text-sm mb-2">{selectedCity.address}</p>
                  <div className="mb-2 flex items-center">
                    <span className="text-sm font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Cooling Center
                    </span>
                    <span className="ml-2 text-sm text-gray-600">
                      Hours: {selectedCity.hours}
                    </span>
                  </div>

                  <div className="mb-2">
                    <p className="text-sm font-semibold">Facilities Available:</p>
                    <ul className="text-sm ml-4 mt-1 list-disc">
                      {selectedCity.facilities.map((facility, index) => (
                        <li key={index}>{facility}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-sm">
                    <p className="text-sm font-semibold">Current Temperature:</p>
                    <p>{selectedCity.temperature ? `${selectedCity.temperature}°C` : 'Data not available'}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-lg">{selectedCity.name}</h3>

                  <div className="flex items-start mt-2">
                    <img
                      src={`https://openweathermap.org/img/wn/${selectedCity.icon}@2x.png`}
                      alt={selectedCity.description}
                      className="w-12 h-12 mr-2"
                    />
                    <div>
                      <p className="font-semibold text-2xl">{Math.round(selectedCity.temperature)}°C</p>
                      <p className="text-sm capitalize">{selectedCity.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Feels Like</p>
                      <p className="font-medium">{Math.round(selectedCity.feelsLike)}°C</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Humidity</p>
                      <p className="font-medium">{selectedCity.humidity}%</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Wind</p>
                      <p className="font-medium">{Math.round(selectedCity.windSpeed * 3.6)} km/h</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Heat Index</p>
                      <p className="font-medium">{selectedCity.heatIndex}°C</p>
                    </div>
                  </div>

                  <div className={`mt-3 p-2 rounded ${selectedCity.heatIndex >= 41 ? 'bg-red-100 text-red-800' :
                      selectedCity.heatIndex >= 32 ? 'bg-orange-100 text-orange-800' :
                        selectedCity.heatIndex >= 27 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                    }`}>
                    <p className="text-sm font-medium">
                      {selectedCity.heatIndex >= 41 ? 'Extreme Danger: Heat stroke likely' :
                        selectedCity.heatIndex >= 32 ? 'Danger: Heat cramps or exhaustion likely' :
                          selectedCity.heatIndex >= 27 ? 'Caution: Fatigue possible with prolonged exposure' :
                            'Safe: Little or no discomfort'}
                    </p>
                  </div>

                  {coolingCenters.length > 0 && (
                    <button
                      className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-1.5 px-2 rounded"
                      onClick={() => {
                        // Find nearest cooling center
                        const nearest = coolingCenters
                          .map(center => ({
                            center,
                            distance: Math.sqrt(
                              Math.pow(selectedCity.lat - center.position.lat, 2) +
                              Math.pow(selectedCity.lng - center.position.lng, 2)
                            )
                          }))
                          .sort((a, b) => a.distance - b.distance)[0];

                        if (nearest) {
                          setSelectedCity({
                            name: nearest.center.name,
                            lat: nearest.center.position.lat,
                            lng: nearest.center.position.lng,
                            isCoolingCenter: true,
                            ...nearest.center
                          });

                          // Center map on cooling center
                          map.panTo(nearest.center.position);
                        }
                      }}
                    >
                      Find Nearest Cooling Center
                    </button>
                  )}
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-20">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mb-4"></div>
            <p className="text-blue-600 font-medium">Loading real-time weather data...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-1 left-2 bg-white p-3 rounded-lg shadow-md z-10 max-w-xs">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-sm mr-3">
            {selectedFilter === 'temperature' ? 'Temperature' :
              selectedFilter === 'humidity' ? 'Humidity' : 'Heat Index'}
          </h4>
          <button
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
            onClick={() => {
              const newFilter = selectedFilter === 'temperature' ? 'humidity' :
                selectedFilter === 'humidity' ? 'heatIndex' : 'temperature';
              setSelectedFilter(newFilter);
            }}
          >
            Change View
          </button>
        </div>

        {selectedFilter === 'temperature' && (
          <>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-blue-400"></div>
              <span className="text-xs">Cool (15-20°C)</span>
            </div>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-green-400"></div>
              <span className="text-xs">Mild (20-25°C)</span>
            </div>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-yellow-400"></div>
              <span className="text-xs">Warm (25-30°C)</span>
            </div>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-orange-400"></div>
              <span className="text-xs">Hot (30-35°C)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-red-600"></div>
              <span className="text-xs">Very Hot (35°C+)</span>
            </div>
          </>
        )}

        {selectedFilter === 'humidity' && (
          <>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-blue-100"></div>
              <span className="text-xs">Low (0-20%)</span>
            </div>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-blue-300"></div>
              <span className="text-xs">Moderate (20-40%)</span>
            </div>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-blue-500"></div>
              <span className="text-xs">Medium (40-60%)</span>
            </div>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-blue-700"></div>
              <span className="text-xs">High (60-80%)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-900"></div>
              <span className="text-xs">Very High (80-100%)</span>
            </div>
          </>
        )}

        {selectedFilter === 'heatIndex' && (
          <>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-green-400"></div>
              <span className="text-xs">Safe (15-27°C)</span>
            </div>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-yellow-400"></div>
              <span className="text-xs">Caution (27-32°C)</span>
            </div>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-orange-400"></div>
              <span className="text-xs">Danger (32-41°C)</span>
            </div>
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-4 h-4 bg-red-600"></div>
              <span className="text-xs">Extreme Danger (41°C+)</span>
            </div>
          </>
        )}

        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center space-x-1 mb-1">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Weather Data Points</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M19.649,5.286L14,8.548V2.025h-4v6.523L4.351,5.286L2,8.196l7,4.9v8.879h6v-8.879l7-4.9L19.649,5.286z" />
            </svg>
            <span className="text-xs">Cooling Centers</span>
          </div>
        </div>
      </div>

      {/* Info box with tips based on current conditions */}
      {/* <div className="absolute bottom-1 left-2 bg-white p-3 rounded-lg shadow-md z-10 max-w-xs">
        <h4 className="font-semibold text-sm mb-1">Heat Safety Tips</h4>
        <div className="text-xs space-y-2">
          {heatMapData.length > 0 && (
            <>
              {selectedFilter === 'heatIndex' && (
                <p className="text-red-600 font-medium">
                  Areas in red indicate extreme heat risk. Avoid outdoor activities in these regions.
                </p>
              )}
              <p>• Stay hydrated by drinking water regularly</p>
              <p>• Wear lightweight, light-colored clothing</p>
              <p>• Seek shade during peak sun hours (10am-4pm)</p>
              <p>• Use sunscreen with SPF 30 or higher</p>
              <p className="italic">Click on city markers for detailed weather information and to find nearby cooling centers.</p>
            </>
          )}
        </div>
      </div> */}
    </div>
  );
};

export default HeatMapDisplay;