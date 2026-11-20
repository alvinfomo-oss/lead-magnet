import 'dotenv/config';
import express from 'express';
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
    )
  `);
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

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    storage: isSupabaseConfigured() ? 'supabase' : 'sqlite-local',
  });
});

app.get('/api/submissions', async (req, res) => {
  try {
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
