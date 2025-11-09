import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';
import { listFiles, searchFiles, MIME_TYPES } from './driveService.js';

// Note: Google Keep doesn't have a public API
// We'll use Google Docs as notes and search Drive for Keep-like notes
export async function createNote(tokens, title, content) {
  const auth = getAuthClient(tokens);
  const docs = google.docs({ version: 'v1', auth });
  
  try {
    const docResponse = await docs.documents.create({
      requestBody: {
        title: title || `Note - ${new Date().toLocaleDateString()}`
      }
    });
    
    const documentId = docResponse.data.documentId;
    
    if (content) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: {
                  index: 1
                },
                text: content
              }
            }
          ]
        }
      });
    }
    
    return {
      noteId: documentId,
      noteUrl: `https://docs.google.com/document/d/${documentId}/edit`,
      title,
      content
    };
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
}

export async function getNotes(tokens, maxResults = 20) {
  // Search for documents that might be notes (small docs, recently created)
  try {
    const files = await searchFiles(tokens, 'note', MIME_TYPES.DOCS);
    return files.slice(0, maxResults);
  } catch (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }
}

export async function searchNotes(tokens, query) {
  try {
    const files = await searchFiles(tokens, query, MIME_TYPES.DOCS);
    return files;
  } catch (error) {
    console.error('Error searching notes:', error);
    throw error;
  }
}

