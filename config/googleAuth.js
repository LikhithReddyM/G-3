import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load credentials
let credentials = null;
let credConfig = null;

try {
  const credsPath = join(__dirname, '..', 'credentials.json');
  const credsFile = readFileSync(credsPath, 'utf8');
  credentials = JSON.parse(credsFile);
  
  // Handle both 'web' and 'installed' credential types
  if (credentials.web) {
    credConfig = credentials.web;
  } else if (credentials.installed) {
    credConfig = credentials.installed;
  } else {
    throw new Error('credentials.json must have either "web" or "installed" property');
  }
  
  // Ensure redirect_uris is an array and use the correct one
  // Override with the correct redirect URI for this application
  credConfig.redirect_uris = [process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/callback'];
} catch (error) {
  if (error.code === 'ENOENT') {
    console.warn('credentials.json not found. Using environment variables.');
  } else {
    console.warn('Error loading credentials.json:', error.message);
    console.warn('Falling back to environment variables.');
  }
  
  // Fallback to environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/callback';
  
  if (!clientId || !clientSecret) {
    console.error('\n❌ ERROR: Missing Google OAuth credentials!');
    console.error('\nPlease do one of the following:');
    console.error('1. Place credentials.json in the root directory, OR');
    console.error('2. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file\n');
    process.exit(1);
  }
  
  credConfig = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri]
  };
}

const oauth2Client = new google.auth.OAuth2(
  credConfig.client_id,
  credConfig.client_secret,
  credConfig.redirect_uris[0]
);

// Scopes for all Google services
export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

export function getToken(code) {
  return oauth2Client.getToken(code);
}

export function setCredentials(tokens) {
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

export function getAuthClient(tokens) {
  const client = new google.auth.OAuth2(
    credConfig.client_id,
    credConfig.client_secret,
    credConfig.redirect_uris[0]
  );
  client.setCredentials(tokens);
  return client;
}

export default oauth2Client;

