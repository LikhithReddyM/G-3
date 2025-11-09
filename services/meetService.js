import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';
import { getUpcomingEvents } from './calendarService.js';

export async function getMeetLinksFromCalendar(tokens) {
  const auth = getAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const meetEvents = (response.data.items || [])
      .filter(event => event.hangoutLink || event.conferenceData)
      .map(event => ({
        id: event.id,
        summary: event.summary || 'Untitled Meeting',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        hangoutLink: event.hangoutLink,
        meetLink: event.conferenceData?.entryPoints?.[0]?.uri || event.hangoutLink,
        location: event.location || '',
        attendees: event.attendees?.map(a => ({
          email: a.email,
          responseStatus: a.responseStatus
        })) || []
      }));
    
    return meetEvents;
  } catch (error) {
    console.error('Error fetching Meet links:', error);
    throw error;
  }
}

export async function createMeetEvent(tokens, summary, startTime, endTime, attendees = []) {
  const auth = getAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const event = {
      summary,
      start: {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      attendees: attendees.map(email => ({ email }))
    };
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1
    });
    
    return {
      id: response.data.id,
      summary: response.data.summary,
      meetLink: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri,
      htmlLink: response.data.htmlLink,
      start: response.data.start?.dateTime,
      end: response.data.end?.dateTime
    };
  } catch (error) {
    console.error('Error creating Meet event:', error);
    throw error;
  }
}

export async function getNextMeetLink(tokens) {
  const meetEvents = await getMeetLinksFromCalendar(tokens);
  const now = new Date();
  
  const upcoming = meetEvents.find(event => {
    const startTime = new Date(event.start);
    return startTime > now;
  });
  
  return upcoming;
}

