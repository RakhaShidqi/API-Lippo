// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth");
const authController = require("../controllers/authController");
const generateToken = require("../middlewares/generateToken");

// ======================
// AUTH ROUTES
// ======================

// ======================
// PUBLIC ROUTES (TIDAK PERLU AUTH)
// ======================

/**
 * @route   POST /auth/login
 * @desc    Login dengan email & password (support web & API)
 * @access  Public
 */
router.post("/login", authController.login);

/**
 * @route   POST /auth/logout
 * @desc    Logout user (destroy session)
 * @access  Public
 */
router.post("/logout", authController.logout);

/**
 * @route   GET /auth/logout
 * @desc    Logout via GET (untuk redirect dari web)
 * @access  Public
 */
router.get("/logout", (req, res) => {
  console.log("🚪 GET logout - redirecting to login");
  if (req.session) {
    req.session.destroy((err) => {
      if (err) console.error("Session destroy error:", err);
      res.clearCookie('lippo.sid');
      res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
});

/**
 * @route   GET /auth/generate-token
 * @desc    Generate default token (1 tahun)
 * @access  Public
 */
router.get("/generate-token", generateToken);

/**
 * @route   POST /auth/generate-token
 * @desc    Generate custom token dengan payload
 * @access  Public
 */
router.post("/generate-token", generateToken);

/**
 * @route   POST /auth/generate-long-token
 * @desc    Generate token dengan masa berlaku 1 tahun
 * @access  Public
 */
router.post("/generate-long-token", (req, res) => {
  req.body.expiresIn = "365d";
  return generateToken(req, res);
});

/**
 * @route   POST /auth/generate-token-with-expiry
 * @desc    Generate token dengan masa berlaku custom
 * @access  Public
 */
router.post("/generate-token-with-expiry", (req, res) => {
  const { expiresIn } = req.body;
  
  const validFormat = /^(\d+)([dhmy])$/.test(expiresIn);
  if (expiresIn && !validFormat) {
    return res.status(400).json({
      success: false,
      message: "Invalid expiry format. Use format: 1d, 30d, 12h, 1y, etc."
    });
  }
  
  return generateToken(req, res);
});

/**
 * @route   GET /auth/verify-token
 * @desc    Verifikasi token JWT
 * @access  Public
 */
router.get("/verify-token", authController.verifyToken);

/**
 * @route   GET /auth/check-table
 * @desc    Cek struktur tabel users (debug)
 * @access  Public
 */
router.get("/check-table", authController.checkTableStructure);

/**
 * @route   POST /auth/register
 * @desc    Register user baru
 * @access  Public
 */
router.post("/register", authController.register);

/**
 * @route   GET /auth/debug-user
 * @desc    Debug user by email
 * @access  Public
 */
router.get("/debug-user", authController.debugUser);

/**
 * @route   POST /auth/test-password
 * @desc    Test password tanpa mengubah
 * @access  Public
 */
router.post("/test-password", authController.testPassword);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password (hanya untuk development!)
 * @access  Public
 */
router.post("/reset-password", authController.resetPassword);

/**
 * @route   GET /auth/current-user
 * @desc    Get current user from session
 * @access  Public (butuh session)
 */
router.get("/current-user", (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      success: true,
      user: req.session.user
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }
});

// ======================
// PROTECTED ROUTES (PERLU AUTH)
// ======================

/**
 * @route   GET /auth/profile
 * @desc    Get user profile (memerlukan token)
 * @access  Protected
 */
router.get("/profile", authMiddleware, authController.getCurrentUser);

/**
 * @route   POST /auth/refresh-token
 * @desc    Refresh token (dapat token baru)
 * @access  Protected
 */
router.post("/refresh-token", authMiddleware, (req, res) => {
  try {
    const payload = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role
    };

    const expiresIn = req.body.expiresIn || "365d";
    
    const token = require("jsonwebtoken").sign(
      payload,
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn }
    );

    res.json({
      success: true,
      message: `Token refreshed successfully (valid for ${expiresIn})`,
      data: { token }
    });
  } catch (err) {
    console.error("🔥 Refresh token error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to refresh token"
    });
  }
});

// ======================
// TEST ROUTE
// ======================
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes working",
    timestamp: new Date().toISOString(),
    session: req.session ? "Active" : "Inactive",
    user: req.session?.user || null,
    endpoints: [
      // Public endpoints
      { method: "POST", path: "/login", description: "Login user" },
      { method: "POST", path: "/logout", description: "Logout user (POST)" },
      { method: "GET", path: "/logout", description: "Logout user (GET - redirect)" },
      { method: "GET", path: "/generate-token", description: "Generate default token (1 year)" },
      { method: "POST", path: "/generate-token", description: "Generate custom token" },
      { method: "POST", path: "/generate-long-token", description: "Generate 1-year token" },
      { method: "POST", path: "/generate-token-with-expiry", description: "Generate token with custom expiry" },
      { method: "GET", path: "/verify-token", description: "Verify token validity" },
      { method: "GET", path: "/check-table", description: "Check database structure" },
      { method: "POST", path: "/register", description: "Register new user" },
      { method: "GET", path: "/debug-user", description: "Debug user info" },
      { method: "POST", path: "/test-password", description: "Test password" },
      { method: "POST", path: "/reset-password", description: "Reset password (dev only)" },
      { method: "GET", path: "/current-user", description: "Get current user from session" },
      
      // Protected endpoints
      { method: "GET", path: "/profile", description: "Get user profile (requires token)" },
      { method: "POST", path: "/refresh-token", description: "Refresh token (requires token)" }
    ]
  });
});

module.exports = router;