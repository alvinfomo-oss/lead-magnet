import type { ApiRequest, ApiResponse } from '../_lib/submissions.js';
import { cleanStr, isSupabaseConfigured } from '../_lib/submissions.js';
import {
  authenticateSupabaseRequest,
  mapPublicUser,
  normalizeEmail,
  supabaseFindUserByEmail,
  supabaseUpdateUserProfile,
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

    if (email !== user.email.toLowerCase()) {
      const collision = await supabaseFindUserByEmail(email);
      if (collision && collision.id !== user.id) {
        res.status(409).json({ error: 'Another team account already uses that email address.' });
        return;
      }
    }

    const updated = await supabaseUpdateUserProfile(user.id, {
      name,
      email,
      title,
      phone,
    });

    if (!updated) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    res.status(200).json({ user: mapPublicUser(updated) });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to update profile.',
    });
  }
}
