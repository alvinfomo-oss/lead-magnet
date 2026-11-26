import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import {
  cleanStr,
  createCsvString,
  createXlsxBuffer,
  type DbRow,
  generateReferenceCode,
  isSupabaseConfigured,
  mapRow,
  parseSubmissionPayload,
  supabaseCreateSubmission,
  supabaseDeleteSubmission,
  supabaseQuerySubmissions,
  supabaseUpdateSubmission,
  VALID_WORKFLOW_STATUSES,
} from './api/_lib/submissions.js';
import {
  authenticateSupabaseRequest,
  buildSeedUserRecords,
  createSessionToken,
  extractBearerToken,
  hashPassword,
  isValidRole,
  mapPublicUser,
  normalizeEmail,
  supabaseCreateUser,
  supabaseDeleteUser,
  supabaseFindUserByEmail,
  supabaseFindUserById,
  supabaseListUsers,
  supabaseUpdateUserPassword,
  supabaseUpdateUserProfile,
  supabaseUpdateUserRole,
  type UserDbRow,
  type UserRole,
  verifyPassword,
  verifySessionToken,
} from './api/_lib/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = path.resolve(__dirname, 'netpub.db');

let sqliteDb: Database.Database | null = null;

function getSqliteDb(): Database.Database {
  if (sqliteDb) return sqliteDb;
  sqliteDb = new Database(DB_PATH);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS client_onboardings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_code TEXT NOT NULL UNIQUE,
      business_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      website_url TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL,
      service_package TEXT NOT NULL,
      monthly_ad_budget TEXT NOT NULL DEFAULT 'Not set yet',
      facebook_status TEXT NOT NULL DEFAULT 'has_account',
      facebook_account_name TEXT NOT NULL DEFAULT '',
      facebook_page_url TEXT NOT NULL DEFAULT '',
      meta_business_id TEXT NOT NULL DEFAULT '',
      instagram_status TEXT NOT NULL DEFAULT 'has_account',
      instagram_handle TEXT NOT NULL DEFAULT '',
      instagram_category TEXT NOT NULL DEFAULT '',
      tiktok_status TEXT NOT NULL DEFAULT 'has_account',
      tiktok_account_name TEXT NOT NULL DEFAULT '',
      tiktok_handle TEXT NOT NULL DEFAULT '',
      tiktok_business_center_id TEXT NOT NULL DEFAULT '',
      linkedin_status TEXT NOT NULL DEFAULT 'has_account',
      linkedin_account_name TEXT NOT NULL DEFAULT '',
      linkedin_page_url TEXT NOT NULL DEFAULT '',
      linkedin_campaign_id TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      onboarding_status TEXT NOT NULL DEFAULT 'Intake Submitted',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agency_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'worker')),
      title TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const countRow = sqliteDb
    .prepare('SELECT COUNT(*) AS count FROM agency_users')
    .get() as { count: number };

  if (countRow.count === 0) {
    const insertUser = sqliteDb.prepare(`
      INSERT OR IGNORE INTO agency_users (name, email, role, title, phone, password_hash, created_at)
      VALUES (@name, @email, @role, @title, @phone, @password_hash, @created_at)
    `);
    const now = new Date().toISOString();
    const tx = sqliteDb.transaction(() => {
      for (const seed of buildSeedUserRecords()) {
        insertUser.run({ ...seed, created_at: now });
      }
    });
    tx();
  }

  return sqliteDb;
}

function sqliteQuerySubmissions(statusFilter?: string, searchQuery?: string): DbRow[] {
  const db = getSqliteDb();
  const clauses: string[] = [];
  const params: string[] = [];

  if (statusFilter && statusFilter !== 'All' && VALID_WORKFLOW_STATUSES.has(statusFilter)) {
    clauses.push('onboarding_status = ?');
    params.push(statusFilter);
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    const q = `%${searchQuery.trim().toLowerCase()}%`;
    clauses.push(`(
      LOWER(business_name) LIKE ? OR
      LOWER(contact_name) LIKE ? OR
      LOWER(contact_email) LIKE ? OR
      LOWER(reference_code) LIKE ? OR
      LOWER(facebook_account_name) LIKE ? OR
      LOWER(instagram_handle) LIKE ? OR
      LOWER(tiktok_handle) LIKE ? OR
      LOWER(linkedin_account_name) LIKE ?
    )`);
    params.push(q, q, q, q, q, q, q, q);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return db
    .prepare(`SELECT * FROM client_onboardings ${where} ORDER BY id DESC`)
    .all(...params) as DbRow[];
}

async function requireAuth(
  req: Request,
  res: Response,
  allowedRoles?: UserRole[],
): Promise<UserDbRow | null> {
  if (isSupabaseConfigured()) {
    return authenticateSupabaseRequest(
      {
        method: req.method,
        query: req.query as Record<string, string | string[] | undefined>,
        headers: req.headers as Record<string, string | string[] | undefined>,
        body: req.body,
      },
      res,
      allowedRoles,
    );
  }

  const token = extractBearerToken({
    method: req.method,
    query: req.query as Record<string, string | string[] | undefined>,
    headers: req.headers as Record<string, string | string[] | undefined>,
  });
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return null;
  }

  const claims = verifySessionToken(token);
  if (!claims) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return null;
  }

  const db = getSqliteDb();
  const user = db
    .prepare('SELECT * FROM agency_users WHERE id = ?')
    .get(claims.sub) as UserDbRow | undefined;

  if (!user) {
    res.status(401).json({ error: 'User account no longer exists.' });
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    res.status(403).json({ error: 'You do not have permission for this action.' });
    return null;
  }

  return user;
}

const ROLE_DISPLAY: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  worker: 'Worker',
};

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    storage: isSupabaseConfigured() ? 'supabase' : 'sqlite-local',
  });
});

// Authentication & Profile Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const email = normalizeEmail(body.email);
    const password = cleanStr(body.password, 128);
    const expectedRole = body.role;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    if (!isValidRole(expectedRole)) {
      res.status(400).json({ error: 'Please select a valid role (Super Admin, Admin, or Worker).' });
      return;
    }

    let user: UserDbRow | null = null;
    if (isSupabaseConfigured()) {
      user = await supabaseFindUserByEmail(email);
    } else {
      const db = getSqliteDb();
      user =
        (db
          .prepare('SELECT * FROM agency_users WHERE email = ?')
          .get(email) as UserDbRow | undefined) ?? null;
    }

    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.role !== expectedRole) {
      res.status(403).json({
        error: `This account is assigned the ${ROLE_DISPLAY[user.role]} role, not ${ROLE_DISPLAY[expectedRole]}.`,
      });
      return;
    }

    const token = createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({ token, user: mapPublicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to sign in.' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;
    res.json({ user: mapPublicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to verify session.' });
  }
});

app.patch('/api/auth/profile', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = cleanStr(body.name, 120);
    const email = normalizeEmail(body.email);
    const title = cleanStr(body.title, 120);
    const phone = cleanStr(body.phone, 60);

    if (!name || !email) {
      res.status(400).json({ error: 'Full name and email are required.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (isSupabaseConfigured()) {
      if (email !== user.email.toLowerCase()) {
        const collision = await supabaseFindUserByEmail(email);
        if (collision && collision.id !== user.id) {
          res.status(409).json({ error: 'Another team account already uses that email address.' });
          return;
        }
      }
      const updated = await supabaseUpdateUserProfile(user.id, { name, email, title, phone });
      if (!updated) {
        res.status(404).json({ error: 'User profile not found.' });
        return;
      }
      res.json({ user: mapPublicUser(updated) });
      return;
    }

    const db = getSqliteDb();
    if (email !== user.email.toLowerCase()) {
      const collision = db
        .prepare('SELECT id FROM agency_users WHERE email = ? AND id != ?')
        .get(email, user.id) as { id: number } | undefined;
      if (collision) {
        res.status(409).json({ error: 'Another team account already uses that email address.' });
        return;
      }
    }

    db.prepare(
      'UPDATE agency_users SET name = ?, email = ?, title = ?, phone = ? WHERE id = ?',
    ).run(name, email, title, phone, user.id);

    const updated = db
      .prepare('SELECT * FROM agency_users WHERE id = ?')
      .get(user.id) as UserDbRow;
    res.json({ user: mapPublicUser(updated) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to update profile.' });
  }
});

app.patch('/api/auth/password', async (req, res) => {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const body = (req.body ?? {}) as Record<string, unknown>;
    const currentPassword = cleanStr(body.currentPassword, 128);
    const newPassword = cleanStr(body.newPassword, 128);

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 4) {
      res.status(400).json({ error: 'New password must be at least 4 characters long.' });
      return;
    }

    if (!verifyPassword(currentPassword, user.password_hash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    const nextHash = hashPassword(newPassword);
    if (isSupabaseConfigured()) {
      await supabaseUpdateUserPassword(user.id, nextHash);
    } else {
      const db = getSqliteDb();
      db.prepare('UPDATE agency_users SET password_hash = ? WHERE id = ?').run(nextHash, user.id);
    }

    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to update password.' });
  }
});

// User & Admin Management Routes (Super Admin & Admin only)
app.get('/api/users', async (req, res) => {
  try {
    const actor = await requireAuth(req, res, ['super_admin', 'admin']);
    if (!actor) return;

    if (isSupabaseConfigured()) {
      const users = await supabaseListUsers();
      res.json({ users: users.map(mapPublicUser) });
      return;
    }

    const db = getSqliteDb();
    const users = db
      .prepare('SELECT * FROM agency_users ORDER BY id ASC')
      .all() as UserDbRow[];
    res.json({ users: users.map(mapPublicUser) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to load users.' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const actor = await requireAuth(req, res, ['super_admin', 'admin']);
    if (!actor) return;

    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = cleanStr(body.name, 120);
    const email = normalizeEmail(body.email);
    const password = cleanStr(body.password, 128);
    const title = cleanStr(body.title, 120);
    const phone = cleanStr(body.phone, 60);
    const requestedRole: UserRole = isValidRole(body.role) ? body.role : 'worker';

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and initial password are required.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters long.' });
      return;
    }

    if (requestedRole === 'super_admin') {
      res.status(403).json({ error: 'Additional Super Admin accounts cannot be created here.' });
      return;
    }

    if (actor.role === 'admin' && requestedRole !== 'worker') {
      res.status(403).json({
        error: 'Admins can only create Worker accounts. Only Super Admin can manage Admins.',
      });
      return;
    }

    const passwordHash = hashPassword(password);
    if (isSupabaseConfigured()) {
      const existing = await supabaseFindUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'An account with that email already exists.' });
        return;
      }
      const created = await supabaseCreateUser({
        name,
        email,
        role: requestedRole,
        title,
        phone,
        passwordHash,
      });
      res.status(201).json({ user: mapPublicUser(created) });
      return;
    }

    const db = getSqliteDb();
    const existing = db
      .prepare('SELECT id FROM agency_users WHERE email = ?')
      .get(email) as { id: number } | undefined;
    if (existing) {
      res.status(409).json({ error: 'An account with that email already exists.' });
      return;
    }

    const info = db
      .prepare(
        `INSERT INTO agency_users (name, email, role, title, phone, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(name, email, requestedRole, title, phone, passwordHash, new Date().toISOString());

    const created = db
      .prepare('SELECT * FROM agency_users WHERE id = ?')
      .get(info.lastInsertRowid) as UserDbRow;

    res.status(201).json({ user: mapPublicUser(created) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to create user.' });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const actor = await requireAuth(req, res, ['super_admin', 'admin']);
    if (!actor) return;

    if (actor.role !== 'super_admin') {
      res.status(403).json({
        error: 'Only the Super Admin can promote Workers to Admin or demote Admins to Worker.',
      });
      return;
    }

    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      res.status(400).json({ error: 'Invalid user ID.' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const nextRole = body.role;
    if (nextRole !== 'admin' && nextRole !== 'worker') {
      res.status(400).json({ error: 'Role must be either admin or worker.' });
      return;
    }

    if (isSupabaseConfigured()) {
      const target = await supabaseFindUserById(targetId);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      if (target.id === actor.id || target.role === 'super_admin') {
        res.status(400).json({ error: 'Super Admin role cannot be changed.' });
        return;
      }
      const updated = await supabaseUpdateUserRole(targetId, nextRole);
      res.json({ user: mapPublicUser(updated!) });
      return;
    }

    const db = getSqliteDb();
    const target = db
      .prepare('SELECT * FROM agency_users WHERE id = ?')
      .get(targetId) as UserDbRow | undefined;
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (target.id === actor.id || target.role === 'super_admin') {
      res.status(400).json({ error: 'Super Admin role cannot be changed.' });
      return;
    }

    db.prepare('UPDATE agency_users SET role = ? WHERE id = ?').run(nextRole, targetId);
    const updated = db
      .prepare('SELECT * FROM agency_users WHERE id = ?')
      .get(targetId) as UserDbRow;
    res.json({ user: mapPublicUser(updated) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to update role.' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const actor = await requireAuth(req, res, ['super_admin', 'admin']);
    if (!actor) return;

    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      res.status(400).json({ error: 'Invalid user ID.' });
      return;
    }

    if (isSupabaseConfigured()) {
      const target = await supabaseFindUserById(targetId);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      if (target.id === actor.id || target.role === 'super_admin') {
        res.status(403).json({ error: 'Super Admin accounts cannot be deleted.' });
        return;
      }
      if (actor.role === 'admin' && target.role !== 'worker') {
        res.status(403).json({
          error: 'Admins can only delete Worker accounts. Only Super Admin can manage Admins.',
        });
        return;
      }
      await supabaseDeleteUser(targetId);
      res.json({ deleted: true });
      return;
    }

    const db = getSqliteDb();
    const target = db
      .prepare('SELECT * FROM agency_users WHERE id = ?')
      .get(targetId) as UserDbRow | undefined;
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (target.id === actor.id || target.role === 'super_admin') {
      res.status(403).json({ error: 'Super Admin accounts cannot be deleted.' });
      return;
    }
    if (actor.role === 'admin' && target.role !== 'worker') {
      res.status(403).json({
        error: 'Admins can only delete Worker accounts. Only Super Admin can manage Admins.',
      });
      return;
    }

    db.prepare('DELETE FROM agency_users WHERE id = ?').run(targetId);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to delete user.' });
  }
});

// Client Onboarding Submissions Routes (POST is public for client intake; GET/PATCH/DELETE/Export require auth)
app.get('/api/submissions', async (req, res) => {
  try {
    const actor = await requireAuth(req, res, ['super_admin', 'admin', 'worker']);
    if (!actor) return;

    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const rows = isSupabaseConfigured()
      ? await supabaseQuerySubmissions(status, q)
      : sqliteQuerySubmissions(status, q);
    res.json({ submissions: rows.map(mapRow) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load submissions.' });
  }
});

app.post('/api/submissions', async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const parsed = parseSubmissionPayload(body);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    if (isSupabaseConfigured()) {
      const created = await supabaseCreateSubmission(parsed.data);
      res.status(201).json({ submission: mapRow(created) });
      return;
    }

    const db = getSqliteDb();
    const row = db
      .prepare('SELECT COALESCE(MAX(id), 0) AS maxId FROM client_onboardings')
      .get() as { maxId: number };
    const referenceCode = generateReferenceCode(row.maxId);
    const createdAt = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO client_onboardings (
        reference_code, business_name, contact_name, contact_email, contact_phone,
        website_url, industry, service_package, monthly_ad_budget,
        facebook_status, facebook_account_name, facebook_page_url, meta_business_id,
        instagram_status, instagram_handle, instagram_category,
        tiktok_status, tiktok_account_name, tiktok_handle, tiktok_business_center_id,
        linkedin_status, linkedin_account_name, linkedin_page_url, linkedin_campaign_id,
        notes, onboarding_status, created_at
      ) VALUES (
        @reference_code, @business_name, @contact_name, @contact_email, @contact_phone,
        @website_url, @industry, @service_package, @monthly_ad_budget,
        @facebook_status, @facebook_account_name, @facebook_page_url, @meta_business_id,
        @instagram_status, @instagram_handle, @instagram_category,
        @tiktok_status, @tiktok_account_name, @tiktok_handle, @tiktok_business_center_id,
        @linkedin_status, @linkedin_account_name, @linkedin_page_url, @linkedin_campaign_id,
        @notes, @onboarding_status, @created_at
      )
    `);

    const info = insert.run({
      reference_code: referenceCode,
      ...parsed.data,
      created_at: createdAt,
    });

    const created = db
      .prepare('SELECT * FROM client_onboardings WHERE id = ?')
      .get(info.lastInsertRowid) as DbRow;

    res.status(201).json({ submission: mapRow(created) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create submission.' });
  }
});

app.patch('/api/submissions/:id', async (req, res) => {
  try {
    const actor = await requireAuth(req, res, ['super_admin', 'admin', 'worker']);
    if (!actor) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid submission ID.' });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (isSupabaseConfigured()) {
      const updated = await supabaseUpdateSubmission(id, {
        onboardingStatus: body.onboardingStatus,
        notes: body.notes,
      });
      if (!updated) {
        res.status(404).json({ error: 'Submission not found.' });
        return;
      }
      res.json({ submission: mapRow(updated) });
      return;
    }

    const db = getSqliteDb();
    const existing = db
      .prepare('SELECT * FROM client_onboardings WHERE id = ?')
      .get(id) as DbRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }

    const nextStatus =
      typeof body.onboardingStatus === 'string' && VALID_WORKFLOW_STATUSES.has(body.onboardingStatus)
        ? body.onboardingStatus
        : existing.onboarding_status;
    const nextNotes =
      typeof body.notes === 'string' ? cleanStr(body.notes, 1000) : existing.notes;

    db.prepare('UPDATE client_onboardings SET onboarding_status = ?, notes = ? WHERE id = ?').run(
      nextStatus,
      nextNotes,
      id,
    );

    const updated = db
      .prepare('SELECT * FROM client_onboardings WHERE id = ?')
      .get(id) as DbRow;

    res.json({ submission: mapRow(updated) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update submission.' });
  }
});

app.delete('/api/submissions/:id', async (req, res) => {
  try {
    const actor = await requireAuth(req, res, ['super_admin', 'admin']);
    if (!actor) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid submission ID.' });
      return;
    }

    if (isSupabaseConfigured()) {
      const deleted = await supabaseDeleteSubmission(id);
      if (!deleted) {
        res.status(404).json({ error: 'Submission not found.' });
        return;
      }
      res.json({ deleted: true });
      return;
    }

    const db = getSqliteDb();
    const result = db.prepare('DELETE FROM client_onboardings WHERE id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete submission.' });
  }
});

app.get('/api/submissions/export.xlsx', async (req, res) => {
  try {
    const actor = await requireAuth(req, res, ['super_admin', 'admin', 'worker']);
    if (!actor) return;

    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const rows = isSupabaseConfigured()
      ? await supabaseQuerySubmissions(status, q)
      : sqliteQuerySubmissions(status, q);
    const buffer = createXlsxBuffer(rows);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="netpub-client-onboarding.xlsx"',
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to export Excel.' });
  }
});

app.get('/api/submissions/export.csv', async (req, res) => {
  try {
    const actor = await requireAuth(req, res, ['super_admin', 'admin', 'worker']);
    if (!actor) return;

    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const rows = isSupabaseConfigured()
      ? await supabaseQuerySubmissions(status, q)
      : sqliteQuerySubmissions(status, q);
    const csv = createCsvString(rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="netpub-client-onboarding.csv"',
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to export CSV.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const storageMode = isSupabaseConfigured() ? 'Supabase' : 'SQLite local fallback';
    console.log(`Netpub onboarding server listening on http://0.0.0.0:${PORT} (${storageMode})`);
  });
}

startServer();
