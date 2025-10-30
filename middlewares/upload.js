// middleware/uploadMiddleware.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Konfigurasi storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // folder penyimpanan
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// Filter file (hanya izinkan CSV)
function fileFilter(req, file, cb) {
  const allowedTypes = [".csv"]; // bisa ditambah ".xlsx", ".txt", dll
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedTypes.includes(ext)) {
    return cb(new Error("Only CSV files are allowed"), false);
  }
  cb(null, true);
}

// Batas ukuran file max 5MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
  