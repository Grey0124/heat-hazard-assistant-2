import * as turf from '@turf/turf';

/**
 * Calculate the net cooling (or warming) effect of urban interventions.
 * @param {Array} interventions - Array of intervention objects with {lat, lng, type, size}
 * @param {Object} options - Optional parameters
 * @param {number} options.neighborhoodRadiusMeters - Radius of neighborhood in meters (default: 150)
 * @param {Object} options.coolingCoefficients - Cooling coefficients for different intervention types (°C per 1% area)
 * @param {Object} options.heatingCoefficients - Heating coefficients for intervention types that increase heat
 * @param {string} options.terrainType - One of ['residential','commercial','forest','park','industrial'] (default: 'commercial')
 * @param {number} options.terrainMultiplier - Direct multiplier; if both terrainType and terrainMultiplier provided, terrainMultiplier takes precedence.
 * @param {number} options.maxCooling - Maximum cooling cap in °C (default: 5)
 * @param {number} options.maxHeating - Maximum heating cap in °C (default: 3)
 * @returns {number} Net temperature change in °C (positive = cooling, negative = heating)
 */
export const computeCoolingEffect = (interventions, options = {}) => {
  const {
    neighborhoodRadiusMeters = 150,
    coolingCoefficients = {
      tree: 0.02,
      roof: 0.015,
    },
    heatingCoefficients = {
      building: 0.01,
      asphalt: 0.012,
    },
    terrainType = 'commercial',
    terrainMultiplier,
    maxCooling = 5,
    maxHeating = 3,
  } = options;

  if (!interventions || interventions.length === 0) {
    return 0;
  }

  // Map terrainType to multiplier if terrainMultiplier not provided
  const terrainMap = {
    residential: 1.2,
    commercial: 1.0,
    forest: 0.5,
    park: 1.1,
    industrial: 0.9,
  };
  const mult = typeof terrainMultiplier === 'number'
    ? terrainMultiplier
    : (terrainMap[terrainType] || 1.0);

  try {
    // Build GeoJSON points for all interventions
    const points = interventions.map(i => turf.point([i.lng, i.lat]));
    const fc = turf.featureCollection(points);

    // Compute centroid of all points
    const centroidFeature = turf.centroid(fc);
    if (!centroidFeature || !centroidFeature.geometry) {
      return 0;
    }

    // Buffer centroid by neighborhood radius to get neighborhood polygon
    const neighborhoodPolygon = turf.buffer(
      centroidFeature,
      neighborhoodRadiusMeters / 1000,
      { units: 'kilometers' }
    );
    const neighborhoodArea = turf.area(neighborhoodPolygon); // in m²
    if (neighborhoodArea <= 0) {
      return 0;
    }

    // Sum added areas by type (cooling and heating)
    const areaSums = {
      tree: 0,
      roof: 0,
      // heating types
      building: 0,
      asphalt: 0,
    };

    interventions.forEach(({ type, size }) => {
      const numericSize = Number(size) || 0;
      if (numericSize <= 0) return;
      if (areaSums.hasOwnProperty(type)) {
        areaSums[type] += numericSize;
      }
    });

    // Compute percent increases per type
    const percentArea = {};
    for (const type in areaSums) {
      percentArea[type] = (areaSums[type] / neighborhoodArea) * 100;
    }

    // Compute cooling effect
    let cooling = 0;
    for (const type in coolingCoefficients) {
      const coeff = coolingCoefficients[type] || 0;
      cooling += (percentArea[type] || 0) * coeff;
    }

    // Compute heating effect
    let heating = 0;
    for (const type in heatingCoefficients) {
      const coeff = heatingCoefficients[type] || 0;
      heating += (percentArea[type] || 0) * coeff;
    }

    // Apply terrain multiplier
    cooling *= mult;
    heating *= mult;

    // Cap values
    if (cooling > maxCooling) cooling = maxCooling;
    if (heating > maxHeating) heating = maxHeating;

    const netEffect = cooling - heating;
    return netEffect;
  } catch (error) {
    console.error('Error computing cooling effect:', error);
    return 0;
  }
};

/**
 * Compute cooling or heating impact of a single intervention
 * @param {Object} intervention - Single intervention object
 * @param {number} intervention.lat
 * @param {number} intervention.lng
 * @param {string} intervention.type - 'tree', 'roof', 'building', etc.
 * @param {number} intervention.size - area in m²
 * @param {Object} options - Same options as computeCoolingEffect
 * @returns {number} Net temperature change in °C
 */
export const computeSingleInterventionCooling = (intervention, options = {}) => {
  return computeCoolingEffect([intervention], options);
};
