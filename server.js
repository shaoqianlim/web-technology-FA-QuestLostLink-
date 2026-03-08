/**
 * server.js — Quest LostLink
 * Backend: Node.js + Express + MySQL (connects to DBeaver/MySQL)
 *
 * Setup:
 *   1. Run database/schema.sql in DBeaver
 *   2. Copy .env.example → .env and fill in DB credentials
 *   3. npm install
 *   4. npm start
 */
'use strict';

require('dotenv').config();

const express    = require('express');
const path       = require('path');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const mysql      = require('mysql2/promise');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MySQL connection pool ──────────────────────────────────────
const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            parseInt(process.env.DB_PORT || '3306'),
  database:        process.env.DB_NAME     || 'quest_lostlink',
  user:            process.env.DB_USER     || 'root',
  password:        process.env.DB_PASS     || '',
  waitForConnections: true,
  connectionLimit: 10,
  timezone:        '+00:00',
});

// Test connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log(`✅  MySQL connected → ${process.env.DB_NAME || 'quest_lostlink'}`);
    conn.release();
  } catch (e) {
    console.error('❌  MySQL connection failed:', e.message);
    console.error('    Check your .env file: DB_HOST, DB_USER, DB_PASS, DB_NAME');
    process.exit(1);
  }
})();

// ── Security middleware ────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*' }));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
}));

// Auth route stricter limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Too many login attempts. Wait 15 minutes.' },
});

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ── Static files ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true, lastModified: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

// ── Helpers ────────────────────────────────────────────────────
const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VALID_TYPES   = ['lost', 'found'];
const VALID_STATUSES= ['active', 'claimed', 'resolved'];
const VALID_CATS    = ['Electronics','Clothing','Books & Stationery','ID / Cards','Keys','Bags & Wallets','Jewellery','Other'];

function sanitize(str, max = 500) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().substring(0, max);
}

function ok(res, data, status = 200) { res.status(status).json({ success: true, ...data }); }
function fail(res, msg, status = 400) { res.status(status).json({ success: false, message: msg }); }

// ── AUTH ROUTES ────────────────────────────────────────────────

// POST /api/auth/signup
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const { first_name, last_name, email, phone, password, role } = req.body;
  if (!first_name?.trim())              return fail(res, 'First name required.');
  if (!last_name?.trim())               return fail(res, 'Last name required.');
  if (!EMAIL_RE.test(email))            return fail(res, 'Valid email required.');
  if (!password || password.length < 8) return fail(res, 'Password must be at least 8 characters.');

  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length) return fail(res, 'An account with this email already exists.', 409);

    const [result] = await pool.execute(
      'INSERT INTO users (first_name, last_name, email, phone, password, role) VALUES (?,?,?,?,?,?)',
      [
        sanitize(first_name, 60),
        sanitize(last_name, 60),
        email.trim().toLowerCase(),
        phone ? sanitize(phone, 20) : null,
        password,   // ← hash with bcrypt in production
        ['student','staff'].includes(role) ? role : 'student',
      ]
    );
    ok(res, { message: 'Account created successfully.', data: { id: result.insertId } }, 201);
  } catch (e) {
    console.error('Signup error:', e.message);
    fail(res, 'Signup failed. Please try again.', 500);
  }
});

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!EMAIL_RE.test(email) || !password) return fail(res, 'Invalid email or password.', 401);

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    const user = rows[0];
    if (!user || user.password !== password) return fail(res, 'Invalid email or password.', 401);
    if (!user.is_active)                     return fail(res, 'Account is deactivated.', 403);

    const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');
    ok(res, {
      message: 'Login successful.',
      token,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role },
    });
  } catch (e) {
    console.error('Login error:', e.message);
    fail(res, 'Login failed. Please try again.', 500);
  }
});

// ── ITEMS ROUTES ───────────────────────────────────────────────

// GET /api/items/stats
app.get('/api/items/stats', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        SUM(type='lost')       AS lost,
        SUM(type='found')      AS found,
        SUM(status='active')   AS active,
        SUM(status='resolved') AS resolved
      FROM items
    `);
    ok(res, { data: rows[0] });
  } catch (e) {
    console.error('Stats error:', e.message);
    fail(res, 'Failed to fetch stats.', 500);
  }
});

// GET /api/items
app.get('/api/items', async (req, res) => {
  const { type, status, category, search } = req.query;
  const parts  = ['SELECT * FROM items WHERE 1=1'];
  const params = [];

  if (type     && VALID_TYPES.includes(type))     { parts.push('AND type = ?');     params.push(type); }
  if (status   && VALID_STATUSES.includes(status)){ parts.push('AND status = ?');   params.push(status); }
  if (category && VALID_CATS.includes(category))  { parts.push('AND category = ?'); params.push(category); }
  if (search) {
    const term = `%${String(search).replace(/[%_\\]/g, '\\$&').substring(0, 100)}%`;
    parts.push('AND (title LIKE ? OR description LIKE ? OR location LIKE ?)');
    params.push(term, term, term);
  }

  parts.push('ORDER BY created_at DESC');
  try {
    const [rows] = await pool.execute(parts.join(' '), params);
    ok(res, { data: rows });
  } catch (e) {
    console.error('Get items error:', e.message);
    fail(res, 'Failed to fetch items.', 500);
  }
});

// GET /api/items/:id
app.get('/api/items/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return fail(res, 'Invalid ID.');
  try {
    const [rows] = await pool.execute('SELECT * FROM items WHERE id = ?', [id]);
    if (!rows.length) return fail(res, 'Item not found.', 404);
    ok(res, { data: rows[0] });
  } catch (e) {
    fail(res, 'Failed to fetch item.', 500);
  }
});

// POST /api/items
app.post('/api/items', async (req, res) => {
  const { type, category, title, description, location, date_reported, contact_name, contact_email } = req.body;

  if (!VALID_TYPES.includes(type))                          return fail(res, 'Type must be lost or found.');
  if (!VALID_CATS.includes(category))                       return fail(res, 'Invalid category.');
  if (!title?.trim() || title.length > 120)                 return fail(res, 'Title required (max 120 chars).');
  if (!description?.trim() || description.length > 1000)    return fail(res, 'Description required (max 1000 chars).');
  if (!location?.trim() || location.length > 150)           return fail(res, 'Location required (max 150 chars).');
  if (!date_reported || new Date(date_reported) > new Date()) return fail(res, 'Valid date required — not in the future.');
  if (!contact_name?.trim() || contact_name.length > 100)   return fail(res, 'Contact name required.');
  if (!EMAIL_RE.test(contact_email))                        return fail(res, 'Valid contact email required.');

  try {
    const [result] = await pool.execute(
      `INSERT INTO items (type, category, title, description, location, date_reported, contact_name, contact_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type, category,
        sanitize(title, 120), sanitize(description, 1000), sanitize(location, 150),
        date_reported,
        sanitize(contact_name, 100), contact_email.trim().substring(0, 180),
      ]
    );
    ok(res, { message: 'Item reported successfully.', data: { id: result.insertId } }, 201);
  } catch (e) {
    console.error('Create item error:', e.message);
    fail(res, 'Failed to save item.', 500);
  }
});

// PATCH /api/items/:id/status
app.patch('/api/items/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return fail(res, 'Invalid ID.');
  if (!VALID_STATUSES.includes(req.body.status)) return fail(res, 'Invalid status.');

  try {
    const [result] = await pool.execute(
      'UPDATE items SET status = ?, updated_at = NOW() WHERE id = ?',
      [req.body.status, id]
    );
    if (!result.affectedRows) return fail(res, 'Item not found.', 404);
    ok(res, { message: 'Status updated.' });
  } catch (e) {
    fail(res, 'Failed to update status.', 500);
  }
});

// DELETE /api/items/:id
app.delete('/api/items/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return fail(res, 'Invalid ID.');
  try {
    const [result] = await pool.execute('DELETE FROM items WHERE id = ?', [id]);
    if (!result.affectedRows) return fail(res, 'Item not found.', 404);
    ok(res, { message: 'Item deleted.' });
  } catch (e) {
    fail(res, 'Failed to delete item.', 500);
  }
});

// Health check
app.get('/api/health', (_req, res) => ok(res, { status: 'ok', timestamp: new Date().toISOString() }));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, message: 'Not found.' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
});

app.listen(PORT, () => {
  console.log(`\n🚀  Quest LostLink running at http://localhost:${PORT}`);
  console.log(`    Mode: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
