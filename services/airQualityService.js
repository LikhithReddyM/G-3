import axios from 'axios';

/**
 * Google Air Quality API service (part of Google Maps Platform)
 * Uses API key from OAuth-enabled Google Cloud project
 */
export async function getAirQuality(tokens, location) {
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
    
    // Get air quality data from Google Air Quality API
    const response = await axios.post(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`,
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
      throw new Error(`Air Quality API error: ${response.data.error.message || 'Unknown error'}`);
    }
    
    const data = response.data;
    
    return {
      location: location,
      coordinates: { lat, lng },
      aqi: data.indexes?.[0]?.aqi || null,
      aqiDisplay: data.indexes?.[0]?.aqiDisplay || null,
      category: data.indexes?.[0]?.category || null,
      dominantPollutant: data.indexes?.[0]?.dominantPollutant || null,
      pollutants: data.pollutants || [],
      updateTime: data.updateTime || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting air quality:', error);
    throw error;
  }
}

export async function getAirQualityForecast(tokens, location, hours = 24) {
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
    
    // Get air quality forecast from Google Air Quality API
    const response = await axios.post(
      `https://airquality.googleapis.com/v1/forecast:lookup?key=${apiKey}`,
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
      throw new Error(`Air Quality Forecast API error: ${response.data.error.message || 'Unknown error'}`);
    }
    
    const forecasts = (response.data.hourlyForecasts || []).slice(0, hours).map(item => ({
      dateTime: item.dateTime || new Date().toISOString(),
      aqi: item.indexes?.[0]?.aqi || null,
      aqiDisplay: item.indexes?.[0]?.aqiDisplay || null,
      category: item.indexes?.[0]?.category || null,
      dominantPollutant: item.indexes?.[0]?.dominantPollutant || null,
      pollutants: item.pollutants || []
    }));
    
    return {
      location: location,
      coordinates: { lat, lng },
      forecasts
    };
  } catch (error) {
    console.error('Error getting air quality forecast:', error);
    throw error;
  }
}

