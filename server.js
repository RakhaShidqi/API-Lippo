// server.js
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const db = require("./config/db");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const lippoRoutes = require("./routes/lippoRoutes");
const loginRoutes = require("./routes/loginRoutes");
const apiLimiter = require("./middlewares/rateLimit");
const upload = require("./middlewares/upload");

const app = express();

// ✅ Helmet CSP + Referrer Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:*", "https://cdn.jsdelivr.net"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Views
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ✅ Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // supaya folder uploads bisa diakses

// auth Routes
app.use("/auth", authRoutes);

// ✅ Routes
app.use("/", loginRoutes); // halaman login
app.use("/api/hypernet-lippo",apiLimiter, authRoutes);
app.use("/hypernet-lippo", lippoRoutes);

// ✅ Dashboard page
app.get("/lippo", (req, res) => {
  res.render("index", { title: "Dashboard" });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.stack || err.message);
  res.status(500).send("Internal Server Error - Check server logs");
});

// ✅ Debug registered routes (only in dev mode)
if (process.env.NODE_ENV === "development" && app._router) {
  app._router.stack
    .filter(r => r.route)
    .forEach(r =>
      console.log(`${Object.keys(r.route.methods)} -> ${r.route.path}`)
    );
}

// ✅ Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
