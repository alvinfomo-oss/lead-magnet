import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export interface ApiRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(data: unknown): void;
  send(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export interface DbRow {
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

export const VALID_CHANNEL_STATUSES = new Set(['has_account', 'create_new', 'not_needed']);
export const VALID_WORKFLOW_STATUSES = new Set([
  'Intake Submitted',
  'Partner Access Pending',
  'Ready for Ads',
  'Completed',
]);

const FORBIDDEN_CREDENTIAL_KEYS = ['password', 'pass', 'pwd', 'secret', 'loginpassword'];

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return false;
  if (
    url.includes('YOUR_PROJECT_REF') ||
    key.includes('YOUR_SUPABASE_SERVICE_ROLE_KEY')
  ) {
    return false;
  }
  return true;
}

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      'Invalid SUPABASE_URL format. Use your Project URL from Supabase Settings -> API (https://<project-ref>.supabase.co).',
    );
  }

  if (parsed.pathname && parsed.pathname !== '/') {
    throw new Error(
      'SUPABASE_URL should be the base Project URL (https://<project-ref>.supabase.co) without a dashboard or sub-path.',
    );
  }

  return createClient(parsed.origin, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function cleanStr(val: unknown, maxLen = 250): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

export function normalizeChannelStatus(val: unknown): string {
  const s = cleanStr(val, 32);
  return VALID_CHANNEL_STATUSES.has(s) ? s : 'has_account';
}

export function hasForbiddenCredentialKeys(body: Record<string, unknown>): boolean {
  return Object.keys(body).some((k) =>
    FORBIDDEN_CREDENTIAL_KEYS.some((bad) => k.toLowerCase().includes(bad)),
  );
}

export function generateReferenceCode(seqHint?: number): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10 + Math.random() * 90);
  if (typeof seqHint === 'number') {
    const nextSeq = String(seqHint + 1).padStart(4, '0');
    return `NP-${year}-${nextSeq}-${randomSuffix}`;
  }
  const timeCode = Date.now().toString(36).slice(-4).toUpperCase();
  return `NP-${year}-${timeCode}-${randomSuffix}`;
}

export function mapRow(row: DbRow) {
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

export function parseSubmissionPayload(body: Record<string, unknown>) {
  if (hasForbiddenCredentialKeys(body)) {
    return {
      error:
        'Passwords and login credentials must never be submitted. Provide public handles or Business IDs only.',
    } as const;
  }

  const businessName = cleanStr(body.businessName, 140);
  const contactName = cleanStr(body.contactName, 120);
  const contactEmail = cleanStr(body.contactEmail, 160);
  const contactPhone = cleanStr(body.contactPhone, 60);
  const industry = cleanStr(body.industry, 100);
  const servicePackage = cleanStr(body.servicePackage, 100);

  if (!businessName || !contactName || !contactEmail || !contactPhone || !industry || !servicePackage) {
    return {
      error: 'Please complete all required business and contact fields.',
    } as const;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(contactEmail)) {
    return { error: 'Please enter a valid work email address.' } as const;
  }

  if (contactPhone.replace(/\D/g, '').length < 6) {
    return { error: 'Please enter a valid phone or WhatsApp number.' } as const;
  }

  const facebookStatus = normalizeChannelStatus(body.facebookStatus);
  const facebookAccountName = cleanStr(body.facebookAccountName, 140);
  const facebookPageUrl = cleanStr(body.facebookPageUrl, 240);

  const instagramStatus = normalizeChannelStatus(body.instagramStatus);
  const instagramHandle = cleanStr(body.instagramHandle, 120);
  const instagramCategory = cleanStr(body.instagramCategory, 100);

  const tiktokStatus = normalizeChannelStatus(body.tiktokStatus);
  const tiktokAccountName = cleanStr(body.tiktokAccountName, 140);
  const tiktokHandle = cleanStr(body.tiktokHandle, 120);

  const linkedinStatus = normalizeChannelStatus(body.linkedinStatus);
  const linkedinAccountName = cleanStr(body.linkedinAccountName, 140);
  const linkedinPageUrl = cleanStr(body.linkedinPageUrl, 240);

  if (
    facebookStatus === 'not_needed' &&
    instagramStatus === 'not_needed' &&
    tiktokStatus === 'not_needed' &&
    linkedinStatus === 'not_needed'
  ) {
    return {
      error: 'Please keep at least one social media platform selected for onboarding.',
    } as const;
  }

  if (facebookStatus !== 'not_needed') {
    if (!facebookAccountName) {
      return { error: 'Facebook Account / Page Name is required.' } as const;
    }
    if (facebookStatus === 'has_account' && !facebookPageUrl) {
      return { error: 'Facebook Page URL is required for existing accounts.' } as const;
    }
  }

  if (instagramStatus !== 'not_needed') {
    if (!instagramHandle) {
      return { error: 'Instagram @Handle is required.' } as const;
    }
    if (!instagramCategory) {
      return { error: 'Instagram Business Category is required.' } as const;
    }
  }

  if (tiktokStatus !== 'not_needed') {
    if (!tiktokAccountName) {
      return { error: 'TikTok Account Name is required.' } as const;
    }
    if (!tiktokHandle) {
      return { error: 'TikTok @Handle is required.' } as const;
    }
  }

  if (linkedinStatus !== 'not_needed') {
    if (!linkedinAccountName) {
      return { error: 'LinkedIn Account / Page Name is required.' } as const;
    }
    if (linkedinStatus === 'has_account' && !linkedinPageUrl) {
      return { error: 'LinkedIn Company Page URL is required for existing accounts.' } as const;
    }
  }

  return {
    data: {
      business_name: businessName,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      website_url: cleanStr(body.websiteUrl, 240),
      industry,
      service_package: servicePackage,
      monthly_ad_budget: cleanStr(body.monthlyAdBudget, 80) || 'Not set yet',
      facebook_status: facebookStatus,
      facebook_account_name: facebookAccountName,
      facebook_page_url: facebookStatus === 'create_new' ? '' : facebookPageUrl,
      meta_business_id: cleanStr(body.metaBusinessId, 60),
      instagram_status: instagramStatus,
      instagram_handle: instagramHandle,
      instagram_category: instagramCategory,
      tiktok_status: tiktokStatus,
      tiktok_account_name: tiktokAccountName,
      tiktok_handle: tiktokHandle,
      tiktok_business_center_id: cleanStr(body.tiktokBusinessCenterId, 60),
      linkedin_status: linkedinStatus,
      linkedin_account_name: linkedinAccountName,
      linkedin_page_url: linkedinStatus === 'create_new' ? '' : linkedinPageUrl,
      linkedin_campaign_id: cleanStr(body.linkedinCampaignId, 60),
      notes: cleanStr(body.notes, 1000),
      onboarding_status: 'Intake Submitted',
    },
  } as const;
}

function formatChannelLabel(status: string): string {
  if (status === 'has_account') return 'Has Account (Partner Access)';
  if (status === 'create_new') return 'Create New Page';
  return 'Not Needed';
}

export function buildExportRows(rows: DbRow[]) {
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

export function createXlsxBuffer(rows: DbRow[]): Buffer {
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
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function createCsvString(rows: DbRow[]): string {
  const exportData = buildExportRows(rows);
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  return XLSX.utils.sheet_to_csv(worksheet);
}

export async function supabaseQuerySubmissions(
  statusFilter?: string,
  searchQuery?: string,
): Promise<DbRow[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('client_onboardings')
    .select('*')
    .order('id', { ascending: false });

  if (statusFilter && statusFilter !== 'All' && VALID_WORKFLOW_STATUSES.has(statusFilter)) {
    query = query.eq('onboarding_status', statusFilter);
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    const safeQ = searchQuery.trim().replace(/[,%()]/g, '');
    if (safeQ) {
      query = query.or(
        [
          `business_name.ilike.%${safeQ}%`,
          `contact_name.ilike.%${safeQ}%`,
          `contact_email.ilike.%${safeQ}%`,
          `reference_code.ilike.%${safeQ}%`,
          `facebook_account_name.ilike.%${safeQ}%`,
          `instagram_handle.ilike.%${safeQ}%`,
          `tiktok_handle.ilike.%${safeQ}%`,
          `linkedin_account_name.ilike.%${safeQ}%`,
        ].join(','),
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DbRow[];
}

export async function supabaseCreateSubmission(
  payload: ReturnType<typeof parseSubmissionPayload> extends infer R
    ? R extends { data: infer D }
      ? D
      : never
    : never,
): Promise<DbRow> {
  const supabase = getSupabaseClient();
  const reference_code = generateReferenceCode();
  const { data, error } = await supabase
    .from('client_onboardings')
    .insert({
      reference_code,
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as DbRow;
}

export async function supabaseUpdateSubmission(
  id: number,
  updates: { onboardingStatus?: unknown; notes?: unknown },
): Promise<DbRow | null> {
  const supabase = getSupabaseClient();
  const { data: existing, error: fetchErr } = await supabase
    .from('client_onboardings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!existing) return null;

  const row = existing as DbRow;
  const nextStatus =
    typeof updates.onboardingStatus === 'string' &&
    VALID_WORKFLOW_STATUSES.has(updates.onboardingStatus)
      ? updates.onboardingStatus
      : row.onboarding_status;
  const nextNotes =
    typeof updates.notes === 'string' ? cleanStr(updates.notes, 1000) : row.notes;

  const { data: updated, error: updateErr } = await supabase
    .from('client_onboardings')
    .update({
      onboarding_status: nextStatus,
      notes: nextNotes,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateErr) throw new Error(updateErr.message);
  return updated as DbRow;
}

export async function supabaseDeleteSubmission(id: number): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('client_onboardings')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}
