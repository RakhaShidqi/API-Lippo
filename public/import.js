// Get filePath from URL
const params = new URLSearchParams(window.location.search);
const filePath = params.get("filePath");
let csvHeaders = [];
let dbFields = [];

async function loadHeaders() {
  // Ask server again to fetch headers for this file
  const res = await fetch("/api/revenue/upload-csv-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filePath })
  });

  const data = await res.json();
  csvHeaders = data.csvHeaders;
  dbFields = data.dbFields;

  const container = document.getElementById("mappingContainer");
  csvHeaders.forEach(h => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label>${h}</label>
      <select name="${h}" class="form-select">
        <option value="">-- Select DB Field --</option>
        ${dbFields.map(f => `<option value="${f}">${f}</option>`).join("")}
      </select>
    `;
    container.appendChild(div);
  });
}

document.getElementById("mappingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const selects = document.querySelectorAll("#mappingContainer select");
  const mapping = {};
  selects.forEach(sel => {
    if (sel.value) mapping[sel.name] = sel.value;
  });

  const res = await fetch("/api/revenue/save-mapping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filePath, mapping })
  });

  const result = await res.json();
  alert(`✅ ${result.message} (${result.total || 0} rows inserted)`);
});

loadHeaders();
