import type { ApiRequest, ApiResponse } from './_lib/submissions';
import { isSupabaseConfigured } from './_lib/submissions';

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  res.status(200).json({
    status: 'ok',
    storage: isSupabaseConfigured() ? 'supabase' : 'unconfigured',
  });
}
