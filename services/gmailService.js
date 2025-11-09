import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';

export async function getMessages(tokens, maxResults = 10) {
  const auth = getAuthClient(tokens);
  const gmail = google.gmail({ version: 'v1', auth });
  
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
    });
    
    const messages = [];
    if (response.data.messages) {
      for (const message of response.data.messages) {
        const messageDetail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });
        
        messages.push({
          id: message.id,
          subject: messageDetail.data.payload?.headers?.find(h => h.name === 'Subject')?.value || 'No Subject',
          from: messageDetail.data.payload?.headers?.find(h => h.name === 'From')?.value || 'Unknown',
          date: messageDetail.data.payload?.headers?.find(h => h.name === 'Date')?.value || '',
          snippet: messageDetail.data.snippet || ''
        });
      }
    }
    
    return messages;
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    throw error;
  }
}

export async function searchMessages(tokens, query, maxResults = 10) {
  const auth = getAuthClient(tokens);
  const gmail = google.gmail({ version: 'v1', auth });
  
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });
    
    const messages = [];
    if (response.data.messages) {
      for (const message of response.data.messages) {
        try {
          const messageDetail = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date']
          });
          
          messages.push({
            id: message.id,
            subject: messageDetail.data.payload?.headers?.find(h => h.name === 'Subject')?.value || 'No Subject',
            from: messageDetail.data.payload?.headers?.find(h => h.name === 'From')?.value || 'Unknown',
            date: messageDetail.data.payload?.headers?.find(h => h.name === 'Date')?.value || '',
            snippet: messageDetail.data.snippet || ''
          });
        } catch (err) {
          console.error(`Error fetching message ${message.id}:`, err);
        }
      }
    }
    
    return messages;
  } catch (error) {
    console.error('Error searching Gmail:', error);
    throw error;
  }
}

