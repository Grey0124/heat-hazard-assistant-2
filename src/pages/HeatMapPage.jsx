// src/pages/HeatMapPage.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useNavigate, Link } from 'react-router-dom';
import HeatMapDisplay from '../components/map/HeatMapDisplay';

const HeatMapPage = () => {
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [heatIndex, setHeatIndex] = useState(null);
  const [locationName, setLocationName] = useState('');

  // Get user's current location when the component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          // Get the location name from reverse geocoding
          fetchLocationName(latitude, longitude);
          fetchWeatherData(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to retrieve your location. Please enter it manually.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  }, []);

  // Function to fetch location name from coordinates
  const fetchLocationName = async (latitude, longitude) => {
    try {
      const apiKey = 'c7438fac71c1c9abdd58c30073620321';
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('Unable to fetch location name');
      }

      const data = await response.json();
      if (data.length > 0) {
        const placeName = data[0].name;
        const countryName = data[0].country;
        setLocationName(`${placeName}, ${countryName}`);
      }
    } catch (error) {
      console.error('Error fetching location name:', error);
      // No need to set error state here as this is not critical
    }
  };

  // Function to fetch weather data from OpenWeather API
  const fetchWeatherData = async (latitude, longitude) => {
    try {
      const apiKey = 'c7438fac71c1c9abdd58c30073620321';
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
      );

      if (!response.ok) {
        // Use mock data if API fails in development
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Using mock weather data for development');
          const mockData = {
            main: {
              temp: 28.5,
              humidity: 65,
              feels_like: 30.2,
              temp_min: 26.8,
              temp_max: 31.2,
              pressure: 1012
            },
            weather: [
              {
                id: 800,
                main: "Clear",
                description: "clear sky",
                icon: "01d"
              }
            ],
            wind: {
              speed: 3.6,
              deg: 160
            },
            name: locationName || "Current Location"
          };

          setWeatherData(mockData);
          calculateHeatIndex(mockData.main.temp, mockData.main.humidity);
          setLoading(false);
          return;
        }
        throw new Error('Weather data not available');
      }

      const data = await response.json();
      setWeatherData(data);

      // If we got a location name from the weather data and don't have one yet
      if (data.name && !locationName) {
        setLocationName(data.name);
      }

      // Calculate heat index based on temperature and humidity
      if (data.main) {
        const temp = data.main.temp;
        const humidity = data.main.humidity;

        // Basic heat index calculation
        calculateHeatIndex(temp, humidity);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setError('Failed to fetch weather data. Please try again later.');
      setLoading(false);
    }
  };

  // Calculate heat index (simplified version)
  const calculateHeatIndex = (temperature, humidity) => {
    // Convert from Celsius to Fahrenheit for the standard heat index formula
    const tempF = (temperature * 9 / 5) + 32;

    // Simplified heat index calculation
    let heatIndexF = 0.5 * (tempF + 61.0 + ((tempF - 68.0) * 1.2) + (humidity * 0.094));

    if (heatIndexF > 79) {
      // More precise calculation for higher temperatures
      heatIndexF = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity
        - 0.22475541 * tempF * humidity - 6.83783e-3 * tempF * tempF
        - 5.481717e-2 * humidity * humidity + 1.22874e-3 * tempF * tempF * humidity
        + 8.5282e-4 * tempF * humidity * humidity - 1.99e-6 * tempF * tempF * humidity * humidity;
    }

    // Convert back to Celsius
    const heatIndexC = (heatIndexF - 32) * 5 / 9;

    // Determine risk level
    let riskLevel = 'Low';
    if (heatIndexC > 40) {
      riskLevel = 'Extreme Danger';
    } else if (heatIndexC > 32) {
      riskLevel = 'Danger';
    } else if (heatIndexC > 27) {
      riskLevel = 'Caution';
    }

    setHeatIndex({
      value: heatIndexC.toFixed(1),
      fahrenheit: heatIndexF.toFixed(1),
      riskLevel
    });
  };

  // Handle manual location search
  const handleLocationSearch = async (e) => {
    e.preventDefault();

    if (!location.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Use geocoding API to get coordinates from location name
      const apiKey = 'c7438fac71c1c9abdd58c30073620321';
      const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;

      const response = await fetch(geocodeUrl);
      if (!response.ok) {
        throw new Error('Location not found');
      }

      const data = await response.json();

      if (data.length === 0) {
        setError('Location not found. Please try another search term.');
        setLoading(false);
        return;
      }

      const { lat, lon, name, country } = data[0];
      console.log(`Found location: ${name}, ${country} at ${lat},${lon}`);

      // Store the location name
      setLocationName(`${name}${country ? `, ${country}` : ''}`);

      // Now fetch weather for this location
      await fetchWeatherData(lat, lon);

      // Clear the search field
      setLocation('');
    } catch (err) {
      console.error('Error searching location:', err);
      setError('Failed to find location. Please try another search term.');
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-navy-900">Heat Map</h1>
        </div>

        {/* Location search */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <form onSubmit={handleLocationSearch} className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter a location (e.g., Bangalore, Mumbai)"
              className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-600"
            />
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              Search
            </button>
          </form>
        </div>

        {/* Weather and heat risk information */}
        {loading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : weatherData && heatIndex ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Current weather */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-semibold mb-2">Current Weather</h2>
                <p className="text-gray-600 mb-4">{locationName || 'Current Location'}</p>
                <div className="flex items-center mb-4">
                  {weatherData.weather && weatherData.weather[0] && (
                    <img
                      src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`}
                      alt={weatherData.weather[0].description}
                      className="w-16 h-16 mr-4"
                    />
                  )}
                  <div>
                    <p className="text-4xl font-bold">{weatherData.main.temp}°C</p>
                    <p className="text-gray-600 capitalize">
                      {weatherData.weather && weatherData.weather[0] && weatherData.weather[0].description}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500">Humidity</p>
                    <p className="text-xl font-semibold">{weatherData.main.humidity}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Wind</p>
                    <p className="text-xl font-semibold">{weatherData.wind.speed} m/s</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Heat risk assessment */}
            <div className={`bg-white rounded-lg shadow-md overflow-hidden`}>
              <div className={`p-1 ${heatIndex.riskLevel === 'Extreme Danger' ? 'bg-red-600' :
                heatIndex.riskLevel === 'Danger' ? 'bg-red-500' :
                  heatIndex.riskLevel === 'Caution' ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
              <div className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Heat Risk Assessment</h2>
                <div className="mb-4">
                  <p className="text-gray-500">Heat Index</p>
                  <p className="text-4xl font-bold">{heatIndex.value}°C / {heatIndex.fahrenheit}°F</p>
                </div>
                <div className="mb-4">
                  <p className="text-gray-500">Risk Level</p>
                  <p className={`text-2xl font-bold ${heatIndex.riskLevel === 'Extreme Danger' ? 'text-red-600' :
                    heatIndex.riskLevel === 'Danger' ? 'text-red-500' :
                      heatIndex.riskLevel === 'Caution' ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                    {heatIndex.riskLevel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p>Enter a location to view heat risk information.</p>
          </div>
        )}

        {/* Interactive Heat Map - Enhanced placeholder until Google Maps API is set up */}
        {weatherData && heatIndex && (
          <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-amber-600 p-4">
              <h2 className="text-xl font-semibold text-white">Heat Risk Map</h2>
              <p className="text-white text-sm">
                Visualizing temperature variations and heat risk zones in this area
              </p>
            </div>
            <div className="h-96">
              <HeatMapDisplay
                center={{
                  lat: currentLocation?.latitude || weatherData.coord.lat,
                  lng: currentLocation?.longitude || weatherData.coord.lon
                }}
                heatIndex={heatIndex}
                weatherData={weatherData}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatMapPage;
