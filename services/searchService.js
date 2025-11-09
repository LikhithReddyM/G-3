/**
 * Google Custom Search API service
 * Note: Uses API key from OAuth-enabled Google Cloud project
 * The API key is part of the same project that handles OAuth authentication
 */
export async function googleSearch(tokens, query, maxResults = 10) {
  try {
    // Google Custom Search API uses API key (part of OAuth-enabled Google Cloud project)
    const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
    const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      throw new Error('Google Search API not configured. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in environment variables');
    }
    
    const axios = (await import('axios')).default;
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: GOOGLE_SEARCH_API_KEY,
        cx: GOOGLE_SEARCH_ENGINE_ID,
        q: query,
        num: Math.min(maxResults, 10) // Google Custom Search max is 10 per request
      }
    });
    
    if (response.data.error) {
      throw new Error(`Google Search API error: ${response.data.error.message}`);
    }
    
    const results = (response.data.items || []).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink
    }));
    
    return {
      query,
      results,
      totalResults: response.data.searchInformation?.totalResults || 0,
      searchTime: response.data.searchInformation?.searchTime || 0
    };
  } catch (error) {
    console.error('Error performing Google search:', error);
    throw error;
  }
}

