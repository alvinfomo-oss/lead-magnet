import type { ApiRequest, ApiResponse } from '../_lib/submissions.js';
import { cleanStr, isSupabaseConfigured } from '../_lib/submissions.js';
import {
  createSessionToken,
  isValidRole,
  mapPublicUser,
  normalizeEmail,
  supabaseFindUserByEmail,
  verifyPassword,
} from '../_lib/auth.js';

const ROLE_DISPLAY: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  worker: 'Worker',
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const email = normalizeEmail(body.email);
    const password = cleanStr(body.password, 128);
    const expectedRole = body.role;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    if (!isValidRole(expectedRole)) {
      res.status(400).json({ error: 'Please select a valid role (Super Admin, Admin, or Worker).' });
      return;
    }

    const user = await supabaseFindUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.role !== expectedRole) {
      res.status(403).json({
        error: `This account is assigned the ${ROLE_DISPLAY[user.role]} role, not ${ROLE_DISPLAY[expectedRole]}.`,
      });
      return;
    }

    const token = createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      token,
      user: mapPublicUser(user),
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to sign in.',
    });
  }
}
