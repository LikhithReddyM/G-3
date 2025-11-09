import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseService {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected && this.db) {
      return this.db;
    }

    try {
      let connectionString = process.env.MONGODB_URI;
      
      // If no MONGODB_URI, use the default connection string
      if (!connectionString) {
        connectionString = 'mongodb+srv://likhithswirl_db_user:<db_password>@cluster0.x8gddwj.mongodb.net/?appName=Cluster0';
      }
      
      // Replace <db_password> with actual password from env if provided
      if (connectionString.includes('<db_password>')) {
        const password = process.env.MONGODB_PASSWORD || '';
        if (!password) {
          throw new Error('MONGODB_PASSWORD environment variable is required when using default connection string');
        }
        // URL encode the password to handle special characters
        connectionString = connectionString.replace('<db_password>', encodeURIComponent(password));
      }
      
      // Log connection attempt (without password)
      const safeConnectionString = connectionString.replace(/:[^:@]+@/, ':****@');
      console.log('Attempting to connect to MongoDB:', safeConnectionString);
      
      // Add connection options to help with SSL/TLS issues
      const clientOptions = {
        // Increase timeouts
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        // Retry options
        retryWrites: true,
        retryReads: true,
        // Let MongoDB handle SSL automatically (don't override)
      };
      
      this.client = new MongoClient(connectionString, clientOptions);
      
      // Try to connect
      await this.client.connect();
      
      // Verify connection with a ping
      await this.client.db('admin').command({ ping: 1 });
      
      const dbName = process.env.MONGODB_DB_NAME || 'google_aio';
      this.db = this.client.db(dbName);
      this.isConnected = true;
      
      console.log(`Connected to MongoDB database: ${dbName}`);
      return this.db;
    } catch (error) {
      console.error('MongoDB connection error:', error.message);
      
      // Provide specific error guidance
      if (error.message.includes('authentication') || error.message.includes('bad auth')) {
        console.error('❌ Authentication failed!');
        console.error('   → Check your MONGODB_PASSWORD in .env file');
        console.error('   → Make sure the password is correct and doesn\'t have extra spaces');
        console.error('   → Special characters in password should be URL-encoded automatically');
      } else if (error.message.includes('SSL') || error.message.includes('TLS') || error.message.includes('alert')) {
        console.error('❌ SSL/TLS connection error!');
        console.error('   → Your IP address may not be whitelisted in MongoDB Atlas');
        console.error('   → Go to MongoDB Atlas → Network Access → Add IP Address');
        console.error('   → You can temporarily allow all IPs (0.0.0.0/0) for testing');
        console.error('   → Wait a few minutes after adding IP for changes to propagate');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
        console.error('❌ DNS resolution failed!');
        console.error('   → Check your internet connection');
        console.error('   → Verify MongoDB Atlas cluster is running');
      } else if (error.message.includes('timeout')) {
        console.error('❌ Connection timeout!');
        console.error('   → Check your network connection');
        console.error('   → Verify MongoDB Atlas cluster is accessible');
      }
      
      this.isConnected = false;
      this.db = null;
      this.client = null;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.db = null;
      console.log('Disconnected from MongoDB');
    }
  }

  // Context storage methods
  async saveContext(sessionId, context) {
    try {
      const db = await this.connect();
      const collection = db.collection('contexts');
      
      await collection.updateOne(
        { sessionId },
        {
          $set: {
            ...context,
            sessionId,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error saving context:', error);
      throw error;
    }
  }

  async getContext(sessionId) {
    try {
      const db = await this.connect();
      const collection = db.collection('contexts');
      
      const context = await collection.findOne({ sessionId });
      return context || null;
    } catch (error) {
      console.error('Error getting context:', error);
      throw error;
    }
  }

  async addConversationHistory(sessionId, message) {
    try {
      const db = await this.connect();
      const collection = db.collection('conversations');
      
      await collection.insertOne({
        sessionId,
        ...message,
        timestamp: new Date()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding conversation history:', error);
      throw error;
    }
  }

  async getConversationHistory(sessionId, limit = 50) {
    try {
      const db = await this.connect();
      const collection = db.collection('conversations');
      
      const history = await collection
        .find({ sessionId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      return history.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  async saveUserPreference(sessionId, key, value) {
    try {
      const db = await this.connect();
      const collection = db.collection('user_preferences');
      
      await collection.updateOne(
        { sessionId, key },
        {
          $set: {
            sessionId,
            key,
            value,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error saving user preference:', error);
      throw error;
    }
  }

  async getUserPreferences(sessionId) {
    try {
      const db = await this.connect();
      const collection = db.collection('user_preferences');
      
      const preferences = await collection.find({ sessionId }).toArray();
      
      const result = {};
      preferences.forEach(pref => {
        result[pref.key] = pref.value;
      });
      
      return result;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  }

  async saveSessionData(sessionId, data) {
    try {
      const db = await this.connect();
      const collection = db.collection('sessions');
      
      await collection.updateOne(
        { sessionId },
        {
          $set: {
            ...data,
            sessionId,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error saving session data:', error);
      throw error;
    }
  }

  async getSessionData(sessionId) {
    try {
      const db = await this.connect();
      const collection = db.collection('sessions');
      
      const session = await collection.findOne({ sessionId });
      return session || null;
    } catch (error) {
      console.error('Error getting session data:', error);
      throw error;
    }
  }

  async searchContexts(query, sessionId = null) {
    try {
      const db = await this.connect();
      const collection = db.collection('contexts');
      
      const searchQuery = {
        $or: [
          { context: { $regex: query, $options: 'i' } },
          { metadata: { $regex: query, $options: 'i' } }
        ]
      };
      
      if (sessionId) {
        searchQuery.sessionId = sessionId;
      }
      
      const results = await collection
        .find(searchQuery)
        .sort({ updatedAt: -1 })
        .limit(10)
        .toArray();
      
      return results;
    } catch (error) {
      console.error('Error searching contexts:', error);
      throw error;
    }
  }

  async deleteContext(sessionId) {
    try {
      const db = await this.connect();
      const contextsCollection = db.collection('contexts');
      const conversationsCollection = db.collection('conversations');
      const preferencesCollection = db.collection('user_preferences');
      const sessionsCollection = db.collection('sessions');
      
      await Promise.all([
        contextsCollection.deleteMany({ sessionId }),
        conversationsCollection.deleteMany({ sessionId }),
        preferencesCollection.deleteMany({ sessionId }),
        sessionsCollection.deleteOne({ sessionId })
      ]);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting context:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dbService = new DatabaseService();

