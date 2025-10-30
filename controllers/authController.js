const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");

// ================== LOGIN ==================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Cari user berdasarkan email
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const user = rows[0];

    // ✅ Password plaintext check
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Pastikan ada secret
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing in .env file");
    }

    // Buat JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Simpan di cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000
    });

    // ✅ Redirect ke dashboard
    return res.redirect("/lippo");
  } catch (err) {
    console.error("❌ Login error:", err.message);
    next(err);
  }
};


// ================== GENERATE TOKEN MANUAL ==================
exports.generateToken = (req, res) => {
  const payload = {
    username: "apiClient",
    role: "system"
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || "defaultSecret",
    { expiresIn: "1d" }
  );

  res.json({
    success: true,
    message: "Token generated successfully",
    token
  });
};

// ================== LOGOUT ==================
exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.redirect("/"); // bisa diubah ke halaman login
};
