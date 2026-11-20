import type { ApiRequest, ApiResponse } from '../_lib/submissions.js';
import {
  isSupabaseConfigured,
  mapRow,
  supabaseDeleteSubmission,
  supabaseUpdateSubmission,
} from '../_lib/submissions.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!isSupabaseConfigured()) {
    res.status(500).json({
      error:
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.',
    });
    return;
  }

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid submission ID.' });
    return;
  }

  try {
    if (req.method === 'PATCH') {
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
        string,
        unknown
      >;
      const updated = await supabaseUpdateSubmission(id, {
        onboardingStatus: body.onboardingStatus,
        notes: body.notes,
      });

      if (!updated) {
        res.status(404).json({ error: 'Submission not found.' });
        return;
      }

      res.status(200).json({ submission: mapRow(updated) });
      return;
    }

    if (req.method === 'DELETE') {
      const deleted = await supabaseDeleteSubmission(id);
      if (!deleted) {
        res.status(404).json({ error: 'Submission not found.' });
        return;
      }
      res.status(200).json({ deleted: true });
      return;
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unexpected server error.',
    });
  }
}
