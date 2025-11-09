import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';

export async function createSpreadsheet(tokens, title, data = []) {
  const auth = getAuthClient(tokens);
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    // Create spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: title
        }
      }
    });
    
    const spreadsheetId = spreadsheet.data.spreadsheetId;
    
    // Add data if provided
    if (data.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: data
        }
      });
    }
    
    return {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    };
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
}

export async function appendData(tokens, spreadsheetId, range, values) {
  const auth = getAuthClient(tokens);
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error appending data:', error);
    throw error;
  }
}

export async function readData(tokens, spreadsheetId, range) {
  const auth = getAuthClient(tokens);
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error('Error reading data:', error);
    throw error;
  }
}

