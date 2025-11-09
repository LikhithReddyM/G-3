import express from 'express';
import { GoogleAssistant } from '../services/assistantService.js';
import { getUpcomingEvents, getScheduleForDate } from '../services/calendarService.js';
import { getTravelTime, geocodeAddress } from '../services/mapsService.js';
import { createDocument, createPresentation } from '../services/docsService.js';
import { getMessages, searchMessages } from '../services/gmailService.js';
import { createSpreadsheet, readData } from '../services/sheetsService.js';
import { createNote, getNotes, searchNotes } from '../services/keepService.js';
import { getContacts, searchContacts, getContact } from '../services/peopleService.js';
import { getTasks, getUpcomingTasks, createTask, completeTask, getTaskLists } from '../services/tasksService.js';
import { getMeetLinksFromCalendar, getNextMeetLink, createMeetEvent } from '../services/meetService.js';
import { listFiles, searchFiles, getRecentFiles, getFile, getFilesByType } from '../services/driveService.js';

const router = express.Router();

// Store tokens in memory (in production, use a database)
export const tokenStore = new Map();

// Middleware to get tokens from session
const getTokens = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(401).json({ error: 'No session ID provided' });
  }
  
  const tokens = tokenStore.get(sessionId);
  if (!tokens) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  req.tokens = tokens;
  next();
};

// Main assistant query endpoint
router.post('/query', getTokens, async (req, res) => {
  try {
    const { query, currentLocation } = req.body;
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const assistant = new GoogleAssistant(req.tokens);
    
    // Get context from database if sessionId is provided
    let context = {};
    let conversationHistory = [];
    let userPreferences = {};
    
    if (sessionId) {
      try {
        const { dbService } = await import('../services/dbService.js');
        context = await dbService.getContext(sessionId) || {};
        conversationHistory = await dbService.getConversationHistory(sessionId, 10);
        userPreferences = await dbService.getUserPreferences(sessionId);
        
        // Save user query to conversation history
        await dbService.addConversationHistory(sessionId, {
          type: 'user',
          content: query,
          method: 'query'
        });
      } catch (dbError) {
        console.warn('Database context not available:', dbError.message);
      }
    }
    
    // Process query with context
    const response = await assistant.processQuery(
      query, 
      currentLocation || context?.currentLocation || null,
      conversationHistory,
      context,
      userPreferences
    );
    
    // Save to database if sessionId is provided
    if (sessionId) {
      try {
        const { dbService } = await import('../services/dbService.js');
        
        // Save assistant response
        await dbService.addConversationHistory(sessionId, {
          type: 'assistant',
          content: response.content,
          method: 'query',
          metadata: response
        });
        
        // Update context
        await dbService.saveContext(sessionId, {
          lastQuery: query,
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
      } catch (dbError) {
        console.warn('Failed to save to database:', dbError.message);
      }
    }
    
    // If text-to-speech is requested, generate audio
    // Note: We'll make a separate call for TTS to preserve JSON response structure
    // The client can call /speech/tts endpoint separately if needed
    // For now, we'll always return JSON and let client handle TTS separately
    
    res.json(response);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calendar endpoints
router.get('/calendar/upcoming', getTokens, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 10;
    const events = await getUpcomingEvents(req.tokens, maxResults);
    res.json({ events });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/calendar/date/:date', getTokens, async (req, res) => {
  try {
    const { date } = req.params;
    const events = await getScheduleForDate(req.tokens, new Date(date));
    res.json({ events });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Maps endpoints
router.post('/maps/travel-time', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }
    
    const travelTimes = await getTravelTime(origin, destination);
    res.json({ travelTimes });
  } catch (error) {
    console.error('Error calculating travel time:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/maps/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    const location = await geocodeAddress(address);
    res.json({ location });
  } catch (error) {
    console.error('Error geocoding address:', error);
    res.status(500).json({ error: error.message });
  }
});

// Document creation endpoints
router.post('/docs/create', getTokens, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const result = await createDocument(req.tokens, title, content || '');
    res.json(result);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/slides/create', getTokens, async (req, res) => {
  try {
    const { title, slides } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const result = await createPresentation(req.tokens, title, slides || []);
    res.json(result);
  } catch (error) {
    console.error('Error creating presentation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gmail endpoints
router.get('/gmail/messages', getTokens, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 10;
    const messages = await getMessages(req.tokens, maxResults);
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching Gmail:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/gmail/search', getTokens, async (req, res) => {
  try {
    const { query, maxResults } = req.body;
    const messages = await searchMessages(req.tokens, query, maxResults || 10);
    res.json({ messages });
  } catch (error) {
    console.error('Error searching Gmail:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sheets endpoints
router.post('/sheets/create', getTokens, async (req, res) => {
  try {
    const { title, data } = req.body;
    const result = await createSpreadsheet(req.tokens, title, data);
    res.json(result);
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sheets/:spreadsheetId/read', getTokens, async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const range = req.query.range || 'Sheet1!A1:Z1000';
    const data = await readData(req.tokens, spreadsheetId, range);
    res.json({ data });
  } catch (error) {
    console.error('Error reading spreadsheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Notes endpoints
router.post('/notes/create', getTokens, async (req, res) => {
  try {
    const { title, content } = req.body;
    const result = await createNote(req.tokens, title, content);
    res.json(result);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/notes', getTokens, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 20;
    const notes = await getNotes(req.tokens, maxResults);
    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/notes/search', getTokens, async (req, res) => {
  try {
    const { query } = req.body;
    const notes = await searchNotes(req.tokens, query);
    res.json({ notes });
  } catch (error) {
    console.error('Error searching notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// People/Contacts endpoints
router.get('/contacts', getTokens, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 100;
    const contacts = await getContacts(req.tokens, maxResults);
    res.json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/contacts/search', getTokens, async (req, res) => {
  try {
    const { query } = req.body;
    const contacts = await searchContacts(req.tokens, query);
    res.json({ contacts });
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/contacts/:resourceName', getTokens, async (req, res) => {
  try {
    const { resourceName } = req.params;
    const contact = await getContact(req.tokens, resourceName);
    res.json({ contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tasks endpoints
router.get('/tasks', getTokens, async (req, res) => {
  try {
    const tasklistId = req.query.tasklist || '@default';
    const tasks = await getTasks(req.tokens, tasklistId);
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/upcoming', getTokens, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 10;
    const tasks = await getUpcomingTasks(req.tokens, maxResults);
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/lists', getTokens, async (req, res) => {
  try {
    const { getTaskLists } = await import('../services/tasksService.js');
    const taskLists = await getTaskLists(req.tokens);
    res.json({ taskLists });
  } catch (error) {
    console.error('Error fetching task lists:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/tasks/create', getTokens, async (req, res) => {
  try {
    const { tasklistId, title, notes, due } = req.body;
    const task = await createTask(req.tokens, tasklistId || '@default', title, notes, due);
    res.json({ task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/tasks/:taskId/complete', getTokens, async (req, res) => {
  try {
    const { taskId } = req.params;
    const tasklistId = req.query.tasklist || '@default';
    const task = await completeTask(req.tokens, tasklistId, taskId);
    res.json({ task });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google Meet endpoints
router.get('/meet/upcoming', getTokens, async (req, res) => {
  try {
    const meetLinks = await getMeetLinksFromCalendar(req.tokens);
    res.json({ meetings: meetLinks });
  } catch (error) {
    console.error('Error fetching Meet links:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/meet/next', getTokens, async (req, res) => {
  try {
    const nextMeet = await getNextMeetLink(req.tokens);
    res.json({ meeting: nextMeet });
  } catch (error) {
    console.error('Error fetching next Meet:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/meet/create', getTokens, async (req, res) => {
  try {
    const { summary, startTime, endTime, attendees } = req.body;
    const meetEvent = await createMeetEvent(req.tokens, summary, startTime, endTime, attendees || []);
    res.json({ meeting: meetEvent });
  } catch (error) {
    console.error('Error creating Meet event:', error);
    res.status(500).json({ error: error.message });
  }
});

// Drive endpoints
router.get('/drive/files', getTokens, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 20;
    const query = req.query.q || '';
    const files = await listFiles(req.tokens, query, maxResults);
    res.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/drive/recent', getTokens, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 10;
    const files = await getRecentFiles(req.tokens, maxResults);
    res.json({ files });
  } catch (error) {
    console.error('Error fetching recent files:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/drive/search', getTokens, async (req, res) => {
  try {
    const { query, mimeType } = req.body;
    const files = await searchFiles(req.tokens, query, mimeType);
    res.json({ files });
  } catch (error) {
    console.error('Error searching files:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/drive/files/:fileId', getTokens, async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await getFile(req.tokens, fileId);
    res.json({ file });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/drive/files/type/:mimeType', getTokens, async (req, res) => {
  try {
    const { mimeType } = req.params;
    const maxResults = parseInt(req.query.maxResults) || 20;
    const files = await getFilesByType(req.tokens, mimeType, maxResults);
    res.json({ files });
  } catch (error) {
    console.error('Error fetching files by type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Speech endpoints
router.post('/speech/tts', async (req, res) => {
  try {
    const { text, voiceId, modelId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const { textToSpeech } = await import('../services/speechService.js');
    const audioBuffer = await textToSpeech(text, { voiceId, modelId });
    
    // If TTS is not available (API key missing), return error
    if (!audioBuffer) {
      return res.status(503).json({ 
        error: 'Text-to-speech not available',
        message: 'ElevenLabs API key not configured. Please set xpi-api-key or ELEVENLABS_API_KEY in .env file.'
      });
    }
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/speech/voices', async (req, res) => {
  try {
    const { getVoices } = await import('../services/speechService.js');
    const voices = await getVoices();
    res.json({ voices });
  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/speech/stt', async (req, res) => {
  try {
    // Speech-to-text is handled on the client side using Web Speech API
    // This endpoint can be used for server-side STT if needed in the future
    // For now, we'll return an error suggesting client-side implementation
    res.status(501).json({ 
      error: 'Server-side STT not implemented. Use Web Speech API on client side.',
      suggestion: 'Use navigator.mediaDevices.getUserMedia() and SpeechRecognition API'
    });
  } catch (error) {
    console.error('Error with speech-to-text:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

