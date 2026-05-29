// js/dashboard.js — Institution dashboard logic

let currentPage  = 1;
let currentRevokeId = null;
let institution  = null;

// ── Auth guard ───────────────────────────────────────────────────
const token = localStorage.getItem('cv_token');
if (!token) { window.location.href = 'login.html'; }

institution = JSON.parse(localStorage.getItem('cv_inst') || '{}');
document.getElementById('instInfo').textContent    = institution.name || 'Unknown';
document.getElementById('topbarInst').textContent  = institution.code || '';

// ── Sidebar navigation ───────────────────────────────────────────
document.querySelectorAll('.sidebar-link[data-panel]').forEach(link => {
  link.addEventListener('click', () => {
    const panel = link.dataset.panel;
    switchPanel(panel);
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

// Mobile sidebar toggle
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${name}`)?.classList.add('active');
  document.getElementById('pageTitle').textContent =
    { overview: 'Overview', upload: 'Upload Certificate', manage: 'Manage Certificates' }[name] || name;

  if (name === 'manage')  loadCerts();
  if (name === 'overview') loadOverview();
}

// ── Overview ─────────────────────────────────────────────────────
async function loadOverview() {
  try {
    // Load stats
    const stats = await API.get('/verify/stats/summary', true);

    if (stats.success) {
      const s = stats.stats;

      document.getElementById('dTotal').textContent = s.total_certificates;
      document.getElementById('dValid').textContent = s.valid_certificates;
      document.getElementById('dRevoked').textContent = s.revoked_certificates;
      document.getElementById('dVerif').textContent = s.total_verifications;
    }

    // Load recent certificates
    const certs = await API.get('/certificates?page=1&limit=100', true);

    if (certs.success) {
      renderRecentTable(certs.data);
    }

  } catch (e) {
    console.error('Overview load error:', e);
  }
}

function renderRecentTable(rows) {
  const el = document.getElementById('recentTable');

  if (!rows.length) {
    el.innerHTML =
      '<p style="color:var(--gray2);padding:20px">No certificates yet.</p>';
    return;
  }

  el.innerHTML = buildTable(rows, true);
}
// ── Manage / list certs ──────────────────────────────────────────
async function loadCerts(page = currentPage) {
  currentPage = page;
  const search = document.getElementById('manageSearch')?.value || '';
  const el = document.getElementById('manageTable');
  el.innerHTML = '<div class="loading-spinner">Loading…</div>';

  try {
    const data = await API.get(`/certificates?page=${page}&limit=10&search=${encodeURIComponent(search)}`, true);
    if (!data.success) { el.innerHTML = '<p style="color:var(--danger)">Error loading certificates.</p>'; return; }
    el.innerHTML = data.data.length ? buildTable(data.data, false) : '<p style="color:var(--gray2);padding:20px">No certificates found.</p>';
    renderPagination(data.total, data.limit, page);
  } catch (e) {
    el.innerHTML = '<p style="color:var(--danger)">Connection error.</p>';
  }
}

function buildTable(rows, compact) {
  return `<table class="data-table">
    <thead>
      <tr>
        <th>Cert ID</th>
        <th>Student</th>
        <th>Course</th>
        <th>Issue Date</th>
        <th>Status</th>
        ${!compact ? '<th>Actions</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `<tr>
        <td><code style="font-size:.78rem">${r.cert_id}</code></td>
        <td>
          <strong>${r.student_name}</strong><br/>
          <span style="font-size:.78rem;color:var(--gray2)">${r.roll_number}</span>
        </td>
        <td style="font-size:.82rem">${r.course}</td>
        <td style="font-size:.82rem">${fmtDate(r.issue_date)}</td>
        <td>
          <span class="badge ${r.is_revoked ? 'revoked' : 'valid'}">
            ${r.is_revoked ? 'Revoked' : 'Active'}
          </span>
        </td>
        ${!compact ? `<td>
          <div class="table-actions">
            <button class="btn btn-outline btn-sm" onclick="showQR('${r.cert_id}')">QR</button>
            ${!r.is_revoked ? `<button class="btn btn-danger btn-sm" onclick="openRevokeModal('${r.cert_id}')">Revoke</button>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="deleteCert('${r.cert_id}')">✕</button>
          </div>
        </td>` : ''}
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderPagination(total, limit, page) {
  const pages = Math.ceil(total / limit);
  const el = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = Array.from({ length: pages }, (_, i) =>
    `<button class="page-btn ${i+1===page?'active':''}" onclick="loadCerts(${i+1})">${i+1}</button>`
  ).join('');
}

// ── Upload cert ──────────────────────────────────────────────────
async function uploadCert() {
  const body = {
    student_name:  document.getElementById('uName').value.trim(),
    roll_number:   document.getElementById('uRoll').value.trim(),
    email:         document.getElementById('uEmail').value.trim(),
    course:        document.getElementById('uCourse').value.trim(),
    specialization:document.getElementById('uSpec').value.trim(),
    issue_date:    document.getElementById('uDate').value,
    expiry_date:   document.getElementById('uExpiry').value,
    grade:         document.getElementById('uGrade').value.trim(),
    cgpa:          document.getElementById('uCgpa').value,
  };

  const alertEl = document.getElementById('uploadAlert');
  alertEl.style.display = 'none';

  if (!body.student_name || !body.roll_number || !body.course || !body.issue_date) {
    alertEl.className = 'alert alert-error';
    alertEl.textContent = 'Please fill in all required fields (*)';
    alertEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('uploadBtn');
  btn.textContent = 'Registering…'; btn.disabled = true;

  try {
    const data = await API.post('/certificates', body, true);
    if (data.success) {
      document.getElementById('newCertId').textContent = data.cert_id;
      document.getElementById('qrImg').src = data.qr_code;
      document.getElementById('qrResult').style.display = 'block';
      document.getElementById('qrResult').scrollIntoView({ behavior: 'smooth' });
      alertEl.className = 'alert alert-success';
      alertEl.textContent = `✔ Certificate registered! ID: ${data.cert_id}`;
      alertEl.style.display = 'block';
      clearUploadForm();
    } else {
      alertEl.className = 'alert alert-error';
      alertEl.textContent = data.message;
      alertEl.style.display = 'block';
    }
  } catch (e) {
    alertEl.className = 'alert alert-error';
    alertEl.textContent = 'Connection error. Is the backend running?';
    alertEl.style.display = 'block';
  } finally {
    btn.textContent = '⬆ Register Certificate'; btn.disabled = false;
  }
}

function clearUploadForm() {
  ['uName','uRoll','uEmail','uCourse','uSpec','uDate','uExpiry','uGrade','uCgpa'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function downloadQR() {
  const img = document.getElementById('qrImg').src;
  const certId = document.getElementById('newCertId').textContent;
  const a = document.createElement('a');
  a.href = img; a.download = `QR_${certId}.png`;
  a.click();
}

// ── QR modal ─────────────────────────────────────────────────────
async function showQR(certId) {
  try {
    const data = await API.get(`/certificates/${certId}/qr`, true);
    if (data.success) {
      const win = window.open('', '_blank', 'width=400,height=450');
      win.document.write(`<html><body style="text-align:center;font-family:sans-serif;padding:20px">
        <h3>QR Code</h3><p>${certId}</p>
        <img src="${data.qr_code}" width="280" /><br/>
        <a href="${data.qr_code}" download="QR_${certId}.png">Download</a>
      </body></html>`);
    }
  } catch (e) { alert('Could not fetch QR code.'); }
}

// ── Revoke ───────────────────────────────────────────────────────
function openRevokeModal(certId) {
  currentRevokeId = certId;
  document.getElementById('revokeCertId').textContent = certId;
  document.getElementById('revokeReason').value = '';
  document.getElementById('revokeModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('revokeModal').style.display = 'none';
  currentRevokeId = null;
}

async function confirmRevoke() {
  if (!currentRevokeId) return;
  const reason = document.getElementById('revokeReason').value.trim() || 'Revoked by institution';
  try {
    const data = await API.patch(`/certificates/${currentRevokeId}/revoke`, { reason }, true);
    if (data.success) { closeModal(); loadCerts(); }
    else alert(data.message);
  } catch (e) { alert('Error revoking certificate.'); }
}

// ── Delete ───────────────────────────────────────────────────────
async function deleteCert(certId) {
  if (!confirm(`Delete certificate ${certId}? This cannot be undone.`)) return;
  try {
    const data = await API.delete(`/certificates/${certId}`, true);
    if (data.success) loadCerts();
    else alert(data.message);
  } catch (e) { alert('Error deleting certificate.'); }
}

// ── Logout ───────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('cv_token');
  localStorage.removeItem('cv_inst');
  window.location.href = 'login.html';
}

// ── Helper ───────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Init ─────────────────────────────────────────────────────────
loadOverview();
