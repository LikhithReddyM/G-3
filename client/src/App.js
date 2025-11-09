import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for session in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session');
    
    if (session) {
      setSessionId(session);
      setIsAuthenticated(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check localStorage for saved session
      const savedSession = localStorage.getItem('googleAioSession');
      if (savedSession) {
        setSessionId(savedSession);
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogin = (session) => {
    setSessionId(session);
    setIsAuthenticated(true);
    localStorage.setItem('googleAioSession', session);
  };

  const handleLogout = () => {
    setSessionId(null);
    setIsAuthenticated(false);
    localStorage.removeItem('googleAioSession');
  };

  return (
    <div className="App">
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <ChatInterface sessionId={sessionId} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;

