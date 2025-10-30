// routes/lippoRoutes.js
const express = require("express");
const router = express.Router();
const lippoController = require("../controllers/lippoController");
const upload = require("../middlewares/upload");
const apiLimiter = require("../middlewares/rateLimit");
// const auth = require("../middleware/auth"); // uncomment kalau mau protect

// Health check
router.get("/", (req, res) => {
  res.send("✅ Lippo API is running");
});

// Mall data
router.post("/mall/all", lippoController.addData);
router.get("/mall/all", lippoController.getAllData);
router.get("/mall/mallName", lippoController.getSpecificData);
router.get("/mall/period", lippoController.getSpecificDataPeriod);

// Customer data
router.get("/customer/customerName", lippoController.getSpecificDataCustomer);

// CSV Upload + Mapping
router.post("/upload-csv", upload.single("file"), lippoController.uploadCSV);
router.post("/save-mapping", lippoController.saveMapping);
router.post("/insert-data", lippoController.insertDataViaUpload);

module.exports = router;
