// config/db.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set in environment variables.');
  process.exit(1);
}

/**
 * Connect to MongoDB with retry/backoff and graceful shutdown.
 */
async function connectDB({
  uri = MONGO_URI,
  maxRetries = 5,
  initialDelayMs = 1000
} = {}) {
  let attempt = 0;

  const connectWithRetry = async () => {
    attempt++;
    try {
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // optional tuning
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      });
      console.log('MongoDB connected.');
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt} failed:`, err.message || err);
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay} ms...`);
        await new Promise(res => setTimeout(res, delay));
        return connectWithRetry();
      } else {
        console.error('Could not connect to MongoDB after retries. Exiting.');
        process.exit(1);
      }
    }
  };

  await connectWithRetry();

  // Connection event listeners
  mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('Mongoose reconnected to DB.');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('Mongoose disconnected from DB.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
  });

  // Graceful shutdown
  const gracefulExit = async (signal) => {
    try {
      await mongoose.connection.close(false);
      console.log(`Mongoose connection closed through ${signal}.`);
      // process.exit handled by caller if needed
    } catch (err) {
      console.error('Error during Mongoose shutdown:', err);
      process.exit(1);
    }
  };

  // listen to process termination signals
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(sig => {
    process.on(sig, () => gracefulExit(sig).then(() => process.exit(0)));
  });

  return mongoose.connection;
}

module.exports = { connectDB };
