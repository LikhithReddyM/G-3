import axios from 'axios';

/**
 * Google Places API service
 * Access place information, search places, get place details
 * Uses API key from OAuth-enabled Google Cloud project
 */

export async function searchPlaces(tokens, query, location = null, radius = 5000, type = null) {
  try {
    // Google Places API (New) can use OAuth, but for REST API we use API key
    // Since OAuth has these capabilities, we'll use the Maps API key from env
    // which is part of the OAuth-enabled Google Cloud project
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
    let apiKey = API_KEY;
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
      apiKey = apiKey.slice(1, -1);
    }
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }
    
    const params = {
      query: query,
      key: apiKey
    };
    
    if (location) {
      params.location = location;
      params.radius = radius;
    }
    
    if (type) {
      params.type = type;
    }
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params
    });
    
    const places = (response.data.results || []).map(place => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      types: place.types,
      photos: place.photos?.map(photo => ({
        photoReference: photo.photo_reference,
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`
      })) || []
    }));
    
    return {
      query,
      places,
      status: response.data.status
    };
  } catch (error) {
    console.error('Error searching places:', error);
    throw error;
  }
}

export async function getPlaceDetails(tokens, placeId) {
  try {
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
    let apiKey = API_KEY;
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
      apiKey = apiKey.slice(1, -1);
    }
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,formatted_address,geometry,rating,user_ratings_total,formatted_phone_number,website,opening_hours,photos,reviews,types',
        key: apiKey
      }
    });
    
    if (!response.data.result) {
      return null;
    }
    
    const place = response.data.result;
    
    return {
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      phoneNumber: place.formatted_phone_number,
      website: place.website,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      openingHours: place.opening_hours,
      reviews: place.reviews?.map(review => ({
        author: review.author_name,
        rating: review.rating,
        text: review.text,
        time: review.time
      })) || [],
      types: place.types,
      photos: place.photos?.map(photo => ({
        photoReference: photo.photo_reference,
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${apiKey}`
      })) || []
    };
  } catch (error) {
    console.error('Error getting place details:', error);
    throw error;
  }
}

export async function getNearbyPlaces(tokens, location, type = null, radius = 5000) {
  try {
    const API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
    let apiKey = API_KEY;
    if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
      apiKey = apiKey.slice(1, -1);
    }
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }
    
    const params = {
      location: location,
      radius: radius,
      key: apiKey
    };
    
    if (type) {
      params.type = type;
    }
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params
    });
    
    const places = (response.data.results || []).map(place => ({
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      types: place.types,
      distance: place.distance // If available
    }));
    
    return {
      location,
      places,
      status: response.data.status
    };
  } catch (error) {
    console.error('Error getting nearby places:', error);
    throw error;
  }
}

