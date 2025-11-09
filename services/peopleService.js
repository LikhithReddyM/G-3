import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';

export async function getContacts(tokens, maxResults = 100) {
  const auth = getAuthClient(tokens);
  const people = google.people({ version: 'v1', auth });
  
  try {
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,phoneNumbers,organizations,photos',
      pageSize: maxResults,
    });
    
    const contacts = (response.data.connections || []).map(contact => ({
      id: contact.resourceName,
      name: contact.names?.[0]?.displayName || 'Unknown',
      email: contact.emailAddresses?.[0]?.value || '',
      phone: contact.phoneNumbers?.[0]?.value || '',
      organization: contact.organizations?.[0]?.name || '',
      photo: contact.photos?.[0]?.url || null
    }));
    
    return contacts;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
}

export async function searchContacts(tokens, query) {
  const auth = getAuthClient(tokens);
  const people = google.people({ version: 'v1', auth });
  
  try {
    const response = await people.people.searchContacts({
      query,
      readMask: 'names,emailAddresses,phoneNumbers,organizations',
    });
    
    const contacts = (response.data.results || []).map(result => {
      const person = result.person;
      return {
        id: person.resourceName,
        name: person.names?.[0]?.displayName || 'Unknown',
        email: person.emailAddresses?.[0]?.value || '',
        phone: person.phoneNumbers?.[0]?.value || '',
        organization: person.organizations?.[0]?.name || ''
      };
    });
    
    return contacts;
  } catch (error) {
    console.error('Error searching contacts:', error);
    throw error;
  }
}

export async function getContact(tokens, resourceName) {
  const auth = getAuthClient(tokens);
  const people = google.people({ version: 'v1', auth });
  
  try {
    const response = await people.people.get({
      resourceName,
      personFields: 'names,emailAddresses,phoneNumbers,organizations,addresses,biographies'
    });
    
    return {
      id: response.data.resourceName,
      name: response.data.names?.[0]?.displayName || 'Unknown',
      email: response.data.emailAddresses?.[0]?.value || '',
      phone: response.data.phoneNumbers?.[0]?.value || '',
      organization: response.data.organizations?.[0]?.name || '',
      address: response.data.addresses?.[0]?.formattedValue || '',
      bio: response.data.biographies?.[0]?.value || ''
    };
  } catch (error) {
    console.error('Error fetching contact:', error);
    throw error;
  }
}

