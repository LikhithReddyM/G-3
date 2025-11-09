# Quick Setup Guide

## Step-by-Step Setup

### 1. Place Your Credentials

Place your `credentials.json` file (downloaded from Google Cloud Console) in the root directory:
```
Google-AIO/
└── credentials.json
```

### 2. Create Environment File

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` and add your values:
- `GOOGLE_MAPS_API_KEY` - Required for Maps features (get from Google Cloud Console)
- Other values will be read from `credentials.json` if not set

### 3. Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 4. Run the Application

**Option 1: Development (Two Terminals)**

Terminal 1 - Backend:
```bash
npm start
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

**Option 2: Production Build**

```bash
# Build React app
cd client
npm run build
cd ..

# Start server (serves both)
NODE_ENV=production npm start
```

### 5. Access the Application

- Open your browser to: http://localhost:3000
- Click "Sign in with Google"
- Authorize the application
- Start using the assistant!

## Required Google APIs

Make sure these are enabled in your Google Cloud Console:

1. ✅ Calendar API
2. ✅ Gmail API
3. ✅ Google Docs API
4. ✅ Google Slides API
5. ✅ Google Sheets API
6. ✅ Google Drive API
7. ✅ Maps JavaScript API
8. ✅ Geocoding API
9. ✅ Directions API

## OAuth Redirect URI

Make sure your OAuth 2.0 Client ID has this redirect URI:
```
http://localhost:3001/auth/callback
```

## Troubleshooting

### "Cannot find module" errors
Run `npm install` in both root and `client/` directories.

### "Invalid credentials" error
- Check that `credentials.json` is in the root directory
- Verify redirect URI matches exactly: `http://localhost:3001/auth/callback`
- Ensure all APIs are enabled

### Maps features not working
- Get a Maps API key from Google Cloud Console
- Add it to `.env` as `GOOGLE_MAPS_API_KEY`
- Enable Maps JavaScript API, Geocoding API, and Directions API

### Port already in use
- Change `PORT` in `.env` (default: 3001)
- Update `proxy` in `client/package.json` to match

