// server.js — Main Express application entry point
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const authRoutes  = require('./routes/auth');
const certRoutes  = require('./routes/certificates');
const verifyRoutes = require('./routes/verify');

const app = express();

// Fix Railway proxy issue
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// ─── Security & Parsing ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
})); // CSP off for dev; tune in prod
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ───────────────────────────────────────────────
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});

app.use('/api/', apiLimiter);
app.use('/api/verify', verifyLimiter);

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/certificates', certRoutes);
app.use('/api/verify',       verifyRoutes);

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Fake Certificate Detection System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Serve Frontend (static) in production ──────────────────────
// ─── Serve Frontend (static) ─────────────────────────────────────
// ─── Serve Frontend ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'public', 'index.html'));
});

// ─── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global error handler ────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start ───────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
 console.log(`📋 API base: http://192.168.1.7:${PORT}/api`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
