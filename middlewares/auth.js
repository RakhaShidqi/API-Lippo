// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token =
      authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : req.cookies?.token;

    if (!token) {
      // Bedakan API vs web
      if (req.originalUrl.startsWith("/api")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
      }
      return res.redirect("/");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing in environment variables");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // simpan payload user
    next();
  } catch (err) {
    console.error("❌ Auth error:", err.message);

    if (req.originalUrl.startsWith("/api")) {
      return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }

    return res.redirect("/");
  }
};
