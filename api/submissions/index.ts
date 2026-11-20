import type { ApiRequest, ApiResponse } from '../_lib/submissions';
import {
  isSupabaseConfigured,
  mapRow,
  parseSubmissionPayload,
  supabaseCreateSubmission,
  supabaseQuerySubmissions,
} from '../_lib/submissions';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!isSupabaseConfigured()) {
    res.status(500).json({
      error:
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.',
    });
    return;
  }

  try {
    if (req.method === 'GET') {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const rows = await supabaseQuerySubmissions(status, q);
      res.status(200).json({ submissions: rows.map(mapRow) });
      return;
    }

    if (req.method === 'POST') {
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
        string,
        unknown
      >;
      const parsed = parseSubmissionPayload(body);
      if ('error' in parsed) {
        res.status(400).json({ error: parsed.error });
        return;
      }

      const created = await supabaseCreateSubmission(parsed.data);
      res.status(201).json({ submission: mapRow(created) });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected server error.',
    });
  }
}
