// controllers/parseController.js
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const db = require("../config/db");
const { normalizeDate } = require("../utils/dateHelper");

/**
 * Parse uploaded CSV and insert into DB
 * @route POST /parse
 */
async function parseCsv(req, res) {
  try {
    const { mapping, fileName } = req.body;

    if (!mapping || !fileName) {
      return res.status(400).json({
        message: "❌ Mapping dan fileName wajib dikirim",
      });
    }

    const filePath = path.join(__dirname, "../uploads", fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "❌ File CSV tidak ditemukan",
      });
    }

    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        const mappedRow = {};
        Object.keys(mapping).forEach((csvHeader) => {
          const dbField = mapping[csvHeader];
          if (dbField) {
            let value = row[csvHeader.trim()] || null;
            value = normalizeDate(value); // format date jadi yyyy-mm-dd kalau valid
            mappedRow[dbField] = value;
          }
        });
        results.push(mappedRow);
      })
      .on("end", async () => {
        try {
          if (results.length === 0) {
            return res.status(400).json({
              message: "❌ CSV kosong atau tidak terbaca",
            });
          }

          // insert ke DB sekaligus
          await Promise.all(
            results.map((row) => db.query("INSERT INTO revenue SET ?", row))
          );

          res.render("success", {
            message: `✅ ${results.length} data berhasil dimasukkan ke database!`,
          });
        } catch (dbErr) {
          console.error("❌ DB Error:", dbErr);
          res.status(500).json({
            message: "❌ Gagal insert ke database",
            error: dbErr.message,
          });
        }
      })
      .on("error", (err) => {
        console.error("❌ CSV Parse Error:", err);
        res.status(500).json({
          message: "❌ Gagal membaca file CSV",
          error: err.message,
        });
      });
  } catch (err) {
    console.error("❌ ERROR /parse:", err);
    res.status(500).json({
      message: "❌ Gagal memproses mapping",
      error: err.message,
    });
  }
}

module.exports = { parseCsv };
