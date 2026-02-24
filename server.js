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

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // List allowed origins (sesuaikan dengan domain Anda)
    const allowedOrigins = [
      'http://localhost:4000',
      'http://127.0.0.1:4000',
      'http://api-lmi.hypernet.co.id'
      // Tambahkan domain production di sini
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

app.options(/.*/, cors());

// Helmet security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
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
  name: 'lippo.sid', // Custom session cookie name
  cookie: {
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
    sameSite: 'lax' // Proteksi CSRF
  }
};

// Tambahkan store untuk production (gunakan Redis/MySQL untuk scaling)
// if (process.env.NODE_ENV === 'production') {
//   const MySQLStore = require('express-mysql-session')(session);
//   sessionConfig.store = new MySQLStore({
//     host: process.env.DB_HOST,
//     port: 3306,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASS,
//     database: process.env.DB_NAME
//   });
// }

app.use(session(sessionConfig));

// ============================================
// VIEW ENGINE & STATIC FILES
// ============================================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static Files - Pastikan folder public ada
const publicPath = path.join(__dirname, "public");
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
  console.log("📁 Created public folder");
}
app.use(express.static(publicPath));

// ============================================
// REQUEST LOGGER MIDDLEWARE (Development)
// ============================================
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url} - ${new Date().toISOString()}`);
    if (req.session && req.session.user) {
      console.log(`👤 User: ${req.session.user.email}`);
    }
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// 1. Auth Routes - untuk autentikasi
app.use("/auth", authRoutes);

// 2. Lippo Routes - untuk semua operasi data Lippo
app.use("/hypernet-lippo", lippoRoutes);

// 3. Login Routes - untuk halaman login
app.use("/", loginRoutes);

// 4. Protected Dashboard Routes
app.get("/hypernet-lippo", (req, res) => {
  // Cek apakah user sudah login via session
  if (!req.session.user) {
    console.log("🔒 Unauthorized access to /lippo, redirecting to login");
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

// 6. GET API Documentation (khusus method GET)
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
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    session: req.session ? 'Active' : 'Inactive',
    user: req.session?.user || null,
    routes: {
      auth: "/auth/*",
      lippo: "/hypernet-lippo/*",
      login: "/* (login pages)"
    }
  });
});

// Debug session
app.get("/debug-session", (req, res) => {
  res.json({
    sessionID: req.sessionID,
    session: req.session,
    cookie: req.session.cookie,
    user: req.session.user || null
  });
});

// Debug routes (hanya untuk development)
if (process.env.NODE_ENV === 'development') {
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
  // Jika request dari browser (minta HTML)
  if (req.accepts('html')) {
    return res.status(404).send(`
      <html>
        <head><title>404 Not Found</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <p><a href="/lippo">Go to Dashboard</a> | <a href="/login">Login</a></p>
        </body>
      </html>
    `);
  }
  
  // Jika request API (minta JSON)
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
  
  // Jangan tampilkan error detail di production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? "Internal Server Error" 
    : err.message;
  
  res.status(err.status || 500).json({ 
    success: false, 
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log(`\n🚀 ========================================`);
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 ========================================`);
  console.log(`📊 Dashboard: http://${HOST}:${PORT}/lippo`);
  console.log(`🔐 Auth routes: http://${HOST}:${PORT}/auth/*`);
  console.log(`📦 Lippo routes: http://${HOST}:${PORT}/hypernet-lippo/*`);
  console.log(`📚 API Docs: http://${HOST}:${PORT}/api-docs`);
  console.log(`🔍 Debug routes: http://${HOST}:${PORT}/debug-routes`);
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