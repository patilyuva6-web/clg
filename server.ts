import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import db, { initDatabase } from './src/db/database.js';

initDatabase();

const app = express();
const PORT = 3000;

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Runtime HMAC signing key (uses env var when provided, otherwise strong per-process random bytes)
const TOKEN_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

interface AuthUser {
  role: 'student' | 'admin';
  id: number;
  name: string;
  usn?: string;
  exp: number;
}

interface AuthedRequest extends Request {
  auth?: AuthUser;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.startsWith('scrypt$')) {
    return false;
  }
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const [, salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

function verifyEnvPasscode(input: string, envSecret: string): boolean {
  const inputHash = crypto.createHash('sha256').update(input).digest();
  const envHash = crypto.createHash('sha256').update(envSecret).digest();
  return crypto.timingSafeEqual(inputHash, envHash);
}

function issueToken(payload: Omit<AuthUser, 'exp'>): string {
  const fullPayload: AuthUser = {
    ...payload,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function parseToken(req: Request): AuthUser | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AuthUser;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const user = parseToken(req);
  if (user) req.auth = user;
  next();
}

function requireStudent(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = parseToken(req);
  if (!user || user.role !== 'student') {
    res.status(401).json({ error: 'Student authentication required. Please sign in.' });
    return;
  }
  req.auth = user;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = parseToken(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator privileges required.' });
    return;
  }
  req.auth = user;
  next();
}

// Validate uploaded image bytes (JPEG, PNG, WebP)
function detectImageExtension(buffer: Buffer, mime: string): string | null {
  if (buffer.length < 12) return null;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  if (isJpeg && (mime === 'image/jpeg' || mime === 'image/jpg')) return '.jpg';
  if (isPng && mime === 'image/png') return '.png';
  if (isWebp && mime === 'image/webp') return '.webp';
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(express.json({ limit: '1mb' }));

// Safe uploaded image serving with path traversal confinement
app.get('/uploads/:filename', (req: Request, res: Response) => {
  const rawName = String(req.params.filename || '');
  if (!/^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(rawName)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }
  const resolvedPath = path.resolve(uploadsDir, rawName);
  if (!resolvedPath.startsWith(uploadsDir + path.sep) || !fs.existsSync(resolvedPath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(resolvedPath);
});

// ========================
// PUBLIC ROUTES
// ========================

app.get('/api/categories', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT category_id, category_name FROM categories ORDER BY category_id ASC').all();
  res.json({ categories: rows });
});

app.get('/api/stats/public', (_req: Request, res: Response) => {
  const stats = db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'approved' AND report_type = 'lost' THEN 1 ELSE 0 END) AS active_lost,
         SUM(CASE WHEN status = 'approved' AND report_type = 'found' THEN 1 ELSE 0 END) AS active_found,
         SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned_count,
         (SELECT COUNT(*) FROM categories) AS category_count
       FROM items`
    )
    .get() as { active_lost: number | null; active_found: number | null; returned_count: number | null; category_count: number };

  res.json({
    active_lost: stats.active_lost ?? 0,
    active_found: stats.active_found ?? 0,
    returned_count: stats.returned_count ?? 0,
    category_count: stats.category_count ?? 0,
  });
});

app.get('/api/items', (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
  const reportType =
    req.query.report_type === 'lost' || req.query.report_type === 'found' ? req.query.report_type : null;
  const statusFilter =
    req.query.status === 'approved' || req.query.status === 'returned' ? req.query.status : null;
  const location = typeof req.query.location === 'string' ? req.query.location.trim() : '';
  const itemDate = typeof req.query.date === 'string' ? req.query.date.trim() : '';
  const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 100) : 50;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (statusFilter) {
    conditions.push('i.status = ?');
    params.push(statusFilter);
  } else {
    conditions.push("i.status IN ('approved', 'returned')");
  }

  if (q) {
    conditions.push('(i.item_name LIKE ? OR i.description LIKE ? OR i.location LIKE ?)');
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ, likeQ);
  }

  if (categoryId && Number.isInteger(categoryId)) {
    conditions.push('i.category_id = ?');
    params.push(categoryId);
  }

  if (reportType) {
    conditions.push('i.report_type = ?');
    params.push(reportType);
  }

  if (location) {
    conditions.push('i.location LIKE ?');
    params.push(`%${location}%`);
  }

  if (itemDate) {
    conditions.push('i.item_date = ?');
    params.push(itemDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Privacy: Never return reporter email, phone, or USN on public endpoints
  const sql = `
    SELECT
      i.item_id,
      i.category_id,
      c.category_name,
      i.item_name,
      i.description,
      i.report_type,
      i.item_date,
      i.location,
      i.image,
      i.status,
      i.created_at,
      u.student_name AS reporter_name
    FROM items i
    JOIN categories c ON i.category_id = c.category_id
    JOIN users u ON i.user_id = u.user_id
    ${whereClause}
    ORDER BY i.created_at DESC, i.item_id DESC
    LIMIT ?
  `;
  params.push(limit);

  const items = db.prepare(sql).all(...params);
  res.json({ items });
});

app.get('/api/items/:id', optionalAuth, (req: AuthedRequest, res: Response) => {
  const itemId = Number(req.params.id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    res.status(400).json({ error: 'Invalid item identifier' });
    return;
  }

  const item = db
    .prepare(
      `SELECT
         i.item_id,
         i.user_id,
         i.category_id,
         c.category_name,
         i.item_name,
         i.description,
         i.report_type,
         i.item_date,
         i.location,
         i.image,
         i.status,
         i.created_at,
         u.student_name AS reporter_name
       FROM items i
       JOIN categories c ON i.category_id = c.category_id
       JOIN users u ON i.user_id = u.user_id
       WHERE i.item_id = ?`
    )
    .get(itemId) as
    | {
        item_id: number;
        user_id: number;
        category_id: number;
        category_name: string;
        item_name: string;
        description: string;
        report_type: string;
        item_date: string;
        location: string;
        image: string | null;
        status: string;
        created_at: string;
        reporter_name: string;
      }
    | undefined;

  if (!item) {
    res.status(404).json({ error: 'Item report not found' });
    return;
  }

  const isOwner = req.auth?.role === 'student' && req.auth.id === item.user_id;
  const isAdmin = req.auth?.role === 'admin';

  if ((item.status === 'pending' || item.status === 'rejected') && !isOwner && !isAdmin) {
    res.status(404).json({ error: 'Item report is unavailable or awaiting moderation' });
    return;
  }

  const claimCountRow = db
    .prepare('SELECT COUNT(*) AS count FROM claims WHERE item_id = ?')
    .get(itemId) as { count: number };

  let userClaim = null;
  if (req.auth?.role === 'student') {
    userClaim = db
      .prepare('SELECT claim_id, claim_status, created_at FROM claims WHERE item_id = ? AND user_id = ? ORDER BY claim_id DESC LIMIT 1')
      .get(itemId, req.auth.id);
  }

  // Strip internal user_id before returning publicly
  const { user_id: _uid, ...safeItem } = item;
  res.json({
    item: {
      ...safeItem,
      is_owner: isOwner,
      claim_count: claimCountRow.count,
      user_claim: userClaim,
    },
  });
});

// ========================
// STUDENT AUTH & PORTAL
// ========================

app.post('/api/student/register', (req: Request, res: Response) => {
  const { student_name, usn, email, phone, password, confirm_password } = req.body ?? {};

  const name = typeof student_name === 'string' ? student_name.trim() : '';
  const cleanUsn = typeof usn === 'string' ? usn.trim().toUpperCase() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
  const rawPass = typeof password === 'string' ? password : '';
  const rawConfirm = typeof confirm_password === 'string' ? confirm_password : '';

  if (name.length < 2 || name.length > 100) {
    res.status(400).json({ error: 'Please enter your full student name (2–100 characters).' });
    return;
  }
  if (!/^[A-Z0-9-]{4,24}$/.test(cleanUsn)) {
    res.status(400).json({ error: 'Please enter a valid USN or College ID (4–24 alphanumeric characters).' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Please enter a valid college or personal email address.' });
    return;
  }
  if (!/^[0-9+\-\s]{7,18}$/.test(cleanPhone)) {
    res.status(400).json({ error: 'Please enter a valid phone number.' });
    return;
  }
  if (rawPass.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }
  if (rawPass !== rawConfirm) {
    res.status(400).json({ error: 'Password and Confirm Password do not match.' });
    return;
  }

  const existing = db
    .prepare('SELECT user_id FROM users WHERE email = ? OR usn = ?')
    .get(cleanEmail, cleanUsn);
  if (existing) {
    res.status(409).json({ error: 'An account with this USN or Email is already registered.' });
    return;
  }

  const hashed = hashPassword(rawPass);
  const result = db
    .prepare('INSERT INTO users (student_name, usn, email, phone, password) VALUES (?, ?, ?, ?, ?)')
    .run(name, cleanUsn, cleanEmail, cleanPhone, hashed);

  const userId = Number(result.lastInsertRowid);
  const token = issueToken({ role: 'student', id: userId, name, usn: cleanUsn });

  res.status(201).json({
    token,
    user: {
      user_id: userId,
      student_name: name,
      usn: cleanUsn,
      email: cleanEmail,
      phone: cleanPhone,
    },
  });
});

app.post('/api/student/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body ?? {};
  const idStr = typeof identifier === 'string' ? identifier.trim() : '';
  const rawPass = typeof password === 'string' ? password : '';

  if (!idStr || !rawPass) {
    res.status(400).json({ error: 'Please enter both Email/USN and Password.' });
    return;
  }

  const user = db
    .prepare('SELECT user_id, student_name, usn, email, phone, password FROM users WHERE LOWER(email) = LOWER(?) OR UPPER(usn) = UPPER(?)')
    .get(idStr, idStr) as
    | {
        user_id: number;
        student_name: string;
        usn: string;
        email: string;
        phone: string;
        password: string;
      }
    | undefined;

  if (!user || !verifyPassword(rawPass, user.password)) {
    res.status(401).json({ error: 'Invalid Email/USN or password. Please verify your credentials.' });
    return;
  }

  const token = issueToken({
    role: 'student',
    id: user.user_id,
    name: user.student_name,
    usn: user.usn,
  });

  res.json({
    token,
    user: {
      user_id: user.user_id,
      student_name: user.student_name,
      usn: user.usn,
      email: user.email,
      phone: user.phone,
    },
  });
});

app.get('/api/student/me', requireStudent, (req: AuthedRequest, res: Response) => {
  const user = db
    .prepare('SELECT user_id, student_name, usn, email, phone, created_at FROM users WHERE user_id = ?')
    .get(req.auth!.id);
  if (!user) {
    res.status(404).json({ error: 'Student account not found' });
    return;
  }
  res.json({ user });
});

app.get('/api/student/reports', requireStudent, (req: AuthedRequest, res: Response) => {
  const reports = db
    .prepare(
      `SELECT
         i.item_id,
         i.category_id,
         c.category_name,
         i.item_name,
         i.description,
         i.report_type,
         i.item_date,
         i.location,
         i.image,
         i.status,
         i.created_at,
         (SELECT COUNT(*) FROM claims cl WHERE cl.item_id = i.item_id) AS claim_count
       FROM items i
       JOIN categories c ON i.category_id = c.category_id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC, i.item_id DESC`
    )
    .all(req.auth!.id);

  res.json({ reports });
});

app.get('/api/student/claims', requireStudent, (req: AuthedRequest, res: Response) => {
  const claims = db
    .prepare(
      `SELECT
         cl.claim_id,
         cl.item_id,
         cl.claim_description,
         cl.supporting_info,
         cl.claim_status,
         cl.created_at,
         i.item_name,
         i.report_type,
         i.location,
         i.item_date,
         i.image,
         i.status AS item_status,
         c.category_name
       FROM claims cl
       JOIN items i ON cl.item_id = i.item_id
       JOIN categories c ON i.category_id = c.category_id
       WHERE cl.user_id = ?
       ORDER BY cl.created_at DESC, cl.claim_id DESC`
    )
    .all(req.auth!.id);

  res.json({ claims });
});

app.post('/api/student/items', requireStudent, (req: AuthedRequest, res: Response) => {
  upload.single('image')(req, res, (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Image file size must be 5 MB or smaller.' });
        return;
      }
      res.status(400).json({ error: 'Invalid file upload request.' });
      return;
    }

    const { item_name, category_id, description, report_type, item_date, location } = req.body ?? {};
    const cleanName = typeof item_name === 'string' ? item_name.trim() : '';
    const catId = Number(category_id);
    const cleanDesc = typeof description === 'string' ? description.trim() : '';
    const type = report_type === 'lost' || report_type === 'found' ? report_type : '';
    const dateStr = typeof item_date === 'string' ? item_date.trim() : '';
    const cleanLoc = typeof location === 'string' ? location.trim() : '';

    if (cleanName.length < 3 || cleanName.length > 140) {
      res.status(400).json({ error: 'Item name must be between 3 and 140 characters.' });
      return;
    }
    if (!Number.isInteger(catId) || !db.prepare('SELECT 1 FROM categories WHERE category_id = ?').get(catId)) {
      res.status(400).json({ error: 'Please select a valid item category.' });
      return;
    }
    if (cleanDesc.length < 10 || cleanDesc.length > 2000) {
      res.status(400).json({ error: 'Please provide a clear description (at least 10 characters).' });
      return;
    }
    if (!type) {
      res.status(400).json({ error: 'Invalid report type.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      res.status(400).json({ error: 'Please provide a valid date (YYYY-MM-DD).' });
      return;
    }
    if (cleanLoc.length < 3 || cleanLoc.length > 160) {
      res.status(400).json({ error: 'Please enter the campus location (3–160 characters).' });
      return;
    }

    let imagePath: string | null = null;
    if (req.file) {
      const ext = detectImageExtension(req.file.buffer, req.file.mimetype);
      if (!ext) {
        res.status(400).json({ error: 'Only valid JPG, PNG, or WEBP photographs are allowed.' });
        return;
      }
      const safeFilename = `item_${crypto.randomUUID()}${ext}`;
      const targetPath = path.resolve(uploadsDir, safeFilename);
      if (!targetPath.startsWith(uploadsDir + path.sep)) {
        res.status(400).json({ error: 'Invalid upload path.' });
        return;
      }
      fs.writeFileSync(targetPath, req.file.buffer);
      imagePath = `/uploads/${safeFilename}`;
    }

    const result = db
      .prepare(
        `INSERT INTO items (user_id, category_id, item_name, description, report_type, item_date, location, image, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
      )
      .run(req.auth!.id, catId, cleanName, cleanDesc, type, dateStr, cleanLoc, imagePath);

    const created = db
      .prepare(
        `SELECT i.*, c.category_name
         FROM items i
         JOIN categories c ON i.category_id = c.category_id
         WHERE i.item_id = ?`
      )
      .get(Number(result.lastInsertRowid));

    res.status(201).json({
      message: 'Report submitted and queued for administrator verification.',
      item: created,
    });
  });
});

app.post('/api/student/claims', requireStudent, (req: AuthedRequest, res: Response) => {
  const { item_id, claim_description, supporting_info } = req.body ?? {};
  const itemId = Number(item_id);
  const reason = typeof claim_description === 'string' ? claim_description.trim() : '';
  const support = typeof supporting_info === 'string' ? supporting_info.trim() : '';

  if (!Number.isInteger(itemId) || itemId <= 0) {
    res.status(400).json({ error: 'Invalid item selected.' });
    return;
  }
  if (reason.length < 10 || reason.length > 2000) {
    res.status(400).json({ error: 'Please explain your reason for ownership or recovery (at least 10 characters).' });
    return;
  }

  const item = db
    .prepare('SELECT item_id, user_id, status FROM items WHERE item_id = ?')
    .get(itemId) as { item_id: number; user_id: number; status: string } | undefined;

  if (!item) {
    res.status(404).json({ error: 'Item not found.' });
    return;
  }
  if (item.status !== 'approved') {
    res.status(400).json({ error: 'Claims can only be submitted for active, approved item listings.' });
    return;
  }
  if (item.user_id === req.auth!.id) {
    res.status(400).json({ error: 'You cannot submit a claim against your own item report.' });
    return;
  }

  const duplicate = db
    .prepare("SELECT claim_id FROM claims WHERE item_id = ? AND user_id = ? AND claim_status = 'pending'")
    .get(itemId, req.auth!.id);

  if (duplicate) {
    res.status(409).json({ error: 'You already have a pending claim under review for this item.' });
    return;
  }

  const result = db
    .prepare(
      `INSERT INTO claims (item_id, user_id, claim_description, supporting_info, claim_status)
       VALUES (?, ?, ?, ?, 'pending')`
    )
    .run(itemId, req.auth!.id, reason, support);

  const claim = db.prepare('SELECT * FROM claims WHERE claim_id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json({
    message: 'Ownership claim submitted for administrator review.',
    claim,
  });
});

// ========================
// ADMIN AUTH & MANAGEMENT
// ========================

app.get('/api/admin/status', (_req: Request, res: Response) => {
  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  const firstAdmin = db.prepare('SELECT username FROM admins ORDER BY admin_id ASC LIMIT 1').get() as
    | { username: string }
    | undefined;

  res.json({
    configured: Boolean(envPasscode) || Boolean(firstAdmin),
    envConfigured: Boolean(envPasscode),
    username: firstAdmin ? firstAdmin.username : null,
  });
});

app.post('/api/admin/bootstrap', (req: Request, res: Response) => {
  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  if (envPasscode) {
    res.status(403).json({ error: 'Administrator passcode is configured via environment settings.' });
    return;
  }

  const { username, password, confirm_password } = req.body ?? {};
  const cleanUser = typeof username === 'string' ? username.trim() : '';
  const rawPass = typeof password === 'string' ? password : '';
  const rawConfirm = typeof confirm_password === 'string' ? confirm_password : '';

  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(cleanUser)) {
    res.status(400).json({ error: 'Admin username must be 3–40 characters (letters, numbers, _, ., -).' });
    return;
  }
  if (rawPass.length < 8) {
    res.status(400).json({ error: 'Administrator password must be at least 8 characters.' });
    return;
  }
  if (rawPass !== rawConfirm) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }

  const hashed = hashPassword(rawPass);

  const bootstrapTx = db.transaction(() => {
    const countRow = db.prepare('SELECT COUNT(*) AS count FROM admins').get() as { count: number };
    if (countRow.count > 0) {
      return null;
    }
    const info = db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(cleanUser, hashed);
    return Number(info.lastInsertRowid);
  });

  const adminId = bootstrapTx();
  if (!adminId) {
    res.status(403).json({ error: 'Administrator account has already been initialized.' });
    return;
  }

  const token = issueToken({ role: 'admin', id: adminId, name: cleanUser });
  res.status(201).json({
    token,
    admin: { admin_id: adminId, username: cleanUser },
  });
});

app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  const cleanUser = typeof username === 'string' ? username.trim() : '';
  const rawPass = typeof password === 'string' ? password : '';

  if (!cleanUser || !rawPass) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  if (envPasscode) {
    if (verifyEnvPasscode(rawPass, envPasscode)) {
      const token = issueToken({ role: 'admin', id: 1, name: cleanUser });
      res.json({ token, admin: { admin_id: 1, username: cleanUser } });
      return;
    }
    res.status(401).json({ error: 'Invalid administrator credentials.' });
    return;
  }

  const admin = db
    .prepare('SELECT admin_id, username, password FROM admins WHERE username = ?')
    .get(cleanUser) as { admin_id: number; username: string; password: string } | undefined;

  if (!admin || !verifyPassword(rawPass, admin.password)) {
    res.status(401).json({ error: 'Invalid administrator username or password.' });
    return;
  }

  const token = issueToken({ role: 'admin', id: admin.admin_id, name: admin.username });
  res.json({ token, admin: { admin_id: admin.admin_id, username: admin.username } });
});

app.get('/api/admin/dashboard', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const totalUsers = (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count;
  const itemCounts = db
    .prepare(
      `SELECT
         SUM(CASE WHEN report_type = 'lost' THEN 1 ELSE 0 END) AS total_lost,
         SUM(CASE WHEN report_type = 'found' THEN 1 ELSE 0 END) AS total_found,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_reports,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_reports,
         SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned_items
       FROM items`
    )
    .get() as {
      total_lost: number | null;
      total_found: number | null;
      pending_reports: number | null;
      approved_reports: number | null;
      returned_items: number | null;
    };

  const pendingClaims = (
    db.prepare("SELECT COUNT(*) AS count FROM claims WHERE claim_status = 'pending'").get() as { count: number }
  ).count;

  const recentReports = db
    .prepare(
      `SELECT
         i.item_id,
         i.item_name,
         i.report_type,
         i.item_date,
         i.location,
         i.status,
         i.created_at,
         c.category_name,
         u.student_name,
         u.usn
       FROM items i
       JOIN categories c ON i.category_id = c.category_id
       JOIN users u ON i.user_id = u.user_id
       ORDER BY i.created_at DESC, i.item_id DESC
       LIMIT 8`
    )
    .all();

  res.json({
    stats: {
      total_users: totalUsers,
      total_lost: itemCounts.total_lost ?? 0,
      total_found: itemCounts.total_found ?? 0,
      pending_reports: itemCounts.pending_reports ?? 0,
      approved_reports: itemCounts.approved_reports ?? 0,
      returned_items: itemCounts.returned_items ?? 0,
      pending_claims: pendingClaims,
    },
    recent_reports: recentReports,
  });
});

app.get('/api/admin/items', requireAdmin, (req: AuthedRequest, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const type = typeof req.query.report_type === 'string' ? req.query.report_type : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const conditions: string[] = [];
  const params: string[] = [];

  if (['pending', 'approved', 'rejected', 'returned'].includes(status)) {
    conditions.push('i.status = ?');
    params.push(status);
  }
  if (['lost', 'found'].includes(type)) {
    conditions.push('i.report_type = ?');
    params.push(type);
  }
  if (q) {
    conditions.push('(i.item_name LIKE ? OR i.location LIKE ? OR u.student_name LIKE ? OR u.usn LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const items = db
    .prepare(
      `SELECT
         i.*,
         c.category_name,
         u.student_name,
         u.usn,
         u.email,
         u.phone,
         (SELECT COUNT(*) FROM claims cl WHERE cl.item_id = i.item_id) AS claim_count
       FROM items i
       JOIN categories c ON i.category_id = c.category_id
       JOIN users u ON i.user_id = u.user_id
       ${where}
       ORDER BY
         CASE WHEN i.status = 'pending' THEN 0 ELSE 1 END,
         i.created_at DESC,
         i.item_id DESC`
    )
    .all(...params);

  res.json({ items });
});

app.patch('/api/admin/items/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const itemId = Number(req.params.id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    res.status(400).json({ error: 'Invalid item ID' });
    return;
  }

  const existing = db.prepare('SELECT * FROM items WHERE item_id = ?').get(itemId) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Item report not found' });
    return;
  }

  const { item_name, category_id, description, report_type, item_date, location, status } = req.body ?? {};
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (typeof item_name === 'string' && item_name.trim().length >= 3) {
    updates.push('item_name = ?');
    params.push(item_name.trim());
  }
  if (category_id !== undefined && Number.isInteger(Number(category_id))) {
    updates.push('category_id = ?');
    params.push(Number(category_id));
  }
  if (typeof description === 'string' && description.trim().length >= 5) {
    updates.push('description = ?');
    params.push(description.trim());
  }
  if (report_type === 'lost' || report_type === 'found') {
    updates.push('report_type = ?');
    params.push(report_type);
  }
  if (typeof item_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item_date)) {
    updates.push('item_date = ?');
    params.push(item_date);
  }
  if (typeof location === 'string' && location.trim().length >= 3) {
    updates.push('location = ?');
    params.push(location.trim());
  }
  if (['pending', 'approved', 'rejected', 'returned'].includes(status)) {
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No valid fields provided to update.' });
    return;
  }

  params.push(itemId);
  db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE item_id = ?`).run(...params);

  const updated = db
    .prepare(
      `SELECT i.*, c.category_name, u.student_name, u.usn, u.email, u.phone
       FROM items i
       JOIN categories c ON i.category_id = c.category_id
       JOIN users u ON i.user_id = u.user_id
       WHERE i.item_id = ?`
    )
    .get(itemId);

  res.json({ item: updated });
});

app.delete('/api/admin/items/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const itemId = Number(req.params.id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    res.status(400).json({ error: 'Invalid item ID' });
    return;
  }

  const info = db.prepare('DELETE FROM items WHERE item_id = ?').run(itemId);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Item report not found' });
    return;
  }
  res.json({ deleted: true });
});

app.get('/api/admin/claims', requireAdmin, (req: AuthedRequest, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const params: string[] = [];
  let where = '';
  if (['pending', 'approved', 'rejected'].includes(status)) {
    where = 'WHERE cl.claim_status = ?';
    params.push(status);
  }

  const claims = db
    .prepare(
      `SELECT
         cl.*,
         claimant.student_name AS claimant_name,
         claimant.usn AS claimant_usn,
         claimant.email AS claimant_email,
         claimant.phone AS claimant_phone,
         i.item_name,
         i.report_type,
         i.location,
         i.item_date,
         i.image,
         i.status AS item_status,
         c.category_name,
         reporter.student_name AS reporter_name,
         reporter.usn AS reporter_usn,
         reporter.email AS reporter_email,
         reporter.phone AS reporter_phone
       FROM claims cl
       JOIN users claimant ON cl.user_id = claimant.user_id
       JOIN items i ON cl.item_id = i.item_id
       JOIN categories c ON i.category_id = c.category_id
       JOIN users reporter ON i.user_id = reporter.user_id
       ${where}
       ORDER BY
         CASE WHEN cl.claim_status = 'pending' THEN 0 ELSE 1 END,
         cl.created_at DESC,
         cl.claim_id DESC`
    )
    .all(...params);

  res.json({ claims });
});

app.patch('/api/admin/claims/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const claimId = Number(req.params.id);
  if (!Number.isInteger(claimId) || claimId <= 0) {
    res.status(400).json({ error: 'Invalid claim ID' });
    return;
  }

  const { action } = req.body ?? {};
  if (!['approve', 'reject', 'mark_returned'].includes(action)) {
    res.status(400).json({ error: 'Invalid claim action. Use approve, reject, or mark_returned.' });
    return;
  }

  const claim = db.prepare('SELECT * FROM claims WHERE claim_id = ?').get(claimId) as
    | { claim_id: number; item_id: number; user_id: number; claim_status: string }
    | undefined;

  if (!claim) {
    res.status(404).json({ error: 'Claim record not found' });
    return;
  }

  const processClaimTx = db.transaction(() => {
    if (action === 'approve') {
      db.prepare("UPDATE claims SET claim_status = 'approved' WHERE claim_id = ?").run(claimId);
      // Reject other competing pending claims for the same item
      db.prepare("UPDATE claims SET claim_status = 'rejected' WHERE item_id = ? AND claim_id != ? AND claim_status = 'pending'").run(
        claim.item_id,
        claimId
      );
    } else if (action === 'reject') {
      db.prepare("UPDATE claims SET claim_status = 'rejected' WHERE claim_id = ?").run(claimId);
    } else if (action === 'mark_returned') {
      db.prepare("UPDATE claims SET claim_status = 'approved' WHERE claim_id = ?").run(claimId);
      db.prepare("UPDATE claims SET claim_status = 'rejected' WHERE item_id = ? AND claim_id != ? AND claim_status = 'pending'").run(
        claim.item_id,
        claimId
      );
      db.prepare("UPDATE items SET status = 'returned' WHERE item_id = ?").run(claim.item_id);
    }
  });

  processClaimTx();
  res.json({ updated: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusFind server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
