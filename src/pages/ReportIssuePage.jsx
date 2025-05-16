// src/pages/ReportIssuePage.jsx - Improved UI with matching colors
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, addDoc, Timestamp, GeoPoint } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const ReportIssuePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    issueType: '',
    location: '',
    description: '',
    severity: 'medium',
    contactEmail: user ? user.email : '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [locationCoords, setLocationCoords] = useState(null);

  // Initialize Google Maps Places Autocomplete
  useEffect(() => {
    // Load Google Maps script with Places library if not already loaded
    if (!window.google && !document.getElementById('google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;

      // Initialize autocomplete when script loads
      script.onload = initializeAutocomplete;

      document.head.appendChild(script);
    } else if (window.google) {
      // Script already loaded, just initialize autocomplete
      initializeAutocomplete();
    }
  }, []);

  const initializeAutocomplete = () => {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;

    const input = document.getElementById('location');
    if (!input) return;

    const autocompleteOptions = {
      types: ['geocode']
    };

    const autocomplete = new window.google.maps.places.Autocomplete(input, autocompleteOptions);

    // Listen for place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (place.geometry && place.geometry.location) {
        // Store coordinates for submission
        setLocationCoords({
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng()
        });

        // Update location field with formatted address
        setFormData(prev => ({
          ...prev,
          location: place.formatted_address
        }));
      }
    });
  };

  const issueTypes = [
    {
      value: 'broken_water',
      label: t('reportIssue.form.issueType.brokenWater'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2c-1.1 0-2 .9-2 2v2H8a2 2 0 00-2 2v2h12V8a2 2 0 00-2-2h-2V4c0-1.1-.9-2-2-2zM6 12v6a2 2 0 002 2h8a2 2 0 002-2v-6H6z" />
        </svg>
      )
    },
    {
      value: 'no_shade',
      label: t('reportIssue.form.issueType.noShade'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h5v-5h4v5h5a1 1 0 001-1V10" />
        </svg>
      )
    },
    {
      value: 'hot_pavement',
      label: t('reportIssue.form.issueType.hotPavement'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      )
    },
    {
      value: 'cooling_center',
      label: t('reportIssue.form.issueType.coolingCenter'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m0-10l4.5-4.5M12 12l4.5 4.5M12 12L7.5 7.5M12 12l-4.5 4.5M2 12h20" />
        </svg>
      )
    },
    {
      value: 'other',
      label: t('reportIssue.form.issueType.other'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationDetection = () => {
    if (navigator.geolocation) {
      setUseCurrentLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocationCoords({ latitude, longitude });

          // Use reverse geocoding to get a human-readable address
          try {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              if (status === 'OK' && results[0]) {
                setFormData(prev => ({
                  ...prev,
                  location: results[0].formatted_address
                }));
              } else {
                // Fallback to coordinates if geocoding fails
                setFormData(prev => ({
                  ...prev,
                  location: `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`
                }));
              }
              setUseCurrentLocation(false);
            });
          } catch (err) {
            // Fallback if geocoder fails
            setFormData(prev => ({
              ...prev,
              location: `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`
            }));
            setUseCurrentLocation(false);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setError(t('reportIssue.errors.locationFailed'));
          setUseCurrentLocation(false);
        }
      );
    } else {
      setError(t('reportIssue.errors.noGeolocation'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.issueType || !formData.location || !formData.description) {
      setError(t('reportIssue.errors.requiredFields'));
      return;
    }

    if (!user) {
      setError(t('reportIssue.errors.loginRequired'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Create report object
      const reportData = {
        issueType: formData.issueType,
        description: formData.description,
        severity: formData.severity,
        contactEmail: formData.contactEmail,
        location: formData.location,
        // Store the coordinates as a GeoPoint if available
        coordinates: locationCoords
          ? new GeoPoint(locationCoords.latitude, locationCoords.longitude)
          : null,
        // Add user ID and timestamps
        userId: user.uid,
        userName: user.displayName || user.email,
        timestamp: Timestamp.now(),
        status: 'pending',
        // Add initial status update
        statusUpdates: [{
          status: 'pending',
          timestamp: Timestamp.now(),
          updatedBy: 'system',
          updaterName: 'System',
          note: 'Report submitted'
        }]
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, "heatHazardReports"), reportData);
      console.log('Report submitted with ID:', docRef.id);

      setSubmitted(true);

      // Reset form
      setFormData({
        issueType: '',
        location: '',
        description: '',
        severity: 'medium',
        contactEmail: user ? user.email : '',
      });
      setLocationCoords(null);
      setUseCurrentLocation(false);
    } catch (err) {
      console.error('Error submitting report:', err);
      setError(t('reportIssue.errors.submitFailed'));
    } finally {
      setSubmitting(false);
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
          <h1 className="text-3xl font-bold text-navy-900">{t('reportIssue.title')}</h1>
        </div>

        {/* Introduction */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="bg-white rounded-full p-4 hidden md:flex items-center justify-center">
              <svg className="w-9 h-9 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-semibold mb-2">{t('reportIssue.title')}</h2>
              <p className="text-white/90 text-lg">
                {t('reportIssue.intro')}
              </p>
            </div>
          </div>
        </div>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-md p-8 text-center">
            <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-green-800 mb-2">{t('reportIssue.thankYou')}</h3>
            <p className="text-gray-700 text-lg mb-8">{t('reportIssue.submissionHelps')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setSubmitted(false)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
              >
                {t('reportIssue.submitAnother')}
              </button>
              <Link
                to="/profile"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
              >
                {t('reportIssue.viewMyReports')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6 flex items-start">
                <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {!user && (
              <div className="bg-amber-100 border border-amber-300 text-amber-800 px-6 py-4 rounded-lg mb-6 flex items-start">
                <svg className="w-6 h-6 text-amber-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold">{t('reportIssue.loginRequired.title')}</p>
                  <p>{t('reportIssue.loginRequired.action')} <Link to="/" className="underline font-medium text-amber-800">Sign in</Link></p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Issue Type */}
              <div>
                <label className="block text-lg font-medium text-gray-800 mb-3">
                  {t('reportIssue.form.issueType.label')} <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {issueTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`border rounded-lg p-4 flex flex-col items-center text-center cursor-pointer transition-colors ${formData.issueType === type.value
                        ? 'bg-amber-50 border-amber-400 text-amber-800'
                        : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                        }`}
                      onClick={() => setFormData(prev => ({ ...prev, issueType: type.value }))}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${formData.issueType === type.value
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                        }`}>
                        {type.icon}
                      </div>
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
                <label htmlFor="location" className="block text-lg font-medium text-gray-800 mb-3">
                  {t('reportIssue.form.location.label')} <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-grow">
                    <div className="relative">
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder={t('reportIssue.form.location.placeholder')}
                        className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white pl-10"
                        required
                        disabled={useCurrentLocation && !formData.location}
                      />
                      <svg className="w-5 h-5 text-gray-500 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    {useCurrentLocation && !formData.location && (
                      <div className="mt-2 text-amber-600 flex items-center">
                        <svg className="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-sm">{t('reportIssue.form.location.detecting')}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleLocationDetection}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-5 rounded-lg flex items-center transition duration-300 whitespace-nowrap"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {t('reportIssue.form.location.useMyLocation')}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600 italic">
                  {t('reportIssue.form.location.hint')}
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-lg font-medium text-gray-800 mb-3">
                  {t('reportIssue.form.description.label')} <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="5"
                  placeholder={t('reportIssue.form.description.placeholder')}
                  className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                ></textarea>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-lg font-medium text-gray-800 mb-3">
                  {t('reportIssue.form.severity.label')}
                </label>
                <div className="flex flex-wrap gap-x-8 gap-y-4">
                  {['low', 'medium', 'high'].map((severity) => (
                    <label key={severity} className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="severity"
                        value={severity}
                        checked={formData.severity === severity}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center transition-colors ${formData.severity === severity
                        ? severity === 'high'
                          ? 'border-red-500 bg-red-500'
                          : severity === 'medium'
                            ? 'border-amber-500 bg-amber-500'
                            : 'border-green-500 bg-green-500'
                        : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                        {formData.severity === severity && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <span className={`font-medium ${severity === 'high'
                          ? 'text-red-700'
                          : severity === 'medium'
                            ? 'text-amber-700'
                            : 'text-green-700'
                          }`}>
                          {t(`reportIssue.form.severity.${severity}`)}
                        </span>
                        {severity === 'high' && (
                          <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Urgent</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Contact Email */}
              <div>
                <label htmlFor="contactEmail" className="block text-lg font-medium text-gray-800 mb-3">
                  {t('reportIssue.form.contactEmail.label')}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="contactEmail"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder={t('reportIssue.form.contactEmail.placeholder')}
                    className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 pl-10"
                  />
                  <svg className="w-5 h-5 text-gray-500 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="mt-2 text-sm text-gray-600 italic">
                  {t('reportIssue.form.contactEmail.hint')}
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || !user}
                  className={`w-full ${user ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-400 cursor-not-allowed'
                    } text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center text-lg transition duration-300`}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('reportIssue.form.submitting')}
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('reportIssue.form.submitButton')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Information Section */}
        {!submitted && (
          <div className="mt-8 bg-blue-50 rounded-lg shadow-md p-6 border border-blue-100">
            <h2 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What Happens After You Report?
            </h2>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-blue-700 font-bold text-xl">1</span>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Verification</h3>
                <p className="text-gray-600">Our team reviews your report to verify the issue and assess its severity.</p>
              </div>

              <div className="bg-white p-5 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-blue-700 font-bold text-xl">2</span>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Action</h3>
                <p className="text-gray-600">The issue is forwarded to appropriate authorities or added to our heat safety map.</p>
              </div>

              <div className="bg-white p-5 rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-blue-700 font-bold text-xl">3</span>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Updates</h3>
                <p className="text-gray-600">You can track the status of your report in your profile, and we'll notify you of changes.</p>
              </div>
            </div>

            <div className="mt-6 bg-white p-5 rounded-lg border border-blue-100">
              <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Important Note
              </h3>
              <p className="text-gray-600">
                For immediate emergencies like heat stroke or medical situations, please contact emergency services directly at <span className="font-semibold text-red-600">108</span> (ambulance) or <span className="font-semibold text-red-600">112</span> (general emergency).
              </p>
            </div>
          </div>
        )}

        {/* Common Issues Examples */}
        {!submitted && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-navy-900 mb-4">Common Heat Safety Issues</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-3 bg-blue-500"></div>
                <div className="p-5">
                  <div className="text-blue-500 mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2c-1.1 0-2 .9-2 2v2H8a2 2 0 00-2 2v2h12V8a2 2 0 00-2-2h-2V4c0-1.1-.9-2-2-2zM6 12v6a2 2 0 002 2h8a2 2 0 002-2v-6H6z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Broken Water Fountain</h3>
                  <p className="text-gray-600 text-sm">Water fountains that are broken, contaminated, or not functioning properly during hot weather.</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-3 bg-amber-500"></div>
                <div className="p-5">
                  <div className="text-amber-500 mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h5v-5h4v5h5a1 1 0 001-1V10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No Shade Available</h3>
                  <p className="text-gray-600 text-sm">Public areas, bus stops, or playgrounds with no shade structures, trees, or protection from direct sun.</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-3 bg-red-500"></div>
                <div className="p-5">
                  <div className="text-red-500 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Hot Pavement</h3>
                  <p className="text-gray-600 text-sm">Dangerously hot surfaces in public areas that could cause burns, especially to children or pets.</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-3 bg-purple-500"></div>
                <div className="p-5">
                  <div className="text-purple-500 mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20m0-10l4.5-4.5M12 12l4.5 4.5M12 12L7.5 7.5M12 12l-4.5 4.5M2 12h20" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Cooling Center Issues</h3>
                  <p className="text-gray-600 text-sm">Problems with cooling centers such as limited hours, overcrowding, or air conditioning failures.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportIssuePage;
