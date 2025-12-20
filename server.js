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
const crypto = require('crypto');

// Security and optimization middlewares
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Importing custom files
const { connectDB } = require('./config/db'); // function to connect MongoDB
const sockets = require('./sockets');
const { apiLimiter } = require('./middleware/rateLimitMiddleware'); // rate limiter
const errorMiddleware = require('./middleware/errorMiddleware');
const CronService = require('./services/cronService'); // Scheduled tasks

const app = express();
const server = http.createServer(app);


// =========================================
// STEP 2️⃣ : BASIC SETUP AND CHECKS
// =========================================
// Here we define PORT, ENVIRONMENT, and do a small sanity check.
// If PORT isn’t found in .env, we set a default value.

if (!process.env.PORT) {
  console.warn('⚠️  Warning: PORT is not set in .env — defaulting to 5001');
}

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const allowedOrigins = ((process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)).length
  ? (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];



// =========================================
// STEP 3️⃣ : CONNECTING TO DATABASE
// =========================================
// This step connects our server to MongoDB before the app runs.
// We use an async IIFE (Immediately Invoked Function Expression) here.

(async () => {
  try {
    await connectDB(); // waits for MongoDB connection
    console.log('✅ MongoDB connected');
    
    // Initialize Cron Jobs
    CronService.init();
    
    try {
      const Ride = require('./models/rideModel');
      const DriverLocation = require('./models/driverLocationModel');
      await Ride.syncIndexes();
      await DriverLocation.syncIndexes();
      // Drop any legacy wrong geo indexes (e.g., 2dsphere on 'from' or 'to')
      const idxs = await Ride.collection.indexes();
      for (const idx of idxs) {
        const key = idx.key || {};
        const hasWrongFrom = key.from === '2dsphere' && !key['from.location'];
        const hasWrongTo = key.to === '2dsphere' && !key['to.location'];
        if (hasWrongFrom || hasWrongTo) {
          try {
            await Ride.collection.dropIndex(idx.name);
            console.log(`🗑️ Dropped legacy index: ${idx.name}`);
          } catch (dropErr) {
            console.warn('⚠️  Failed to drop legacy index:', idx.name, dropErr?.message || dropErr);
          }
        }
      }
      console.log('✅ Ride & DriverLocation indexes synced');
    } catch (e) {
      console.warn('⚠️  Index sync failed:', e?.message || e);
    }
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

// CORS MUST be applied FIRST, before other middlewares
// Setup CORS (cross-origin resource sharing)
// The CORS middleware automatically handles OPTIONS preflight requests
// In development, allow all localhost origins; in production, use strict list
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, allow all localhost origins
    if (NODE_ENV === 'development') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        console.log(`✅ CORS allowing origin: ${origin}`);
        return callback(null, true);
      }
    }
    
    // Check environment variable for allowed origins
    const envOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    if (envOrigins.length > 0 && envOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Default allowed origins for development
    const defaultOrigins = [
      'http://localhost:5173', 
      'http://localhost:3000', 
      'http://localhost:5174', 
      'https://campus-connect-frontend.vercel.app',
      'https://societyconnect1.netlify.app'
    ];
    if (defaultOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log(`⚠️  CORS blocked origin: ${origin}`);
    callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
};

app.use(cors(corsOptions));

// Security headers (configured to work with CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
})); // adds security headers
app.use(hpp()); // protects against HTTP parameter pollution
app.use(compression()); // compresses responses for faster delivery
app.use(express.json({ limit: '10mb' })); // parses JSON with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // parses form data
app.use(cookieParser()); // allows reading cookies
app.use((req, res, next) => {
  const id = crypto.randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
});

// Use morgan only in development to see logs in console
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
  // const { morganMiddleware } = require('./utils/logger');
  // app.use(morganMiddleware);
}

// Apply custom rate limiter AFTER CORS (but skip for OPTIONS requests)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next(); // Skip rate limiting for preflight requests
  }
  apiLimiter(req, res, next);
});

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

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({ 
    message: 'CORS is working!', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});
app.get('/api/debug/error', (req, res, next) => {
  const e = new Error('Debug error');
  e.status = 500;
  next(e);
});



// =========================================
// STEP 6️⃣ : ROUTES AND API VERSIONING
// =========================================
// Here we define main routes. The “/api” prefix helps versioning in future.

// Geo proxy to avoid CORS/403 issues with Nominatim/Photon in production
app.get('/api/geo/osm/search', async (req, res) => {
  try {
    const contact = process.env.NOMINATIM_CONTACT || 'contact@example.com';
    const upstream = new URL('https://nominatim.openstreetmap.org/search');
    Object.entries(req.query || {}).forEach(([k, v]) => upstream.searchParams.set(k, String(v)));
    if (!upstream.searchParams.get('email')) {
      upstream.searchParams.set('email', contact);
    }
    if (!upstream.searchParams.get('format')) {
      upstream.searchParams.set('format', 'jsonv2');
    }
    const resp = await fetch(upstream, {
      headers: {
        'User-Agent': `minor-project (${contact})`,
        'Accept': 'application/json',
        'Referer': (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',')[0]
      }
    });
    const text = await resp.text();
    res.status(resp.status).type(resp.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ message: 'Upstream error contacting Nominatim', error: e?.message || String(e) });
  }
});

app.get('/api/geo/osm/reverse', async (req, res) => {
  try {
    const contact = process.env.NOMINATIM_CONTACT || 'contact@example.com';
    const upstream = new URL('https://nominatim.openstreetmap.org/reverse');
    Object.entries(req.query || {}).forEach(([k, v]) => upstream.searchParams.set(k, String(v)));
    if (!upstream.searchParams.get('email')) {
      upstream.searchParams.set('email', contact);
    }
    if (!upstream.searchParams.get('format')) {
      upstream.searchParams.set('format', 'jsonv2');
    }
    const resp = await fetch(upstream, {
      headers: {
        'User-Agent': `minor-project (${contact})`,
        'Accept': 'application/json',
        'Referer': (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',')[0]
      }
    });
    const text = await resp.text();
    res.status(resp.status).type(resp.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ message: 'Upstream error contacting Nominatim', error: e?.message || String(e) });
  }
});

app.get('/api/geo/photon', async (req, res) => {
  try {
    const upstream = new URL('https://photon.komoot.io/api');
    Object.entries(req.query || {}).forEach(([k, v]) => upstream.searchParams.set(k, String(v)));
    const resp = await fetch(upstream, { headers: { 'Accept': 'application/json' } });
    const text = await resp.text();
    res.status(resp.status).type(resp.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ message: 'Upstream error contacting Photon', error: e?.message || String(e) });
  }
});

// OSRM proxy to avoid CORS/browser restrictions
app.get('/api/osrm/nearest', async (req, res) => {
  try {
    const base = process.env.OSRM_BASE || 'https://router.project-osrm.org';
    const { lon, lat, number = 1 } = req.query;
    if (!lon || !lat) return res.status(400).json({ message: 'lon and lat required' });
    const upstream = new URL(`${base}/nearest/v1/driving/${lon},${lat}`);
    upstream.searchParams.set('number', String(number));
    const resp = await fetch(upstream, { headers: { Accept: 'application/json' } });
    const text = await resp.text();
    res.status(resp.status).type(resp.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ message: 'Upstream error contacting OSRM nearest', error: e?.message || String(e) });
  }
});
app.get('/api/osrm/route', async (req, res) => {
  try {
    const base = process.env.OSRM_BASE || 'https://router.project-osrm.org';
    const { a_lon, a_lat, b_lon, b_lat, overview = 'full', geometries = 'geojson', radiuses } = req.query;
    if (!a_lon || !a_lat || !b_lon || !b_lat) return res.status(400).json({ message: 'a_lon,a_lat,b_lon,b_lat required' });
    const upstream = new URL(`${base}/route/v1/driving/${a_lon},${a_lat};${b_lon},${b_lat}`);
    upstream.searchParams.set('overview', String(overview));
    upstream.searchParams.set('geometries', String(geometries));
    if (radiuses) upstream.searchParams.set('radiuses', String(radiuses));
    const resp = await fetch(upstream, { headers: { Accept: 'application/json' } });
    const text = await resp.text();
    res.status(resp.status).type(resp.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ message: 'Upstream error contacting OSRM route', error: e?.message || String(e) });
  }
});

const routes = require('./routes');
const requestRoutes = require('./routes/requestRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

app.use('/api/requests', requestRoutes);
app.use('/api/wishlist', wishlistRoutes);
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
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (NODE_ENV === 'development') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000, // disconnect idle sockets after 60s
});

// Initialize socket namespaces and handlers
sockets.init(io);

// Make io available in controllers via req.app.get('io')
app.set('io', io);



// =========================================
// STEP 8️⃣ : START THE SERVER
// =========================================
// Now we finally start the HTTP server on the given port.

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  });
}

module.exports = app;


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
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
});
