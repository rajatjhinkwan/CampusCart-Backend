'use strict';
// =========================================
// STEP 1️⃣ : IMPORTING REQUIRED MODULES
// =========================================
// Think of this step like collecting all the tools 
// you’ll need before starting the construction of your backend.
const express = require('express');
const http = require('http');
require('dotenv').config(); // to load .env file values
const path = require('path');

// Security and optimization middlewares
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Importing custom files
const { connectDB } = require('./config/db'); // function to connect MongoDB
const chatSocket = require('./sockets/chatSocket'); // socket setup function
const { apiLimiter } = require('./middleware/rateLimitMiddleware'); // rate limiter
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();
const server = http.createServer(app);


// =========================================
// STEP 2️⃣ : BASIC SETUP AND CHECKS
// =========================================
// Here we define PORT, ENVIRONMENT, and do a small sanity check.
// If PORT isn’t found in .env, we set a default value.

if (!process.env.PORT) {
  console.warn('⚠️  Warning: PORT is not set in .env — defaulting to 5000');
}

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';



// =========================================
// STEP 3️⃣ : CONNECTING TO DATABASE
// =========================================
// This step connects our server to MongoDB before the app runs.
// We use an async IIFE (Immediately Invoked Function Expression) here.

(async () => {
  try {
    await connectDB(); // waits for MongoDB connection
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1); // stop server if DB fails
  }
})();



// =========================================
// STEP 4️⃣ : APPLYING MIDDLEWARES
// =========================================
// Middlewares are like security guards and translators that handle requests before routes.
// These improve security, handle data, and compress responses.

app.use(helmet()); // adds security headers
app.use(hpp()); // protects against HTTP parameter pollution
app.use(compression()); // compresses responses for faster delivery
app.use(express.json({ limit: '10mb' })); // parses JSON with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // parses form data
app.use(cookieParser()); // allows reading cookies

// Use morgan only in development to see logs in console
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
  // const { morganMiddleware } = require('./utils/logger');
  // app.use(morganMiddleware);
}

// Setup CORS (cross-origin resource sharing)
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Apply custom rate limiter to prevent spam/attacks
app.use(apiLimiter);

// Serve static uploaded files safely
app.use('/public/uploads', express.static(path.join(__dirname, 'public', 'uploads')));



// =========================================
// STEP 5️⃣ : TESTING SERVER IS WORKING
// =========================================
// Just a simple test route to check if everything works fine.

app.get('/', (req, res) => {
  console.log("EVERYTHING FINE : YOU ARE A GOOD BACKEND DEVELOPER");
  res.send("EVERYTHING FINE : YOU ARE A GOOD BACKEND DEVELOPER");
});



// =========================================
// STEP 6️⃣ : ROUTES AND API VERSIONING
// =========================================
// Here we define main routes. The “/api” prefix helps versioning in future.

const routes = require('./routes');
app.use('/api', routes);

// Health check route for monitoring
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: NODE_ENV, timestamp: new Date().toISOString() });
});

// Handle undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (handles all thrown errors)
app.use(errorMiddleware);



// =========================================
// STEP 7️⃣ : SOCKET.IO SETUP FOR REAL-TIME COMMUNICATION
// =========================================
// This part enables chat or live updates using WebSockets.

const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000, // disconnect idle sockets after 60s
});

// Attach socket handlers (chat, notifications, etc.)
try {
  if (typeof chatSocket === 'function') { // module.exports = function(io) { ... }
    chatSocket(io);
  } else if (chatSocket?.default && typeof chatSocket.default === 'function') { // export default function(io) { ... }
    chatSocket.default(io);
  } else {
    console.warn('⚠️ chatSocket export is not a function. Please export a function that accepts io.');
  }
} catch (err) {
  console.error('❌ Failed to initialize sockets:', err);
}



// =========================================
// STEP 8️⃣ : START THE SERVER
// =========================================
// Now we finally start the HTTP server on the given port.

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
});


// =========================================
// STEP 9️⃣ : GRACEFUL SHUTDOWN HANDLING
// =========================================
// When you stop the server (Ctrl + C or system signal), 
// this code closes everything properly (server + DB).

const shutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Closing server...`);
  server.close(async (err) => {
    if (err) {
      console.error('❌ Error closing server:', err);
      process.exit(1);
    }

    // Try closing DB connection if available
    try {
      const dbClose = require('./config/db').closeDB;
      if (typeof dbClose === 'function') {
        await dbClose();
        console.log('✅ DB connection closed');
      }
    } catch (e) {
      // Ignore if no closeDB function provided
    }

    console.log('✅ Shutdown complete. Exiting.');
    process.exit(0);
  });

  // Force exit if shutdown takes too long
  setTimeout(() => {
    console.error('🔥 Forcing shutdown after 10s');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));   // CTRL + C
process.on('SIGINT', () => shutdown('SIGINT'));     // SERVER RESTARTS


// =========================================
// STEP 🔟 : HANDLE UNEXPECTED ERRORS
// =========================================
// Just in case something crashes, 
// this ensures server logs the problem and exits cleanly.

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  shutdown('unhandledRejection');
});
