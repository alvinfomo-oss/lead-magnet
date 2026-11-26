import type { ApiRequest, ApiResponse } from '../_lib/submissions.js';
import { cleanStr, isSupabaseConfigured } from '../_lib/submissions.js';
import {
  authenticateSupabaseRequest,
  hashPassword,
  isValidRole,
  mapPublicUser,
  normalizeEmail,
  supabaseCreateUser,
  supabaseFindUserByEmail,
  supabaseListUsers,
  type UserRole,
} from '../_lib/auth.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!isSupabaseConfigured()) {
    res.status(500).json({
      error:
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.',
    });
    return;
  }

  try {
    const actor = await authenticateSupabaseRequest(req, res, ['super_admin', 'admin']);
    if (!actor) return;

    if (req.method === 'GET') {
      const users = await supabaseListUsers();
      res.status(200).json({ users: users.map(mapPublicUser) });
      return;
    }

    if (req.method === 'POST') {
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
        string,
        unknown
      >;
      const name = cleanStr(body.name, 120);
      const email = normalizeEmail(body.email);
      const password = cleanStr(body.password, 128);
      const title = cleanStr(body.title, 120);
      const phone = cleanStr(body.phone, 60);
      const requestedRole: UserRole = isValidRole(body.role) ? body.role : 'worker';

      if (!name || !email || !password) {
        res.status(400).json({ error: 'Name, email, and initial password are required.' });
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }

      if (password.length < 4) {
        res.status(400).json({ error: 'Password must be at least 4 characters long.' });
        return;
      }

      if (requestedRole === 'super_admin') {
        res.status(403).json({ error: 'Additional Super Admin accounts cannot be created here.' });
        return;
      }

      if (actor.role === 'admin' && requestedRole !== 'worker') {
        res.status(403).json({
          error: 'Admins can only create Worker accounts. Only Super Admin can manage Admins.',
        });
        return;
      }

      const existing = await supabaseFindUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: 'An account with that email already exists.' });
        return;
      }

      const created = await supabaseCreateUser({
        name,
        email,
        role: requestedRole,
        title,
        phone,
        passwordHash: hashPassword(password),
      });

      res.status(201).json({ user: mapPublicUser(created) });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to manage users.',
    });
  }
}
