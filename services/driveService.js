import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';

export async function listFiles(tokens, query = '', maxResults = 20) {
  const auth = getAuthClient(tokens);
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    const params = {
      pageSize: maxResults,
      fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, thumbnailLink)',
      orderBy: 'modifiedTime desc'
    };
    
    if (query) {
      params.q = `name contains '${query}' or fullText contains '${query}'`;
    }
    
    const response = await drive.files.list(params);
    return response.data.files || [];
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

export async function searchFiles(tokens, query, mimeType = null) {
  const auth = getAuthClient(tokens);
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    let searchQuery = `name contains '${query}' or fullText contains '${query}'`;
    
    if (mimeType) {
      searchQuery += ` and mimeType = '${mimeType}'`;
    }
    
    const response = await drive.files.list({
      q: searchQuery,
      pageSize: 20,
      fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)'
    });
    
    return response.data.files || [];
  } catch (error) {
    console.error('Error searching files:', error);
    throw error;
  }
}

export async function getFile(tokens, fileId) {
  const auth = getAuthClient(tokens);
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, modifiedTime, size, webViewLink, thumbnailLink, owners, shared'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting file:', error);
    throw error;
  }
}

export async function getRecentFiles(tokens, maxResults = 10) {
  const auth = getAuthClient(tokens);
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    const response = await drive.files.list({
      pageSize: maxResults,
      orderBy: 'modifiedTime desc',
      fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, thumbnailLink)'
    });
    
    return response.data.files || [];
  } catch (error) {
    console.error('Error fetching recent files:', error);
    throw error;
  }
}

export async function getFilesByType(tokens, mimeType, maxResults = 20) {
  const auth = getAuthClient(tokens);
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    const response = await drive.files.list({
      q: `mimeType = '${mimeType}'`,
      pageSize: maxResults,
      orderBy: 'modifiedTime desc',
      fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)'
    });
    
    return response.data.files || [];
  } catch (error) {
    console.error('Error fetching files by type:', error);
    throw error;
  }
}

// Helper to get MIME type for common file types
export const MIME_TYPES = {
  DOCS: 'application/vnd.google-apps.document',
  SHEETS: 'application/vnd.google-apps.spreadsheet',
  SLIDES: 'application/vnd.google-apps.presentation',
  PDF: 'application/pdf',
  IMAGE: 'image/',
  VIDEO: 'video/'
};

