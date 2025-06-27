import axios from 'axios';

const API_BASE_URL = 'https://idp-final-mustard-groundnut.onrender.com';

class HeatHazardService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Get heat hazard risk prediction for a specific location and time
  async predictHeatHazard(lat, lon, date, hour, temp, tavg, tmin, prcp = 0.0) {
    try {
      const response = await this.api.post('/predict', {
        lat,
        lon,
        date,
        hour,
        temp,
        tavg,
        tmin,
        prcp,
      });
      return response.data;
    } catch (error) {
      console.error('Error predicting heat hazard:', error);
      throw new Error('Failed to get heat hazard prediction');
    }
  }

  // Get heat hazard risk for multiple points along a route
  async predictRouteHazards(routePoints, weatherData, startTime) {
    try {
      const predictions = await Promise.all(
        routePoints.map(async (point, index) => {
          // Calculate time for this point (assuming 5 minutes per point)
          const minutesFromStart = index * 5;
          const pointTime = new Date(startTime.getTime() + minutesFromStart * 60000);
          const hour = pointTime.getHours();
          const date = pointTime.toISOString().split('T')[0];
          
          return this.predictHeatHazard(
            point.lat,
            point.lng,
            date,
            hour,
            weatherData.temp,
            weatherData.humidity,
            weatherData.temp - 5, // Approximate min temp
            weatherData.precipitation || 0
          );
        })
      );
      
      return predictions;
    } catch (error) {
      console.error('Error predicting route hazards:', error);
      throw new Error('Failed to analyze route heat hazards');
    }
  }

  // Get heat hazard risk for map overlay (grid of points)
  async predictMapHazards(bounds, weatherData) {
    try {
      const { north, south, east, west } = bounds;
      const gridSize = 0.01; // ~1km grid
      const predictions = [];
      
      for (let lat = south; lat <= north; lat += gridSize) {
        for (let lng = west; lng <= east; lng += gridSize) {
          try {
            const prediction = await this.predictHeatHazard(
              lat,
              lng,
              new Date().toISOString().split('T')[0],
              new Date().getHours(),
              weatherData.temp,
              weatherData.humidity,
              weatherData.temp - 5,
              weatherData.precipitation || 0
            );
            
            predictions.push({
              lat,
              lng,
              risk: prediction.risk_score,
              level: prediction.risk_level,
              hazard_type: prediction.hazard_type || 'heat_stroke'
            });
          } catch (error) {
            console.warn(`Failed to predict hazard for ${lat}, ${lng}:`, error);
          }
        }
      }
      
      return predictions;
    } catch (error) {
      console.error('Error predicting map hazards:', error);
      throw new Error('Failed to generate map hazard overlay');
    }
  }

  // Check if the API is available
  async checkHealth() {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Heat hazard API health check failed:', error);
      return null;
    }
  }

  // Get heat safety recommendations based on predicted risk
  getSafetyRecommendations(riskLevel, hazardType = 'heat_stroke') {
    const recommendations = {
      low: [
        'Stay hydrated with water',
        'Wear light, loose-fitting clothing',
        'Take breaks in shaded areas',
        'Monitor for early warning signs'
      ],
      medium: [
        'Increase water intake significantly',
        'Avoid strenuous activities during peak hours (10 AM - 4 PM)',
        'Seek air-conditioned spaces when possible',
        'Wear wide-brimmed hat and sunscreen',
        'Know the signs of heat exhaustion'
      ],
      high: [
        'Limit outdoor activities to early morning or evening',
        'Stay in air-conditioned environments',
        'Drink electrolyte solutions',
        'Wear light-colored, breathable clothing',
        'Have a buddy system for outdoor activities',
        'Know emergency contact numbers'
      ],
      very_high: [
        'AVOID outdoor activities if possible',
        'Stay in air-conditioned spaces',
        'Monitor for heat stroke symptoms',
        'Have emergency plan ready',
        'Consider postponing non-essential travel',
        'Stay connected with family/friends'
      ]
    };

    return recommendations[riskLevel] || recommendations.low;
  }

  // Get hazard level description
  getHazardLevelDescription(riskLevel) {
    const descriptions = {
      low: 'Low risk of heat-related illness',
      medium: 'Moderate risk - take precautions',
      high: 'High risk - limit outdoor activities',
      very_high: 'Very high risk - avoid outdoor activities'
    };
    return descriptions[riskLevel] || descriptions.low;
  }
}

export default new HeatHazardService(); 