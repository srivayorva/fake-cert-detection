// routes/certificates.js — Upload, list, revoke certificates
const express = require('express');
const QRCode  = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// Helper: generate QR code as base64 PNG
async function generateQR(certId) {
  const url =
    `http://192.168.1.7:5500/frontend/public/index.html?certId=${certId}`;

  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    width: 300
  });
}

// ─── POST /api/certificates  (protected) ────────────────────────
// Upload / register a new certificate
router.post('/', auth, async (req, res) => {
  const {
    student_name, roll_number, email, course,
    specialization, issue_date, expiry_date, grade, cgpa
  } = req.body;

  if (!student_name || !roll_number || !course || !issue_date) {
    return res.status(400).json({
      success: false,
      message: 'student_name, roll_number, course, and issue_date are required.'
    });
  }

  try {
    const certId = `${req.institution.code}-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    const qrData = await generateQR(certId);

    await db.execute(
      `INSERT INTO certificates
         (cert_id, student_name, roll_number, email, course, specialization,
          institution_id, issue_date, expiry_date, grade, cgpa, qr_code_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        certId, student_name, roll_number, email || null, course,
        specialization || null, req.institution.id, issue_date,
        expiry_date || null, grade || null, cgpa || null, qrData
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Certificate registered successfully.',
      cert_id: certId,
      qr_code: qrData,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Certificate already exists.' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while saving certificate.' });
  }
});

// ─── GET /api/certificates  (protected) ─────────────────────────
// List all certificates for logged-in institution
router.get('/', auth, async (req, res) => {
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    const searchWild = `%${search}%`;
    const [rows] = await db.execute(
      `SELECT cert_id, student_name, roll_number, email, course,
              specialization, issue_date, expiry_date, grade, cgpa,
              is_revoked, revoke_reason, created_at
       FROM certificates
       WHERE institution_id = ?
         AND (student_name LIKE ? OR roll_number LIKE ? OR cert_id LIKE ?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.institution.id, searchWild, searchWild, searchWild, limit, offset]
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM certificates
       WHERE institution_id = ?
         AND (student_name LIKE ? OR roll_number LIKE ? OR cert_id LIKE ?)`,
      [req.institution.id, searchWild, searchWild, searchWild]
    );

    res.json({ success: true, data: rows, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error fetching certificates.' });
  }
});

// ─── GET /api/certificates/:certId/qr  (protected) ──────────────
// Get QR code for a certificate
router.get('/:certId/qr', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT qr_code_data FROM certificates WHERE cert_id = ? AND institution_id = ?',
      [req.params.certId, req.institution.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }
    res.json({ success: true, qr_code: rows[0].qr_code_data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── PATCH /api/certificates/:certId/revoke  (protected) ────────
// Revoke a certificate
router.patch('/:certId/revoke', auth, async (req, res) => {
  const { reason } = req.body;
  try {
    const [result] = await db.execute(
      `UPDATE certificates
       SET is_revoked = 1, revoke_reason = ?
       WHERE cert_id = ? AND institution_id = ?`,
      [reason || 'Revoked by institution', req.params.certId, req.institution.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }
    res.json({ success: true, message: 'Certificate revoked successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error revoking certificate.' });
  }
});

// ─── DELETE /api/certificates/:certId  (protected) ──────────────
router.delete('/:certId', auth, async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM certificates WHERE cert_id = ? AND institution_id = ?',
      [req.params.certId, req.institution.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }
    res.json({ success: true, message: 'Certificate deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
