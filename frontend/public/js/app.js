// js/app.js — Public verify page logic

// ── Tab switching ─────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab')
      .forEach(t => t.classList.remove('active'));

    document.querySelectorAll('.tab-panel')
      .forEach(p => p.classList.remove('active'));

    tab.classList.add('active');

    document.getElementById(
      `tab-${tab.dataset.tab}`
    ).classList.add('active');
  });
});


// ── Enter key support ─────────────────────────────────────────────
document.getElementById('certIdInput')
?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    verifyCertById();
  }
});


// ── Verify by Certificate ID ─────────────────────────────────────
async function verifyCertById() {

  const certId =
    document.getElementById('certIdInput')
      .value
      .trim();

  if (!certId) {
    shakeInput();
    return;
  }

  setLoading(true);

  try {
const API_URL =
  'https://nacho-scavenger-pasty.ngrok-free.dev/api';
const response = await fetch(
  `${API_URL}/verify/${encodeURIComponent(certId)}`
);
   const data = await response.json();

    // VALID certificate
    if (response.ok && data.result === 'VALID') {
      showResult(data, certId);
      return;
    }

    // REVOKED certificate
    if (data.result === 'REVOKED') {
      showResult(data, certId);
      return;
    }

    // INVALID / FAKE certificate
    if (response.status === 404) {
      showResult({
        result: 'FAKE',
        message:
          data.message ||
          'No certificate found with this ID.'
      }, certId);

      return;
    }

    // Other API errors
    showConnectionError();

  } catch (err) {

    console.error('Verification error:', err);

    // Real network/server failure
    showConnectionError();

  } finally {
    setLoading(false);
  }
}


// ── Advanced Search ──────────────────────────────────────────────
async function advancedSearch() {

  const name =
    document.getElementById('searchName')
      .value
      .trim();

  const roll =
    document.getElementById('searchRoll')
      .value
      .trim();

  const certId =
    document.getElementById('searchCertId')
      .value
      .trim();

  if (!name && !roll && !certId) {
    alert(
      'Please fill in at least one search field.'
    );
    return;
  }

  setLoading(true);

  try {

    const data = await API.post(
      '/verify',
      {
        student_name: name,
        roll_number: roll,
        cert_id: certId
      }
    );

    showSearchResults(data);

  } catch (e) {

    console.error(e);
    showConnectionError();

  } finally {
    setLoading(false);
  }
}


// ── Show verification result ────────────────────────────────────
function showResult(data, inputId) {

  const sec =
    document.getElementById('resultSection');

  const card =
    document.getElementById('resultCard');

  sec.style.display = 'block';

  sec.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  let cls, icon, status, message;

  if (data.result === 'VALID') {

    cls = 'valid';
    icon = '✔';
    status = 'VALID CERTIFICATE';
    message = data.message;

  } else if (data.result === 'REVOKED') {

    cls = 'revoked';
    icon = '⚠';
    status = 'CERTIFICATE REVOKED';
    message = data.message;

  } else {

    cls = 'fake';
    icon = '✘';
    status = 'FAKE / NOT FOUND';
    message =
      data.message ||
      'No certificate found with this ID.';
  }

  card.className =
    `result-card ${cls}`;

  // Certificate exists
  if (data.certificate) {

    const c = data.certificate;

    card.innerHTML = `
      <div class="result-header">
        <div class="result-icon ${cls}">
          ${icon}
        </div>

        <div>
          <div class="result-status ${cls}">
            ${status}
          </div>

          <div class="result-message">
            ${message}
          </div>
        </div>
      </div>

      <div class="cert-details">
        ${field('Certificate ID', c.cert_id)}
        ${field('Student Name', c.student_name)}
        ${field('Roll Number', c.roll_number)}
        ${field('Course', c.course)}
        ${field('Specialization', c.specialization || '—')}
        ${field('Institution', c.institution)}
        ${field('Issue Date', fmtDate(c.issue_date))}
        ${field(
          'Grade / CGPA',
          [c.grade, c.cgpa]
            .filter(Boolean)
            .join(' / ') || '—'
        )}
      </div>
    `;

  } else {

    // Fake certificate
    card.innerHTML = `
      <div class="result-header">
        <div class="result-icon ${cls}">
          ${icon}
        </div>

        <div>
          <div class="result-status ${cls}">
            ${status}
          </div>

          <div class="result-message">
            ${message}
          </div>
        </div>
      </div>

      <p style="
        color:var(--gray);
        font-size:.9rem;
        margin-top:12px
      ">
        Searched for:
        <strong>${inputId}</strong>
      </p>
    `;
  }
}


// ── Multi search results ─────────────────────────────────────────
function showSearchResults(data) {

  const sec =
    document.getElementById('resultSection');

  const card =
    document.getElementById('resultCard');

  sec.style.display = 'block';

  sec.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  card.className =
    'result-card valid';

  if (
    !data.results ||
    data.results.length === 0
  ) {

    card.innerHTML = `
      <p style="
        text-align:center;
        padding:32px;
        color:var(--gray)
      ">
        No certificates found
        matching your search.
      </p>
    `;

    return;
  }

  card.innerHTML = `
    <h3 style="
      margin-bottom:16px;
      font-family:Syne,sans-serif
    ">
      Found ${data.count}
      certificate(s)
    </h3>

    <div class="search-results">

      ${data.results.map(c => `
        <div class="search-result-item">

          <div class="sri-info">
            <h4>${c.student_name}</h4>

            <p>
              ${c.course}
              ·
              ${c.institution}
              ·
              ${fmtDate(c.issue_date)}
            </p>

            <p style="
              margin-top:4px;
              font-size:.8rem;
              color:var(--gray2)
            ">
              ID: ${c.cert_id}
            </p>
          </div>

          <span class="
            badge
            ${c.status.toLowerCase()}
          ">
            ${c.status}
          </span>

        </div>
      `).join('')}

    </div>
  `;
}


// ── Helpers ──────────────────────────────────────────────────────
function field(label, val) {
  return `
    <div class="cert-field">
      <div class="cert-field-label">
        ${label}
      </div>

      <div class="cert-field-value">
        ${val || '—'}
      </div>
    </div>
  `;
}

function fmtDate(d) {
  if (!d) return '—';

  return new Date(d)
    .toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
}

function setLoading(on) {

  const btn =
    document.getElementById('verifyBtn');

  if (!btn) return;

  btn.disabled = on;

  const txt =
    btn.querySelector('.btn-text');

  if (txt) {
    txt.textContent =
      on ? 'Checking…' : 'Verify';
  }
}

function shakeInput() {

  const el =
    document.getElementById(
      'certIdInput'
    );

  el.style.borderColor =
    'var(--danger)';

  setTimeout(() => {
    el.style.borderColor = '';
  }, 1200);
}


// ── Real connection error only ──────────────────────────────────
function showConnectionError() {

  const sec =
    document.getElementById(
      'resultSection'
    );

  const card =
    document.getElementById(
      'resultCard'
    );

  sec.style.display = 'block';

  card.className =
    'result-card fake';

  card.innerHTML = `
    <div class="result-header">

      <div class="result-icon fake">
        !
      </div>

      <div>
        <div class="
          result-status fake
        ">
          CONNECTION ERROR
        </div>

        <div class="
          result-message
        ">
          Could not reach
          the server.
          Make sure backend
          is running on port
          5000.
        </div>
      </div>

    </div>
  `;
}