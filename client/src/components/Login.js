import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('http://localhost:3001/auth/login');
      window.location.href = response.data.authUrl;
    } catch (err) {
      setError('Failed to initiate login. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🤖 Google AIO Assistant</h1>
          <p>Your intelligent assistant for Google services</p>
        </div>
        
        <div className="login-content">
          <p className="login-description">
            Connect your Google account to access Calendar, Maps, Docs, Sheets, Slides, and more.
            This assistant will help you manage your schedule, calculate travel times, and create documents.
          </p>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            className="login-button" 
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Connecting...' : '🔐 Sign in with Google'}
          </button>
          
          <div className="login-features">
            <h3>Features:</h3>
            <ul>
              <li>📅 View and manage your calendar</li>
              <li>🗺️ Get travel times and directions</li>
              <li>📄 Create documents and presentations</li>
              <li>📊 Access Sheets and Gmail</li>
              <li>💡 Intelligent scheduling assistance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

