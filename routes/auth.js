import express from 'express';
import { getAuthUrl, getToken } from '../config/googleAuth.js';
import { tokenStore } from './api.js';

const router = express.Router();

router.get('/login', (req, res) => {
  const authUrl = getAuthUrl();
  res.json({ authUrl });
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }
  
  try {
    const { tokens } = await getToken(code);
    
    // Generate a session ID (in production, use proper session management)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    tokenStore.set(sessionId, tokens);
    
    // Redirect to frontend with session ID
    res.redirect(`http://localhost:3000?session=${sessionId}`);
  } catch (error) {
    console.error('Error during OAuth callback:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

router.get('/tokens/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const tokens = tokenStore.get(sessionId);
  
  if (!tokens) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({ tokens });
});

export default router;

