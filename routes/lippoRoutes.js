// routes/lippoRoutes.js
const express = require("express");
const router = express.Router();
const lippoController = require("../controllers/lippoController");
const upload = require("../middlewares/upload");
const limiter = require("../middlewares/rateLimit");
const auth = require("../middlewares/auth"); // Middleware untuk verifikasi JWT (API)

// ======================
// MIDDLEWARE UNTUK CEK LOGIN (WEB)
// ======================
const checkWebLogin = (req, res, next) => {
  // Cek apakah user sudah login (dari session)
  // Ini bisa berbeda-beda tergantung implementasi session Anda
  
  // Contoh 1: Cek dari session (jika pakai express-session)
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }
  
  // Contoh 2: Cek dari cookie (jika pakai cookie)
  // if (req.cookies && req.cookies.token) { ... }
  
  // Contoh 3: Cek dari header (untuk web)
  // if (req.headers['x-user-token']) { ... }
  
  // Jika tidak ada session, redirect ke halaman login
  console.log("🔒 Unauthorized web access, redirecting to login");
  
  // Untuk API-style response (jika request JSON)
  if (req.headers.accept === 'application/json') {
    return res.status(401).json({
      success: false,
      message: "Silakan login terlebih dahulu"
    });
  }
  
  // Redirect ke halaman login
  res.redirect('/login');
};

// ======================
// MIDDLEWARE UNTUK DETEKSI AKSES
// ======================
const detectAccessType = (req, res, next) => {
  const hasAuthHeader = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
  const isJsonRequest = req.headers['content-type'] === 'application/json';
  const wantsJson = req.headers.accept === 'application/json';
  
  if (hasAuthHeader || isJsonRequest || wantsJson) {
    req.accessType = 'api';
  } else {
    req.accessType = 'web';
  }
  
  console.log(`📡 Request: ${req.method} ${req.path} | Type: ${req.accessType}`);
  next();
};

// Middleware untuk API (wajib token)
const requireApiAuth = (req, res, next) => {
  if (req.accessType === 'api') {
    return auth(req, res, next);
  }
  next();
};

// Apply middleware ke semua route
router.use(detectAccessType);

// ======================
// TEST ROUTE - TANPA AUTH
// ======================
router.get("/test", (req, res) => {
  res.json({ 
    success: true, 
    message: "Lippo routes are working",
    accessType: req.accessType,
    timestamp: new Date().toISOString()
  });
});

// ======================
// WEB ROUTES - WAJIB LOGIN DULU
// ======================

// 🔐 Halaman dashboard - WAJIB LOGIN
router.get("/web/dashboard", checkWebLogin, (req, res) => {
  if (req.accessType === 'api') {
    return res.status(403).json({
      success: false,
      message: "This endpoint is only accessible via web browser"
    });
  }
  console.log("✅ User accessing dashboard:", req.user?.email || "Unknown");
  res.render("index", { 
    title: "Dashboard Lippo",
    user: req.user 
  });
});

// 🔐 Web routes lainnya - WAJIB LOGIN
router.get("/web/data", checkWebLogin, limiter, lippoController.getAllData);
router.get("/web/data/:id", checkWebLogin, limiter, lippoController.getDataById);
router.get("/web/customer/idCustomer", checkWebLogin, limiter, lippoController.getDataByIdCustomer);
router.get("/web/mall/all", checkWebLogin, limiter, lippoController.getAllData);
router.get("/web/mall/mallName", checkWebLogin, limiter, lippoController.getDataByMall);
router.get("/web/mall/period", checkWebLogin, limiter, lippoController.getDataByPeriod);
router.get("/web/customer/customerName", checkWebLogin, limiter, lippoController.getDataByCustomer);

router.post("/web/upload", checkWebLogin, upload.single("file"), lippoController.uploadFile);
router.post("/web/mapping/save", checkWebLogin, lippoController.saveMapping);
router.post("/web/mapping/insert", checkWebLogin, lippoController.insertMappedData);
router.post("/web/cache/clear", checkWebLogin, lippoController.clearCache);

// ======================
// API ROUTES - WAJIB TOKEN
// ======================
router.get("/api/data", auth, limiter, lippoController.getAllDataViaApi);
router.get("/api/customer/idCustomer", auth, limiter, lippoController.getDataByIdCustomerViaApi);
router.get("/api/mall/all", auth, limiter, lippoController.getAllDataViaApi);
router.get("/api/mall/mallName", auth, limiter, lippoController.getDataByMallViaApi);
router.get("/api/mall/period", auth, limiter, lippoController.getDataByPeriodViaApi);
router.get("/api/customer/customerName", auth, limiter, lippoController.getDataByCustomerViaApi);
router.get("/api/tenant/tenantName", auth, limiter, lippoController.getDataByTenantViaApi);
router.get("/api/status/statusPayment", auth, limiter, lippoController.getDataByStatusViaApi);

router.post("/api/upload", auth, upload.single("file"), lippoController.uploadFile);
router.post("/api/mapping/save", auth, lippoController.saveMapping);
router.post("/api/mapping/insert", auth, lippoController.insertMappedData);
router.post("/api/cache/clear", auth, lippoController.clearCache);

// ======================
// LEGACY ROUTES - AUTO DETECT
// ======================
router.get("/data", lippoController.getAllData);
router.get("/data/:id", lippoController.getDataById);
router.put("/data/:id", lippoController.updateData);
router.delete("/data/:id",lippoController.deleteData);
router.get("/customer/idCustomer", limiter, requireApiAuth, lippoController.getDataByIdCustomer);
router.get("/mall/all", limiter, requireApiAuth, lippoController.getAllData);
router.get("/mall/mallName", limiter, requireApiAuth, lippoController.getDataByMall);
router.get("/mall/period", limiter, requireApiAuth, lippoController.getDataByPeriod);
router.get("/customer/customerName", limiter, requireApiAuth, lippoController.getDataByCustomer);

router.post("/upload", requireApiAuth, upload.single("file"), lippoController.uploadFile);
router.post("/mapping/save", requireApiAuth, lippoController.saveMapping);
router.post("/mapping/insert", requireApiAuth, lippoController.insertMappedData);
router.post("/cache/clear", requireApiAuth, lippoController.clearCache);
router.post("/save-mapping", requireApiAuth, lippoController.saveMapping);
router.post("/insert-mapping", requireApiAuth, lippoController.insertMappedData);
router.post("/clear-cache", requireApiAuth, lippoController.clearCache);

module.exports = router;