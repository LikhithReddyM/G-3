import express from 'express';
import { GoogleAssistant } from '../services/assistantService.js';
import { dbService } from '../services/dbService.js';

const router = express.Router();

// MCP protocol endpoint
router.post('/execute', async (req, res) => {
  try {
    const { method, params, sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    
    // Get tokens from session (in production, use proper session management)
    const { tokenStore } = await import('./api.js');
    const tokens = tokenStore.get(sessionId);
    
    if (!tokens) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    const assistant = new GoogleAssistant(tokens);
    
    // Get context from database
    const context = await dbService.getContext(sessionId);
    const conversationHistory = await dbService.getConversationHistory(sessionId, 10);
    const userPreferences = await dbService.getUserPreferences(sessionId);
    
    // Handle MCP method calls
    switch (method) {
      case 'query': {
        // Save user query to conversation history
        await dbService.addConversationHistory(sessionId, {
          type: 'user',
          content: params.query,
          method: 'query'
        });
        
        // Process query with context and conversation history
        const response = await assistant.processQuery(
          params.query,
          context?.currentLocation || null,
          conversationHistory,
          context,
          userPreferences
        );
        
        // Save assistant response to conversation history
        await dbService.addConversationHistory(sessionId, {
          type: 'assistant',
          content: response.content,
          method: 'query',
          metadata: {
            type: response.type,
            ...response
          }
        });
        
        // Always update context with new information
        await dbService.saveContext(sessionId, {
          lastQuery: params.query,
          lastResponse: response.content,
          lastEvents: response.events,
          lastTravelTimes: response.travelTimes,
          lastMeeting: response.meeting,
          lastTasks: response.tasks,
          lastFiles: response.files,
          lastContacts: response.contacts,
          lastMessages: response.messages,
          lastVideos: response.videos,
          lastWeather: response.weather,
          lastForecasts: response.forecasts,
          lastPlaces: response.places,
          lastTimezone: response.timezone,
          lastForms: response.forms,
          lastResults: response.results,
          lastPlaylists: response.playlists,
          conversationCount: (context?.conversationCount || 0) + 1,
          lastUpdated: new Date()
        });
        
        return res.json({
          result: response,
          context: {
            hasHistory: conversationHistory.length > 0,
            historyCount: conversationHistory.length,
            preferences: userPreferences
          }
        });
      }
      
      case 'get_schedule': {
        const schedule = await assistant.handleScheduleQuery(params.query || 'get schedule', null);
        
        // Save to context
        await dbService.saveContext(sessionId, {
          lastSchedule: schedule,
          lastQuery: 'get_schedule'
        });
        
        return res.json({ result: schedule });
      }
      
      case 'get_travel_time': {
        const travelTime = await assistant.handleTravelQuery(
          params.query || `travel time from ${params.origin} to ${params.destination}`,
          context?.currentLocation || null
        );
        
        // Save to context
        await dbService.saveContext(sessionId, {
          lastTravelTime: travelTime,
          lastQuery: 'get_travel_time'
        });
        
        return res.json({ result: travelTime });
      }
      
      case 'save_context': {
        const saved = await dbService.saveContext(sessionId, params.context || {});
        return res.json({ result: saved });
      }
      
      case 'get_context': {
        const contextData = await dbService.getContext(sessionId);
        return res.json({ result: contextData || {} });
      }
      
      case 'get_conversation_history': {
        const limit = params.limit || 50;
        const history = await dbService.getConversationHistory(sessionId, limit);
        return res.json({ result: history });
      }
      
      case 'save_preference': {
        const { key, value } = params;
        if (!key) {
          return res.status(400).json({ error: 'key is required' });
        }
        const saved = await dbService.saveUserPreference(sessionId, key, value);
        return res.json({ result: saved });
      }
      
      case 'get_preferences': {
        const preferences = await dbService.getUserPreferences(sessionId);
        return res.json({ result: preferences });
      }
      
      case 'search_context': {
        const { query } = params;
        if (!query) {
          return res.status(400).json({ error: 'query is required' });
        }
        const results = await dbService.searchContexts(query, sessionId);
        return res.json({ result: results });
      }
      
      case 'update_location': {
        const { location } = params;
        if (!location) {
          return res.status(400).json({ error: 'location is required' });
        }
        await dbService.saveContext(sessionId, {
          currentLocation: location,
          locationUpdatedAt: new Date()
        });
        return res.json({ result: { success: true, location } });
      }
      
      case 'clear_context': {
        const cleared = await dbService.deleteContext(sessionId);
        return res.json({ result: cleared });
      }
      
      default:
        return res.status(400).json({ error: `Unknown method: ${method}` });
    }
  } catch (error) {
    console.error('MCP execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    await dbService.connect();
    res.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Debug endpoint to check database contents
router.get('/debug/context/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const context = await dbService.getContext(sessionId);
    const history = await dbService.getConversationHistory(sessionId, 50);
    const preferences = await dbService.getUserPreferences(sessionId);
    
    res.json({
      sessionId,
      context: context || null,
      historyCount: history.length,
      history: history,
      preferences: preferences,
      collections: {
        hasContext: !!context,
        hasHistory: history.length > 0,
        hasPreferences: Object.keys(preferences).length > 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

