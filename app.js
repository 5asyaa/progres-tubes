const STORAGE_USERS = "pw_users_v1";
const STORAGE_REPORTS = "pw_reports_v1";

function loadUsers(){ return JSON.parse(localStorage.getItem(STORAGE_USERS) || 'null') || null; }
function loadReports(){ return JSON.parse(localStorage.getItem(STORAGE_REPORTS) || 'null') || []; }
function saveUsers(u){ localStorage.setItem(STORAGE_USERS, JSON.stringify(u)); }
function saveReports(r){ localStorage.setItem(STORAGE_REPORTS, JSON.stringify(r)); }

function setCurrentUser(u){ sessionStorage.setItem("pw_current_user", JSON.stringify(u)); }
function getCurrentUser(){ return JSON.parse(sessionStorage.getItem("pw_current_user")||'null'); }
function clearCurrentUser(){ sessionStorage.removeItem("pw_current_user"); }

(function initSeed(){
  let users = loadUsers();
  if(!users){
    users = [
      { nama:"Administrator", email:"admin@mail.com", pass:"admin123", role:"admin" }
    ];
    saveUsers(users);
  }
})();

function registerUser(){ 
  const nama = document.getElementById('regNama').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPass').value;

  if(!nama || !email || !pass){ alert("Lengkapi semua field"); return; }
  const users = loadUsers();
  if(users.some(u=>u.email===email)){ alert("Email sudah terdaftar"); return; }
  users.push({ nama, email, pass, role:"user" });
  saveUsers(users);
  alert("Registrasi berhasil. Silakan login.");
  window.location.href = "login.html";
}

function loginUser(){
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  const users = loadUsers()||[];
  const found = users.find(u=>u.email===email && u.pass===pass);
  if(!found){ alert("Email / password salah"); return; }
  setCurrentUser(found);
  if(found.role==="admin") window.location.href = "dashboard_admin.html";
  else window.location.href = "dashboard_user.html";
}

function logout(){
  clearCurrentUser();
  window.location.href = "login.html";
}

function adminLoadPage(){
  const user = getCurrentUser();
  if(!user || user.role!=="admin"){ window.location.href="login.html"; return; }
  const navUser = document.getElementById('nav-user');
  if(navUser) navUser.textContent = `${user.nama} (${user.role})`;
  renderAdminTable();
}

function renderAdminTable(filter=''){
  const reports = loadReports();
  const tbody = document.getElementById('reports-tbody');
  if(!tbody) return;
  const f = (filter||'').trim().toLowerCase();
  let rows = '';
  reports.forEach((r, idx)=>{

    if(f && !(
          (r.judul||'').toLowerCase().includes(f) ||
          (r.lokasi||'').toLowerCase().includes(f) ||
          (r.kategori||'').toLowerCase().includes(f) ||
          (r.pelaporName||'').toLowerCase().includes(f)
        )) return;
    rows += `<tr>
      <td>${idx+1}</td>
      <td>${escapeHtml(r.judul)}</td>
      <td>${escapeHtml(r.pelaporName||'Anonim')}</td>
      <td>${escapeHtml(r.kategori||'')}</td>
      <td>${escapeHtml(r.lokasi||'')}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${formatDate(r.createdAt)}</td>
      <td><button class="action-btn" onclick="openAdminDetail('${r.id}')">Detail</button></td>
    </tr>`;
  });
  tbody.innerHTML = rows || '<tr><td colspan="8" style="padding:14px;color:#6b7280">Tidak ada data</td></tr>';
}

function adminSearch(){
  const q = document.getElementById('admin-search').value || '';
  renderAdminTable(q);
}

function openAdminDetail(id){
  window.location.href = `detail_admin.html?id=${id}`;
}

function adminDetailLoad(){
  const user = getCurrentUser(); if(!user||user.role!=="admin"){ window.location.href="login.html"; return; }
  const navUser = document.getElementById('nav-user'); if(navUser) navUser.textContent = `${user.nama} (${user.role})`;
  const id = new URLSearchParams(location.search).get('id');
  const reports = loadReports();
  const r = reports.find(x=>x.id===id);
  if(!r){ alert('Laporan tidak ditemukan'); window.location.href='dashboard_admin.html'; return; }

  document.getElementById('d-judul').textContent = r.judul;
  document.getElementById('d-kategori').textContent = r.kategori||'';
  document.getElementById('d-lokasi').textContent = r.lokasi||'';
  document.getElementById('d-creator').textContent = r.pelaporName || 'Anonim';
  document.getElementById('d-created').textContent = formatDate(r.createdAt);
  document.getElementById('d-desc').textContent = r.deskripsi || '';
  if(r.foto) document.getElementById('d-foto').innerHTML = `<img src="${r.foto}" class="report-image">`;
  else document.getElementById('d-foto').innerHTML = '<em>(tidak ada foto)</em>';
 
  const cs = document.getElementById('current-status');
  if(cs) cs.innerHTML = statusBadge(r.status);

  const bA = document.getElementById('btn-accept'); if(bA) bA.onclick = ()=>adminAccept(id);
  const bR = document.getElementById('btn-reject'); if(bR) bR.onclick = ()=>adminReject(id);
}

function adminAccept(id){
  const reports = loadReports();
  const r = reports.find(x=>x.id===id);
  if(!r) return alert('not found');
  r.status = (r.status === 'Menunggu Verifikasi') ? 'Diproses' : (r.status === 'Diproses') ? 'Selesai' : r.status;
  saveReports(reports);
  alert('Perubahan status tersimpan');
  adminDetailLoad();
}

function adminReject(id){
  const reason = document.getElementById('reject-reason').value.trim();
  if(!reason) return alert('Isi alasan penolakan');
  const reports = loadReports();
  const r = reports.find(x=>x.id===id);
  if(!r) return alert('not found');
  r.status = 'Ditolak';
  r.rejectReason = reason;
  saveReports(reports);
  alert('Aduan ditolak');
  adminDetailLoad();
}

function userLoadPage(){
  const user = getCurrentUser(); if(!user){ window.location.href='login.html'; return; }
  const navUser = document.getElementById('nav-user'); if(navUser) navUser.textContent = `${user.nama} (${user.role})`;
  renderUserList();
}

function renderUserList(){
  const user = getCurrentUser();
  const reports = loadReports().filter(r=> r.email === user.email );
  const box = document.getElementById('user-list') || document.getElementById('myReports') || null;
  if(!box) return;
  let html = '';
  reports.forEach(r=>{
    html += `<div class="card" style="background:#fff;padding:14px;border-radius:8px;margin-bottom:12px">
      <strong>${escapeHtml(r.judul)}</strong>
      <div style="margin:8px 0;color:#6b7280">Pengadu: ${escapeHtml(r.pelaporName||'Anonim')} • ${formatDate(r.createdAt)}</div>
      <div>${escapeHtml(r.deskripsi||'')}</div>
      ${r.foto?`<img src="${r.foto}" class="report-image">`:''}
      <div style="margin-top:8px">${statusBadge(r.status)}</div>
      <div style="margin-top:8px"><button class="action-btn" onclick="openUserDetail('${r.id}')">Detail</button></div>
    </div>`;
  });
  box.innerHTML = html || '<div style="color:#6b7280;padding:12px">Belum ada laporan</div>';
}

function addReport(){
  const judul = document.getElementById('r-judul').value.trim();
  const deskripsi = document.getElementById('r-deskripsi').value.trim();
  const kategori = (document.getElementById('r-kategori') ? document.getElementById('r-kategori').value.trim() : "");
  const lokasi = (document.getElementById('r-lokasi') ? document.getElementById('r-lokasi').value.trim() : "");
  const fotoInput = document.getElementById('r-foto');
  const fotoFile = fotoInput ? fotoInput.files[0] : null;

  if(!judul || !deskripsi){
    alert('Judul dan deskripsi wajib');
    return;
  }

  const user = getCurrentUser();
  const reports = loadReports();
  const id = 'r' + Date.now();

  if(fotoFile){
    const reader = new FileReader();
    reader.onload = function(e){
      saveReportWithImage(id, judul, deskripsi, kategori, lokasi, e.target.result, user, reports);
    };
    reader.readAsDataURL(fotoFile);
  } else {
    saveReportWithImage(id, judul, deskripsi, kategori, lokasi, "", user, reports);
  }
}

function saveReportWithImage(id, judul, deskripsi, kategori, lokasi, base64Foto, user, reports){
  reports.unshift({
    id,
    judul,
    deskripsi,
    foto: base64Foto,
    kategori,
    lokasi,
    email: user.email,
    pelaporName: user.nama,
    status: 'Menunggu Verifikasi',
    createdAt: new Date().toISOString()
  });

  saveReports(reports);
  alert("Laporan berhasil dikirim!");

  if(document.getElementById('r-judul')) document.getElementById('r-judul').value = '';
  if(document.getElementById('r-deskripsi')) document.getElementById('r-deskripsi').value = '';
  if(document.getElementById('r-kategori')) document.getElementById('r-kategori').value = '';
  if(document.getElementById('r-lokasi')) document.getElementById('r-lokasi').value = '';
  if(document.getElementById('r-foto')) document.getElementById('r-foto').value = '';

  renderUserList();
}

function openUserDetail(id){
  window.location.href = `detail_user.html?id=${id}`;
}

function userDetailLoad(){
  const user = getCurrentUser(); if(!user) window.location.href='login.html';
  const navUser = document.getElementById('nav-user'); if(navUser) navUser.textContent = `${user.nama} (${user.role})`;
  const id = new URLSearchParams(location.search).get('id');
  const r = loadReports().find(x=>x.id===id);
  if(!r){ alert('Tidak ditemukan'); window.location.href='dashboard_user.html'; return; }
  document.getElementById('u-judul').textContent = r.judul;
  document.getElementById('u-kategori').textContent = r.kategori||'';
  document.getElementById('u-lokasi').textContent = r.lokasi||'';
  document.getElementById('u-created').textContent = formatDate(r.createdAt);
  document.getElementById('u-desc').textContent = r.deskripsi||'';
  document.getElementById('u-status').innerHTML = statusBadge(r.status);
  if(r.foto) document.getElementById('u-foto').innerHTML = `<img src="${r.foto}" class="report-image">`;
  else document.getElementById('u-foto').innerHTML = '<em>(tidak ada foto)</em>';
  if(r.status==='Ditolak') document.getElementById('u-reject').textContent = r.rejectReason||'';
}

function statusBadge(s){
  const key = (s||'').toLowerCase();
  if(key.includes('menunggu')) return `<span class="badge pending">Menunggu Verifikasi</span>`;
  if(key.includes('diproses')) return `<span class="badge processing">Diproses</span>`;
  if(key.includes('selesai')) return `<span class="badge done">Selesai</span>`;
  if(key.includes('ditolak')) return `<span class="badge rejected">Ditolak</span>`;
  return `<span class="badge">${escapeHtml(s||'')}</span>`;
}
function formatDate(iso){
  if(!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID') + ' ' + d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
function escapeHtml(t){ return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
