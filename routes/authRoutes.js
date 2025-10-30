// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth")
const lippoController = require("../controllers/lippoController");
const { login, generateToken, logout } = require("../controllers/authController");


// Testing API

router.get("/", (req, res) => {
  res.send("✅ Lippo API is running");
});

// Get All Mall
router.get("/mall/all",auth, lippoController.getAllData);
router.get("/mall/mallName",auth, lippoController.getSpecificData);
router.get("/mall/period",auth, lippoController.getSpecificDataPeriod);

// Customer data
router.get("/customer/customerName", lippoController.getSpecificDataCustomer);

// Login user (POST /auth/login)
router.post("/login", login);

// Generate token (GET /auth/generate-token)
router.get("/generate-token", generateToken);

// Logout user (POST /auth/logout)
router.post("/logout", logout);

module.exports = router;
