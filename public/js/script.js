// ==========================
// script.js - VERSI DENGAN SESSION TETAP
// ==========================

// ==========================
// GLOBAL VARIABLES
// ==========================
let editModal;
let dataLoaded = false;
let refreshInterval = null;
let isModalSubmitting = false;

// ==========================
// INITIALIZATION
// ==========================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Script UI initialized');
  
  // Cek element penting
  checkElements();
  
  // Inisialisasi Bootstrap Modal
  initializeModal();
  
  // Setup event listeners
  setupEventListeners();
  
  // PERBAIKAN: Auto-load data dengan pengecekan session yang lebih baik
  setTimeout(() => {
    autoLoadData();
  }, 300); // Delay 300ms untuk memastikan DOM siap
  
  // Set auto-refresh setiap 5 menit (opsional)
  setupAutoRefresh();
});

// ==========================
// SETUP AUTO REFRESH (Opsional)
// ==========================
function setupAutoRefresh() {
  // Hapus interval sebelumnya jika ada
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Set interval baru setiap 5 menit (300000 ms)
  refreshInterval = setInterval(() => {
    if (dataLoaded && checkSessionStatus()) {
      console.log('🔄 Auto-refresh data...');
      fetchData(false); // false = jangan tampilkan loading
    }
  }, 300000); // 5 menit
}

// ==========================
// CEK SESSION STATUS - YANG BENAR
// ==========================
function checkSessionStatus() {
  // PERBAIKAN: Cara cek session yang lebih akurat
  
  // 1. Cek dari cookie session
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  // Cek berbagai nama cookie session yang umum
  const hasSessionCookie = cookies['connect.sid'] || 
                          cookies['session'] ||
                          cookies['token'] ||
                          cookies['user_session'] ||
                          Object.keys(cookies).some(key => 
                            key.includes('session') || 
                            key.includes('token') || 
                            key.includes('sid')
                          );
  
  // 2. Cek dari localStorage (jika ada)
  const hasLocalToken = localStorage.getItem('token') || 
                       localStorage.getItem('user') ||
                       localStorage.getItem('session');
  
  // 3. Cek dari sessionStorage
  const hasSessionToken = sessionStorage.getItem('token') ||
                         sessionStorage.getItem('user');
  
  // 4. Cek dari meta tag (untuk SSR)
  const metaUser = document.querySelector('meta[name="user"]')?.content;
  const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
  
  // PERBAIKAN: Jangan langsung anggap tidak login
  // Jika ada salah satu indikator, anggap masih login
  const isLoggedIn = !!(hasSessionCookie || hasLocalToken || hasSessionToken || metaUser || metaToken);
  
  console.log('🔍 Session check:', { 
    hasSessionCookie, 
    hasLocalToken, 
    hasSessionToken,
    metaUser: !!metaUser,
    isLoggedIn 
  });
  
  return isLoggedIn;
}

// ==========================
// AUTO LOAD DATA - DIPERBAIKI
// ==========================
function autoLoadData() {
  console.log('🔄 Auto-loading data...');
  
  // PERBAIKAN: Jangan langsung fetch, cek session dulu
  const isLoggedIn = checkSessionStatus();
  
  if (isLoggedIn) {
    console.log('✅ Session aktif, memuat data...');
    fetchData(true);
  } else {
    console.log('⏳ Session tidak ditemukan, menunggu...');
    
    // PERBAIKAN: Coba lagi beberapa kali sebelum anggap tidak login
    let retryCount = 0;
    const maxRetries = 3;
    
    const retryInterval = setInterval(() => {
      retryCount++;
      console.log(`🔄 Retry ${retryCount}/${maxRetries}...`);
      
      const sessionNow = checkSessionStatus();
      
      if (sessionNow) {
        console.log('✅ Session ditemukan pada percobaan ke-' + retryCount);
        clearInterval(retryInterval);
        fetchData(true);
      } else if (retryCount >= maxRetries) {
        console.log('❌ Session tetap tidak ditemukan setelah ' + maxRetries + ' percobaan');
        clearInterval(retryInterval);
        
        // Tampilkan pesan tapi jangan logout otomatis
        const tbody = document.getElementById('table-body');
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="17" class="text-center py-4">Silakan <a href="/login">login</a> untuk melihat data</td></tr>';
        }
      }
    }, 1000); // Coba setiap 1 detik
  }
}

// ==========================
// FETCH DATA
// ==========================
async function fetchData(showLoading = true) {
  console.log('📊 Fetching data...');
  
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  
  if (showLoading) {
    tbody.innerHTML = '<tr><td colspan="17" class="text-center py-4">Loading...</td></tr>';
  }
  
  try {
    const response = await fetch('/hypernet-lippo/data', {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    
    if (result.success && result.data) {
      console.log('✅ Data diterima, jumlah:', result.data.length);
      
      // Debug: lihat data pertama
      if (result.data.length > 0) {
        console.log('📦 Sample data dari server:', {
          no: result.data[0].no,
          bast_date: result.data[0].bast_date,
          start: result.data[0].start,
          end: result.data[0].end
        });
      }
      
      renderTableData(result.data);
    } else {
      tbody.innerHTML = `<tr><td colspan="17" class="text-center text-danger">${result.message || 'Gagal memuat data'}</td></tr>`;
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    tbody.innerHTML = `<tr><td colspan="17" class="text-center text-danger">Error: ${error.message}</td></tr>`;
  }
}

// ==========================
// RENDER TABLE DATA - FORMAT TANGGAL BENAR
// ==========================
function renderTableData(data) {
  console.log('📊 Rendering table data. Count:', data?.length);
  
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="17" class="text-center py-4">Tidak ada data</td></tr>';
    return;
  }
  
  data.forEach((item, index) => {
    const row = document.createElement('tr');
    const rowId = item.no;
    
    // Ambil data dari database
    const uniqueId = item.unique_id || '';
    const idCustomer = item.id_customer || '';
    const customerName = item.customer_name || '';
    const tenantName = item.tenant_name || '';
    const mallName = item.mall_name || '';
    const shipAddress = item.ship_address || '';
    
    // PERBAIKAN: Konversi tanggal dari YYYY-MM-DD ke DD/MM/YYYY
    const bastDate = item.bast_date ? formatTanggalIndonesia(item.bast_date) : '';
    const start = item.start ? formatTanggalIndonesia(item.start) : '';
    const end = item.end ? formatTanggalIndonesia(item.end) : '';
    
    const period = item.period || '';
    const pricePerMonth = item.price_per_month || '';
    const month = item.month || '';
    const statusPayment = item.status_payment || '';
    const revLmi = item.rev_lmi || '';
    const revMall = item.rev_mall || '';
    
    // Debug
    if (index < 3) {
      console.log(`🔍 Row ${index}:`, {
        bast_date_db: item.bast_date,
        bast_date_display: bastDate,
        start_db: item.start,
        start_display: start,
        end_db: item.end,
        end_display: end
      });
    }
    
    // Status badge
    const statusBadge = statusPayment ?
      `<span class="badge-status ${statusPayment === 'Paid' ? 'badge-paid' : 'badge-unpaid'}">${statusPayment}</span>` :
      '<span class="text-muted">-</span>';
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td class="text-truncate" style="max-width: 100px;" title="${uniqueId}">
        ${uniqueId ? uniqueId.substring(0, 15) + (uniqueId.length > 15 ? '...' : '') : ''}
      </td>
      <td>${idCustomer}</td>
      <td class="text-truncate" style="max-width: 120px;" title="${customerName}">
        ${customerName}
      </td>
      <td>${tenantName}</td>
      <td class="text-truncate" style="max-width: 100px;" title="${mallName}">
        ${mallName}
      </td>
      <td class="text-truncate" style="max-width: 150px;" title="${shipAddress}">
        ${shipAddress ? shipAddress.substring(0, 20) + (shipAddress.length > 20 ? '...' : '') : ''}
      </td>
      <td>${bastDate}</td>  <!-- Harusnya: 01/06/2025 -->
      <td>${start}</td>     <!-- Harusnya: 01/06/2025 -->
      <td>${end}</td>       <!-- Harusnya: 31/05/2026 -->
      <td>${period}</td>
      <td>${pricePerMonth}</td>
      <td>${month}</td>
      <td id="status-cell-${rowId}" class="editable-dropdown" onclick="showStatusDropdown(${rowId})">
        <span id="status-text-${rowId}">${statusBadge}</span>
        <span id="status-dropdown-${rowId}" style="display:none;">
          <select id="status-select-${rowId}" class="dropdown-status" 
                  onchange="updateStatus(${rowId}, this.value)" 
                  onblur="hideStatusDropdown(${rowId})">
            <option value="">-</option>
            <option value="Paid" ${statusPayment === 'Paid' ? 'selected' : ''}>Paid</option>
            <option value="Unpaid" ${statusPayment === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
          </select>
        </span>
      </td>
      <td>${revLmi}</td>
      <td>${revMall}</td>
      <td class="action-buttons">
        <div style="display: flex; gap: 5px; justify-content: center;">
          <button class="btn-icon btn-edit" onclick="editData(${item.no})" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
        </div>
      </td>
    `;
    
    tbody.appendChild(row);
  });
  
  console.log('✅ Table rendered successfully');
}

// ==========================
// FUNGSI FORMAT TANGGAL INDONESIA
// ==========================
function formatTanggalIndonesia(dateString) {
  if (!dateString) return '';
  
  // Jika formatnya YYYY-MM-DD
  if (typeof dateString === 'string' && dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const tahun = parts[0];
      const bulan = parts[1];
      const tanggal = parts[2];
      
      // Kembalikan sebagai DD/MM/YYYY
      return `${tanggal}/${bulan}/${tahun}`;
    }
  }
  
  // Jika sudah format lain, kembalikan apa adanya
  return dateString;
}

// ==========================
// FUNGSI DROPDOWN STATUS (Hanya untuk Payment Status)
// ==========================
function showStatusDropdown(rowId) {
  const statusText = document.getElementById(`status-text-${rowId}`);
  const statusDropdown = document.getElementById(`status-dropdown-${rowId}`);
  
  if (statusText && statusDropdown) {
    statusText.style.display = 'none';
    statusDropdown.style.display = 'inline-block';
    const select = document.getElementById(`status-select-${rowId}`);
    if (select) select.focus();
  }
}

function hideStatusDropdown(rowId) {
  const statusText = document.getElementById(`status-text-${rowId}`);
  const statusDropdown = document.getElementById(`status-dropdown-${rowId}`);
  
  if (statusText && statusDropdown) {
    statusDropdown.style.display = 'none';
    statusText.style.display = 'inline-block';
  }
}

// PERBAIKAN: Fungsi update untuk Payment Status
async function updateStatus(id, newStatus) {
  console.log('🔄 Updating payment status:', id, newStatus);
  
  try {
    const response = await fetch(`/hypernet-lippo/data/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      body: JSON.stringify({ 
        status_payment: newStatus || null  // Kirim ke field status_payment
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      const statusBadge = newStatus ?
        `<span class="badge-status ${newStatus === 'Paid' ? 'badge-paid' : 'badge-unpaid'}">${newStatus}</span>` :
        '<span class="text-muted">-</span>';
      
      const statusText = document.getElementById(`status-text-${id}`);
      if (statusText) statusText.innerHTML = statusBadge;
      
      hideStatusDropdown(id);
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Status pembayaran diperbarui',
        timer: 1000,
        showConfirmButton: false
      });
    }
  } catch (error) {
    console.error('Error updating status:', error);
  }
}
// ==========================
// UPDATE STATISTIK
// ==========================
function updateStatistics(data) {
  const totalEl = document.getElementById('total-data');
  if (totalEl) totalEl.textContent = data.length;
  
  const paidCount = data.filter(item => item.status === 'Paid').length;
  const paidEl = document.getElementById('total-paid');
  if (paidEl) paidEl.textContent = paidCount;
  
  const notUnpaidCount = data.filter(item => item.status === 'Unpaid').length;
  const notUnpaidEl = document.getElementById('total-unpaid');
  if (notUnpaidEl) notUnpaidEl.textContent = notUnpaidCount;
}

// ==========================
// REFRESH DATA MANUAL
// ==========================
function refreshData() {
  console.log('🔄 Manual refresh...');
  fetchData(true);
}

// ==========================
// LOGOUT FUNCTION - TETAP AMAN
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
      Swal.fire({
        title: 'Logging out...',
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      
      fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      })
      .then(() => {
        // Hapus data lokal
        localStorage.clear();
        sessionStorage.clear();
        
        // Hapus interval
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
        
        // Redirect ke login
        window.location.href = '/login';
      })
      .catch(() => {
        // Fallback
        window.location.href = '/login';
      });
    }
  });
}

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
    else console.warn(`⚠️ ${name} NOT found!`);
  }
}

// ==========================
// INITIALIZE MODAL - DIPERBAIKI LENGKAP
// ==========================
function initializeModal() {
  if (typeof bootstrap !== 'undefined') {
    const modalElement = document.getElementById('editModal');
    if (modalElement) {
      editModal = new bootstrap.Modal(modalElement);
      console.log('✅ Edit Modal initialized');
      
      // PERBAIKAN 1: Reset TOTAL setiap modal ditutup
      modalElement.addEventListener('hidden.bs.modal', function() {
        console.log('🔄 Modal hidden - mereset semua...');
        
        // Reset form
        resetEditForm();
        
        // Reset semua input di modal
        const inputs = modalElement.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          input.value = '';
          input.removeAttribute('data-original-value');
          input.classList.remove('is-valid', 'is-invalid');
        });
        
        // Reset currentEditId
        currentEditId = null;
        
        // Hapus data attribute
        modalElement.removeAttribute('data-current-id');
        modalElement.removeAttribute('data-loaded');
        
        // Force reflow untuk memastikan modal benar-benar reset
        void modalElement.offsetHeight;
      });
      
      // PERBAIKAN 2: Bersihkan saat modal akan dibuka
      modalElement.addEventListener('show.bs.modal', function() {
        console.log('📋 Modal will show - ID:', currentEditId);
        
        // Jika tidak ada ID, jangan buka modal
        if (!currentEditId) {
          console.warn('⚠️ No currentEditId, preventing modal show');
          editModal.hide();
          return;
        }
        
        // Set data attribute
        modalElement.setAttribute('data-current-id', currentEditId);
      });
      
      // PERBAIKAN 3: Handler untuk modal terbuka
      modalElement.addEventListener('shown.bs.modal', function() {
        console.log('✅ Modal shown - ID:', currentEditId);
        
        // Focus ke input pertama
        const firstInput = modalElement.querySelector('input:not([type=hidden])');
        if (firstInput) firstInput.focus();
      });
      
    } else {
      console.error('❌ Modal element tidak ditemukan!');
    }
  } else {
    console.error('❌ Bootstrap tidak tersedia!');
  }
}

// ==========================
// RESET EDIT FORM - DIPERBAIKI
// ==========================
function resetEditForm() {
  console.log('🧹 Resetting edit form...');
  
  const form = document.getElementById('editForm');
  if (form) {
    // Reset form ke default
    form.reset();
    
    // Reset semua elemen form secara manual
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.type !== 'button' && element.type !== 'submit') {
        // Kosongkan value
        element.value = '';
        
        // Untuk select, pilih opsi pertama yang kosong jika ada
        if (element.tagName === 'SELECT') {
          const emptyOption = Array.from(element.options).find(opt => opt.value === '');
          if (emptyOption) {
            element.value = '';
          } else {
            element.selectedIndex = 0;
          }
        }
        
        // Hapus styling validasi
        element.classList.remove('is-valid', 'is-invalid');
      }
    }
  }
  
  // Reset juga form lain jika ada
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) uploadForm.reset();
  
  console.log('✅ Form reset complete');
}

// ==========================
// SETUP EVENT LISTENERS
// ==========================
function setupEventListeners() {
  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', function(e) {
      const fileInput = this.querySelector('input[type="file"]');
      if (!fileInput.files || fileInput.files.length === 0) {
        e.preventDefault();
        Swal.fire({
          icon: 'warning',
          title: 'Peringatan',
          text: 'Pilih file terlebih dahulu!'
        });
      }
    });
  }
  
  const lippoForm = document.getElementById('lippoForm');
  if (lippoForm) {
    lippoForm.addEventListener('submit', handleFormSubmit);
  }
}

// ==========================
// EDIT DATA - DIPERBAIKI DENGAN PREVENTION CACHE
// ==========================
async function editData(id) {
  console.log('✏️ Opening edit modal for ID:', id);
  
  // PERBAIKAN: Set currentEditId SEBELUM fetch
  currentEditId = id;
  
  // PERBAIKAN: Reset form TERLEBIH DAHULU
  resetEditForm();
  
  // Tampilkan loading
  Swal.fire({
    title: 'Loading...',
    text: 'Mengambil data...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });
  
  try {
    // PERBAIKAN: Tambahkan timestamp untuk hindari cache
    const timestamp = new Date().getTime();
    const response = await fetch(`/hypernet-lippo/data/${id}?_=${timestamp}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    Swal.close();
    
    if (result.success && result.data) {
      console.log('✅ Data diterima:', result.data);
      
      // PERBAIKAN: Isi form dengan data baru
      const data = result.data;
      
      // Mapping field dengan aman
      const fieldMappings = [
        { id: 'edit-id', value: data.no },
        { id: 'edit-unique-id', value: data.unique_id },
        { id: 'edit-id-customer', value: data.id_customer },
        { id: 'edit-customer-name', value: data.customer_name },
        { id: 'edit-tenant-name', value: data.tenant_name },
        { id: 'edit-mall-name', value: data.mall_name },
        { id: 'edit-ship-address', value: data.ship_address },
        { id: 'edit-tgl-wo', value: data.tgl_wo_address_request ? data.tgl_wo_address_request.split('T')[0] : '' },
        { id: 'edit-bast-date', value: data.bast_date ? data.bast_date.split('T')[0] : '' },
        { id: 'edit-status', value: data.status },
        { id: 'edit-start', value: data.start ? data.start.split('T')[0] : '' },
        { id: 'edit-end', value: data.end ? data.end.split('T')[0] : '' },
        { id: 'edit-period', value: data.period },
        { id: 'edit-price', value: data.price_per_month },
        { id: 'edit-month', value: data.month },
        { id: 'edit-status-payment', value: data.status_payment },
        { id: 'edit-rev-lmi', value: data.rev_lmi },
        { id: 'edit-rev-mall', value: data.rev_mall }
      ];
      
      // Isi form dengan konversi untuk input date
        fieldMappings.forEach(({ id, value }) => {
          const element = document.getElementById(id);
          if (element) {
            let finalValue = value !== null && value !== undefined ? value : '';
            
            // PERBAIKAN: Konversi format tanggal untuk input type="date"
            if (element.type === 'date' && finalValue) {
              const originalValue = finalValue;
              
              // Jika format DD/MM/YYYY (dari database)
              if (typeof finalValue === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(finalValue)) {
                const [day, month, year] = finalValue.split('/');
                finalValue = `${year}-${month}-${day}`; // Ubah ke YYYY-MM-DD
                console.log(`  📅 ${id}: ${originalValue} (DB) -> ${finalValue} (input date)`);
              }
            }
            
            element.value = finalValue;
            console.log(`  ✅ ${id} = ${element.value}`);
          } else {
            console.warn(`  ⚠️ ${id} tidak ditemukan`);
          }
        });
      
      // PERBAIKAN: Tampilkan modal DENGAN DELAY untuk memastikan form terisi
      setTimeout(() => {
        if (editModal && currentEditId === id) {
          editModal.show();
          console.log('✅ Modal ditampilkan untuk ID:', id);
        } else {
          console.warn('⚠️ CurrentEditId berubah, tidak jadi tampilkan modal');
        }
      }, 100);
      
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: result.message || 'Gagal memuat data'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in editData:', error);
    Swal.close();
    Swal.fire({
      icon: 'error',
      title: 'Gagal Memuat Data',
      text: error.message
    });
  }
}



// ==========================
// POPULATE EDIT FORM - SESUAI DATABASE DD/MM/YYYY
// ==========================
function populateEditForm(data) {
  console.log('📝 Mengisi form edit dengan data:', data);
  
  // Fungsi konversi DD/MM/YYYY (dari database) ke YYYY-MM-DD (untuk input date)
  function convertToDateInputFormat(dateString) {
    if (!dateString) return '';
    
    // Database menyimpan DD/MM/YYYY
    if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`; // YYYY-MM-DD untuk input date
    }
    
    return dateString;
  }
  
  const fieldMappings = [
    { id: 'edit-id', field: 'no' },
    { id: 'edit-unique-id', field: 'unique_id' },
    { id: 'edit-id-customer', field: 'id_customer' },
    { id: 'edit-customer-name', field: 'customer_name' },
    { id: 'edit-tenant-name', field: 'tenant_name' },
    { id: 'edit-mall-name', field: 'mall_name' },
    { id: 'edit-ship-address', field: 'ship_address' },
    // { id: 'edit-tgl-wo', field: 'tgl_wo_address_request', isDate: true },
    { id: 'edit-bast-date', field: 'bast_date', isDate: true },
    { id: 'edit-status', field: 'status' },
    { id: 'edit-start', field: 'start', isDate: true },
    { id: 'edit-end', field: 'end', isDate: true },
    { id: 'edit-period', field: 'period' },
    { id: 'edit-price', field: 'price_per_month' },
    { id: 'edit-month', field: 'month' },
    { id: 'edit-status-payment', field: 'status_payment' },
    { id: 'edit-rev-lmi', field: 'rev_lmi' },
    { id: 'edit-rev-mall', field: 'rev_mall' }
  ];
  
  fieldMappings.forEach(mapping => {
    const element = document.getElementById(mapping.id);
    if (!element) {
      console.warn(`⚠️ ${mapping.id} tidak ditemukan`);
      return;
    }
    
    let value = data[mapping.field];
    if (value === undefined || value === null) value = '';
    
    // PERBAIKAN: Konversi DD/MM/YYYY (database) ke YYYY-MM-DD (input date)
    if (mapping.isDate && value) {
      const originalValue = value;
      value = convertToDateInputFormat(value);
      console.log(`  📅 ${mapping.id}: ${originalValue} (DB) -> ${value} (input)`);
    }
    
    element.value = value;
    console.log(`  ✅ ${mapping.id} = ${element.value}`);
  });
}

// ==========================
// SAVE EDIT - SESUAI DATABASE DD/MM/YYYY
// ==========================
async function saveEdit() {
  console.log('💾 Menyimpan perubahan...');
  
  const id = document.getElementById('edit-id')?.value;
  if (!id) {
    Swal.fire({ icon: 'error', title: 'Error!', text: 'ID tidak ditemukan' });
    return;
  }
  
  // PERBAIKAN: Input type="date" memberi YYYY-MM-DD, tapi database butuh DD/MM/YYYY
  const bastDateInput = document.getElementById('edit-bast-date')?.value || '';
  const startInput = document.getElementById('edit-start')?.value || '';
  const endInput = document.getElementById('edit-end')?.value || '';
  const tglWoInput = document.getElementById('edit-tgl-wo')?.value || '';
  const periodValue = document.getElementById('edit-period')?.value || '';
  
  // Fungsi konversi YYYY-MM-DD (dari input date) ke DD/MM/YYYY (untuk database)
  function convertToDatabaseFormat(dateString) {
    if (!dateString) return '';
    
    // Jika format YYYY-MM-DD (dari input date)
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`; // DD/MM/YYYY untuk database
    }
    
    // Jika sudah DD/MM/YYYY, kembalikan apa adanya
    return dateString;
  }
  
  // Konversi ke format database DD/MM/YYYY
  const bastDateValue = convertToDatabaseFormat(bastDateInput);
  const startValue = convertToDatabaseFormat(startInput);
  const endValue = convertToDatabaseFormat(endInput);
  const tglWoValue = convertToDatabaseFormat(tglWoInput);
  
  console.log('📅 Konversi untuk database (DD/MM/YYYY):', {
    input: { bast_date: bastDateInput, start: startInput, end: endInput },
    output: { bast_date: bastDateValue, start: startValue, end: endValue }
  });
  
  const updatedData = {
    no: parseInt(id),
    unique_id: document.getElementById('edit-unique-id')?.value || '',
    id_customer: document.getElementById('edit-id-customer')?.value || '',
    customer_name: document.getElementById('edit-customer-name')?.value || '',
    tenant_name: document.getElementById('edit-tenant-name')?.value || '',
    mall_name: document.getElementById('edit-mall-name')?.value || '',
    ship_address: document.getElementById('edit-ship-address')?.value || '',
    tgl_wo_address_request: tglWoValue,
    bast_date: bastDateValue,
    status: document.getElementById('edit-status')?.value || '',
    start: startValue,
    end: endValue,
    period: periodValue,
    price_per_month: parseFloat(document.getElementById('edit-price')?.value) || 0,
    month: document.getElementById('edit-month')?.value || '',
    status_payment: document.getElementById('edit-status-payment')?.value || 'Unpaid',
    rev_lmi: document.getElementById('edit-rev-lmi')?.value || '',
    rev_mall: document.getElementById('edit-rev-mall')?.value || ''
  };
  
  console.log('📤 Data yang dikirim ke database (DD/MM/YYYY):', updatedData);
  
  try {
    Swal.fire({
      title: 'Menyimpan...',
      text: 'Mohon tunggu',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    const response = await fetch(`/hypernet-lippo/data/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      body: JSON.stringify(updatedData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    Swal.close();
    
    if (result.success) {
      if (editModal) editModal.hide();
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Data berhasil diperbarui',
        timer: 1500,
        showConfirmButton: false
      });
      
      // Refresh data
      setTimeout(() => {
        fetchData();
      }, 500);
      
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: result.message || 'Gagal memperbarui data'
      });
    }
    
  } catch (error) {
    console.error('❌ Error saving:', error);
    Swal.close();
    Swal.fire({
      icon: 'error',
      title: 'Gagal Menyimpan',
      text: error.message
    });
  }
}

// ==========================
// FETCH DATA WITH NO CACHE
// ==========================
async function fetchDataWithNoCache() {
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`/hypernet-lippo/data?_=${timestamp}`, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      credentials: 'include'
    });
    
    const result = await response.json();
    if (result.success && result.data) {
      renderTableData(result.data);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// ==========================
// DELETE DATA
// ==========================
async function deleteData(id) {
  console.log('🗑️ Delete data ID:', id);
  
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
  
  if (!result.isConfirmed) return;
  
  try {
    Swal.fire({
      title: 'Menghapus...',
      text: 'Mohon tunggu',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    const response = await fetch(`/hypernet-lippo/data/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    Swal.close();
    
    if (result.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Data berhasil dihapus',
        timer: 1500,
        showConfirmButton: false
      });
      fetchData(false); // Refresh tanpa loading
    } else {
      throw new Error(result.message || 'Gagal menghapus data');
    }
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    Swal.close();
    Swal.fire({
      icon: 'error',
      title: 'Gagal!',
      text: error.message
    });
  }
}

// ==========================
// UPDATE STATUS
// ==========================
function showStatusDropdown(rowId) {
  const statusText = document.getElementById(`status-text-${rowId}`);
  const statusDropdown = document.getElementById(`status-dropdown-${rowId}`);
  
  if (statusText && statusDropdown) {
    statusText.style.display = 'none';
    statusDropdown.style.display = 'inline-block';
    const select = document.getElementById(`status-select-${rowId}`);
    if (select) select.focus();
  }
}

function hideStatusDropdown(rowId) {
  const statusText = document.getElementById(`status-text-${rowId}`);
  const statusDropdown = document.getElementById(`status-dropdown-${rowId}`);
  
  if (statusText && statusDropdown) {
    statusDropdown.style.display = 'none';
    statusText.style.display = 'inline-block';
  }
}

async function updateStatus(id, newStatus) {
  console.log('🔄 Updating status:', id, newStatus);
  
  try {
    const response = await fetch(`/hypernet-lippo/data/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus || null })
    });
    
    const result = await response.json();
    
    if (result.success) {
      const statusBadge = newStatus ?
        `<span class="badge-status ${newStatus === 'Paid' ? 'badge-paid' : 'badge-unpaid'}">${newStatus}</span>` :
        '<span class="text-muted">-</span>';
      
      const statusText = document.getElementById(`status-text-${id}`);
      if (statusText) statusText.innerHTML = statusBadge;
      
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
    console.error('Error updating status:', error);
  }
}

// ==========================
// HANDLE FORM SUBMIT
// ==========================
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const formData = {
    uniqueId: document.getElementById('unique-id')?.value || '',
    idCustomer: document.getElementById('id-customer')?.value || '',
    customerName: document.getElementById('customer-name')?.value || '',
    tenantName: document.getElementById('tenant-name')?.value || '',
    mallName: document.getElementById('mall-name')?.value || '',
    shipAddress: document.getElementById('ship-address')?.value || '',
    tglWOAdressRequest: document.getElementById('tgl-wo-address-request')?.value || '',
    bastDate: document.getElementById('bast-date')?.value || '',
    status: document.getElementById('status')?.value || '',
    start: document.getElementById('start')?.value || '',
    end: document.getElementById('end')?.value || '',
    period: document.getElementById('period')?.value || '',
    pricePerMonth: document.getElementById('price-per-month')?.value || 0,
    revLMI: document.getElementById('rev-lmi')?.value || '',
    revMall: document.getElementById('rev-mall')?.value || ''
  };
  
  try {
    Swal.fire({
      title: 'Menyimpan...',
      text: 'Mohon tunggu',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    const response = await fetch('/hypernet-lippo/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    Swal.close();
    
    if (result.success) {
      e.target.reset();
      fetchData(false);
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Data berhasil ditambahkan',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      throw new Error(result.message || 'Gagal menambahkan data');
    }
    
  } catch (error) {
    console.error('Error:', error);
    Swal.close();
    Swal.fire({
      icon: 'error',
      title: 'Error!',
      text: error.message
    });
  }
}

// ==========================
// PASTIKAN EXPORT FUNCTIONS
// ==========================
function exportFunctions() {
  window.showStatusDropdown = showStatusDropdown;
  window.showPaymentDropdown = showPaymentDropdown;
  window.updateStatus = updateStatus;
  window.updatePayment = updatePayment;
  window.editData = editData;
  window.deleteData = deleteData;
  window.refreshData = fetchDataWithNoCache;
  window.handleLogout = handleLogout;
  window.saveEdit = saveEdit;
  console.log('✅ Functions exported');
}