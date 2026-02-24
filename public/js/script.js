// ==========================
// GLOBAL VARIABLES
// ==========================
let editModal;
let currentEditId = null;

// ==========================
// INITIALIZATION
// ==========================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Script initialized');
  
  // Cek element penting
  checkElements();
  
  // Inisialisasi Bootstrap Modal
  initializeModal();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load data awal
  fetchData();
  
  // Export semua fungsi ke global scope
  exportFunctions();
});

// ==========================
// CHECK ELEMENTS
// ==========================
function checkElements() {
  console.log('🔍 Checking elements...');
  const elements = {
    'uploadForm': document.getElementById('uploadForm'),
    'lippoForm': document.getElementById('lippoForm'),
    'table-body': document.getElementById('table-body'),
    'editModal': document.getElementById('editModal')
  };
  
  for (const [name, element] of Object.entries(elements)) {
    if (element) console.log(`✅ ${name} found`);
    else console.error(`❌ ${name} NOT found!`);
  }
}

// ==========================
// INITIALIZE MODAL
// ==========================
function initializeModal() {
  if (typeof bootstrap !== 'undefined') {
    const modalElement = document.getElementById('editModal');
    if (modalElement) {
      editModal = new bootstrap.Modal(modalElement);
      console.log('✅ Modal initialized');
    }
  }
}

// ==========================
// EXPORT FUNCTIONS
// ==========================
function exportFunctions() {
  window.showStatusDropdown = showStatusDropdown;
  window.showPaymentDropdown = showPaymentDropdown;
  window.updateStatus = updateStatus;
  window.updatePayment = updatePayment;
  window.editData = editData;
  window.deleteData = deleteData;
  window.refreshData = refreshData;
  window.handleLogout = handleLogout;
  window.saveEdit = saveEdit;
  console.log('✅ Functions exported');
}

// ==========================
// SETUP EVENT LISTENERS
// ==========================
function setupEventListeners() {
  // Upload form
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', function(e) {
      const fileInput = this.querySelector('input[type="file"]');
      if (!fileInput.files || fileInput.files.length === 0) {
        e.preventDefault();
        alert('Pilih file terlebih dahulu!');
      }
    });
  }
  
  // Lippo form
  const lippoForm = document.getElementById('lippoForm');
  if (lippoForm) {
    lippoForm.addEventListener('submit', handleFormSubmit);
  }
}

// ==========================
// 🔥 FUNGSI EDIT DATA
// ==========================
async function editData(id) {
  console.log('✏️ Editing data ID:', id);
  currentEditId = id;
  
  try {
    // Tampilkan loading
    Swal.fire({
      title: 'Loading...',
      text: 'Mengambil data...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    // Fetch data dari API
    const response = await fetch(`/hypernet-lippo/data/${id}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    Swal.close();
    
    if (result.success && result.data) {
      const data = result.data;
      
      // Isi form modal dengan data
      document.getElementById('edit-id').value = data.no || '';
      document.getElementById('edit-unique-id').value = data.unique_id || '';
      document.getElementById('edit-id-customer').value = data.id_customer || '';
      document.getElementById('edit-customer-name').value = data.customer_name || '';
      document.getElementById('edit-tenant-name').value = data.tenant_name || '';
      document.getElementById('edit-mall-name').value = data.mall_name || '';
      document.getElementById('edit-ship-address').value = data.ship_address || '';
      document.getElementById('edit-tgl-wo').value = data.tgl_wo_address_request ? data.tgl_wo_address_request.split('T')[0] : '';
      document.getElementById('edit-bast-date').value = data.bast_date ? data.bast_date.split('T')[0] : '';
      document.getElementById('edit-status').value = data.status || '';
      document.getElementById('edit-start').value = data.start ? data.start.split('T')[0] : '';
      document.getElementById('edit-end').value = data.end ? data.end.split('T')[0] : '';
      document.getElementById('edit-period').value = data.period || '';
      document.getElementById('edit-price').value = data.price_per_month || '';
      document.getElementById('edit-month').value = data.month || '';
      document.getElementById('edit-status-payment').value = data.status_payment || '';
      document.getElementById('edit-rev-lmi').value = data.rev_lmi || '';
      document.getElementById('edit-rev-mall').value = data.rev_mall || '';
      
      // Tampilkan modal
      if (editModal) editModal.show();
    } else {
      Swal.fire({ icon: 'error', title: 'Error!', text: result.message || 'Gagal memuat data' });
    }
  } catch (error) {
    console.error('Error:', error);
    Swal.close();
    Swal.fire({ icon: 'error', title: 'Error!', text: 'Gagal memuat data: ' + error.message });
  }
}

// ==========================
// 🔥 FUNGSI SAVE EDIT
// ==========================
async function saveEdit() {
  console.log('💾 Saving edit...');
  
  const id = document.getElementById('edit-id').value;
  if (!id) {
    Swal.fire({ icon: 'error', title: 'Error!', text: 'ID tidak ditemukan' });
    return;
  }
  
  const updatedData = {
    uniqueId: document.getElementById('edit-unique-id').value,
    idCustomer: document.getElementById('edit-id-customer').value,
    customerName: document.getElementById('edit-customer-name').value,
    tenantName: document.getElementById('edit-tenant-name').value,
    mallName: document.getElementById('edit-mall-name').value,
    shipAddress: document.getElementById('edit-ship-address').value,
    tglWOAdressRequest: document.getElementById('edit-tgl-wo').value,
    bastDate: document.getElementById('edit-bast-date').value,
    status: document.getElementById('edit-status').value,
    start: document.getElementById('edit-start').value,
    end: document.getElementById('edit-end').value,
    period: document.getElementById('edit-period').value,
    pricePerMonth: document.getElementById('edit-price').value,
    month: document.getElementById('edit-month').value,
    statusPayment: document.getElementById('edit-status-payment').value,
    revLMI: document.getElementById('edit-rev-lmi').value,
    revMall: document.getElementById('edit-rev-mall').value
  };
  
  try {
    Swal.fire({
      title: 'Menyimpan...',
      text: 'Mohon tunggu',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    const response = await fetch(`/hypernet-lippo/data/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    Swal.close();
    
    if (result.success) {
      if (editModal) editModal.hide();
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Data berhasil diperbarui',
        timer: 1500
      });
      refreshData();
    } else {
      Swal.fire({ icon: 'error', title: 'Error!', text: result.message || 'Gagal memperbarui data' });
    }
  } catch (error) {
    console.error('Error:', error);
    Swal.close();
    Swal.fire({ icon: 'error', title: 'Error!', text: 'Gagal menyimpan: ' + error.message });
  }
}

// ==========================
// 🔥 FUNGSI DELETE DATA
// ==========================
async function deleteData(id) {
  console.log('🗑️ Deleting data ID:', id);
  
  const result = await Swal.fire({
    title: 'Hapus Data',
    text: 'Apakah Anda yakin ingin menghapus data ini?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, hapus!',
    cancelButtonText: 'Batal'
  });
  
  if (result.isConfirmed) {
    try {
      Swal.fire({
        title: 'Menghapus...',
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      
      const response = await fetch(`/hypernet-lippo/data/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      Swal.close();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: 'Data berhasil dihapus',
          timer: 1500
        });
        refreshData();
      } else {
        Swal.fire({ icon: 'error', title: 'Error!', text: data.message || 'Gagal menghapus data' });
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.close();
      Swal.fire({ icon: 'error', title: 'Error!', text: 'Gagal menghapus: ' + error.message });
    }
  }
}

// ==========================
// 🔥 FUNGSI DROPDOWN STATUS
// ==========================
function showStatusDropdown(rowId) {
  // Sembunyikan text, tampilkan dropdown
  document.getElementById(`status-text-${rowId}`).style.display = 'none';
  document.getElementById(`status-dropdown-${rowId}`).style.display = 'inline-block';
  document.getElementById(`status-select-${rowId}`).focus();
}

function hideStatusDropdown(rowId) {
  document.getElementById(`status-dropdown-${rowId}`).style.display = 'none';
  document.getElementById(`status-text-${rowId}`).style.display = 'inline-block';
}

async function updateStatus(id, newStatus) {
  console.log('🔄 Updating status:', id, newStatus);
  
  try {
    const response = await fetch(`/hypernet-lippo/data/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus || null })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update tampilan
      const statusBadge = newStatus ? 
        `<span class="status-badge ${getStatusBadgeClass(newStatus)}">${newStatus}</span>` : 
        '<span class="text-muted">-</span>';
      
      document.getElementById(`status-text-${id}`).innerHTML = statusBadge;
      hideStatusDropdown(id);
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Status diperbarui',
        timer: 1000,
        showConfirmButton: false
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ==========================
// 🔥 FUNGSI DROPDOWN PAYMENT
// ==========================
function showPaymentDropdown(rowId) {
  document.getElementById(`payment-text-${rowId}`).style.display = 'none';
  document.getElementById(`payment-dropdown-${rowId}`).style.display = 'inline-block';
  document.getElementById(`payment-select-${rowId}`).focus();
}

function hidePaymentDropdown(rowId) {
  document.getElementById(`payment-dropdown-${rowId}`).style.display = 'none';
  document.getElementById(`payment-text-${rowId}`).style.display = 'inline-block';
}

async function updatePayment(id, newPayment) {
  console.log('🔄 Updating payment:', id, newPayment);
  
  try {
    const response = await fetch(`/hypernet-lippo/data/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusPayment: newPayment || null })
    });
    
    const result = await response.json();
    
    if (result.success) {
      const paymentBadge = newPayment ? 
        `<span class="status-badge ${getPaymentBadgeClass(newPayment)}">${newPayment}</span>` : 
        '<span class="text-muted">-</span>';
      
      document.getElementById(`payment-text-${id}`).innerHTML = paymentBadge;
      hidePaymentDropdown(id);
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Status pembayaran diperbarui',
        timer: 1000,
        showConfirmButton: false
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ==========================
// UTILITY FUNCTIONS
// ==========================
function getStatusBadgeClass(status) {
  if (!status) return '';
  return status.toLowerCase() === 'posted' ? 'status-posted' : 'status-notposted';
}

function getPaymentBadgeClass(payment) {
  if (!payment) return '';
  return payment.toLowerCase() === 'paid' ? 'status-paid' : 'status-unpaid';
}

// ==========================
// FETCH DATA & RENDER
// ==========================
async function fetchData() {
  try {
    const response = await fetch('/hypernet-lippo/data');
    const result = await response.json();
    if (result.success && result.data) renderTableData(result.data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

function refreshData() {
  document.getElementById('table-body').innerHTML = '<tr><td colspan="18">Loading...</td></tr>';
  fetchData();
}

// ==========================
// RENDER TABLE DATA - Dengan Icon Button
// ==========================
function renderTableData(data) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="18" class="text-center py-4">Tidak ada data</td></tr>';
    return;
  }
  
  data.forEach((item, index) => {
    const row = document.createElement('tr');
    const rowId = item.no;
    
    const statusBadge = item.status ? 
      `<span class="badge-status ${item.status === 'Posted' ? 'badge-posted' : 'badge-notposted'}">${item.status}</span>` : 
      '<span class="text-muted">-</span>';
    
    const paymentBadge = item.statusPayment ? 
      `<span class="badge-status ${item.statusPayment === 'Paid' ? 'badge-paid' : 'badge-unpaid'}">${item.statusPayment}</span>` : 
      '<span class="text-muted">-</span>';
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td class="text-truncate" style="max-width: 100px;" title="${item.uniqueId || ''}">${item.uniqueId ? item.uniqueId.substring(0, 15) + '...' : ''}</td>
      <td>${item.idCustomer || ''}</td>
      <td class="text-truncate" style="max-width: 120px;" title="${item.customerName || ''}">${item.customerName || ''}</td>
      <td>${item.tenantName || ''}</td>
      <td class="text-truncate" style="max-width: 100px;" title="${item.mallName || ''}">${item.mallName || ''}</td>
      <td class="text-truncate" style="max-width: 150px;" title="${item.shipAddress || ''}">${item.shipAddress ? item.shipAddress.substring(0, 20) + '...' : ''}</td>
      <td>${item.bastDate || ''}</td>
      <td>${item.start || ''}</td>
      <td>${item.end || ''}</td>
      <td>${item.period || ''}</td>
      <td>${item.pricePerMonth || ''}</td>
      <td>${item.month || ''}</td>
      <td id="status-cell-${rowId}" class="editable-dropdown" onclick="showStatusDropdown(${rowId})">
        <span id="status-text-${rowId}">${statusBadge}</span>
        <span id="status-dropdown-${rowId}" style="display:none;">
          <select class="dropdown-status" onchange="updateStatus(${rowId}, this.value)" onblur="hideStatusDropdown(${rowId})">
            <option value="">-</option>
            <option value="Posted" ${item.status === 'Posted' ? 'selected' : ''}>Posted</option>
            <option value="Not Posted" ${item.status === 'Not Posted' ? 'selected' : ''}>Not Posted</option>
          </select>
        </span>
      </td>
      <td id="payment-cell-${rowId}" class="editable-dropdown" onclick="showPaymentDropdown(${rowId})">
        <span id="payment-text-${rowId}">${paymentBadge}</span>
        <span id="payment-dropdown-${rowId}" style="display:none;">
          <select class="dropdown-payment" onchange="updatePayment(${rowId}, this.value)" onblur="hidePaymentDropdown(${rowId})">
            <option value="">-</option>
            <option value="Paid" ${item.statusPayment === 'Paid' ? 'selected' : ''}>Paid</option>
            <option value="Unpaid" ${item.statusPayment === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
          </select>
        </span>
      </td>
      <td>${item.revLMI || ''}</td>
      <td>${item.revMall || ''}</td>
      <td class="action-buttons">
        <button class="btn-icon btn-edit" onclick="editData(${item.no})" title="Edit">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn-icon btn-delete" onclick="deleteData(${item.no})" title="Hapus">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

// function renderTableData(data) {
//   const tbody = document.getElementById('table-body');
//   if (!tbody) return;
  
//   tbody.innerHTML = '';
  
//   if (!data || data.length === 0) {
//     tbody.innerHTML = '<tr><td colspan="18">Tidak ada data</td></tr>';
//     return;
//   }
  
//   data.forEach((item, index) => {
//     const row = document.createElement('tr');
//     const rowId = item.no;
    
//     const statusBadge = item.status ? 
//       `<span class="status-badge ${getStatusBadgeClass(item.status)}">${item.status}</span>` : 
//       '<span class="text-muted">-</span>';
    
//     const paymentBadge = item.statusPayment ? 
//       `<span class="status-badge ${getPaymentBadgeClass(item.statusPayment)}">${item.statusPayment}</span>` : 
//       '<span class="text-muted">-</span>';
    
//     row.innerHTML = `
//       <td>${index + 1}</td>
//       <td>${item.uniqueId || ''}</td>
//       <td>${item.idCustomer || ''}</td>
//       <td>${item.customerName || ''}</td>
//       <td>${item.tenantName || ''}</td>
//       <td>${item.mallName || ''}</td>
//       <td>${item.shipAddress || ''}</td>
//       <td>${item.bastDate || ''}</td>
//       <td>${item.start || ''}</td>
//       <td>${item.end || ''}</td>
//       <td>${item.period || ''}</td>
//       <td>${item.pricePerMonth || ''}</td>
//       <td>${item.month || ''}</td>
//       <td id="status-cell-${rowId}" class="editable-dropdown" onclick="showStatusDropdown(${rowId})">
//         <span id="status-text-${rowId}">${statusBadge}</span>
//         <span id="status-dropdown-${rowId}" style="display:none;">
//           <select onchange="updateStatus(${rowId}, this.value)" onblur="hideStatusDropdown(${rowId})">
//             <option value="">-</option>
//             <option value="Posted" ${item.status === 'Posted' ? 'selected' : ''}>Posted</option>
//             <option value="Not Posted" ${item.status === 'Not Posted' ? 'selected' : ''}>Not Posted</option>
//           </select>
//         </span>
//       </td>
//       <td id="payment-cell-${rowId}" class="editable-dropdown" onclick="showPaymentDropdown(${rowId})">
//         <span id="payment-text-${rowId}">${paymentBadge}</span>
//         <span id="payment-dropdown-${rowId}" style="display:none;">
//           <select onchange="updatePayment(${rowId}, this.value)" onblur="hidePaymentDropdown(${rowId})">
//             <option value="">-</option>
//             <option value="Paid" ${item.statusPayment === 'Paid' ? 'selected' : ''}>Paid</option>
//             <option value="Unpaid" ${item.statusPayment === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
//           </select>
//         </span>
//       </td>
//       <td>${item.revLMI || ''}</td>
//       <td>${item.revMall || ''}</td>
//       <td>
//         <button class="btn btn-sm btn-warning" onclick="editData(${item.no})">Edit</button>
//         <button class="btn btn-sm btn-danger" onclick="deleteData(${item.no})">Hapus</button>
//       </td>
//     `;
    
//     tbody.appendChild(row);
//   });
// }

// ==========================
// HANDLE FORM SUBMIT
// ==========================
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const formData = {
    uniqueId: document.getElementById('unique-id').value,
    idCustomer: document.getElementById('id-customer').value,
    customerName: document.getElementById('customer-name').value,
    tenantName: document.getElementById('tenant-name').value,
    mallName: document.getElementById('mall-name').value,
    shipAddress: document.getElementById('ship-address').value,
    tglWOAdressRequest: document.getElementById('tgl-wo-address-request').value,
    bastDate: document.getElementById('bast-date').value,
    status: document.getElementById('status').value,
    start: document.getElementById('start').value,
    end: document.getElementById('end').value,
    period: document.getElementById('period').value,
    pricePerMonth: document.getElementById('price-per-month').value,
    statusPayment: document.getElementById('status-payment').value,
    revLMI: document.getElementById('rev-lmi').value,
    revMall: document.getElementById('rev-mall').value
  };
  
  try {
    const response = await fetch('/hypernet-lippo/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      e.target.reset();
      refreshData();
      alert('Data berhasil ditambahkan!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ==========================
// LOGOUT FUNCTION - VERSI YANG BENAR
// ==========================
function handleLogout() {
  console.log('🚪 Logout button clicked');
  
  Swal.fire({
    title: 'Logout',
    text: 'Apakah Anda yakin ingin logout?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Ya, logout',
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      // Tampilkan loading
      Swal.fire({
        title: 'Logging out...',
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      console.log('📡 Sending logout request to /auth/logout');
      
      // Fetch dengan method POST
      fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include' // Penting untuk cookie/session
      })
      .then(async response => {
        console.log('📥 Logout response status:', response.status);
        
        // Coba parse JSON, tapi jika gagal ambil text
        try {
          return await response.json();
        } catch (e) {
          const text = await response.text();
          console.error('❌ Response not JSON:', text);
          throw new Error('Server returned non-JSON response');
        }
      })
      .then(data => {
        console.log('📦 Logout response data:', data);
        Swal.close();
        
        if (data.success) {
          // Hapus data localStorage/sessionStorage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.clear();
          
          // ✅ BENAR: Redirect ke halaman login, BUKAN ke /auth/logout
          window.location.href = data.redirect || '/login';
        } else {
          // Jika server mengembalikan success: false
          Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: data.message || 'Gagal logout'
          }).then(() => {
            // Fallback redirect ke login
            window.location.href = '/login';
          });
        }
      })
      .catch(error => {
        console.error('🔥 Logout error:', error);
        Swal.close();
        
        // Tampilkan pesan error
        Swal.fire({
          icon: 'warning',
          title: 'Perhatian!',
          text: 'Terjadi kesalahan, akan redirect ke halaman login',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          // ✅ FALLBACK: Redirect langsung ke login
          window.location.href = '/login';
        });
      });
    }
  });
}