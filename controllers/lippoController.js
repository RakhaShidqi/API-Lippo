const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const XLSX = require('xlsx');
const db = require("../config/db");
const { normalizeDate } = require("../utils/dateHelper");

// Cache untuk menyimpan hasil mapping sementara
let cachedResults = [];

// ==========================
// INSERT DATA MANUAL (from form / API)
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
// GET ALL DATA
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
        bast_date, 
        start, 
        end, 
        period, 
        month, 
        price_per_month, 
        status_payment, 
        rev_lmi, 
        rev_mall
      FROM revenue 
      ORDER BY no ASC
    `);

    // KIRIM APA ADANYA, jangan diubah
    res.json({ 
      success: true, 
      count: rows.length, 
      data: rows 
    });
    
  } catch (err) {
    console.error("🔥 Fetch all error:", err.message);
    next(err);
  }
};

exports.getAllDataViaApi = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        no,  
        id_customer, 
        customer_name, 
        tenant_name, 
        mall_name, 
        ship_address,
        bast_date, 
        start, 
        end, 
        period, 
        month, 
        price_per_month, 
        status_payment, 
        rev_lmi, 
        rev_mall
      FROM revenue 
      ORDER BY no ASC
    `);

    // KIRIM APA ADANYA, jangan diubah
    res.json({ 
      success: true, 
      count: rows.length, 
      data: rows 
    });
    
  } catch (err) {
    console.error("🔥 Fetch all error:", err.message);
    next(err);
  }
};

// ==========================
// GET DATA BY ID (Single Record)
// ==========================
exports.getDataById = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "ID wajib diisi" 
      });
    }

    console.log(`🔍 Mencari data dengan ID: ${id}`);

    // Query ke database
    const [rows] = await db.query(
      "SELECT * FROM revenue WHERE no = ?", 
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Data dengan ID ${id} tidak ditemukan`
      });
    }

    res.json({ 
      success: true, 
      data: rows[0]
    });

  } catch (err) {
    console.error("🔥 Error getDataById:", err.message);
    next(err);
  }
};
exports.getDataByIdViaApi = async (req, res, next, includeUniqueId = true) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "ID wajib diisi" 
      });
    }

    console.log(`🔍 Mencari data dengan ID: ${id}, includeUniqueId: ${includeUniqueId}`);

    // Query dinamis berdasarkan parameter
    let query;
    if (includeUniqueId) {
      query = "SELECT * FROM revenue WHERE no = ?";
    } else {
      query = `SELECT 
        no, 
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
      FROM revenue WHERE no = ?`;
    }

    const [rows] = await db.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Data dengan ID ${id} tidak ditemukan`
      });
    }

    res.json({ 
      success: true, 
      data: rows[0]
    });

  } catch (err) {
    console.error("🔥 Error getDataById:", err.message);
    next(err);
  }
};

// ==========================
// GET DATA BY ID CUSTOMER
// ==========================
exports.getDataByIdCustomer = async (req, res, next) => {
  try {
    const idCustomer = req.params.idCustomer || req.query.idCustomer;

    if (!idCustomer) {
      return res.status(400).json({ 
        success: false, 
        message: "ID Customer is required" 
      });
    }

    console.log("🔍 Searching for ID Customer:", idCustomer);

    const [rows] = await db.query(
      "SELECT * FROM revenue WHERE id_customer LIKE ? ORDER BY no ASC", 
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

exports.getDataByIdCustomerViaApi = async (req, res, next) => {
  try {
    const idCustomer = req.params.idCustomer || req.query.idCustomer;

    if (!idCustomer) {
      return res.status(400).json({ 
        success: false, 
        message: "ID Customer is required" 
      });
    }

    console.log("🔍 Searching for ID Customer:", idCustomer);

    // PERBAIKAN: Query dengan kolom yang dipilih, kecualikan unique_id
    const [rows] = await db.query(
      `SELECT 
        no, 
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
      WHERE id_customer LIKE ? 
      ORDER BY no ASC`, 
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
// GET DATA BY MALL NAME
// ==========================
exports.getDataByMall = async (req, res, next) => {
  try {
    const { mallName } = req.query;

    if (!mallName) {
      return res.status(400).json({ success: false, message: "Mall name is required" });
    }

    const [rows] = await db.query(
      "SELECT * FROM revenue WHERE mall_name LIKE ? ORDER BY no ASC", 
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

exports.getDataByMallViaApi = async (req, res, next) => {
  try {
    const { mallName } = req.query;

    if (!mallName) {
      return res.status(400).json({ success: false, message: "Mall name is required" });
    }

    console.log("🔍 Searching for Mall Name:", mallName);

    // PERBAIKAN: Query dengan kolom yang dipilih, kecualikan unique_id
    const [rows] = await db.query(
      `SELECT 
        no, 
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
      WHERE mall_name LIKE ? 
      ORDER BY no ASC`, 
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
// GET DATA BY CUSTOMER NAME
// ==========================
exports.getDataByCustomer = async (req, res, next) => {
  try {
    const { customerName } = req.query;
    
    if (!customerName) {
      return res.status(400).json({ success: false, message: "Customer name is required" });
    }

    const [rows] = await db.query(
      "SELECT * FROM revenue WHERE customer_name LIKE ? ORDER BY no ASC", 
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

exports.getDataByCustomerViaApi = async (req, res, next) => {
  try {
    const { customerName } = req.query;
    
    if (!customerName) {
      return res.status(400).json({ success: false, message: "Customer name is required" });
    }

    console.log("🔍 Searching for Customer Name:", customerName);

    // PERBAIKAN: Query dengan kolom yang dipilih, kecualikan unique_id
    const [rows] = await db.query(
      `SELECT 
        no, 
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
      WHERE customer_name LIKE ? 
      ORDER BY no ASC`, 
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
// GET DATA BY TENANT NAME
// ==========================
exports.getDataByTenant = async (req, res, next) => {
  try {
    const { tenantName } = req.query;
    
    if (!tenantName) {
      return res.status(400).json({ success: false, message: "Tenant name is required" });
    }

    const [rows] = await db.query(
      "SELECT * FROM revenue WHERE tenant_name LIKE ? ORDER BY no ASC", 
      [`%${tenantName}%`]
    );
    
    res.json({ 
      success: true, 
      count: rows.length,
      data: rows 
    });
  } catch (err) {
    console.error("🔥 Fetch tenant error:", err.message);
    next(err);
  }
};

exports.getDataByTenantViaApi = async (req, res, next) => {
  try {
    const { tenantName } = req.query;
    
    if (!tenantName) {
      return res.status(400).json({ success: false, message: "Tenant name is required" });
    }

    console.log("🔍 Searching for Tenant Name:", tenantName);

    // PERBAIKAN: Query dengan kolom yang dipilih, kecualikan unique_id
    const [rows] = await db.query(
      `SELECT 
        no, 
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
      WHERE tenant_name LIKE ? 
      ORDER BY no ASC`, 
      [`%${tenantName}%`]
    );
    
    res.json({ 
      success: true, 
      count: rows.length,
      data: rows 
    });
  } catch (err) {
    console.error("🔥 Fetch tenant error:", err.message);
    next(err);
  }
};

// ==========================
// GET DATA BY PERIOD
// ==========================
exports.getDataByPeriod = async (req, res, next) => {
  try {
    const { period } = req.query;
    
    if (!period) {
      return res.status(400).json({ success: false, message: "Period is required" });
    }

    const [rows] = await db.query(
      "SELECT * FROM revenue WHERE period LIKE ? ORDER BY no ASC", 
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

exports.getDataByPeriodViaApi = async (req, res, next) => {
  try {
    const { period } = req.query;
    
    if (!period) {
      return res.status(400).json({ success: false, message: "Period is required" });
    }

    console.log("🔍 Searching for Period:", period);

    // PERBAIKAN: Query dengan kolom yang dipilih, kecualikan unique_id
    const [rows] = await db.query(
      `SELECT 
        no, 
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
      WHERE period LIKE ? 
      ORDER BY no ASC`, 
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

// Get Data By Status Payment
exports.getDataByStatusViaApi = async (req, res, next) => {
  try {
    const statusPayment = req.params.statusPayment || req.query.statusPayment;

    if (!statusPayment) {
      return res.status(400).json({ 
        success: false, 
        message: "Status Payment is required" 
      });
    }

    console.log("🔍 Searching for Status Payment:", statusPayment);

    // PERBAIKAN: Query dengan kolom yang dipilih, kecualikan unique_id
    const [rows] = await db.query(
      `SELECT 
        no, 
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
      WHERE status_payment LIKE ? 
      ORDER BY no ASC`, 
      [`%${statusPayment}%`]
    );

    res.json({ 
      success: true, 
      count: rows.length,
      data: rows 
    });

  } catch (err) {
    console.error("🔥 Fetch by status payment error:", err.message);
    next(err);
  }
};

// ==========================
// SEARCH DATA (Multi-field search)
// ==========================
exports.searchData = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: "Search term minimal 2 karakter" 
      });
    }

    const searchTerm = `%${q}%`;
    
    const [rows] = await db.query(`
      SELECT * FROM revenue 
      WHERE 
        unique_id LIKE ? OR
        id_customer LIKE ? OR
        customer_name LIKE ? OR
        tenant_name LIKE ? OR
        mall_name LIKE ? OR
        period LIKE ?
      ORDER BY no ASC
    `, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);
    
    res.json({ 
      success: true, 
      count: rows.length,
      data: rows 
    });
  } catch (err) {
    console.error("🔥 Search error:", err.message);
    next(err);
  }
};

// ==========================
// UPDATE DATA - PERTAHANKAN NILAI LAMA
// ==========================
exports.updateData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const d = req.body;

    console.log('📝 Update request:', d);

    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    // PERBAIKAN: Ambil data lama dulu
    const [existing] = await db.query("SELECT * FROM revenue WHERE no = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Data not found" });
    }

    const oldData = existing[0];
    console.log('📦 Data lama:', oldData);

    // PERBAIKAN: Gunakan nilai baru jika ada, jika tidak pakai nilai lama
    const sql = `UPDATE revenue SET
      unique_id = ?, 
      id_customer = ?, 
      customer_name = ?, 
      tenant_name = ?, 
      mall_name = ?, 
      ship_address = ?,
      tgl_wo_address_request = ?, 
      bast_date = ?, 
      status = ?, 
      start = ?, 
      end = ?,
      period = ?, 
      month = ?, 
      price_per_month = ?, 
      status_payment = ?, 
      rev_lmi = ?, 
      rev_mall = ?
      WHERE no = ?`;

    const values = [
      d.unique_id !== undefined ? d.unique_id : oldData.unique_id,
      d.id_customer !== undefined ? d.id_customer : oldData.id_customer,
      d.customer_name !== undefined ? d.customer_name : oldData.customer_name,
      d.tenant_name !== undefined ? d.tenant_name : oldData.tenant_name,
      d.mall_name !== undefined ? d.mall_name : oldData.mall_name,
      d.ship_address !== undefined ? d.ship_address : oldData.ship_address,
      d.tgl_wo_address_request !== undefined ? d.tgl_wo_address_request : oldData.tgl_wo_address_request,
      d.bast_date !== undefined ? d.bast_date : oldData.bast_date,  // PERTAHANKAN NILAI LAMA
      d.status !== undefined ? d.status : oldData.status,
      d.start !== undefined ? d.start : oldData.start,              // PERTAHANKAN NILAI LAMA
      d.end !== undefined ? d.end : oldData.end,                    // PERTAHANKAN NILAI LAMA
      d.period !== undefined ? d.period : oldData.period,
      d.month !== undefined ? d.month : oldData.month,
      d.price_per_month !== undefined ? d.price_per_month : oldData.price_per_month,
      d.status_payment !== undefined ? d.status_payment : oldData.status_payment,
      d.rev_lmi !== undefined ? d.rev_lmi : oldData.rev_lmi,
      d.rev_mall !== undefined ? d.rev_mall : oldData.rev_mall,
      id
    ];

    console.log('📤 Values untuk update:', values);

    await db.query(sql, values);

    const [updated] = await db.query("SELECT * FROM revenue WHERE no = ?", [id]);

    res.json({
      success: true,
      message: "Data successfully updated",
      data: updated[0]
    });
  } catch (err) {
    console.error("🔥 Update error:", err.message);
    next(err);
  }
};

// ==========================
// PATCH DATA - UPDATE PARTIAL
// ==========================
exports.patchData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No data to update" });
    }

    // Bangun query dinamis
    let setClauses = [];
    let values = [];

    for (const [key, value] of Object.entries(updates)) {
      // Mapping field names
      const dbField = key; // Sesuaikan dengan nama kolom di database
      setClauses.push(`${dbField} = ?`);
      values.push(value);
    }

    values.push(id);

    const sql = `UPDATE revenue SET ${setClauses.join(', ')} WHERE no = ?`;
    
    console.log('📝 SQL:', sql);
    console.log('📤 Values:', values);

    await db.query(sql, values);

    const [updated] = await db.query("SELECT * FROM revenue WHERE no = ?", [id]);

    res.json({
      success: true,
      message: "Data successfully updated",
      data: updated[0]
    });

  } catch (err) {
    console.error("🔥 Patch error:", err.message);
    next(err);
  }
};

// ==========================
// DELETE DATA
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
// BULK DELETE (Delete multiple records)
// ==========================
exports.bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Array of IDs is required" 
      });
    }

    // Build placeholders for IN clause
    const placeholders = ids.map(() => '?').join(',');
    
    const [result] = await db.query(
      `DELETE FROM revenue WHERE no IN (${placeholders})`, 
      ids
    );

    res.json({
      success: true,
      message: `${result.affectedRows} data successfully deleted`,
      deletedCount: result.affectedRows
    });

  } catch (err) {
    console.error("🔥 Bulk delete error:", err.message);
    next(err);
  }
};

// ==========================
// UPLOAD FILE (CSV/Excel)
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
    
    // Proses berdasarkan tipe file
    if (fileExt === '.csv') {
      processCSVAndRedirect(filePath, fileName, req, res);
    } 
    else if (fileExt === '.xlsx' || fileExt === '.xls') {
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

// ==========================
// PROCESS CSV AND REDIRECT TO MAPPING
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
        
        // Redirect ke halaman mapping
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
// PROCESS EXCEL AND REDIRECT TO MAPPING
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
      range: 0
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
          csvHeaders: headers,
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
// SAVE MAPPING - DIPERBAIKI
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
    
    // PERBAIKAN: Deklarasikan results di sini
    let results = []; // <-- PENTING: deklarasi dengan let

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

    // Auto insert ke database
    try {
      const insertResult = await insertDataToDatabase(results);
      
      if (insertResult.success) {
        console.log(`✅ Auto-insert success: Inserted: ${insertResult.insertedCount}, Updated: ${insertResult.updatedCount}`);
        
        // Hapus file setelah sukses
        cleanupFile(filePath);
        
        // Redirect ke halaman dashboard
        return res.redirect("/hypernet-lippo/web/dashboard");
      } else {
        throw new Error(insertResult.message);
      }
    } catch (insertErr) {
      console.error("❌ Auto-insert failed:", insertErr);
      
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
// INSERT MAPPED DATA TO DATABASE
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
      'rev_mall',
      'status_payment'
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
          row.rev_mall || 0,
          row.status_payment || Unpaid 
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
// CLEAR CACHE
// ==========================
exports.clearCache = (req, res) => {
  cachedResults = [];
  res.json({
    success: true,
    message: "Cache cleared successfully"
  });
};

// ==========================
// GET STATISTICS
// ==========================
exports.getStats = async (req, res, next) => {
  try {
    const [total] = await db.query("SELECT COUNT(*) as count FROM revenue");
    
    const [paid] = await db.query(
      "SELECT COUNT(*) as count FROM revenue WHERE status_payment = 'Paid'"
    );
    
    const [unpaid] = await db.query(
      "SELECT COUNT(*) as count FROM revenue WHERE status_payment = 'Unpaid'"
    );
    
    const [totalRevenue] = await db.query(
      "SELECT SUM(price_per_month) as total FROM revenue"
    );

    res.json({
      success: true,
      data: {
        total: total[0].count,
        paid: paid[0].count,
        unpaid: unpaid[0].count,
        totalRevenue: totalRevenue[0].total || 0
      }
    });

  } catch (err) {
    console.error("🔥 Stats error:", err.message);
    next(err);
  }
};

// ==========================
// EXPORT DATA (Excel)
// ==========================
exports.exportData = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM revenue ORDER BY no DESC");
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    
    XLSX.utils.book_append_sheet(wb, ws, "Revenue");
    
    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers
    res.setHeader('Content-Disposition', 'attachment; filename=revenue_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(buf);

  } catch (err) {
    console.error("🔥 Export error:", err.message);
    next(err);
  }
};

// ==========================
// HELPER FUNCTIONS
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

// ==========================
// PARSE EXCEL FILE - VERSI DIPERBAIKI (TANGGAL BENAR)
// ==========================
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
        'period', 'month', 'price_per_month', 'status_payment',
        'rev_lmi', 'rev_mall'
      ];
      
      // Mapping headers
      for (const [excelHeader, dbField] of Object.entries(mapping)) {
        if (!dbField) continue;
        
        const headerIndex = excelHeaders.findIndex(h => 
          normalizeHeader(h) === normalizeHeader(excelHeader)
        );
        
        if (headerIndex !== -1) {
          dbFieldToExcelIndex[dbField] = headerIndex;
        }
      }
      
      // PERBAIKAN: Fungsi konversi Excel serial ke string tanggal yang BENAR
      function excelSerialToDateString(serial) {
        if (!serial && serial !== 0) return '';
        
        // Jika sudah string, kembalikan apa adanya
        if (typeof serial === 'string') {
          return serial.trim();
        }
        
        // Jika number (Excel serial)
        if (typeof serial === 'number' || !isNaN(parseFloat(serial))) {
          const num = typeof serial === 'number' ? serial : parseFloat(serial);
          
          // Excel serial date
          // 1 Jan 1900 = 1 (tapi Excel punya bug leap year)
          try {
            // PERBAIKAN: Cara yang lebih akurat untuk konversi Excel serial
            // Gunakan UTC untuk menghindari masalah timezone
            const date = new Date(Date.UTC(1899, 11, 30 + num));
            
            if (!isNaN(date.getTime())) {
              const day = String(date.getUTCDate()).padStart(2, '0');
              const month = String(date.getUTCMonth() + 1).padStart(2, '0');
              const year = date.getUTCFullYear();
              return `${day}/${month}/${year}`; // Format DD/MM/YYYY
            }
          } catch (e) {
            console.warn('Failed to convert Excel serial:', serial);
          }
        }
        
        return serial ? serial.toString() : '';
      }
      
      const results = [];
      
      // Loop setiap baris data
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const record = {};
        
        // Inisialisasi semua field dengan null
        allDatabaseFields.forEach(field => record[field] = null);
        
        // Mapping values dari Excel
        for (const [dbField, excelIndex] of Object.entries(dbFieldToExcelIndex)) {
          if (excelIndex !== undefined && row[excelIndex] !== undefined) {
            let val = row[excelIndex];
            
            // Untuk field tanggal, konversi Excel serial ke string
            if (dbField === 'bast_date' || dbField === 'start' || dbField === 'end') {
              record[dbField] = excelSerialToDateString(val);
            } else {
              record[dbField] = cleanValue(val);
            }
          }
        }
        
        // Debug untuk baris pertama (tampilkan nilai asli dan hasil konversi)
        if (i === 0) {
          console.log('📅 DEBUG TANGGAL BARIS 1:');
          console.log('   bast_date original:', row[dbFieldToExcelIndex['bast_date']]);
          console.log('   bast_date converted:', record.bast_date);
          console.log('   start original:', row[dbFieldToExcelIndex['start']]);
          console.log('   start converted:', record.start);
          console.log('   end original:', row[dbFieldToExcelIndex['end']]);
          console.log('   end converted:', record.end);
        }
        
        // Proses price_per_month
        if (record.price_per_month) {
          const strVal = record.price_per_month.toString();
          record.price_per_month = parseInt(strVal.replace(/[^0-9]/g, '')) || 0;
        }
        
        // Proses rev_mall
        if (record.rev_mall) {
          const strVal = record.rev_mall.toString();
          record.rev_mall = parseInt(strVal.replace(/[^0-9]/g, '')) || 0;
        }
        
        // Proses rev_lmi
        if (record.rev_lmi) {
          const strVal = record.rev_lmi.toString();
          record.rev_lmi = parseInt(strVal.replace(/[^0-9]/g, '')) || 0;
        }
        
        // Proses period
        if (record.period) {
          const numVal = parseInt(record.period.toString().replace(/[^0-9]/g, ''));
          record.period = isNaN(numVal) ? record.period : numVal;
        }
        
        // Proses month
        if (record.month) {
          record.month = record.month.toString().trim();
        }
        
        // Proses status_payment
        if (record.status_payment) {
          const payment = record.status_payment.toString().toLowerCase().trim();
          if (payment === 'paid' || payment === 'yes' || payment === '1' || payment === 'true') {
            record.status_payment = 'Paid';
          } else if (payment === 'unpaid' || payment === 'no' || payment === '0' || payment === 'false') {
            record.status_payment = 'Unpaid';
          } else {
            record.status_payment = 'Unpaid';
          }
        } else {
          record.status_payment = 'Unpaid';
        }
        
        // Generate unique_id jika tidak ada
        if (!record.unique_id) {
          const generatedId = generateUniqueId(record);
          if (generatedId) record.unique_id = generatedId;
        }
        
        // Hanya tambahkan jika ada data penting
        if (record.customer_name || record.unique_id || record.id_customer) {
          results.push(record);
        }
      }
      
      console.log(`📊 Total records parsed: ${results.length}`);
      if (results.length > 0) {
        console.log('📊 Sample first record:', {
          unique_id: results[0].unique_id,
          bast_date: results[0].bast_date,
          start: results[0].start,
          end: results[0].end
        });
      }
      
      resolve(results);
      
    } catch (err) {
      console.error('🔥 Error parsing Excel:', err);
      reject(err);
    }
  });
}

// ==========================
// NORMALIZE DATE VALUE - VERSI ORIGINAL
// ==========================
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
      'rev_mall',
      'status_payment'
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
          row.rev_lmi || 0,
          row.rev_mall || 0,
          row.status_payment || Unpaid
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