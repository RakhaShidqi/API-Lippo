// === JS Terstruktur ===

// 1️⃣ Konfigurasi API.
const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFwaUNsaWVudCIsInJvbGUiOiJzeXN0ZW0iLCJpYXQiOjE3NTk0NzYwODIsImV4cCI6MTc1OTU2MjQ4Mn0.K8WH7nCBle7E0JFOQ5Hie1-9B8d2zcx15gZpO0hMwck"; // ganti token
const BASE_URL = "http://localhost:4000/hypernet-lippo/mall/all";

const headers = { 
  "Content-Type": "application/json",
  "Authorization": `Bearer ${API_TOKEN}`
};

// Flag untuk cek apakah import file
let isImported = false;

// 2️⃣ Load Table Data
// async function loadTableData() {
//   try {
//     const res = await fetch(BASE_URL, { headers });
//     const data = await res.json();
//     const tableBody = document.getElementById("table-body");
//     tableBody.innerHTML = "";

//     data.forEach(item => {
//       const row = `
//         <tr>
//           <td>${item.UniqueId}</td>
//           <td>${item.idCustomer}</td>
//           <td>${item.customerName}</td>
//           <td>${item.mallName}</td>
//           <td>${item.shipAddress}</td>
//           <td>${item.tglWOAdressRequest}</td>
//           <td>${item.bastDate}</td>
//           <td>${item.status}</td>
//           <td>${item.start}</td>
//           <td>${item.end}</td>
//           <td>${item.period}</td>
//           <td>${item.pricePerMonth}</td>
//           <td>${item.statusPayment}</td>
//           <td>${item.revLMI}</td>
//           <td>${item.revMall}</td>
//         </tr>
//       `;
//       tableBody.insertAdjacentHTML("beforeend", row);
//     });
//   } catch (err) {
//     console.log("Failed to load table", err);
//   }
// }

async function loadTableData() {
  try {
    const res = await fetch("http://localhost:4000/hypernet-lippo/mall/all", {
      headers: { "Content-Type": "application/json" }
    });

    const json = await res.json();
    const data = json.data; // ✅ array dari server

    const tableBody = document.getElementById("table-body");
    tableBody.innerHTML = "";

    data.forEach(item => {
      const row = `
        <tr>
          <td>${item.no}</td>
          <td>${item.uniqueId}</td>
          <td>${item.idCustomer}</td>
          <td>${item.customerName}</td>
          <td>${item.mallName}</td>
          <td>${item.shipAddress}</td>
          <td>${item.tglWOAdressRequest}</td>
          <td>${item.bastDate}</td>
          <td>${item.status}</td>
          <td>${item.start}</td>
          <td>${item.end}</td>
          <td>${item.period}</td>
          <td>${item.pricePerMonth}</td>
          <td>${item.statusPayment}</td>
          <td>${item.revLMI ?? ""}</td>
          <td>${item.revMall ?? ""}</td>
        </tr>
      `;
      tableBody.insertAdjacentHTML("beforeend", row);
    });
  } catch (err) {
    console.error("Failed to load table", err);
  }
}



// 3️⃣ Handle Form Submit
document.getElementById("lippoForm").addEventListener("submit", async e => {
  e.preventDefault();

  // Cek jika manual input → semua field harus diisi
  if (!isImported) {
    let allFilled = true;
    document.querySelectorAll("#lippoForm input, #lippoForm select, #lippoForm textarea")
      .forEach(el => {
        if (!el.value.trim()) {
          allFilled = false;
          el.setAttribute("required", "true");
        }
      });
    if (!allFilled) {
      Swal.fire("Error", "Harap isi semua field sebelum submit", "error");
      return;
    }
  }

  // Ambil data form
  const data = {
    uniqueId: document.getElementById("unique-id").value,
    idCustomer: document.getElementById("id-customer").value,
    customerName: document.getElementById("customer-name").value,
    mallName: document.getElementById("mall-name").value,
    shipAddress: document.getElementById("ship-address").value,
    tglWOAdressRequest: document.getElementById("tgl-wo-address-request").value || null,
    bastDate: document.getElementById("bast-date").value || null,
    status: document.getElementById("status").value || null,
    start: document.getElementById("start").value || null,
    end: document.getElementById("end").value || null,
    period: document.getElementById("period").value || null,
    pricePerMonth: document.getElementById("price-per-month").value,
    statusPayment: document.getElementById("status-payment").value,
    revLMI: document.getElementById("rev-lmi").value || null,
    revMall: document.getElementById("rev-mall").value || null
  };

  try {
    console.log(JSON.stringify(data, null, 2));
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (res.ok) {
      Swal.fire("Success", "Data berhasil disimpan!", "success");
      document.getElementById("lippoForm").reset();
      isImported = false; // reset flag
      loadTableData();
    } else {
      Swal.fire("Error", result.message || "Gagal menyimpan data", "error");
    }
  } catch (err) {
    console.log(err);
    Swal.fire("Error", "Terjadi kesalahan saat menyimpan data", "error");
  }
});

// 4️⃣ Handle Upload Form
document.addEventListener("DOMContentLoaded", () => {
  const uploadForm = document.getElementById("uploadForm");
  const fileInput = uploadForm.querySelector("input[type='file']");

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      // kirim ke route /upload (Express + Multer)
      uploadForm.action = "/hypernet-lippo/upload-csv";
      uploadForm.method = "POST";
      uploadForm.enctype = "multipart/form-data";
      uploadForm.submit();
    }
  });
});

// 5️⃣ Autofill form + remove required
function autoFillForm(header, values) {
  const map = {};
  header.forEach((h, i) => (map[h.toLowerCase().replace(/\s+/g, "")] = values[i]));

  document.getElementById("unique-id").value = map["uniqueid"] || "";
  document.getElementById("id-customer").value = map["idcustomer"] || "";
  document.getElementById("customer-name").value = map["customername"] || "";
  document.getElementById("mall-name").value = map["mallname"] || "";
  document.getElementById("ship-address").value = map["shipaddress"] || "";

  document.getElementById("tgl-wo-address-request").value = map["tglwoaddressrequest"] || "";
  document.getElementById("bast-date").value = map["bastdate"] || "";
  document.getElementById("status").value = map["status"] || "";

  document.getElementById("start").value = map["start"] || "";
  document.getElementById("end").value = map["end"] || "";
  document.getElementById("period").value = map["period"] || "";
  document.getElementById("price-per-month").value = map["pricepermonth"] || "";

  document.getElementById("status-payment").value = map["statuspayment"] || "";
  document.getElementById("rev-lmi").value = map["revlmi"] || "";
  document.getElementById("rev-mall").value = map["revmall"] || "";

  // Hapus required
  document.querySelectorAll("#lippoForm input, #lippoForm select, #lippoForm textarea")
    .forEach((el) => el.removeAttribute("required"));

  isImported = true; // set flag
  Swal.fire("Success", "Data berhasil di-import ke form.", "success");
}

// 6️⃣ Initial load table
loadTableData();

// 7️⃣ Logout button
document.querySelector('.logout-btn').addEventListener('click', function() {
  Swal.fire({
    title: 'Are you sure to logout?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = '/auth/logout'; // Adjust logout route
    }
  });
});
