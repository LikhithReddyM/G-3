import axios from 'axios';

/**
 * Google Weather API service (part of Google Maps Platform)
 * Uses API key from OAuth-enabled Google Cloud project
 */
export async function getWeather(tokens, location, units = 'metric') {
  try {
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
    let apiKey = API_KEY;
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
      apiKey = apiKey.slice(1, -1);
    }
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }
    
    // Parse location (can be coordinates or address)
    let lat, lng;
    
    if (typeof location === 'string' && location.includes(',')) {
      [lat, lng] = location.split(',').map(Number);
    } else {
      // Geocode address first using Google Geocoding API
      const geocodeResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: location,
          key: apiKey
        }
      });
      
      if (!geocodeResponse.data.results || geocodeResponse.data.results.length === 0) {
        throw new Error(`Location "${location}" not found`);
      }
      
      const coords = geocodeResponse.data.results[0].geometry.location;
      lat = coords.lat;
      lng = coords.lng;
    }
    
    // Get weather data from Google Weather API
    // Weather API uses POST requests similar to Air Quality API
    const response = await axios.post(
      `https://weather.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`,
      {
        location: {
          latitude: lat,
          longitude: lng
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.error) {
      throw new Error(`Weather API error: ${response.data.error.message || 'Unknown error'}`);
    }
    
    const data = response.data;
    
    // Convert temperature based on units
    const tempC = data.temperature?.value || 0;
    const tempF = (tempC * 9/5) + 32;
    const temperature = units === 'metric' ? tempC : tempF;
    
    return {
      location: location,
      coordinates: { lat, lng },
      temperature: {
        current: temperature,
        celsius: tempC,
        fahrenheit: tempF
      },
      condition: data.condition || 'Unknown',
      description: data.description || '',
      humidity: data.humidity?.value || null,
      windSpeed: data.windSpeed?.value || null,
      windDirection: data.windDirection?.value || null,
      cloudCover: data.cloudCover?.value || null,
      uvIndex: data.uvIndex?.value || null,
      visibility: data.visibility?.value || null,
      pressure: data.pressure?.value || null,
      updateTime: data.updateTime || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting weather:', error);
    throw error;
  }
}

export async function getWeatherForecast(tokens, location, days = 5) {
  try {
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
    let apiKey = API_KEY;
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
      apiKey = apiKey.slice(1, -1);
    }
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }
    
    // Parse location
    let lat, lng;
    
    if (typeof location === 'string' && location.includes(',')) {
      [lat, lng] = location.split(',').map(Number);
    } else {
      const geocodeResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: location,
          key: apiKey
        }
      });
      
      if (!geocodeResponse.data.results || geocodeResponse.data.results.length === 0) {
        throw new Error(`Location "${location}" not found`);
      }
      
      const coords = geocodeResponse.data.results[0].geometry.location;
      lat = coords.lat;
      lng = coords.lng;
    }
    
    // Get weather forecast from Google Weather API
    // Weather API uses POST requests similar to Air Quality API
    const response = await axios.post(
      `https://weather.googleapis.com/v1/forecast:lookup?key=${apiKey}`,
      {
        location: {
          latitude: lat,
          longitude: lng
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.error) {
      throw new Error(`Weather Forecast API error: ${response.data.error.message || 'Unknown error'}`);
    }
    
    const forecasts = (response.data.forecast || []).slice(0, days).map(item => ({
      dateTime: item.dateTime || new Date().toISOString(),
      temperature: {
        current: item.temperature?.value || 0,
        celsius: item.temperature?.value || 0,
        fahrenheit: ((item.temperature?.value || 0) * 9/5) + 32
      },
      condition: item.condition || 'Unknown',
      description: item.description || '',
      humidity: item.humidity?.value || null,
      windSpeed: item.windSpeed?.value || null,
      precipitation: item.precipitation?.value || null,
      cloudCover: item.cloudCover?.value || null
    }));
    
    return {
      location: location,
      coordinates: { lat, lng },
      forecasts
    };
  } catch (error) {
    console.error('Error getting weather forecast:', error);
    throw error;
  }
}
