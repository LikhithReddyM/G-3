import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';

export async function getTaskLists(tokens) {
  const auth = getAuthClient(tokens);
  const tasks = google.tasks({ version: 'v1', auth });
  
  try {
    const response = await tasks.tasklists.list();
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching task lists:', error);
    throw error;
  }
}

export async function getTasks(tokens, tasklistId = '@default') {
  const auth = getAuthClient(tokens);
  const tasks = google.tasks({ version: 'v1', auth });
  
  try {
    const response = await tasks.tasks.list({
      tasklist: tasklistId,
      showCompleted: false,
      showHidden: false
    });
    
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

export async function createTask(tokens, tasklistId, title, notes = '', due = null) {
  const auth = getAuthClient(tokens);
  const tasks = google.tasks({ version: 'v1', auth });
  
  try {
    const task = {
      title,
      notes,
      status: 'needsAction'
    };
    
    if (due) {
      task.due = new Date(due).toISOString();
    }
    
    const response = await tasks.tasks.insert({
      tasklist: tasklistId,
      requestBody: task
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

export async function completeTask(tokens, tasklistId, taskId) {
  const auth = getAuthClient(tokens);
  const tasks = google.tasks({ version: 'v1', auth });
  
  try {
    const response = await tasks.tasks.patch({
      tasklist: tasklistId,
      task: taskId,
      requestBody: {
        status: 'completed'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
}

export async function getUpcomingTasks(tokens, maxResults = 10) {
  const auth = getAuthClient(tokens);
  const tasks = google.tasks({ version: 'v1', auth });
  
  try {
    const taskLists = await getTaskLists(tokens);
    const allTasks = [];
    
    for (const taskList of taskLists) {
      const taskListTasks = await getTasks(tokens, taskList.id);
      allTasks.push(...taskListTasks.map(task => ({
        ...task,
        taskListName: taskList.title
      })));
    }
    
    // Sort by due date
    allTasks.sort((a, b) => {
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    });
    
    return allTasks.slice(0, maxResults);
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    throw error;
  }
}

