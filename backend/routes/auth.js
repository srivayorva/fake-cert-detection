// routes/auth.js — Institution login & registration
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');
const router   = express.Router();

// ─── POST /api/auth/register ─────────────────────────────────────
// Register a new institution (admin use — remove in production or guard with admin key)
router.post('/register', async (req, res) => {
  const { name, code, email, password, address, phone } = req.body;

  if (!name || !code || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, code, email and password are required.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO institutions (name, code, email, password, address, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [name, code.toUpperCase(), email, hash, address || null, phone || null]
    );
    res.status(201).json({
      success: true,
      message: 'Institution registered successfully.',
      id: result.insertId,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Institution code or email already exists.' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.execute(
  'SELECT * FROM institutions WHERE email = ?',
  [email]
);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const institution = rows[0];
    const match = await bcrypt.compare(password, institution.password);
    console.log('Entered Password:', password);
console.log('DB Password:', institution.password);
console.log('Match:', match);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: institution.id, code: institution.code, name: institution.name },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      institution: {
        id:   institution.id,
        name: institution.name,
        code: institution.code,
        email: institution.email,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

module.exports = router;
