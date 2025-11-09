import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatInterface.css';

function ChatInterface({ sessionId, onLogout }) {
  const [messages, setMessages] = useState([
    {
      type: 'assistant',
      content: "Hello! I'm your Google AIO Assistant. I can help you with:\n\n• Your schedule and calendar\n• Travel times and directions\n• Creating documents and presentations\n• And much more!\n\nWhat would you like to know?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }

    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up audio event listeners to track playback state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsAudioPlaying(true);
    const handlePause = () => setIsAudioPlaying(false);
    const handleEnded = () => setIsAudioPlaying(false);
    const handleError = () => setIsAudioPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:3001/api/query',
        {
          query: userMessage,
          currentLocation: currentLocation ? `${currentLocation.lat},${currentLocation.lng}` : null
        },
        {
          headers: {
            'X-Session-Id': sessionId
          }
        }
      );

      const assistantMessage = {
        type: 'assistant',
        content: response.data.content,
        events: response.data.events,
        travelTimes: response.data.travelTimes,
        link: response.data.link,
        contacts: response.data.contacts,
        tasks: response.data.tasks,
        meeting: response.data.meeting,
        files: response.data.files,
        notes: response.data.notes,
        messages: response.data.messages
      };

      // Generate and play audio if TTS is enabled
      if (textToSpeechEnabled && response.data.content) {
        try {
          const audioResponse = await axios.post(
            'http://localhost:3001/api/speech/tts',
            { text: response.data.content },
            { responseType: 'blob', validateStatus: (status) => status < 500 } // Don't throw on 503
          );
          
          // Check if TTS is available (not 503)
          if (audioResponse.status === 503) {
            console.warn('TTS not available: ElevenLabs API key not configured');
            // Optionally disable TTS toggle if API key is missing
            setTextToSpeechEnabled(false);
          } else if (audioResponse.data instanceof Blob) {
            const audioUrl = URL.createObjectURL(audioResponse.data);
            assistantMessage.audioUrl = audioUrl;
            
            // Play audio automatically if TTS is enabled
            if (audioRef.current && textToSpeechEnabled) {
              audioRef.current.src = audioUrl;
              audioRef.current.play().catch(err => {
                console.error('Error playing audio:', err);
                setIsAudioPlaying(false);
              });
            }
          }
        } catch (ttsError) {
          // Only log if it's not a 503 (which we handle above)
          if (ttsError.response?.status !== 503) {
            console.warn('TTS generation failed:', ttsError.message);
          }
          // Continue without audio
        }
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error.response?.data?.error || error.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const formatMessage = (message) => {
    const lines = message.content.split('\n');
    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <h1>🤖 Google AIO Assistant</h1>
          <div className="header-controls">
            {/* TTS Toggle/Stop Button */}
            {isAudioPlaying ? (
              <button
                className="tts-stop-button"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    setIsAudioPlaying(false);
                  }
                }}
                title="Stop audio playback"
              >
                ⏹️
              </button>
            ) : (
              <button
                className={`voice-toggle ${textToSpeechEnabled ? 'active' : ''}`}
                onClick={() => {
                  const newValue = !textToSpeechEnabled;
                  setTextToSpeechEnabled(newValue);
                  
                  // If disabling TTS while audio is playing, stop it
                  if (!newValue && audioRef.current && !audioRef.current.paused) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    setIsAudioPlaying(false);
                  }
                }}
                title={textToSpeechEnabled ? 'Disable Text-to-Speech (Auto-play)' : 'Enable Text-to-Speech (Auto-play)'}
              >
                {textToSpeechEnabled ? '🔊' : '🔇'}
              </button>
            )}
            <button className="logout-button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            <div className="message-content">
              {formatMessage(message)}
              
              {message.events && message.events.length > 0 && (
                <div className="events-list">
                  <h4>Upcoming Events:</h4>
                  {message.events.map((event, idx) => (
                    <div key={idx} className="event-item">
                      <strong>{event.summary}</strong>
                      <p>{new Date(event.start).toLocaleString()}</p>
                      {event.location && <p>📍 {event.location}</p>}
                      {event.htmlLink && (
                        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                          Open in Calendar
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {message.travelTimes && (
                <div className="travel-times">
                  <h4>Travel Options:</h4>
                  {message.travelTimes.driving && (
                    <div className="travel-option">
                      🚗 <strong>Driving:</strong> {message.travelTimes.driving.duration} ({message.travelTimes.driving.distance})
                    </div>
                  )}
                  {message.travelTimes.transit && (
                    <div className="travel-option">
                      🚇 <strong>Transit:</strong> {message.travelTimes.transit.duration} ({message.travelTimes.transit.distance})
                    </div>
                  )}
                  {message.travelTimes.walking && (
                    <div className="travel-option">
                      🚶 <strong>Walking:</strong> {message.travelTimes.walking.duration} ({message.travelTimes.walking.distance})
                    </div>
                  )}
                </div>
              )}

              {message.link && (
                <div className="document-link">
                  <a href={message.link} target="_blank" rel="noopener noreferrer" className="link-button">
                    {message.link.includes('meet.google.com') ? '🎥 Join Meeting' : '📄 Open Document'}
                  </a>
                </div>
              )}

              {message.contacts && message.contacts.length > 0 && (
                <div className="contacts-list">
                  <h4>Contacts:</h4>
                  {message.contacts.map((contact, idx) => (
                    <div key={idx} className="contact-item">
                      <strong>{contact.name}</strong>
                      {contact.email && <p>📧 {contact.email}</p>}
                      {contact.phone && <p>📞 {contact.phone}</p>}
                      {contact.organization && <p>🏢 {contact.organization}</p>}
                    </div>
                  ))}
                </div>
              )}

              {message.tasks && message.tasks.length > 0 && (
                <div className="tasks-list">
                  <h4>Tasks:</h4>
                  {message.tasks.map((task, idx) => (
                    <div key={idx} className="task-item">
                      <strong>✅ {task.title}</strong>
                      {task.due && <p>Due: {new Date(task.due).toLocaleString()}</p>}
                      {task.notes && <p>{task.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              {message.meeting && (
                <div className="meeting-link">
                  <h4>Google Meet:</h4>
                  <a href={message.meeting.meetLink} target="_blank" rel="noopener noreferrer" className="link-button">
                    🎥 Join Meeting
                  </a>
                </div>
              )}

              {message.files && message.files.length > 0 && (
                <div className="files-list">
                  <h4>Files:</h4>
                  {message.files.map((file, idx) => (
                    <div key={idx} className="file-item">
                      <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                        📄 {file.name}
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {message.notes && message.notes.length > 0 && (
                <div className="notes-list">
                  <h4>Notes:</h4>
                  {message.notes.map((note, idx) => (
                    <div key={idx} className="note-item">
                      <a href={note.webViewLink} target="_blank" rel="noopener noreferrer">
                        📝 {note.name}
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {message.messages && message.messages.length > 0 && (
                <div className="messages-list">
                  <h4>Emails:</h4>
                  {message.messages.map((msg, idx) => (
                    <div key={idx} className="message-item">
                      <strong>{msg.subject || 'No Subject'}</strong>
                      <p>From: {msg.from}</p>
                      {msg.snippet && <p className="snippet">{msg.snippet}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <div className="input-container">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your schedule, travel, or documents..."
            disabled={loading}
          />
          {recognition && (
            <button
              type="button"
              className={`voice-button ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Stop listening' : 'Start voice input'}
              disabled={loading}
            >
              🎤
            </button>
          )}
        </div>
        <button type="submit" className="send-button" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
      
      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}

export default ChatInterface;

