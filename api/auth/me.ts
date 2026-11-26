import type { ApiRequest, ApiResponse } from '../_lib/submissions.js';
import { isSupabaseConfigured } from '../_lib/submissions.js';
import { authenticateSupabaseRequest, mapPublicUser } from '../_lib/auth.js';

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
    const user = await authenticateSupabaseRequest(req, res);
    if (!user) return;
    res.status(200).json({ user: mapPublicUser(user) });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to verify session.',
    });
  }
}
