const db = require("../config/db");

async function getDbFields(req, res, next) {
  try {
    const [rows] = await db.query("SHOW COLUMNS FROM revenue");
    const fields = rows.map((r) => r.Field);

    return res.json({
      success: true,
      fields
    });
  } catch (err) {
    console.error("❌ DB fields error:", err.message);
    next(err); // lempar ke middleware error handler
  }
}

module.exports = { getDbFields };
