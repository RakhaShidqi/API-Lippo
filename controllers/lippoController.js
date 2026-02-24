const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const XLSX = require('xlsx');
const db = require("../config/db");
const { normalizeDate } = require("../utils/dateHelper");

// Cache untuk menyimpan hasil mapping sementara
let cachedResults = [];

// ==========================
// Insert Data Manual (from form / API)
// ==========================
exports.addData = async (req, res, next) => {
  try {
    const d = req.body;

    // Validasi input
    if (!d.uniqueId || !d.idCustomer || !d.customerName) {
      return res.status(400).json({
        success: false,
        message: "Required fields: uniqueId, idCustomer, customerName"
      });
    }

    // Parse period
    let periodStr = null;
    let month = null;
    
    if (d.period) {
      try {
        const periodDate = new Date(d.period);
        if (!isNaN(periodDate.getTime())) {
          periodStr = periodDate.toLocaleString('default', { month: 'long' });
          month = periodDate.getMonth() + 1;
        }
      } catch (e) {
        console.warn("Period parsing warning:", e.message);
      }
    }

    const sql = `INSERT INTO revenue 
      (unique_id, id_customer, customer_name, tenant_name, mall_name, ship_address, 
       tgl_wo_address_request, bast_date, status, start, end, 
       period, month, price_per_month, status_payment, rev_lmi, rev_mall)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      d.uniqueId,
      d.idCustomer,
      d.customerName,
      d.tenantName || null,
      d.mallName || null,
      d.shipAddress || null,
      normalizeDate(d.tglWOAdressRequest),
      normalizeDate(d.bastDate),
      d.status || 'Not Posted',
      normalizeDate(d.start),
      normalizeDate(d.end),
      periodStr,
      month,
      d.pricePerMonth || 0,
      d.statusPayment || 'Unpaid',
      d.revLMI || 0,
      d.revMall || 0,
    ];

    const [result] = await db.query(sql, values);

    res.status(201).json({
      success: true,
      message: "Data successfully added",
      data: { id: result.insertId, ...d },
    });
  } catch (err) {
    console.error("🔥 Insert error:", err.message);
    next(err);
  }
};

// ==========================
// Get All Data
// ==========================
exports.getAllData = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        no, 
        unique_id, 
        id_customer, 
        customer_name, 
        tenant_name, 
        mall_name, 
        ship_address,
        tgl_wo_address_request, 
        bast_date, 
        status, 
        start, 
        end, 
        period, 
        month, 
        price_per_month, 
        status_payment, 
        rev_lmi, 
        rev_mall
      FROM revenue 
      ORDER BY no DESC
    `);

    const data = rows.map((row) => ({
      no: row.no,
      uniqueId: row.unique_id,
      idCustomer: row.id_customer,
      customerName: row.customer_name,
      tenantName: row.tenant_name,
      mallName: row.mall_name,
      shipAddress: row.ship_address,
      tglWOAdressRequest: row.tgl_wo_address_request
        ? formatDate(row.tgl_wo_address_request)
        : "",
      bastDate: row.bast_date ? formatDate(row.bast_date) : "",
      status: row.status,
      start: row.start ? formatDate(row.start) : "",
      end: row.end ? formatDate(row.end) : "",
      period: row.period,
      month: row.month,
      pricePerMonth: row.price_per_month,
      statusPayment: row.status_payment,
      revLMI: row.rev_lmi,
      revMall: row.rev_mall,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("🔥 Fetch all error:", err.message);
    next(err);
  }
};

// ==========================
// Get Data by ID Customer
// ==========================
exports.getDataByIdCustomer = async (req, res, next) => {
  try {
    // Dukung path parameter ATAU query parameter
    const idCustomer = req.params.idCustomer || req.query.idCustomer;

    if (!idCustomer) {
      return res.status(400).json({ 
        success: false, 
        message: "ID Customer is required" 
      });
    }

    console.log("🔍 Searching for ID Customer:", idCustomer);

    const [rows] = await db.query(
      "SELECT * FROM revenue WHERE id_customer LIKE ? ORDER BY no DESC", 
      [`%${idCustomer}%`]
    );

    res.json({ 
      success: true, 
      count: rows.length,
      data: rows 
    });

  } catch (err) {
    console.error("🔥 Fetch by ID Customer error:", err.message);
    next(err);
  }
};

// ==========================
// Get Data by mall_name
// ==========================
exports.getDataByMall = async (req, res, next) => {
  try {
    const { mallName } = req.query;

    if (!mallName) {
      return res.status(400).json({ success: false, message: "Mall name is required" });
    }

    const [rows] = await db.query(
      "SELECT * FROM revenue WHERE mall_name LIKE ? ORDER BY no DESC", 
      [`%${mallName}%`]
    );
    
    res.json({ 
      success: true, 
      count: rows.length,
      data: rows 
    });
  } catch (err) {
    console.error("🔥 Fetch mall error:", err.message);
    next(err);
  }
};

// ==========================
// Get Data by customer_name
// ==========================
exports.getDataByCustomer = async (req, res, next) => {
  try {
    const { customerName } = req.query;
    
    if (!customerName) {
      return res.status(400).json({ success: false, message: "Customer name is required" });
    }

    const [rows] = await db.query(
      "SELECT * FROM revenue WHERE customer_name LIKE ? ORDER BY no DESC", 
      [`%${customerName}%`]
    );
    
    res.json({ 
      success: true, 
      count: rows.length,
      data: rows 
    });
  } catch (err) {
    console.error("🔥 Fetch customer error:", err.message);
    next(err);
  }
};

// ==========================
// Get Data by period
// ==========================
exports.getDataByPeriod = async (req, res, next) => {
  try {
    const { period } = req.query;
    
    if (!period) {
      return res.status(400).json({ success: false, message: "Period is required" });
    }

    const [rows] = await db.query(
      "SELECT * FROM revenue WHERE period LIKE ? ORDER BY no DESC", 
      [`%${period}%`]
    );
    
    res.json({ 
      success: true, 
      count: rows.length,
      data: rows 
    });
  } catch (err) {
    console.error("🔥 Fetch period error:", err.message);
    next(err);
  }
};

// ==========================
// Update Data
// ==========================
exports.updateData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const d = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    // Cek data exists
    const [existing] = await db.query("SELECT no FROM revenue WHERE no = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Data not found" });
    }

    const sql = `UPDATE revenue SET
      unique_id = ?, id_customer = ?, customer_name = ?, tenant_name = ?, mall_name = ?, ship_address = ?,
      tgl_wo_address_request = ?, bast_date = ?, status = ?, start = ?, end = ?,
      period = ?, month = ?, price_per_month = ?, status_payment = ?, rev_lmi = ?, rev_mall = ?
      WHERE no = ?`;

    const values = [
      d.uniqueId,
      d.idCustomer,
      d.customerName,
      d.tenantName || null,
      d.mallName || null,
      d.shipAddress || null,
      normalizeDate(d.tglWOAdressRequest),
      normalizeDate(d.bastDate),
      d.status || 'Not Posted',
      normalizeDate(d.start),
      normalizeDate(d.end),
      d.period || null,
      d.month || null,
      d.pricePerMonth || 0,
      d.statusPayment || 'Unpaid',
      d.revLMI || 0,
      d.revMall || 0,
      id
    ];

    await db.query(sql, values);

    res.json({
      success: true,
      message: "Data successfully updated"
    });
  } catch (err) {
    console.error("🔥 Update error:", err.message);
    next(err);
  }
};

// ==========================
// Delete Data
// ==========================
exports.deleteData = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    // Cek data exists
    const [existing] = await db.query("SELECT no FROM revenue WHERE no = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Data not found" });
    }

    await db.query("DELETE FROM revenue WHERE no = ?", [id]);

    res.json({
      success: true,
      message: "Data successfully deleted"
    });
  } catch (err) {
    console.error("🔥 Delete error:", err.message);
    next(err);
  }
};

// ==========================
// 🔥 PERBAIKAN: Upload CSV/Excel → return headers
// ==========================
exports.uploadFile = (req, res, next) => {
  try {
    console.log("📤 Upload endpoint hit!");
    console.log("📎 File received:", req.file);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "No file uploaded" 
      });
    }

    const filePath = req.file.path;
    const fileName = path.basename(filePath);
    const originalName = req.file.originalname;
    const fileExt = path.extname(originalName).toLowerCase();
    
    console.log("📊 File details:", {
      originalName,
      fileName,
      size: req.file.size,
      path: filePath,
      ext: fileExt
    });
    
    // Proses berdasarkan tipe file - PANGGIL FUNGSI YANG BENAR
    if (fileExt === '.csv') {
      // Panggil fungsi untuk proses CSV dan redirect ke mapping
      processCSVAndRedirect(filePath, fileName, req, res);
    } 
    else if (fileExt === '.xlsx' || fileExt === '.xls') {
      // Panggil fungsi untuk proses Excel dan redirect ke mapping
      processExcelAndRedirect(filePath, fileName, req, res);
    }
    else {
      cleanupFile(filePath);
      return res.status(400).json({ 
        success: false, 
        message: "Only CSV and Excel files (.csv, .xlsx, .xls) are allowed" 
      });
    }
    
  } catch (err) {
    console.error("🔥 Upload error:", err);
    cleanupFile(req.file?.path);
    res.status(500).json({
      success: false,
      message: "Upload failed: " + err.message
    });
  }
};

// 🔥 FUNGSI BARU: Process CSV dan Redirect ke Mapping
// ==========================
function processCSVAndRedirect(filePath, fileName, req, res) {
  const headers = [];
  
  fs.createReadStream(filePath)
    .pipe(csv({ separator: ";" }))
    .on("headers", async (csvHeaders) => {
      console.log("🔥 Headers CSV terbaca:", csvHeaders);
      headers.push(...csvHeaders.map(h => h.trim()));

      try {
        // Ambil nama kolom dari tabel revenue
        const [rows] = await db.query("SHOW COLUMNS FROM revenue");
        const dbFields = rows.map(r => r.Field);

        console.log("✅ Redirecting to mapping page with headers:", headers);
        
        // Redirect ke halaman mapping dengan data yang diperlukan
        res.render("mapping", {
          title: "Field Mapping",
          filePath: filePath,
          fileName: fileName,
          csvHeaders: headers,
          dbFields: dbFields,
          fileType: 'csv'
        });
      } catch (err) {
        console.error("🔥 Gagal ambil column DB:", err);
        cleanupFile(filePath);
        res.status(500).send("Gagal ambil field database: " + err.message);
      }
    })
    .on("error", (err) => {
      console.error("🔥 CSV parse error:", err);
      cleanupFile(filePath);
      res.status(500).send("Gagal membaca file CSV: " + err.message);
    });
}

// ==========================
// 🔥 FUNGSI BARU: Process Excel dan Redirect ke Mapping
// ==========================
function processExcelAndRedirect(filePath, fileName, req, res) {
  try {
    const workbook = XLSX.readFile(filePath);
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      cleanupFile(filePath);
      return res.status(400).send("File Excel tidak memiliki sheet");
    }
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Baca headers dari baris pertama
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
      range: 0 // Hanya baca baris pertama untuk headers
    });
    
    if (jsonData.length === 0) {
      cleanupFile(filePath);
      return res.status(400).send("File Excel kosong");
    }
    
    // Ambil headers dari baris pertama
    const rawHeaders = jsonData[0] || [];
    console.log("🔥 Headers Excel mentah:", rawHeaders);
    
    // Bersihkan headers
    const headers = rawHeaders
      .filter(h => h !== null && h !== undefined)
      .map(h => h.toString().trim());
    
    console.log("🔥 Headers Excel setelah dibersihkan:", headers);
    
    // Ambil nama kolom dari tabel revenue
    db.query("SHOW COLUMNS FROM revenue")
      .then(([rows]) => {
        const dbFields = rows.map(r => r.Field);
        
        console.log("✅ Redirecting to mapping page with Excel headers:", headers);
        
        // Redirect ke halaman mapping
        res.render("mapping", {
          title: "Field Mapping",
          filePath: filePath,
          fileName: fileName,
          csvHeaders: headers, // Tetap pakai nama csvHeaders untuk kompatibilitas view
          dbFields: dbFields,
          fileType: 'excel'
        });
      })
      .catch(err => {
        console.error("🔥 Gagal ambil column DB:", err);
        cleanupFile(filePath);
        res.status(500).send("Gagal ambil field database: " + err.message);
      });
    
  } catch (err) {
    console.error("🔥 Excel parse error:", err);
    cleanupFile(filePath);
    res.status(500).send("Gagal membaca file Excel: " + err.message);
  }
}

// ==========================
// Save mapping and preview data
// ==========================
exports.saveMapping = async (req, res, next) => {
  try {
    const { fileName, mapping } = req.body;
    
    console.log("📝 Save mapping request:", { fileName, mapping });

    // Validasi input
    if (!fileName) {
      return res.status(400).json({ 
        success: false, 
        message: "File name is required" 
      });
    }

    if (!mapping || typeof mapping !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: "Mapping must be a valid object" 
      });
    }

    // Path ke file yang diupload
    const filePath = path.join(__dirname, "../uploads", fileName);
    
    // Cek apakah file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        message: "File not found",
        debug: { filePath }
      });
    }

    // Baca file berdasarkan ekstensi
    const fileExt = path.extname(fileName).toLowerCase();
    let results = [];

    if (fileExt === '.csv') {
      results = await parseCSVFile(filePath, mapping);
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      results = await parseExcelFile(filePath, mapping);
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Unsupported file type" 
      });
    }

    // Debug: Lihat hasil parsing
    console.log("📊 Parsed results:", {
      totalRows: results.length,
      sampleRow: results[0] || null,
    });

    // Validasi results
    if (results.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data found in file",
        debug: { filePath, fileExt }
      });
    }

    // Simpan ke cache
    cachedResults = results;

    // ✅ AUTO INSERT KE DATABASE
    try {
      const insertResult = await insertDataToDatabase(results);
      
      if (insertResult.success) {
        console.log(`✅ Auto-insert success: Inserted: ${insertResult.insertedCount}, Updated: ${insertResult.updatedCount}`);
        
        // Hapus file setelah sukses
        cleanupFile(filePath);
        
        // Redirect ke halaman lippo
        return res.redirect("/lippo");
      } else {
        throw new Error(insertResult.message);
      }
    } catch (insertErr) {
      console.error("❌ Auto-insert failed:", insertErr);
      
      // Jika insert gagal, kirim error dengan detail
      return res.status(500).json({ 
        success: false, 
        message: `Auto-insert failed: ${insertErr.message}`,
        error: insertErr.message,
        details: insertErr.sqlMessage || null
      });
    }

  } catch (err) {
    console.error("🔥 Save mapping error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      error: err.message 
    });
  }
};

// ==========================
// Insert mapped data to database
// ==========================
exports.insertMappedData = async (req, res, next) => {
  let connection;
  
  try {
    if (!cachedResults || cachedResults.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No data to insert. Please upload and map file first." 
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Filter out empty rows
    const validResults = cachedResults.filter(row => 
      row.customer_name || row.unique_id || row.id_customer
    );

    if (validResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid data to insert"
      });
    }

    const allDatabaseFields = [
      'unique_id', 
      'id_customer', 
      'customer_name', 
      'tenant_name', 
      'mall_name', 
      'ship_address', 
      'bast_date', 
      'start', 
      'end', 
      'period',
      'month',
      'price_per_month', 
      'rev_lmi', 
      'rev_mall'
    ];
    
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let errorDetails = [];
    
    for (let i = 0; i < validResults.length; i++) {
      const row = validResults[i];
      try {
        let periodValue = row.period ? parseInt(row.period) || 0 : 0;
        let monthValue = row.month ? row.month.toString().trim() : null;
        
        const values = [
          row.unique_id || null,
          row.id_customer || null,
          row.customer_name || null,
          row.tenant_name || null,
          row.mall_name || null,
          row.ship_address || null,
          row.bast_date || null,
          row.start || null,
          row.end || null,
          periodValue,
          monthValue,
          row.price_per_month || 0,
          row.rev_lmi || null,
          row.rev_mall || 0
        ];

        const updateSet = allDatabaseFields
          .filter(field => field !== 'unique_id')
          .map(field => `${field} = VALUES(${field})`)
          .join(', ');
        
        const placeholders = allDatabaseFields.map(() => '?').join(', ');
        const sql = `INSERT INTO revenue (${allDatabaseFields.join(', ')}) 
                     VALUES (${placeholders})
                     ON DUPLICATE KEY UPDATE ${updateSet}`;
        
        const [result] = await connection.query(sql, values);
        
        if (result.affectedRows > 0) {
          if (result.affectedRows === 1) {
            insertedCount++;
          } else {
            updatedCount++;
          }
        }
        
      } catch (rowErr) {
        errorCount++;
        errorDetails.push({
          row: i + 1,
          error: rowErr.message,
          data: row
        });
        console.error(`❌ Error inserting row ${i + 1}:`, rowErr.message);
      }
    }

    await connection.commit();

    cachedResults = [];

    res.json({
      success: true,
      message: `Successfully inserted ${insertedCount} rows, updated ${updatedCount} rows`,
      data: {
        insertedCount,
        updatedCount,
        errorCount,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
        totalRows: validResults.length
      }
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("🔥 Insert error:", err.sqlMessage || err);
    res.status(500).json({
      success: false,
      message: err.sqlMessage || "Failed to insert data into database",
      error: err.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================
// Clear cache
// ==========================
exports.clearCache = (req, res) => {
  cachedResults = [];
  res.json({
    success: true,
    message: "Cache cleared successfully"
  });
};

// ==========================
// Helper Functions
// ==========================

function formatDate(date) {
  if (!date) return "";
  try {
    if (date instanceof Date) {
      return date.toISOString().split("T")[0];
    }
    if (typeof date === 'string') {
      const d = new Date(date);
      return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
    }
    return "";
  } catch (e) {
    return "";
  }
}

function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  }
}

function normalizeHeader(header) {
  if (!header) return '';
  return header
    .toString()
    .replace(/\uFEFF/g, "")
    .replace(/\r/g, "")
    .replace(/\u00A0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[().]/g, "")
    .replace(/\s+/g, "_");
}

function cleanValue(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }
  return val;
}

function generateUniqueId(row) {
  if (!row) return null;
  
  const idCustomer = row.id_customer ? row.id_customer.toString().trim() : '';
  const shipAddress = row.ship_address ? row.ship_address.toString().trim() : '';
  const attribute = row.rev_lmi ? row.rev_lmi.toString().trim() : '';
  
  if (idCustomer && shipAddress && attribute) {
    return idCustomer + shipAddress + attribute;
  }
  
  return null;
}

function normalizeDateValue(val) {
  if (!val && val !== 0) return null;
  
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  
  if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    const [d, m, y] = val.split("/");
    return `${y}-${m}-${d}`;
  }
  
  if (!isNaN(val)) {
    const num = Number(val);
    if (num > 40000 && num < 50000) {
      try {
        const date = new Date((num - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) {
        console.warn("Failed to convert Excel serial date:", val);
      }
    }
  }
  
  if (typeof val === 'string') {
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
}

// Fungsi parseCSVFile
async function parseCSVFile(filePath, mapping) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        const record = {};
        
        const allFields = [
          'unique_id', 'id_customer', 'customer_name', 'tenant_name', 
          'mall_name', 'ship_address', 'bast_date', 'start', 'end', 
          'period', 'month', 'price_per_month', 'rev_lmi', 'rev_mall'
        ];
        allFields.forEach(field => record[field] = null);
        
        for (const [csvCol, dbField] of Object.entries(mapping)) {
          if (!dbField) continue;
          
          const normalizedCsvCol = normalizeHeader(csvCol);
          
          for (const key in row) {
            if (normalizeHeader(key) === normalizedCsvCol) {
              record[dbField] = cleanValue(row[key]);
              break;
            }
          }
        }
        
        if (record.bast_date) record.bast_date = normalizeDateValue(record.bast_date);
        if (record.start) record.start = normalizeDateValue(record.start);
        if (record.end) record.end = normalizeDateValue(record.end);
        
        if (record.price_per_month) {
          const strVal = record.price_per_month.toString();
          record.price_per_month = parseInt(strVal.replace(/[^0-9]/g, '')) || 0;
        }
        if (record.rev_mall) {
          const strVal = record.rev_mall.toString();
          record.rev_mall = parseInt(strVal.replace(/[^0-9]/g, '')) || 0;
        }
        if (record.period) record.period = parseInt(record.period) || 0;
        
        if (record.month) {
          record.month = record.month.toString().trim();
          if (record.month.length > 50) record.month = record.month.substring(0, 50);
        }
        
        if (!record.unique_id) {
          const generatedId = generateUniqueId(record);
          if (generatedId) record.unique_id = generatedId;
        }
        
        if (record.customer_name || record.unique_id || record.id_customer) {
          results.push(record);
        }
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

// Fungsi parseExcelFile
async function parseExcelFile(filePath, mapping) {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
        raw: true
      });
      
      if (jsonData.length < 2) {
        return resolve([]);
      }
      
      const excelHeaders = jsonData[0].map(h => h ? h.toString().trim() : '');
      const dataRows = jsonData.slice(1);
      
      const dbFieldToExcelIndex = {};
      const allDatabaseFields = [
        'unique_id', 'id_customer', 'customer_name', 'tenant_name', 
        'mall_name', 'ship_address', 'bast_date', 'start', 'end', 
        'period', 'month', 'price_per_month', 'rev_lmi', 'rev_mall'
      ];
      
      for (const [excelHeader, dbField] of Object.entries(mapping)) {
        if (!dbField) continue;
        
        const headerIndex = excelHeaders.findIndex(h => 
          normalizeHeader(h) === normalizeHeader(excelHeader)
        );
        
        if (headerIndex !== -1) {
          dbFieldToExcelIndex[dbField] = headerIndex;
        }
      }
      
      const results = dataRows.map(row => {
        const record = {};
        
        allDatabaseFields.forEach(field => record[field] = null);
        
        for (const [dbField, excelIndex] of Object.entries(dbFieldToExcelIndex)) {
          let val = row[excelIndex];
          record[dbField] = cleanValue(val);
        }
        
        if (record.bast_date) record.bast_date = normalizeDateValue(record.bast_date);
        if (record.start) record.start = normalizeDateValue(record.start);
        if (record.end) record.end = normalizeDateValue(record.end);
        
        if (record.price_per_month) {
          const strVal = record.price_per_month.toString();
          record.price_per_month = parseInt(strVal.replace(/[^0-9]/g, '')) || 0;
        }
        if (record.rev_mall) {
          const strVal = record.rev_mall.toString();
          record.rev_mall = parseInt(strVal.replace(/[^0-9]/g, '')) || 0;
        }
        if (record.period) record.period = parseInt(record.period) || 0;
        
        if (record.month) {
          record.month = record.month.toString().trim();
          if (record.month.length > 50) record.month = record.month.substring(0, 50);
        }
        
        if (!record.unique_id) {
          const generatedId = generateUniqueId(record);
          if (generatedId) record.unique_id = generatedId;
        }
        
        return record;
        
      }).filter(row => row.customer_name || row.unique_id || row.id_customer);
      
      resolve(results);
      
    } catch (err) {
      reject(err);
    }
  });
}

// Fungsi insertDataToDatabase
async function insertDataToDatabase(data) {
  let connection;
  
  try {
    if (!data || data.length === 0) {
      return { success: false, message: "No data to insert" };
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const validResults = data.filter(row => 
      row.customer_name || row.unique_id || row.id_customer
    );

    if (validResults.length === 0) {
      return { success: false, message: "No valid data to insert" };
    }

    const allDatabaseFields = [
      'unique_id', 
      'id_customer', 
      'customer_name', 
      'tenant_name', 
      'mall_name', 
      'ship_address', 
      'bast_date', 
      'start', 
      'end', 
      'period',
      'month',
      'price_per_month', 
      'rev_lmi', 
      'rev_mall'
    ];
    
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const row of validResults) {
      try {
        let periodValue = row.period ? parseInt(row.period) || 0 : 0;
        let monthValue = row.month ? row.month.toString().trim() : null;

        const values = [
          row.unique_id || null,
          row.id_customer || null,
          row.customer_name || null,
          row.tenant_name || null,
          row.mall_name || null,
          row.ship_address || null,
          row.bast_date || null,
          row.start || null,
          row.end || null,
          periodValue,
          monthValue,
          row.price_per_month || 0,
          row.rev_lmi || null,
          row.rev_mall || 0
        ];

        const updateSet = allDatabaseFields
          .filter(field => field !== 'unique_id')
          .map(field => `${field} = VALUES(${field})`)
          .join(', ');
        
        const placeholders = allDatabaseFields.map(() => '?').join(', ');
        const sql = `INSERT INTO revenue (${allDatabaseFields.join(', ')}) 
                     VALUES (${placeholders})
                     ON DUPLICATE KEY UPDATE ${updateSet}`;
        
        const [result] = await connection.query(sql, values);
        
        if (result.affectedRows > 0) {
          if (result.affectedRows === 1) {
            insertedCount++;
          } else {
            updatedCount++;
          }
        }
        
      } catch (rowErr) {
        errorCount++;
        console.error(`❌ Error inserting row:`, rowErr.message);
      }
    }

    await connection.commit();

    return { 
      success: true, 
      insertedCount,
      updatedCount,
      errorCount,
      totalRows: validResults.length
    };

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("🔥 Database insert error:", err);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}