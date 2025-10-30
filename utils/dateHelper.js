const bulanMap = {
  Januari: "01",
  Februari: "02",
  Maret: "03",
  April: "04",
  Mei: "05",
  Juni: "06",
  Juli: "07",
  Agustus: "08",
  September: "09",
  Oktober: "10",
  November: "11",
  Desember: "12",
};

function toMysqlDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const d = match[1].padStart(2, "0");
    const m = match[2].padStart(2, "0");
    const y = match[3];
    return `${y}-${m}-${d}`;
  }
  return null;
}

function toMysqlPeriod(val) {
  if (!val) return null;
  const s = String(val).trim();
  const match = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (match) {
    const bulan = bulanMap[match[1]];
    const tahun = match[2];
    if (bulan) return `${tahun}-${bulan}-01`;
  }
  if (bulanMap[s]) {
    return `${new Date().getFullYear()}-${bulanMap[s]}-01`;
  }
  return null;
}

function normalizeDate(val) {
  if (!val) return null;

  // format dd/mm/yyyy
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(val)) {
    return toMysqlDate(val);
  }

  // format bulan indo
  if (/^[A-Za-z]+(\s+\d{4})?$/.test(val)) {
    return toMysqlPeriod(val);
  }

  return val; // biarkan original kalau bukan tanggal
}

module.exports = { toMysqlDate, toMysqlPeriod, normalizeDate };
