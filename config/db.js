const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "testdb",
  waitForConnections: true,
  connectionLimit: 10,   // batas koneksi aktif
  queueLimit: 0          // unlimited queue
});

// Test koneksi sekali di awal
(async () => {
  try {
    const connection = await db.getConnection();
    console.log("✅ Database connected");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1); // matikan server kalau gagal connect
  }
})();

module.exports = db;
