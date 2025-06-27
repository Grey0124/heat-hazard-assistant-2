// src/components/safety/HeatSafetyRecommendations.jsx
import React, { useState, useEffect } from 'react';
import { getHeatSafetyRecommendations } from '../../services/heatSafetyService';

const HeatSafetyRecommendations = ({ heatIndex, activityType = 'moderate' }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(activityType);

  useEffect(() => {
    if (heatIndex) {
      const safetyRecs = getHeatSafetyRecommendations(heatIndex.value, selectedActivity);
      setRecommendations(safetyRecs);
    }
  }, [heatIndex, selectedActivity]);

  if (!heatIndex || !recommendations) {
    return (
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-20 bg-gray-200 rounded mb-2"></div>
      </div>
    );
  }

  const getBgColorByWarningLevel = (level) => {
    switch (level) {
      case 'extreme':
        return 'bg-red-100 border-red-500';
      case 'high':
        return 'bg-orange-100 border-orange-500';
      case 'moderate':
        return 'bg-yellow-100 border-yellow-500';
      case 'low-moderate':
        return 'bg-yellow-50 border-yellow-400';
      default:
        return 'bg-green-50 border-green-500';
    }
  };

  const getTextColorByWarningLevel = (level) => {
    switch (level) {
      case 'extreme':
        return 'text-red-700';
      case 'high':
        return 'text-orange-700';
      case 'moderate':
        return 'text-yellow-700';
      case 'low-moderate':
        return 'text-yellow-800';
      default:
        return 'text-green-700';
    }
  };

  const getIconByRecommendationType = (type) => {
    switch (type) {
      case 'hydration':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'clothing':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'outdoor':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        );
      case 'cooling':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'monitoring':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'emergency':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'planning':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'sunProtection':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'awareness':
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className={`p-4 ${getBgColorByWarningLevel(recommendations.warningLevel)} border-l-4`}>
        <h3 className={`text-lg font-semibold ${getTextColorByWarningLevel(recommendations.warningLevel)}`}>
          Heat Safety Recommendations
        </h3>
        <p className="text-gray-600 text-sm">Based on current conditions and your activity level</p>
      </div>
      
      <div className="p-4">
        {/* Activity Type Selector */}
        <div className="mb-4">
          <label htmlFor="activityType" className="block text-sm font-medium text-gray-700 mb-1">
            Activity Level
          </label>
          <select
            id="activityType"
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            className="w-full md:w-auto border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="resting">Resting / Minimal Activity</option>
            <option value="light">Light Activity (Walking)</option>
            <option value="moderate">Moderate Activity (Jogging)</option>
            <option value="vigorous">Vigorous Activity (Running, Sports)</option>
          </select>
        </div>
        
        {/* Activity Restrictions */}
        <div className={`p-3 mb-4 rounded-lg ${getBgColorByWarningLevel(recommendations.warningLevel)}`}>
          <h4 className={`font-semibold ${getTextColorByWarningLevel(recommendations.warningLevel)}`}>
            Activity Guidelines
          </h4>
          <p className="text-gray-700">{recommendations.activityRestrictions}</p>
        </div>
        
        {/* Recommendations List */}
        <div className="space-y-3">
          {Object.entries(recommendations.recommendations).map(([key, value]) => (
            <div key={key} className="flex items-start">
              <div className="flex-shrink-0 text-blue-600">
                {getIconByRecommendationType(key)}
              </div>
              <div>
                <p className="text-gray-700">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeatSafetyRecommendations;