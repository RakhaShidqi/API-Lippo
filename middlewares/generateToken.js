// middleware/generateToken.js
const jwt = require("jsonwebtoken");

/**
 * Middleware untuk generate token JWT
 * Bisa dipanggil lewat route misalnya: GET /api/generate-token
 */
module.exports = (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing in environment variables");
    }

    const payload = {
      username: "apiClient", // default identity
      role: "system",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d", // token berlaku 1 hari
    });

    return res.json({
      message: "✅ Token generated successfully",
      token,
    });
  } catch (err) {
    console.error("❌ Token generation error:", err.message);
    return res.status(500).json({
      message: "❌ Failed to generate token",
      error: err.message,
    });
  }
};
