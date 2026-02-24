// middlewares/auth.js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  console.log("🔐 Auth middleware dipanggil untuk:", req.method, req.path);
  
  try {
    // Ambil token dari header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log("❌ No authorization header");
      return res.status(401).json({
        success: false,
        message: "API key required",
        error: {
          code: "MISSING_API_KEY",
          detail: "Please provide a valid API key in the Authorization header"
        }
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.log("❌ Invalid authorization format");
      return res.status(401).json({
        success: false,
        message: "Invalid API key format",
        error: {
          code: "INVALID_API_KEY_FORMAT",
          detail: "Use format: Bearer <your-api-key>"
        }
      });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      console.log("❌ No token provided");
      return res.status(401).json({
        success: false,
        message: "API key missing",
        error: {
          code: "EMPTY_API_KEY",
          detail: "Token is empty"
        }
      });
    }

    // Verifikasi token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    console.log("✅ API key valid. User:", decoded.email || decoded.username);

    // Simpan user info ke request
    req.user = decoded;
    
    next();

  } catch (err) {
    console.error("🔥 Auth middleware error:", err.message);
    
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "API key expired",
        error: {
          code: "API_KEY_EXPIRED",
          detail: "Your API key has expired. Please login again to get a new one."
        }
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
        error: {
          code: "INVALID_API_KEY",
          detail: "The provided API key is invalid. Please check your token."
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication service error",
      error: {
        code: "AUTH_SERVICE_ERROR",
        detail: err.message
      }
    });
  }
};

module.exports = authMiddleware;