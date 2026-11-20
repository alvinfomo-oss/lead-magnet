import type { ApiRequest, ApiResponse } from '../_lib/submissions.js';
import {
  createCsvString,
  createXlsxBuffer,
  isSupabaseConfigured,
  supabaseQuerySubmissions,
} from '../_lib/submissions.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!isSupabaseConfigured()) {
    res.status(500).json({
      error:
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.',
    });
    return;
  }

  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const format = typeof req.query.format === 'string' ? req.query.format : 'xlsx';
    const rows = await supabaseQuerySubmissions(status, q);

    if (format === 'csv') {
      const csv = createCsvString(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="netpub-client-onboarding.csv"',
      );
      res.status(200).send(csv);
      return;
    }

    const buffer = createXlsxBuffer(rows);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="netpub-client-onboarding.xlsx"',
    );
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected server error.',
    });
  }
}
