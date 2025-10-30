// routes/loginRoutes.js
const express = require("express");
const router = express.Router();
const loginController = require("../controllers/loginController");

// 👉 Form login (GET)
router.get("/", loginController.loginView);

// 👉 Proses login (POST) bisa ditambahkan kalau perlu
const { login } = require("../controllers/authController");
router.post("/login", login);

module.exports = router;
