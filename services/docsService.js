import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';

export async function createDocument(tokens, title, content) {
  const auth = getAuthClient(tokens);
  const docs = google.docs({ version: 'v1', auth });
  
  try {
    // Create document
    const docResponse = await docs.documents.create({
      requestBody: {
        title: title
      }
    });
    
    const documentId = docResponse.data.documentId;
    
    // Insert content - need to get the document structure first
    if (content && content.trim()) {
      // Wait a bit for the document to be fully created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the document to find the correct insertion point
      const doc = await docs.documents.get({ documentId });
      
      // Find where to insert - look for the end of the document body
      let insertIndex = 1;
      
      if (doc.data.body && doc.data.body.content && doc.data.body.content.length > 0) {
        // Get the last element's end index
        const lastElement = doc.data.body.content[doc.data.body.content.length - 1];
        insertIndex = lastElement.endIndex - 1;
      }
      
      // Prepare content - ensure proper formatting
      let formattedContent = content.trim();
      
      // Split into paragraphs and insert each one
      const paragraphs = formattedContent.split('\n').filter(p => p.trim() || p === '');
      const requests = [];
      let currentIndex = insertIndex;
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        if (paragraph.trim()) {
          // Insert paragraph text
          requests.push({
            insertText: {
              location: {
                index: currentIndex
              },
              text: paragraph + (i < paragraphs.length - 1 ? '\n' : '')
            }
          });
          // Update index for next insertion (approximate)
          currentIndex += paragraph.length + 1;
        } else if (i < paragraphs.length - 1) {
          // Empty line - add newline
          requests.push({
            insertText: {
              location: {
                index: currentIndex
              },
              text: '\n'
            }
          });
          currentIndex += 1;
        }
      }
      
      // Execute all insertions
      if (requests.length > 0) {
        // Insert all at once in a single batch
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: {
                    index: insertIndex
                  },
                  text: formattedContent
                }
              }
            ]
          }
        });
      }
    }
    
    return {
      documentId,
      documentUrl: `https://docs.google.com/document/d/${documentId}/edit`
    };
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
}

export async function createPresentation(tokens, title, slides) {
  const auth = getAuthClient(tokens);
  const slidesAPI = google.slides({ version: 'v1', auth });
  
  try {
    // Create presentation
    const presentationResponse = await slidesAPI.presentations.create({
      requestBody: {
        title: title
      }
    });
    
    const presentationId = presentationResponse.data.presentationId;
    
    // Get the presentation to access page elements
    const presentation = await slidesAPI.presentations.get({
      presentationId
    });
    
    const requests = [];
    
    // Delete default slide if we're creating custom slides
    if (slides && slides.length > 0) {
      if (presentation.data.slides && presentation.data.slides.length > 0) {
        requests.push({
          deleteObject: {
            objectId: presentation.data.slides[0].objectId
          }
        });
      }
    }
    
    // Create slides with content
    if (slides && slides.length > 0) {
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        
        // Select layout based on slide index for variety
        // Use TITLE_AND_BODY for most slides, TITLE_ONLY for first, etc.
        let layoutType = 'TITLE_AND_BODY';
        if (i === 0) {
          layoutType = 'TITLE';
        } else if (i % 3 === 0) {
          layoutType = 'TITLE_AND_TWO_COLUMNS';
        } else if (i % 4 === 0) {
          layoutType = 'SECTION_HEADER';
        }
        
        // Create slide with layout
        const createSlideRequest = {
          createSlide: {
            slideLayoutReference: {
              predefinedLayout: layoutType
            },
            insertionIndex: i
          }
        };
        
        requests.push(createSlideRequest);
      }
      
      // Execute slide creation first
      if (requests.length > 0) {
        await slidesAPI.presentations.batchUpdate({
          presentationId,
          requestBody: {
            requests
          }
        });
        
        // Wait a bit for slides to be fully created
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get updated presentation to access new slide IDs and elements
        const updatedPresentation = await slidesAPI.presentations.get({
          presentationId
        });
        
        // Now add content to each slide
        const contentRequests = [];
        
        for (let i = 0; i < slides.length && i < updatedPresentation.data.slides.length; i++) {
          const slide = slides[i];
          const slideTitle = slide.title || `Slide ${i + 1}`;
          const slideContent = slide.content || '';
          const slideData = updatedPresentation.data.slides[i];
          const pageElements = slideData.pageElements || [];
          
          // Find text boxes - typically first is title, second is body
          const textBoxes = pageElements
            .filter(el => el.shape && el.shape.shapeType === 'TEXT_BOX')
            .map(el => el.objectId);
          
          const titleBoxId = textBoxes[0] || null;
          const bodyBoxId = textBoxes[1] || textBoxes[0] || null; // Use first as body if no second
          
          // Add title to first text box
          if (titleBoxId && slideTitle) {
            contentRequests.push({
              insertText: {
                objectId: titleBoxId,
                insertionIndex: 0,
                text: slideTitle
              }
            });
          }
          
          // Add content to body text box
          if (bodyBoxId && slideContent && bodyBoxId !== titleBoxId) {
            // Clean up content - remove extra newlines
            const cleanContent = slideContent.trim().replace(/\n{3,}/g, '\n\n');
            contentRequests.push({
              insertText: {
                objectId: bodyBoxId,
                insertionIndex: 0,
                text: cleanContent
              }
            });
          } else if (titleBoxId && slideContent && !bodyBoxId) {
            // If only one text box, add content after title
            const cleanContent = slideContent.trim().replace(/\n{3,}/g, '\n\n');
            contentRequests.push({
              insertText: {
                objectId: titleBoxId,
                insertionIndex: slideTitle.length,
                text: '\n\n' + cleanContent
              }
            });
          }
        }
        
        // Execute content insertion
        if (contentRequests.length > 0) {
          await slidesAPI.presentations.batchUpdate({
            presentationId,
            requestBody: {
              requests: contentRequests
            }
          });
        }
      }
    }
    
    return {
      presentationId,
      presentationUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`
    };
  } catch (error) {
    console.error('Error creating presentation:', error);
    throw error;
  }
}

export async function appendToDocument(tokens, documentId, content) {
  const auth = getAuthClient(tokens);
  const docs = google.docs({ version: 'v1', auth });
  
  try {
    // Get document to find end index
    const doc = await docs.documents.get({ documentId });
    const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;
    
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: endIndex
              },
              text: '\n' + content
            }
          }
        ]
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error appending to document:', error);
    throw error;
  }
}

