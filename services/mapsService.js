import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Remove quotes if present
let GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
if (GOOGLE_MAPS_API_KEY.startsWith('"') && GOOGLE_MAPS_API_KEY.endsWith('"')) {
  GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY.slice(1, -1);
}
if (GOOGLE_MAPS_API_KEY.startsWith("'") && GOOGLE_MAPS_API_KEY.endsWith("'")) {
  GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY.slice(1, -1);
}

export async function getCurrentLocation() {
  // In a real app, you'd get this from the browser's geolocation API
  // For now, we'll return a placeholder
  return {
    lat: null,
    lng: null,
    address: null
  };
}

export async function geocodeAddress(address) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured. Please set GOOGLE_MAPS_API_KEY in your .env file.');
  }
  
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response.data.status === 'ZERO_RESULTS') {
      throw new Error(`No results found for address: ${address}`);
    }
    
    if (response.data.status === 'REQUEST_DENIED') {
      throw new Error('Google Maps API request denied. Please check your API key and ensure Geocoding API is enabled.');
    }
    
    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        address: result.formatted_address
      };
    }
    
    throw new Error(`Geocoding failed: ${response.data.status}`);
  } catch (error) {
    console.error('Error geocoding address:', error);
    if (error.response) {
      throw new Error(`Maps API error: ${error.response.data.error_message || error.message}`);
    }
    throw error;
  }
}

export async function getDirections(origin, destination, mode = 'driving') {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured. Please set GOOGLE_MAPS_API_KEY in your .env file.');
  }
  
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin,
        destination,
        mode,
        key: GOOGLE_MAPS_API_KEY,
        alternatives: false
      }
    });
    
    if (response.data.status === 'ZERO_RESULTS') {
      throw new Error(`No route found from ${origin} to ${destination}`);
    }
    
    if (response.data.status === 'REQUEST_DENIED') {
      throw new Error('Google Maps API request denied. Please check your API key and ensure Directions API is enabled.');
    }
    
    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      
      return {
        distance: leg.distance.text,
        distanceValue: leg.distance.value,
        duration: leg.duration.text,
        durationValue: leg.duration.value,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions,
          distance: step.distance.text,
          duration: step.duration.text
        }))
      };
    }
    
    throw new Error(`Directions failed: ${response.data.status}`);
  } catch (error) {
    console.error('Error getting directions:', error);
    if (error.response) {
      throw new Error(`Maps API error: ${error.response.data.error_message || error.message}`);
    }
    throw error;
  }
}

export async function getTravelTime(origin, destination) {
  const modes = ['driving', 'transit', 'walking'];
  const results = {};
  
  for (const mode of modes) {
    try {
      const directions = await getDirections(origin, destination, mode);
      if (directions) {
        results[mode] = {
          duration: directions.duration,
          durationValue: directions.durationValue,
          distance: directions.distance
        };
      }
    } catch (error) {
      console.error(`Error getting ${mode} directions:`, error);
    }
  }
  
  return results;
}

export async function getPlaceDetails(placeId) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        key: GOOGLE_MAPS_API_KEY,
        fields: 'name,formatted_address,geometry,opening_hours,rating'
      }
    });
    
    if (response.data.result) {
      return response.data.result;
    }
    return null;
  } catch (error) {
    console.error('Error getting place details:', error);
    throw error;
  }
}

