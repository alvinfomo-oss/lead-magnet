import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = path.resolve(__dirname, 'netpub.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
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

interface DbRow {
  id: number;
  reference_code: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  industry: string;
  service_package: string;
  monthly_ad_budget: string;
  facebook_status: string;
  facebook_account_name: string;
  facebook_page_url: string;
  meta_business_id: string;
  instagram_status: string;
  instagram_handle: string;
  instagram_category: string;
  tiktok_status: string;
  tiktok_account_name: string;
  tiktok_handle: string;
  tiktok_business_center_id: string;
  linkedin_status: string;
  linkedin_account_name: string;
  linkedin_page_url: string;
  linkedin_campaign_id: string;
  notes: string;
  onboarding_status: string;
  created_at: string;
}

function mapRow(row: DbRow) {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    businessName: row.business_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    websiteUrl: row.website_url,
    industry: row.industry,
    servicePackage: row.service_package,
    monthlyAdBudget: row.monthly_ad_budget,
    facebookStatus: row.facebook_status,
    facebookAccountName: row.facebook_account_name,
    facebookPageUrl: row.facebook_page_url,
    metaBusinessId: row.meta_business_id,
    instagramStatus: row.instagram_status,
    instagramHandle: row.instagram_handle,
    instagramCategory: row.instagram_category,
    tiktokStatus: row.tiktok_status,
    tiktokAccountName: row.tiktok_account_name,
    tiktokHandle: row.tiktok_handle,
    tiktokBusinessCenterId: row.tiktok_business_center_id,
    linkedinStatus: row.linkedin_status,
    linkedinAccountName: row.linkedin_account_name,
    linkedinPageUrl: row.linkedin_page_url,
    linkedinCampaignId: row.linkedin_campaign_id,
    notes: row.notes,
    onboardingStatus: row.onboarding_status,
    createdAt: row.created_at,
  };
}

function cleanStr(val: unknown, maxLen = 250): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

const VALID_CHANNEL_STATUSES = new Set(['has_account', 'create_new', 'not_needed']);
const VALID_WORKFLOW_STATUSES = new Set([
  'Intake Submitted',
  'Partner Access Pending',
  'Ready for Ads',
  'Completed',
]);

function normalizeChannelStatus(val: unknown): string {
  const s = cleanStr(val, 32);
  return VALID_CHANNEL_STATUSES.has(s) ? s : 'has_account';
}

function formatChannelLabel(status: string): string {
  if (status === 'has_account') return 'Has Account (Partner Access)';
  if (status === 'create_new') return 'Create New Page';
  return 'Not Needed';
}

const FORBIDDEN_CREDENTIAL_KEYS = ['password', 'pass', 'pwd', 'secret', 'loginpassword'];

function hasForbiddenCredentialKeys(body: Record<string, unknown>): boolean {
  return Object.keys(body).some((k) =>
    FORBIDDEN_CREDENTIAL_KEYS.some((bad) => k.toLowerCase().includes(bad)),
  );
}

function generateReferenceCode(): string {
  const year = new Date().getFullYear();
  const row = db
    .prepare('SELECT COALESCE(MAX(id), 0) AS maxId FROM client_onboardings')
    .get() as { maxId: number };
  const nextSeq = String(row.maxId + 1).padStart(4, '0');
  const randomSuffix = Math.floor(10 + Math.random() * 90);
  return `NP-${year}-${nextSeq}-${randomSuffix}`;
}

function querySubmissions(statusFilter?: string, searchQuery?: string): DbRow[] {
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

function buildExportRows(rows: DbRow[]) {
  return rows.map((r) => ({
    'Reference Code': r.reference_code,
    'Submitted At': new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' '),
    'Onboarding Status': r.onboarding_status,
    'Business Name': r.business_name,
    'Contact Name': r.contact_name,
    'Contact Email': r.contact_email,
    'Contact Phone': r.contact_phone,
    'Website URL': r.website_url,
    'Industry': r.industry,
    'Service Package': r.service_package,
    'Monthly Ad Budget': r.monthly_ad_budget,
    'Facebook Status': formatChannelLabel(r.facebook_status),
    'Facebook Account / Page Name': r.facebook_account_name,
    'Facebook Page URL': r.facebook_page_url,
    'Meta Business Portfolio ID': r.meta_business_id,
    'Instagram Status': formatChannelLabel(r.instagram_status),
    'Instagram Handle': r.instagram_handle,
    'Instagram Category': r.instagram_category,
    'TikTok Status': formatChannelLabel(r.tiktok_status),
    'TikTok Account Name': r.tiktok_account_name,
    'TikTok Handle': r.tiktok_handle,
    'TikTok Business Center ID': r.tiktok_business_center_id,
    'LinkedIn Status': formatChannelLabel(r.linkedin_status),
    'LinkedIn Account / Page Name': r.linkedin_account_name,
    'LinkedIn Page URL': r.linkedin_page_url,
    'LinkedIn Campaign Manager ID': r.linkedin_campaign_id,
    'Campaign Notes': r.notes,
  }));
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/submissions', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const rows = querySubmissions(status, q);
  res.json({ submissions: rows.map(mapRow) });
});

app.post('/api/submissions', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (hasForbiddenCredentialKeys(body)) {
    res.status(400).json({
      error: 'Passwords and login credentials must never be submitted. Provide public handles or Business IDs only.',
    });
    return;
  }

  const businessName = cleanStr(body.businessName, 140);
  const contactName = cleanStr(body.contactName, 120);
  const contactEmail = cleanStr(body.contactEmail, 160);
  const contactPhone = cleanStr(body.contactPhone, 60);
  const industry = cleanStr(body.industry, 100);
  const servicePackage = cleanStr(body.servicePackage, 100);

  if (!businessName || !contactName || !contactEmail || !contactPhone || !industry || !servicePackage) {
    res.status(400).json({
      error: 'Please complete all required business and contact fields.',
    });
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(contactEmail)) {
    res.status(400).json({ error: 'Please enter a valid work email address.' });
    return;
  }

  const referenceCode = generateReferenceCode();
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
      @referenceCode, @businessName, @contactName, @contactEmail, @contactPhone,
      @websiteUrl, @industry, @servicePackage, @monthlyAdBudget,
      @facebookStatus, @facebookAccountName, @facebookPageUrl, @metaBusinessId,
      @instagramStatus, @instagramHandle, @instagramCategory,
      @tiktokStatus, @tiktokAccountName, @tiktokHandle, @tiktokBusinessCenterId,
      @linkedinStatus, @linkedinAccountName, @linkedinPageUrl, @linkedinCampaignId,
      @notes, @onboardingStatus, @createdAt
    )
  `);

  const info = insert.run({
    referenceCode,
    businessName,
    contactName,
    contactEmail,
    contactPhone,
    websiteUrl: cleanStr(body.websiteUrl, 240),
    industry,
    servicePackage,
    monthlyAdBudget: cleanStr(body.monthlyAdBudget, 80) || 'Not set yet',
    facebookStatus: normalizeChannelStatus(body.facebookStatus),
    facebookAccountName: cleanStr(body.facebookAccountName, 140),
    facebookPageUrl: cleanStr(body.facebookPageUrl, 240),
    metaBusinessId: cleanStr(body.metaBusinessId, 60),
    instagramStatus: normalizeChannelStatus(body.instagramStatus),
    instagramHandle: cleanStr(body.instagramHandle, 120),
    instagramCategory: cleanStr(body.instagramCategory, 100),
    tiktokStatus: normalizeChannelStatus(body.tiktokStatus),
    tiktokAccountName: cleanStr(body.tiktokAccountName, 140),
    tiktokHandle: cleanStr(body.tiktokHandle, 120),
    tiktokBusinessCenterId: cleanStr(body.tiktokBusinessCenterId, 60),
    linkedinStatus: normalizeChannelStatus(body.linkedinStatus),
    linkedinAccountName: cleanStr(body.linkedinAccountName, 140),
    linkedinPageUrl: cleanStr(body.linkedinPageUrl, 240),
    linkedinCampaignId: cleanStr(body.linkedinCampaignId, 60),
    notes: cleanStr(body.notes, 1000),
    onboardingStatus: 'Intake Submitted',
    createdAt,
  });

  const created = db
    .prepare('SELECT * FROM client_onboardings WHERE id = ?')
    .get(info.lastInsertRowid) as DbRow;

  res.status(201).json({ submission: mapRow(created) });
});

app.patch('/api/submissions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid submission ID.' });
    return;
  }

  const existing = db
    .prepare('SELECT * FROM client_onboardings WHERE id = ?')
    .get(id) as DbRow | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
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
});

app.delete('/api/submissions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid submission ID.' });
    return;
  }

  const result = db.prepare('DELETE FROM client_onboardings WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }
  res.json({ deleted: true });
});

app.get('/api/submissions/export.xlsx', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const rows = querySubmissions(status, q);
  const exportData = buildExportRows(rows);

  const worksheet = XLSX.utils.json_to_sheet(
    exportData.length > 0
      ? exportData
      : [
          {
            'Reference Code': '',
            'Submitted At': '',
            'Onboarding Status': '',
            'Business Name': '',
            'Contact Name': '',
            'Contact Email': '',
            'Contact Phone': '',
            'Website URL': '',
            'Industry': '',
            'Service Package': '',
            'Monthly Ad Budget': '',
            'Facebook Status': '',
            'Facebook Account / Page Name': '',
            'Facebook Page URL': '',
            'Meta Business Portfolio ID': '',
            'Instagram Status': '',
            'Instagram Handle': '',
            'Instagram Category': '',
            'TikTok Status': '',
            'TikTok Account Name': '',
            'TikTok Handle': '',
            'TikTok Business Center ID': '',
            'LinkedIn Status': '',
            'LinkedIn Account / Page Name': '',
            'LinkedIn Page URL': '',
            'LinkedIn Campaign Manager ID': '',
            'Campaign Notes': '',
          },
        ],
  );

  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 20 },
    { wch: 26 },
    { wch: 18 },
    { wch: 26 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 26 },
    { wch: 24 },
    { wch: 28 },
    { wch: 22 },
    { wch: 26 },
    { wch: 20 },
    { wch: 20 },
    { wch: 26 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
    { wch: 26 },
    { wch: 24 },
    { wch: 28 },
    { wch: 24 },
    { wch: 36 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Client Onboarding');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="netpub-client-onboarding.xlsx"',
  );
  res.send(buffer);
});

app.get('/api/submissions/export.csv', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const rows = querySubmissions(status, q);
  const exportData = buildExportRows(rows);

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="netpub-client-onboarding.csv"',
  );
  res.send(csv);
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
    console.log(`Netpub onboarding server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
