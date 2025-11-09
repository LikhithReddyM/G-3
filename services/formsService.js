import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';

/**
 * Google Forms API service
 * Full CRUD operations for Google Forms
 */

export async function createForm(tokens, title, description = '', questions = []) {
  const auth = getAuthClient(tokens);
  const forms = google.forms({ version: 'v1', auth });
  
  try {
    // Create a new form
    const formResponse = await forms.forms.create({
      requestBody: {
        info: {
          title: title,
          description: description,
          documentTitle: title
        }
      }
    });
    
    const formId = formResponse.data.formId;
    
    // If questions are provided, add them to the form
    if (questions && questions.length > 0) {
      // Wait a bit for the form to be fully created
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const requests = questions.map((question, index) => {
        return buildQuestionRequest(question, index);
      });
      
      if (requests.length > 0) {
        await forms.forms.batchUpdate({
          formId,
          requestBody: {
            requests
          }
        });
      }
    }
    
    return {
      formId,
      formUrl: `https://docs.google.com/forms/d/${formId}/edit`,
      title,
      questionsAdded: questions.length
    };
  } catch (error) {
    console.error('Error creating form:', error);
    throw error;
  }
}

export async function getForm(tokens, formId) {
  const auth = getAuthClient(tokens);
  const forms = google.forms({ version: 'v1', auth });
  
  try {
    const form = await forms.forms.get({ formId });
    return form.data;
  } catch (error) {
    console.error('Error getting form:', error);
    throw error;
  }
}

export async function listForms(tokens, maxResults = 20) {
  const auth = getAuthClient(tokens);
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.form'",
      pageSize: maxResults,
      fields: 'files(id, name, createdTime, modifiedTime, webViewLink, owners)',
      orderBy: 'modifiedTime desc'
    });
    
    return response.data.files.map(file => ({
      formId: file.id,
      title: file.name,
      formUrl: file.webViewLink,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime
    }));
  } catch (error) {
    console.error('Error listing forms:', error);
    throw error;
  }
}

export async function updateForm(tokens, formId, updates) {
  const auth = getAuthClient(tokens);
  const forms = google.forms({ version: 'v1', auth });
  
  try {
    const requests = [];
    
    if (updates.title) {
      requests.push({
        updateFormInfo: {
          info: {
            title: updates.title
          },
          updateMask: 'title'
        }
      });
    }
    
    if (updates.description) {
      requests.push({
        updateFormInfo: {
          info: {
            description: updates.description
          },
          updateMask: 'description'
        }
      });
    }
    
    if (requests.length > 0) {
      await forms.forms.batchUpdate({
        formId,
        requestBody: {
          requests
        }
      });
    }
    
    return { success: true, formId };
  } catch (error) {
    console.error('Error updating form:', error);
    throw error;
  }
}

export async function deleteForm(tokens, formId) {
  const auth = getAuthClient(tokens);
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    await drive.files.delete({ fileId: formId });
    return { success: true, formId };
  } catch (error) {
    console.error('Error deleting form:', error);
    throw error;
  }
}

/**
 * Helper function to build a question request for Google Forms API
 */
function buildQuestionRequest(question, index = 0) {
  const questionItem = {
    title: question.title || question.question || '',
    questionItem: {
      question: {
        required: question.required || false
      }
    }
  };
  
  // Handle different question types
  const questionType = (question.type || question.questionType || 'text').toLowerCase();
  
  if (questionType === 'multiple_choice' || questionType === 'radio') {
    questionItem.questionItem.question.choiceQuestion = {
      type: 'RADIO',
      options: (question.options || question.choices || []).map(opt => ({ 
        value: typeof opt === 'string' ? opt : opt.value || opt.label || String(opt)
      }))
    };
  } else if (questionType === 'checkbox' || questionType === 'checkboxes') {
    questionItem.questionItem.question.choiceQuestion = {
      type: 'CHECKBOX',
      options: (question.options || question.choices || []).map(opt => ({ 
        value: typeof opt === 'string' ? opt : opt.value || opt.label || String(opt)
      }))
    };
  } else if (questionType === 'dropdown' || questionType === 'select') {
    questionItem.questionItem.question.choiceQuestion = {
      type: 'DROP_DOWN',
      options: (question.options || question.choices || []).map(opt => ({ 
        value: typeof opt === 'string' ? opt : opt.value || opt.label || String(opt)
      }))
    };
  } else if (questionType === 'paragraph' || questionType === 'long_text') {
    questionItem.questionItem.question.textQuestion = {
      paragraph: true
    };
  } else if (questionType === 'linear_scale' || questionType === 'scale') {
    questionItem.questionItem.question.scaleQuestion = {
      low: question.low || 1,
      high: question.high || 5,
      lowLabel: question.lowLabel || '',
      highLabel: question.highLabel || ''
    };
  } else if (questionType === 'date') {
    questionItem.questionItem.question.dateQuestion = {
      includeTime: false,
      includeYear: true
    };
  } else if (questionType === 'time') {
    questionItem.questionItem.question.timeQuestion = {
      duration: false
    };
  } else if (questionType === 'file_upload') {
    questionItem.questionItem.question.fileUploadQuestion = {
      maxFileSize: question.maxFileSize || '10MB',
      maxFiles: question.maxFiles || 1
    };
  } else {
    // Default to short text
    questionItem.questionItem.question.textQuestion = {};
  }
  
  return {
    createItem: {
      item: questionItem,
      location: {
        index: question.index !== undefined ? question.index : index
      }
    }
  };
}

export async function addQuestionToForm(tokens, formId, question) {
  const auth = getAuthClient(tokens);
  const forms = google.forms({ version: 'v1', auth });
  
  try {
    // Get current form to determine the next index
    const form = await forms.forms.get({ formId });
    const currentItemCount = form.data.items ? form.data.items.length : 0;
    
    const request = buildQuestionRequest(question, currentItemCount);
    
    await forms.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [request]
      }
    });
    
    return { success: true, formId };
  } catch (error) {
    console.error('Error adding question to form:', error);
    throw error;
  }
}

export async function addQuestionsToForm(tokens, formId, questions) {
  const auth = getAuthClient(tokens);
  const forms = google.forms({ version: 'v1', auth });
  
  try {
    // Get current form to determine the starting index
    const form = await forms.forms.get({ formId });
    const currentItemCount = form.data.items ? form.data.items.length : 0;
    
    const requests = questions.map((question, index) => {
      return buildQuestionRequest(question, currentItemCount + index);
    });
    
    if (requests.length > 0) {
      await forms.forms.batchUpdate({
        formId,
        requestBody: {
          requests
        }
      });
    }
    
    return { success: true, formId, questionsAdded: questions.length };
  } catch (error) {
    console.error('Error adding questions to form:', error);
    throw error;
  }
}

export async function updateQuestion(tokens, formId, questionId, updates) {
  const auth = getAuthClient(tokens);
  const forms = google.forms({ version: 'v1', auth });
  
  try {
    const updateFields = [];
    const questionUpdate = {};
    
    if (updates.title !== undefined) {
      updateFields.push('title');
      questionUpdate.title = updates.title;
    }
    
    if (updates.required !== undefined) {
      updateFields.push('required');
      questionUpdate.required = updates.required;
    }
    
    if (updates.options !== undefined || updates.choices !== undefined) {
      updateFields.push('choiceQuestion.options');
      const options = updates.options || updates.choices || [];
      questionUpdate.choiceQuestion = {
        options: options.map(opt => ({ 
          value: typeof opt === 'string' ? opt : opt.value || opt.label || String(opt)
        }))
      };
    }
    
    if (updateFields.length === 0) {
      return { success: false, message: 'No fields to update' };
    }
    
    const request = {
      updateItem: {
        item: {
          itemId: questionId,
          questionItem: {
            question: questionUpdate
          }
        },
        location: {
          index: updates.index !== undefined ? updates.index : 0
        },
        updateMask: updateFields.join(',')
      }
    };
    
    await forms.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [request]
      }
    });
    
    return { success: true, formId, questionId };
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
}

export async function deleteQuestion(tokens, formId, questionId) {
  const auth = getAuthClient(tokens);
  const forms = google.forms({ version: 'v1', auth });
  
  try {
    const request = {
      deleteItem: {
        location: {
          index: questionId
        }
      }
    };
    
    await forms.forms.batchUpdate({
      formId,
      requestBody: {
        requests: [request]
      }
    });
    
    return { success: true, formId };
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
}

export async function getFormResponses(tokens, formId) {
  const auth = getAuthClient(tokens);
  const forms = google.forms({ version: 'v1', auth });
  
  try {
    const response = await forms.forms.responses.list({
      formId
    });
    
    return response.data.responses || [];
  } catch (error) {
    console.error('Error getting form responses:', error);
    throw error;
  }
}

