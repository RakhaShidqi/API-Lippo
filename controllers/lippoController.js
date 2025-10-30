const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const db = require("../config/db");
const { normalizeDate } = require("../utils/dateHelper");
const upload = require("../middlewares/upload");

// ==========================
// Insert Data Manual (from form / API)
// ==========================

exports.addData = async (req, res, next) => {
  try {
    const d = req.body;

    // parse period menjadi string dan ambil tahun jika mau
    const periodDate = new Date(d.period); // misal user input date
    const periodStr = periodDate.toLocaleString('default', { month: 'long' }); // "Agustus"
    const year = periodDate.getFullYear(); // misal untuk kolom year

    const sql = `INSERT INTO revenue 
      (unique_id, id_customer, customer_name, mall_name, ship_address, tgl_wo_address_request, bast_date, status, start, end, period, year, price_per_month, status_payment, rev_lmi, rev_mall)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      d.uniqueId,
      d.idCustomer,
      d.customerName,
      d.mallName,
      d.shipAddress,
      normalizeDate(d.tglWOAdressRequest),
      normalizeDate(d.bastDate),
      d.status,
      normalizeDate(d.start),
      normalizeDate(d.end),
      periodStr,   // period sebagai string
      year,        // kolom year
      d.pricePerMonth,
      d.statusPayment,
      d.revLMI,
      d.revMall,
    ];

    const [result] = await db.query(sql, values);

    res.json({
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
    const [rows] = await db.query("SELECT * FROM revenue");

    const data = rows.map((row) => ({
      no:row.no,
      uniqueId: row.unique_id,
      idCustomer: row.id_customer,
      customerName: row.customer_name,
      mallName: row.mall_name,
      shipAddress: row.ship_address,
      tglWOAdressRequest: row.tgl_wo_address_request
        ? row.tgl_wo_address_request.toISOString().split("T")[0]
        : "",
      bastDate: row.bast_date ? row.bast_date.toISOString().split("T")[0] : "",
      status: row.status,
      start: row.start ? row.start.toISOString().split("T")[0] : "",
      end: row.end ? row.end.toISOString().split("T")[0] : "",
      period: row.period,
      pricePerMonth: row.price_per_month,
      statusPayment: row.status_payment,
      revLMI: row.rev_lmi,
      revMall: row.rev_mall,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("🔥 Fetch all error:", err.message);
    next(err);
  }
};

// ==========================
// Get Data by mall_name
// ==========================
exports.getSpecificData = async (req, res, next) => {
  try {
    const { mallName } = req.query;

    if (!mallName) {
      return res.status(400).json({ success: false, message: "Mall name is required" });
    }

    const [rows] = await db.query("SELECT * FROM revenue WHERE mall_name = ?", [mallName]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No data found for this mall" });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("🔥 Fetch mall error:", err.message);
    next(err);
  }
};

// ==========================
// Get Data by customer_name
// ==========================
exports.getSpecificDataCustomer = async (req, res, next) => {
  try {
    const { customerName } = req.query;
    if (!customerName) {
      return res.status(400).json({ success: false, message: "Customer name is required" });
    }

    const [rows] = await db.query("SELECT * FROM revenue WHERE customer_name = ?", [customerName]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No data found for this customer" });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("🔥 Fetch customer error:", err.message);
    next(err);
  }
};

// ==========================
// Get Data by period
// ==========================
exports.getSpecificDataPeriod = async (req, res, next) => {
  try {
    const { period } = req.query;
    if (!period) {
      return res.status(400).json({ success: false, message: "Period is required" });
    }

    const [rows] = await db.query("SELECT * FROM revenue WHERE period = ?", [period]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No data found for this period" });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("🔥 Fetch period error:", err.message);
    next(err);
  }
};

// ==========================
// Upload CSV → return headers
// ==========================

exports.uploadCSV = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const filePath = req.file.path;
    const fileName = path.basename(filePath);
    const headers = [];

    //Gunakan separator ';' agar CSV header terbaca dengan benar
    fs.createReadStream(filePath)
      .pipe(csv({ separator: ";" }))
      .on("headers", async (csvHeaders) => {
        console.log("🔥 Headers terbaca:", csvHeaders);
        headers.push(...csvHeaders.map(h => h.trim())); // bersihkan spasi

        try {
          // Ambil nama kolom dari tabel revenue
          const [rows] = await db.query("SHOW COLUMNS FROM revenue");
          const dbFields = rows.map(r => r.Field);

          // Render mapping view
          res.render("mapping", {
            title: "Field Mapping",
            filePath,
            fileName,      // dikirim ke view
            csvHeaders: headers,
            dbFields       // field dinamis dari DB
          });
        } catch (err) {
          console.error("🔥 Gagal ambil column DB:", err);
          res.status(500).send("Gagal ambil field database");
        }
      })
      .on("error", (err) => {
        console.error("🔥 CSV parse error:", err);
        res.status(500).send("Gagal membaca file CSV");
      });
  } catch (err) {
    console.error("🔥 Upload error:", err);
    next(err);
  }
};


// ==========================
// Check headers mapping
// ==========================
exports.checkHeaders = async (req, res, next) => {
  try {
    const { csvHeaders, mapping } = req.body;
    if (!csvHeaders || !mapping) {
      return res.status(400).json({ success: false, message: "Headers and mapping required" });
    }

    const mappedFields = Object.values(mapping);
    res.json({ success: true, message: "Headers checked successfully", mappedFields });
  } catch (err) {
    console.error("🔥 Check headers error:", err.message);
    next(err);
  }
};

let cachedResults = [];

exports.saveMapping = async (req, res, next) => {
  try {
    const { fileName, mapping } = req.body; 
    if (!fileName || !mapping) {
      return res.status(400).json({ success: false, message: "File name and mapping required" });
    }

    const filePath = path.join(__dirname, "../uploads", fileName);
    const results = [];

    // Normalizer pintar: lowercase + trim + replace space -> underscore
    const normalizeHeader = (h) =>
      h
        ?.replace(/\uFEFF/g, "")   // BOM
        .replace(/\r/g, "")       // CR
        .replace(/\u00A0/g, " ")  // NBSP
        .trim()
        .toLowerCase()
        .replace(/[().]/g, "")    // hapus titik & kurung
        .replace(/\s+/g, "_");    // spasi -> underscore

    // helper normalisasi date
    const normalizeDate = (val) => {
      if (!val) return null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
        // dd/mm/yyyy → yyyy-mm-dd
        const [d, m, y] = val.split("/");
        return `${y}-${m}-${d}`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return val; // sudah normal
      }
      return val; // bukan date → biarin aja
    };

    fs.createReadStream(filePath)
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        console.log("🔑 Keys dari row CSV:", Object.keys(row));  // header asli
        console.log("📝 Row CSV asli:", row);

        const records = {};

        // normalisasi semua key dari row CSV
        const normalizedRow = {};
        for (const key in row) {
          normalizedRow[normalizeHeader(key)] = row[key];
        }
        console.log("✨ Normalized row:", normalizedRow);

        // mapping ke DB
        for (const csvCol in mapping) {
          const dbField = mapping[csvCol];
          if (!dbField) continue;

          const normalizedCsvCol = normalizeHeader(csvCol);

          // ambil nilai dari normalizedRow
          let val = Object.prototype.hasOwnProperty.call(normalizedRow, normalizedCsvCol)
            ? normalizedRow[normalizedCsvCol]
            : null;

          console.log("Looking for:", normalizedCsvCol, "→", val);

          // normalisasi date kalau cocok format
          val = normalizeDate(val);

          // simpan ke records
          records[dbField] = val !== undefined && val !== null && val !== "" ? val : null;
        }

        results.push(records);
        console.log("✅ Record hasil mapping:", records);
      })
      .on("end", async () => {
        cachedResults = results;
        console.log("✅ Mapping dari user:", mapping);
        console.log("✅ Contoh row hasil normalisasi:", results[0]);
        console.log("✅ Preview mapped data (max 5 rows):", results.slice(0, 5));

        return res.render("success-mapping", {
          title: "Mapping Preview",
          message: `Total rows mapped: ${results.length}`,
          preview: results.slice(0, 5),
        });
      })
      .on("error", (err) => {
        console.error("🔥 CSV parse error:", err);
        res.status(500).send("Gagal membaca file CSV");
      });
  } catch (err) {
    console.error("🔥 Save mapping error:", err);
    next(err);
  }
};

exports.insertDataViaUpload = async (req, res, next) => {
  try {
    if (!cachedResults || cachedResults.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada data untuk insert" });
    }

    const conn = await db.getConnection();

    try {
      const columns = Object.keys(cachedResults[0]); // ambil semua kolom dari mapping
      const values = cachedResults.map(r => columns.map(c => r[c]));

      const sql = `INSERT INTO revenue (${columns.join(",")}) VALUES ?`;

      await conn.query(sql, [values]);

      const total = cachedResults.length;
      cachedResults = []; // reset biar ga dobel insert

      // 🔹 redirect ke /lippo
      return res.redirect("/lippo");
    } catch (err) {
      console.error("🔥 Insert error:", err.sqlMessage || err);
      return res.status(500).send("Gagal insert ke database");
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("🔥 InsertData error:", err);
    next(err);
  }
};

