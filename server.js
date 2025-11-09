import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import mcpRoutes from './routes/mcp.js';
import { dbService } from './services/dbService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize MongoDB connection
(async () => {
  try {
    await dbService.connect();
    console.log('MongoDB initialized successfully');
  } catch (error) {
    console.error('Failed to initialize MongoDB:', error);
    console.warn('Server will continue without database connection');
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await dbService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await dbService.disconnect();
  process.exit(0);
});

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/mcp', mcpRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

