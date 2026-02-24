// middleware/generateToken.js - Versi Sederhana
const jwt = require("jsonwebtoken");

module.exports = (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing");
    }

    // Default payload
    const payload = {
      id: 1,
      username: "apiClient",
      email: "client@example.com",
      name: "API Client",
      role: "system"
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "365d" // 1 tahun
    });

    return res.json({
      success: true,
      message: "✅ Token generated successfully (valid for 1 year)",
      token: token
    });

  } catch (err) {
    console.error("❌ Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "❌ Failed to generate token"
    });
  }
};