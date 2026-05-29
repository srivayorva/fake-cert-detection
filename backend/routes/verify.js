// routes/verify.js — Public certificate verification endpoint

const express = require('express');
const auth = require('../middleware/auth');
const db = require('../db');

const router = express.Router();


// ────────────────────────────────────────────────────────────────
// GET /api/verify/stats/summary
// Institution dashboard statistics
// Protected route
// ────────────────────────────────────────────────────────────────
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const institutionId = req.institution.id;

    // Total certificates
    const [[totals]] = await db.execute(
      'SELECT COUNT(*) AS total FROM certificates WHERE institution_id = ?',
      [institutionId]
    );

    // Active certificates
    const [[valid]] = await db.execute(
      `SELECT COUNT(*) AS c
       FROM certificates
       WHERE institution_id = ?
       AND is_revoked = 0`,
      [institutionId]
    );

    // Revoked certificates
    const [[revoked]] = await db.execute(
      `SELECT COUNT(*) AS c
       FROM certificates
       WHERE institution_id = ?
       AND is_revoked = 1`,
      [institutionId]
    );

    // Total verifications
    const [[logs]] = await db.execute(
      'SELECT COUNT(*) AS c FROM verification_logs'
    );

    return res.json({
      success: true,
      stats: {
        total_certificates: totals.total,
        valid_certificates: valid.c,
        revoked_certificates: revoked.c,
        total_verifications: logs.c
      }
    });

  } catch (err) {
    console.error('Stats summary error:', err);

    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


// ────────────────────────────────────────────────────────────────
// POST /api/verify
// Search certificates using multiple fields
// ────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const {
    cert_id,
    student_name,
    roll_number
  } = req.body;

  if (!cert_id && !student_name && !roll_number) {
    return res.status(400).json({
      success: false,
      message:
        'Provide at least one field: cert_id, student_name, or roll_number.'
    });
  }

  try {
    let query = `
      SELECT
        c.cert_id,
        c.student_name,
        c.roll_number,
        c.email,
        c.course,
        c.specialization,
        c.issue_date,
        c.expiry_date,
        c.grade,
        c.cgpa,
        c.is_revoked,
        c.revoke_reason,
        i.name AS institution_name,
        i.code AS institution_code
      FROM certificates c
      JOIN institutions i
        ON c.institution_id = i.id
      WHERE 1=1
    `;

    const params = [];

    if (cert_id) {
      query += ' AND c.cert_id = ?';
      params.push(cert_id.trim());
    }

    if (student_name) {
      query += ' AND c.student_name LIKE ?';
      params.push(`%${student_name.trim()}%`);
    }

    if (roll_number) {
      query += ' AND c.roll_number = ?';
      params.push(roll_number.trim());
    }

    query += ' LIMIT 10';

    const [rows] = await db.execute(query, params);

    return res.json({
      success: true,
      count: rows.length,
      results: rows.map(r => ({
        ...formatCert(r),
        status: r.is_revoked ? 'REVOKED' : 'VALID'
      }))
    });

  } catch (err) {
    console.error('Verify search error:', err);

    return res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
});


// ────────────────────────────────────────────────────────────────
// GET /api/verify/:certId
// Public certificate verification
// Must be LAST route
// ────────────────────────────────────────────────────────────────
router.get('/:certId', async (req, res) => {
  const { certId } = req.params;

  const ip =
    req.ip || req.connection.remoteAddress;

  const userAgent =
    req.headers['user-agent'] || '';

  if (!certId || certId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Certificate ID is required.'
    });
  }

  try {
    const [rows] = await db.execute(
      `
      SELECT
        c.cert_id,
        c.student_name,
        c.roll_number,
        c.email,
        c.course,
        c.specialization,
        c.issue_date,
        c.expiry_date,
        c.grade,
        c.cgpa,
        c.is_revoked,
        c.revoke_reason,
        i.name AS institution_name,
        i.code AS institution_code
      FROM certificates c
      JOIN institutions i
        ON c.institution_id = i.id
      WHERE c.cert_id = ?
      `,
      [certId.trim()]
    );

    let result;
    let certData;

    if (rows.length === 0) {
      result = 'NOT_FOUND';
      certData = null;

    } else if (rows[0].is_revoked) {
      result = 'REVOKED';
      certData = rows[0];

    } else {
      result = 'VALID';
      certData = rows[0];
    }

    // Log verification attempt
    try {
      await db.execute(
        `
        INSERT INTO verification_logs
        (cert_id_input, result, ip_address, user_agent)
        VALUES (?, ?, ?, ?)
        `,
        [
          certId.trim(),
          result,
          ip,
          userAgent.slice(0, 255)
        ]
      );
    } catch (logErr) {
      console.error('Log error:', logErr);
    }

    // Certificate not found
    if (result === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        result: 'FAKE',
        message:
          'No certificate found with this ID. It may be fake or the ID is incorrect.'
      });
    }

    // Revoked certificate
    if (result === 'REVOKED') {
      return res.json({
        success: true,
        result: 'REVOKED',
        message:
          `This certificate has been revoked. Reason: ${certData.revoke_reason}`,
        certificate: formatCert(certData)
      });
    }

    // Valid certificate
    return res.json({
      success: true,
      result: 'VALID',
      message:
        'Certificate is genuine and verified.',
      certificate: formatCert(certData)
    });

  } catch (err) {
    console.error('Certificate verification error:', err);

    return res.status(500).json({
      success: false,
      message:
        'Server error during verification.'
    });
  }
});


// ────────────────────────────────────────────────────────────────
// Format certificate response
// ────────────────────────────────────────────────────────────────
function formatCert(c) {
  return {
    cert_id: c.cert_id,
    student_name: c.student_name,
    roll_number: c.roll_number,
    email: c.email,
    course: c.course,
    specialization: c.specialization,
    institution: c.institution_name,
    institution_code: c.institution_code,
    issue_date: c.issue_date,
    expiry_date: c.expiry_date,
    grade: c.grade,
    cgpa: c.cgpa,
    is_revoked: c.is_revoked
  };
}

module.exports = router;