import type { ApiRequest, ApiResponse } from '../_lib/submissions.js';
import { cleanStr, isSupabaseConfigured } from '../_lib/submissions.js';
import {
  authenticateSupabaseRequest,
  hashPassword,
  supabaseUpdateUserPassword,
  verifyPassword,
} from '../_lib/auth.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
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

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
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

    const updated = await supabaseUpdateUserPassword(user.id, hashPassword(newPassword));
    if (!updated) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    res.status(200).json({ updated: true });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to update password.',
    });
  }
}
