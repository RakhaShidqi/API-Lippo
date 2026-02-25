// server.js
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const db = require("./config/db");
const session = require('express-session');
const fs = require('fs');
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/authRoutes");
const lippoRoutes = require("./routes/lippoRoutes");
const loginRoutes = require("./routes/loginRoutes");
const apiLimiter = require("./middlewares/rateLimit");

const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// SIMPLIFIED CORS CONFIGURATION - INI YANG DIPERBAIKI
app.use((req, res, next) => {
  // Izinkan semua origin di development
  const allowedOrigins = [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://10.254.245.2:4000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://10.254.245.2:3000'
  ];

  const origin = req.headers.origin;
  
  // Set CORS headers untuk semua response
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // Di development, izinkan semua origin
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Di production, hanya origin tertentu
    res.setHeader('Access-Control-Allow-Origin', 'https://api-lmi.hypernet.co.id');
  }
  
  // Header CORS penting lainnya
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours cache for preflight

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('🔧 OPTIONS preflight request from:', origin);
    return res.status(200).end();
  }

  next();
});

// Gunakan cors package sebagai backup
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:4000',
      'http://127.0.0.1:4000',
      'http://10.254.245.2:4000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://10.254.245.2:3000',
      'https://api-lmi.hypernet.co.id'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Helmet security - DENGAN CORS YANG SESUAI
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Izinkan resource diakses cross-origin
  referrerPolicy: { policy: "no-referrer-when-downgrade" },
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// SESSION CONFIGURATION
// ============================================
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-session-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'lippo.sid',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none', // 'none' untuk cross-site di development
    domain: process.env.NODE_ENV === 'production' ? '.hypernet.co.id' : undefined
  }
};

// Untuk development dengan CORS, set sameSite = 'none' dan secure = false
if (process.env.NODE_ENV !== 'production') {
  sessionConfig.cookie.sameSite = 'none';
  sessionConfig.cookie.secure = false; // HTTP di development
}

app.use(session(sessionConfig));

// ============================================
// VIEW ENGINE & STATIC FILES
// ============================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static Files
const publicPath = path.join(__dirname, "public");
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
  console.log("📁 Created public folder");
}
app.use(express.static(publicPath));

// ============================================
// REQUEST LOGGER MIDDLEWARE
// ============================================
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  console.log(`   Origin: ${req.headers.origin || 'No origin'}`);
  console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);
  if (req.session && req.session.user) {
    console.log(`   User: ${req.session.user.email}`);
  }
  next();
});

// ============================================
// ROUTES
// ============================================

// 1. Auth Routes
app.use("/auth", authRoutes);

// 2. Lippo Routes - dengan CORS headers tambahan untuk DELETE
app.use("/hypernet-lippo", (req, res, next) => {
  // Log untuk method DELETE
  if (req.method === 'DELETE') {
    console.log('🗑️ DELETE request received for:', req.url);
    console.log('   Headers:', req.headers);
  }
  next();
}, lippoRoutes);

// 3. Login Routes
app.use("/", loginRoutes);

// 4. Protected Dashboard Routes
app.get("/hypernet-lippo", (req, res) => {
  if (!req.session.user) {
    console.log("🔒 Unauthorized access to /hypernet-lippo, redirecting to login");
    return res.redirect('/login');
  }
  
  res.render("index", { 
    title: "Dashboard Lippo",
    user: req.session.user,
    message: "Welcome to Lippo Dashboard"
  });
});

// 5. API Documentation
app.get("/api-docs", (req, res) => {
  res.render("api-docs", { 
    title: "API Documentation - Lippo Revenue"
  });
});

app.get("/api-docs-get", (req, res) => {
  res.render("api-docs-get", { 
    title: "GET API Documentation - Lippo Revenue"
  });
});

// ============================================
// TEST & DEBUG ROUTES
// ============================================

// Test server
app.get("/test", (req, res) => {
  // Set CORS headers explicitly for test
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    session: req.session ? 'Active' : 'Inactive',
    user: req.session?.user || null,
    cors: {
      origin: req.headers.origin,
      method: req.method,
      headers: req.headers
    }
  });
});

// Debug session
app.get("/debug-session", (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.json({
    sessionID: req.sessionID,
    session: req.session,
    cookie: req.session.cookie,
    user: req.session.user || null
  });
});

// Test CORS
app.options("/test-cors", (req, res) => {
  res.status(200).end();
});

app.all("/test-cors", (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.json({
    success: true,
    method: req.method,
    message: `CORS test successful for ${req.method}`,
    headers: req.headers
  });
});

// Test DELETE
app.delete("/test-delete/:id", (req, res) => {
  console.log('🗑️ Test DELETE:', req.params.id);
  
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.json({
    success: true,
    message: `DELETE test successful for ID: ${req.params.id}`,
    data: { id: req.params.id, deleted: true }
  });
});

// Debug routes (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get("/debug-routes", (req, res) => {
    const routes = [];
    
    function extractRoutes(path, layer) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        routes.push(`${methods} ${path}${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle.stack) {
        const prefix = path + (layer.regexp.source === '^\\/?$' ? '' : 
          layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/'));
        layer.handle.stack.forEach(stackItem => extractRoutes(prefix, stackItem));
      }
    }
    
    app._router.stack.forEach(layer => extractRoutes('', layer));
    
    res.json({
      success: true,
      totalRoutes: routes.length,
      routes: routes.sort()
    });
  });
}

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.accepts('html')) {
    return res.status(404).send(`
      <html>
        <head><title>404 Not Found</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <p><a href="/hypernet-lippo">Go to Dashboard</a> | <a href="/login">Login</a></p>
        </body>
      </html>
    `);
  }
  
  res.status(404).json({ 
    success: false, 
    message: "Route not found",
    path: req.url,
    method: req.method
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.stack || err.message);
  
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? "Internal Server Error" 
    : err.message;
  
  res.status(err.status || 500).json({ 
    success: false, 
    message: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ============================================
// DATABASE CONNECTION CHECK
// ============================================
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️ Server will continue but database features may not work');
  }
})();

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind ke semua interface

const server = app.listen(PORT, HOST, () => {
  console.log(`\n🚀 ========================================`);
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 CORS: ${process.env.NODE_ENV === 'production' ? 'Restricted' : 'Development mode'}`);
  console.log(`🚀 ========================================`);
  console.log(`📊 Dashboard: http://${HOST}:${PORT}/hypernet-lippo`);
  console.log(`🔐 Auth routes: http://${HOST}:${PORT}/auth/*`);
  console.log(`📦 Lippo routes: http://${HOST}:${PORT}/hypernet-lippo/*`);
  console.log(`📚 API Docs: http://${HOST}:${PORT}/api-docs`);
  console.log(`🔍 Test CORS: http://${HOST}:${PORT}/test-cors`);
  console.log(`🗑️ Test DELETE: http://${HOST}:${PORT}/test-delete/123`);
  console.log(`🚀 ========================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;