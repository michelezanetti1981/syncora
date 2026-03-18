// ============================================================
// WorkBoard - Backend Node.js/Express
// Sostituisce le funzioni Base44 per deploy autonomo
// Requisiti: Node.js 18+, PostgreSQL 14+
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

// ============================================================
// DATABASE
// ============================================================
const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'workboard',
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Upload locale (sostituisce Base44 UploadFile)
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
app.use('/uploads', express.static(uploadDir));

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
  next();
};

// ============================================================
// AUTH ROUTES
// ============================================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { email, full_name, password } = req.body;
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    'INSERT INTO users (email, full_name, password_hash) VALUES ($1,$2,$3) RETURNING id,email,full_name,role,avatar_url,created_date',
    [email, full_name, hash]
  );
  const token = jwt.sign({ userId: rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user: rows[0], token });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
  const { password_hash, ...user } = rows[0];
  res.json({ user, token });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req, res) => {
  const { password_hash, ...user } = req.user;
  res.json(user);
});

// PATCH /api/auth/me
app.patch('/api/auth/me', authenticate, async (req, res) => {
  const { full_name, avatar_url } = req.body;
  const { rows } = await pool.query(
    'UPDATE users SET full_name=$1, avatar_url=$2 WHERE id=$3 RETURNING id,email,full_name,role,avatar_url',
    [full_name, avatar_url, req.user.id]
  );
  res.json(rows[0]);
});

// ============================================================
// USERS
// ============================================================

// GET /api/users  (admin only)
app.get('/api/users', authenticate, requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT id,email,full_name,role,avatar_url,created_date FROM users ORDER BY created_date DESC');
  res.json(rows);
});

// POST /api/users/invite  (admin only)
app.post('/api/users/invite', authenticate, requireAdmin, async (req, res) => {
  const { email, role = 'user' } = req.body;
  const tempPassword = Math.random().toString(36).slice(-10);
  const hash = await bcrypt.hash(tempPassword, 12);
  const { rows } = await pool.query(
    'INSERT INTO users (email, full_name, password_hash, role) VALUES ($1,$1,$2,$3) ON CONFLICT (email) DO NOTHING RETURNING id,email,role',
    [email, hash, role]
  );
  // Invia email con password temporanea
  await sendEmail({
    to: email,
    subject: 'Invito WorkBoard',
    html: `<p>Sei stato invitato su WorkBoard.<br>Email: <b>${email}</b><br>Password temporanea: <b>${tempPassword}</b><br>Cambiala al primo accesso.</p>`
  });
  res.json({ success: true, user: rows[0] });
});

// PATCH /api/users/:id  (admin only)
app.patch('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  const { role } = req.body;
  const { rows } = await pool.query('UPDATE users SET role=$1 WHERE id=$2 RETURNING id,email,full_name,role', [role, req.params.id]);
  res.json(rows[0]);
});

// ============================================================
// FILE UPLOAD (sostituisce Base44 UploadFile)
// ============================================================
app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const file_url = `${process.env.BASE_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;
  res.json({ file_url });
});

// ============================================================
// PROJECTS
// ============================================================
const projectsRouter = require('./routes/projects')(pool);
app.use('/api/projects', authenticate, projectsRouter);

// ============================================================
// BOARDS
// ============================================================
const boardsRouter = require('./routes/boards')(pool);
app.use('/api/boards', authenticate, boardsRouter);

// ============================================================
// TASKS
// ============================================================
const tasksRouter = require('./routes/tasks')(pool);
app.use('/api/tasks', authenticate, tasksRouter);

// ============================================================
// COMMISSIONS
// ============================================================
const commissionsRouter = require('./routes/commissions')(pool);
app.use('/api/commissions', authenticate, commissionsRouter);

// ============================================================
// COMMENTS
// ============================================================
const commentsRouter = require('./routes/comments')(pool);
app.use('/api/comments', authenticate, commentsRouter);

// ============================================================
// NOTIFICATIONS
// ============================================================
const notificationsRouter = require('./routes/notifications')(pool);
app.use('/api/notifications', authenticate, notificationsRouter);

// ============================================================
// MESSAGES (board chat)
// ============================================================
const messagesRouter = require('./routes/messages')(pool);
app.use('/api/messages', authenticate, messagesRouter);

// ============================================================
// BOARD MEMBERS
// ============================================================
const boardMembersRouter = require('./routes/boardMembers')(pool);
app.use('/api/board-members', authenticate, boardMembersRouter);

// ============================================================
// CUSTOM FIELDS
// ============================================================
const customFieldsRouter = require('./routes/customFields')(pool);
app.use('/api/custom-fields', authenticate, customFieldsRouter);

// ============================================================
// APP SETTINGS
// ============================================================
const settingsRouter = require('./routes/settings')(pool);
app.use('/api/settings', authenticate, settingsRouter);

// ============================================================
// EMAIL HELPER
// ============================================================
async function sendEmail({ to, subject, html }) {
  const { rows } = await pool.query('SELECT * FROM app_settings LIMIT 1');
  const cfg = rows[0];
  if (!cfg?.smtp_host) {
    console.warn('SMTP non configurato, email non inviata.');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: cfg.smtp_port || 587,
    secure: cfg.smtp_secure || false,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_password },
  });
  await transporter.sendMail({
    from: `"${cfg.smtp_from_name || 'WorkBoard'}" <${cfg.smtp_from_email}>`,
    to, subject, html,
  });
}
app.locals.sendEmail = sendEmail;

// ============================================================
// COMMISSION REPORT (sostituisce funzione Base44)
// ============================================================
app.post('/api/reports/commission', authenticate, async (req, res) => {
  const { commission_id } = req.body;
  const { rows: commissions } = commission_id
    ? await pool.query('SELECT * FROM commissions WHERE id=$1', [commission_id])
    : await pool.query("SELECT * FROM commissions WHERE report_frequency != 'none'");

  let sent = 0;
  for (const comm of commissions) {
    const { rows: tasks } = await pool.query(
      "SELECT * FROM tasks WHERE commission_id=$1 AND status != 'done'", [comm.id]
    );
    const remaining = (comm.prepaid_hours || 0) - (comm.used_hours || 0);
    const pct = comm.prepaid_hours ? Math.round((comm.used_hours / comm.prepaid_hours) * 100) : 0;

    const taskRows = tasks.map(t => `<tr><td>${t.title}</td><td>${t.status}</td><td>${t.assignee_name || '—'}</td><td>${t.logged_hours || 0}h</td></tr>`).join('');
    const html = `
      <h2>Report Commessa: ${comm.name}</h2>
      <p><b>Cliente:</b> ${comm.client}</p>
      <p><b>Ore prepagato:</b> ${comm.prepaid_hours}h | <b>Utilizzate:</b> ${comm.used_hours}h | <b>Rimanenti:</b> ${remaining.toFixed(1)}h (${pct}%)</p>
      <table border="1" cellpadding="6" style="border-collapse:collapse">
        <thead><tr><th>Task</th><th>Stato</th><th>Assegnato</th><th>Ore</th></tr></thead>
        <tbody>${taskRows}</tbody>
      </table>
    `;
    for (const email of (comm.referenti || [])) {
      await sendEmail({ to: email, subject: `Report commessa: ${comm.name}`, html });
      sent++;
    }
  }
  res.json({ sent });
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.listen(PORT, () => console.log(`WorkBoard API running on port ${PORT}`));
module.exports = { app, pool, sendEmail };