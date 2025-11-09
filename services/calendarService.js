import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';

export async function getUpcomingEvents(tokens, maxResults = 10) {
  const auth = getAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });
  
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Next 7 days
  
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

export async function getEventDetails(tokens, eventId) {
  const auth = getAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const response = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching event details:', error);
    throw error;
  }
}

export async function getScheduleForDate(tokens, date) {
  const auth = getAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }
}

export function formatEventForResponse(event) {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;
  const location = event.location || 'No location specified';
  
  return {
    id: event.id,
    summary: event.summary || 'No title',
    description: event.description || '',
    location,
    start,
    end,
    attendees: event.attendees?.map(a => a.email) || [],
    htmlLink: event.htmlLink
  };
}

