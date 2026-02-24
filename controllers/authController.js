// controllers/authController.js
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const bcrypt = require("bcryptjs");

const authController = {
  // ============================================
  // LOGIN FUNCTION - SUPPORT BOTH WEB & API
  // ============================================
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      console.log("📝 Login attempt:", { email, passwordProvided: !!password });

      // Validasi input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }

      // Cek koneksi database
      if (!db) {
        console.error("❌ Database connection not available");
        return res.status(500).json({
          success: false,
          message: "Database connection error"
        });
      }

      // Query cari user berdasarkan email
      const [users] = await db.query(
        "SELECT * FROM users WHERE LOWER(email) = LOWER(?)",
        [email]
      );

      if (users.length === 0) {
        console.log("❌ User not found with email:", email);
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      const user = users[0];
      console.log("✅ User found:", { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role
      });
      
      // 🔐 VERIFIKASI PASSWORD
      let isValid = false;
      const isHashed = user.password && 
                       user.password.length === 60 && 
                       user.password.startsWith('$2a$');
      
      if (isHashed) {
        // Password sudah di-hash
        isValid = await bcrypt.compare(password, user.password);
      } else {
        // Password plain text - compare langsung
        console.log("⚠️ Password is plain text, comparing directly");
        isValid = (password === user.password);
        
        // Update ke hash jika valid
        if (isValid) {
          try {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(
              "UPDATE users SET password = ? WHERE id = ?",
              [hashedPassword, user.id]
            );
            console.log("✅ Password updated to hash");
          } catch (updateError) {
            console.error("❌ Failed to update password:", updateError);
          }
        }
      }

      if (!isValid) {
        console.log("❌ Invalid password for email:", email);
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      // ============================================
      // SET SESSION UNTUK WEB
      // ============================================
      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      };

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("❌ Session save error:", err);
        }
      });

      console.log("✅ Session created for user:", user.email);

      // ============================================
      // GENERATE JWT TOKEN UNTUK API
      // ============================================
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          name: user.name,
          role: user.role || 'user' 
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "365d" } // Token berlaku 1 tahun untuk API
      );

      console.log("✅ Login successful for:", email);
      
      // Cek tipe request (web form atau API)
      const wantsJson = req.headers.accept === 'application/json' || 
                       req.headers['content-type'] === 'application/json';
      
      if (wantsJson) {
        // Response untuk API (JSON)
        res.json({
          success: true,
          message: "Login successful",
          data: {
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role || 'user'
            }
          }
        });
      } else {
        // Response untuk web form (redirect)
        res.redirect('/lippo');
      }

    } catch (err) {
      console.error("🔥 Login error:", err);
      console.error("🔥 Error stack:", err.stack);
      
      res.status(500).json({
        success: false,
        message: "Internal server error during login",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },

  // ============================================
  // LOGOUT FUNCTION - Clear session
  // ============================================
  logout: (req, res) => {
    console.log("🚪 Logout called");
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error("❌ Session destroy error:", err);
      }
      
      // Clear cookie
      res.clearCookie('lippo.sid');
      
      console.log("✅ Logout successful");
      
      // Cek tipe request
      const wantsJson = req.headers.accept === 'application/json';
      
      if (wantsJson) {
        res.json({
          success: true,
          message: "Logout successful",
          redirect: "/login"
        });
      } else {
        res.redirect('/login');
      }
    });
  },

  // ============================================
  // GET CURRENT USER (from session)
  // ============================================
  getCurrentUser: (req, res) => {
    if (req.session.user) {
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
  },

  // ============================================
  // GENERATE TOKEN (for testing)
  // ============================================
  generateToken: (req, res) => {
    try {
      const { 
        id = 1, 
        email = "admin@example.com", 
        name = "Admin User", 
        role = "admin",
        expiresIn = "365d" 
      } = req.body;

      const payload = { id, email, name, role };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn }
      );

      // Hitung tanggal expired
      let expiresAt = new Date();
      if (expiresIn.endsWith('d')) {
        expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
      } else if (expiresIn.endsWith('y')) {
        expiresAt.setFullYear(expiresAt.getFullYear() + parseInt(expiresIn));
      }

      res.json({
        success: true,
        message: `Token generated successfully (valid for ${expiresIn})`,
        data: {
          token,
          expires_in: expiresIn,
          expires_at: expiresAt.toISOString(),
          user: payload
        }
      });
    } catch (err) {
      console.error("🔥 Generate token error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to generate token"
      });
    }
  },

  // ============================================
  // VERIFY TOKEN
  // ============================================
  verifyToken: (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: "No authorization header provided"
        });
      }

      const token = authHeader.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided"
        });
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );

      res.json({
        success: true,
        message: "Token is valid",
        data: decoded
      });
    } catch (err) {
      console.error("🔥 Token verification error:", err.message);
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: "Token has expired"
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: "Invalid token"
        });
      }
      
      res.status(401).json({
        success: false,
        message: "Token verification failed"
      });
    }
  },

  // ============================================
  // DEBUG FUNCTIONS
  // ============================================
  debugUser: async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.json({
          success: false,
          message: "Email parameter required"
        });
      }

      const [users] = await db.query(
        "SELECT id, email, name, role, password FROM users WHERE email = ?",
        [email]
      );

      if (users.length === 0) {
        return res.json({
          success: false,
          message: "User not found",
          email: email
        });
      }

      const user = users[0];
      
      res.json({
        success: true,
        message: "User found",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          passwordHash: user.password ? user.password.substring(0, 30) + '...' : null,
          passwordLength: user.password ? user.password.length : 0,
          isHashed: user.password && user.password.length === 60 && user.password.startsWith('$2a$')
        }
      });

    } catch (err) {
      console.error("🔥 Debug error:", err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  },

  testPassword: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.json({
          success: false,
          message: "Email and password required"
        });
      }

      const [users] = await db.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (users.length === 0) {
        return res.json({
          success: false,
          message: "User not found"
        });
      }

      const user = users[0];
      
      const isValid = await bcrypt.compare(password, user.password);
      const newHash = await bcrypt.hash(password, 10);
      
      res.json({
        success: true,
        message: "Password test result",
        email: email,
        passwordValid: isValid,
        storedPasswordHash: user.password ? user.password.substring(0, 30) + '...' : null,
        newPasswordHash: newHash.substring(0, 30) + '...',
        note: isValid ? "✅ Password cocok" : "❌ Password tidak cocok"
      });

    } catch (err) {
      console.error("🔥 Test password error:", err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      
      if (!email || !newPassword) {
        return res.json({
          success: false,
          message: "Email and newPassword required"
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const [result] = await db.query(
        "UPDATE users SET password = ? WHERE email = ?",
        [hashedPassword, email]
      );
      
      if (result.affectedRows > 0) {
        res.json({
          success: true,
          message: "Password reset successfully",
          email: email
        });
      } else {
        res.json({
          success: false,
          message: "User not found"
        });
      }

    } catch (err) {
      console.error("🔥 Reset password error:", err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  },

  // ============================================
  // CHECK TABLE STRUCTURE
  // ============================================
  checkTableStructure: async (req, res) => {
    try {
      const [tables] = await db.query("SHOW TABLES LIKE 'users'");
      if (tables.length === 0) {
        return res.json({
          success: false,
          message: "Table 'users' does not exist"
        });
      }

      const [columns] = await db.query("DESCRIBE users");
      const [sample] = await db.query("SELECT * FROM users LIMIT 1");
      
      res.json({
        success: true,
        message: "Users table structure",
        columns: columns.map(col => ({
          field: col.Field,
          type: col.Type,
          nullable: col.Null === 'YES',
          key: col.Key
        })),
        sampleData: sample.length > 0 ? sample[0] : null,
        totalUsers: (await db.query("SELECT COUNT(*) as total FROM users"))[0][0].total
      });
    } catch (err) {
      console.error("Error:", err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  },

  // ============================================
  // REGISTER NEW USER
  // ============================================
  register: async (req, res, next) => {
    try {
      const { email, name, password, role } = req.body;

      if (!email || !name || !password) {
        return res.status(400).json({
          success: false,
          message: "Email, name, and password are required"
        });
      }

      const [existing] = await db.query(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email already exists"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [result] = await db.query(
        "INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)",
        [email, name, hashedPassword, role || 'user']
      );

      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          id: result.insertId,
          email,
          name,
          role: role || 'user'
        }
      });

    } catch (err) {
      console.error("🔥 Register error:", err);
      next(err);
    }
  }
};

module.exports = authController;