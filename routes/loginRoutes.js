// routes/loginRoutes.js
const express = require("express");
const router = express.Router();

// Halaman login
router.get("/login", (req, res) => {
  res.render("login", { 
    title: "Login",
    error: null 
  });
});

// Handle login form submission (optional - jika menggunakan form)
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  
  // Redirect ke API login atau handle di sini
  res.redirect("/auth/login");
});

// Root route - redirect ke login atau dashboard
router.get("/", (req, res) => {
  res.redirect("/login");
});

module.exports = router;