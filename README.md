# Google AIO Assistant

An intelligent Google Assistant application that integrates multiple Google services using the MCP (Model Context Protocol) protocol. This application provides a unified interface to manage your Google Calendar, Maps, Gmail, Docs, Sheets, Slides, and more.

## Features

- 📅 **Calendar Integration**: View your schedule, upcoming meetings, and get intelligent reminders
- 🗺️ **Maps & Travel**: Get travel times, directions, and route information for multiple transportation modes
- 📧 **Gmail**: Access and search your emails
- 📄 **Docs & Slides**: Create documents and presentations on the fly
- 📊 **Sheets**: Create and manage spreadsheets
- 💡 **Intelligent Assistant**: Combines multiple services to provide contextual responses
  - Automatically calculates travel time for upcoming meetings
  - Suggests optimal departure times based on your schedule
  - Creates documents and presentations based on your requests

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Google Cloud Project** with the following APIs enabled:
   - Google Calendar API
   - Google Maps JavaScript API (for Maps features)
   - Gmail API
   - Google Docs API
   - Google Slides API
   - Google Sheets API
   - Google Drive API
3. **OAuth 2.0 Credentials** (credentials.json file)

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "MCP Google Assistant")
3. Enable the following APIs:
   - Calendar API
   - Gmail API
   - Google Docs API
   - Google Slides API
   - Google Sheets API
   - Google Drive API
   - Maps JavaScript API (for Maps features)
   - Geocoding API (for address lookups)
   - Directions API (for travel times)

4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth 2.0 Client ID**
6. Choose **Web application** or **Desktop app**
7. Add authorized redirect URI: `http://localhost:3001/auth/callback`
8. Download the credentials and save as `credentials.json` in the project root

### 2. Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the root directory (you can copy from `.env.example`):

```env
PORT=3001
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback
GOOGLE_MAPS_API_KEY=your_maps_api_key_here
NODE_ENV=development
```

**Important Notes:**
- If you have `credentials.json`, the app will use it automatically for OAuth credentials
- You **must** set `GOOGLE_MAPS_API_KEY` in `.env` for Maps features to work
- Get your Maps API key from [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials

### 4. Run the Application

**Development Mode:**

```bash
# Terminal 1: Start the backend server
npm start

# Terminal 2: Start the React frontend
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

**Production Mode:**

```bash
# Build the React app
cd client
npm run build
cd ..

# Start the server (serves both API and frontend)
NODE_ENV=production npm start
```

## Usage

### 1. Authentication

1. Click "Sign in with Google" on the login page
2. Authorize the application to access your Google services
3. You'll be redirected back to the application

### 2. Using the Assistant

The assistant understands natural language queries. Here are some examples:

**Calendar Queries:**
- "What's my schedule today?"
- "Show me my upcoming meetings"
- "Do I have any meetings this week?"

**Travel Queries:**
- "How long to get to Central Park?"
- "Travel time from Times Square to JFK Airport"
- "How long from my location to 123 Main St?"

**Document Creation:**
- "Create a report about Q4 sales"
- "Generate a presentation on project status"
- "Make a document called Meeting Notes"

**Combined Intelligence:**
- When you ask about your schedule and a meeting is coming up soon, the assistant will automatically:
  - Check your current location
  - Calculate travel time to the meeting location
  - Show multiple transportation options (driving, transit, walking)
  - Suggest when to leave

### 3. Example Workflow

1. **Ask about schedule**: "What's my schedule?"
   - Assistant shows upcoming events
   - If a meeting is within 3 hours, it automatically calculates travel time

2. **Travel planning**: "How long to get to my 3pm meeting?"
   - Assistant looks up the meeting location
   - Calculates travel time from your current location
   - Shows all transportation options

3. **Document creation**: "Create a report about today's meetings"
   - Assistant creates a Google Doc
   - Provides a link to view/edit

## Project Structure

```
Google-AIO/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.js         # Main app component
│   │   └── index.js       # Entry point
│   └── package.json
├── config/                # Configuration files
│   └── googleAuth.js      # OAuth setup
├── routes/                # Express routes
│   ├── auth.js           # Authentication routes
│   ├── api.js            # API endpoints
│   └── mcp.js            # MCP protocol routes
├── services/             # Service integrations
│   ├── assistantService.js  # Main assistant logic
│   ├── calendarService.js   # Calendar integration
│   ├── mapsService.js       # Maps integration
│   ├── docsService.js       # Docs integration
│   ├── gmailService.js      # Gmail integration
│   ├── sheetsService.js     # Sheets integration
│   └── keepService.js       # Notes integration
├── server.js              # Express server
├── package.json           # Dependencies
├── credentials.json       # OAuth credentials (not in repo)
└── README.md            # This file
```

## API Endpoints

### Authentication
- `GET /auth/login` - Get OAuth login URL
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/tokens/:sessionId` - Get tokens for session

### Assistant
- `POST /api/query` - Main query endpoint (requires session header)

### Calendar
- `GET /api/calendar/upcoming` - Get upcoming events
- `GET /api/calendar/date/:date` - Get schedule for specific date

### Maps
- `POST /api/maps/travel-time` - Calculate travel time
- `POST /api/maps/geocode` - Geocode an address

### Documents
- `POST /api/docs/create` - Create a Google Doc
- `POST /api/slides/create` - Create a Google Slides presentation

### Gmail
- `GET /api/gmail/messages` - Get recent messages
- `POST /api/gmail/search` - Search messages

### Sheets
- `POST /api/sheets/create` - Create a spreadsheet
- `GET /api/sheets/:id/read` - Read spreadsheet data

## Security Notes

- **Never commit** `credentials.json` or `.env` files to version control
- Tokens are stored in memory (for demo purposes). In production, use:
  - Secure session storage (Redis, database)
  - Token encryption
  - Proper session management
- Use HTTPS in production
- Implement proper CORS policies

## Troubleshooting

### "Invalid credentials" error
- Ensure `credentials.json` is in the root directory
- Check that OAuth redirect URI matches exactly: `http://localhost:3001/auth/callback`
- Verify all required APIs are enabled in Google Cloud Console

### Maps API errors
- Ensure Maps JavaScript API, Geocoding API, and Directions API are enabled
- Check that `GOOGLE_MAPS_API_KEY` is set in `.env`
- Verify API key restrictions allow your domain

### Calendar not showing events
- Check that Calendar API is enabled
- Verify OAuth scopes include calendar access
- Ensure you've granted calendar permissions during login

### CORS errors
- Make sure backend is running on port 3001
- Check that frontend proxy is configured correctly in `client/package.json`

## Future Enhancements

- [ ] Google Meet integration
- [ ] ] Google Keep API integration (when available)
- [ ] Voice input/output
- [ ] Multi-user support
- [ ] Persistent session storage
- [ ] Advanced NLP for better query understanding
- [ ] Meeting scheduling automation
- [ ] Email composition and sending
- [ ] Calendar event creation

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

