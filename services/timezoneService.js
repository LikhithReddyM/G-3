import axios from 'axios';

/**
 * Timezone service using Google Time Zone API
 * Uses OAuth-enabled Google Maps API key
 */
export async function getTimezone(tokens, location, timestamp = null) {
  try {
    // Google Time Zone API uses API key (part of OAuth-enabled Google Cloud project)
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
      // Geocode address first using OAuth-enabled geocoding
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
    
    // Use current timestamp if not provided
    const time = timestamp || Math.floor(Date.now() / 1000);
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/timezone/json', {
      params: {
        location: `${lat},${lng}`,
        timestamp: time,
        key: apiKey
      }
    });
    
    if (response.data.status !== 'OK') {
      throw new Error(`Timezone API error: ${response.data.status}`);
    }
    
    const data = response.data;
    const localTime = new Date((time + data.rawOffset + data.dstOffset) * 1000);
    
    return {
      location: { lat, lng },
      timezoneId: data.timeZoneId,
      timezoneName: data.timeZoneName,
      rawOffset: data.rawOffset, // in seconds
      dstOffset: data.dstOffset, // in seconds
      totalOffset: data.rawOffset + data.dstOffset,
      localTime: localTime.toISOString(),
      utcTime: new Date(time * 1000).toISOString()
    };
  } catch (error) {
    console.error('Error getting timezone:', error);
    throw error;
  }
}

export async function getTimezonesForLocations(tokens, locations) {
  try {
    const results = await Promise.all(
      locations.map(loc => getTimezone(tokens, loc).catch(err => ({ location: loc, error: err.message })))
    );
    
    return results;
  } catch (error) {
    console.error('Error getting timezones:', error);
    throw error;
  }
}

