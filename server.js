// server.js
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const db = require("./config/db");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const lippoRoutes = require("./routes/lippoRoutes");
const loginRoutes = require("./routes/loginRoutes");
const apiLimiter = require("./middlewares/rateLimit");

const app = express();

// ✅ Izinkan semua origin (CORS ON)
// ✅ CORS FIX — Izinkan domain / IP manapun
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true); // izinkan semua origin
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ✅ Izinkan preflight request OPTIONS
app.options(/.*/, cors());

// ✅ Helmet tanpa CSP supaya tidak blok script/style eksternal
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    referrerPolicy: { policy: "no-referrer-when-downgrade" },
  })
);

// ✅ Middleware Parser Body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ✅ Static Folder
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes
app.use("/auth", authRoutes);
app.use("/hypernet-lippo", lippoRoutes);
app.use("/api/hypernet-lippo", apiLimiter, lippoRoutes); // versi API dilindungi limiter
app.use("/", loginRoutes); // login page paling terakhir untuk menghindari override route lain

// ✅ Dashboard Page
app.get("/lippo", (req, res) => {
  res.render("index", { title: "Dashboard" });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err.stack || err.message);
  res.status(500).send("Internal Server Error - Check server logs");
});

// ✅ Optional: Debug daftar route saat development
if (process.env.NODE_ENV === "development" && app._router) {
  app._router.stack
    .filter(r => r.route)
    .forEach(r =>
      console.log(`${Object.keys(r.route.methods)} -> ${r.route.path}`)
    );
}

// ✅ Start Server
const PORT = process.env.PORT || 4000;
const DB_HOST = process.env.DB_HOST || "localhost";
app.listen(PORT, () => {
  console.log(`✅ Server running at http://${DB_HOST}:${PORT}`);
});
