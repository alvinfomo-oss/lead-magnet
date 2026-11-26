import type { ApiRequest, ApiResponse } from '../_lib/submissions.js';
import { isSupabaseConfigured } from '../_lib/submissions.js';
import {
  authenticateSupabaseRequest,
  mapPublicUser,
  supabaseDeleteUser,
  supabaseFindUserById,
  supabaseUpdateUserRole,
} from '../_lib/auth.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!isSupabaseConfigured()) {
    res.status(500).json({
      error:
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.',
    });
    return;
  }

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const targetId = Number(rawId);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    res.status(400).json({ error: 'Invalid user ID.' });
    return;
  }

  try {
    const actor = await authenticateSupabaseRequest(req, res, ['super_admin', 'admin']);
    if (!actor) return;

    const target = await supabaseFindUserById(targetId);
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (req.method === 'PATCH') {
      if (actor.role !== 'super_admin') {
        res.status(403).json({
          error: 'Only the Super Admin can promote Workers to Admin or demote Admins to Worker.',
        });
        return;
      }

      if (target.id === actor.id || target.role === 'super_admin') {
        res.status(400).json({ error: 'Super Admin role cannot be changed.' });
        return;
      }

      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
        string,
        unknown
      >;
      const nextRole = body.role;
      if (nextRole !== 'admin' && nextRole !== 'worker') {
        res.status(400).json({ error: 'Role must be either admin or worker.' });
        return;
      }

      const updated = await supabaseUpdateUserRole(target.id, nextRole);
      if (!updated) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      res.status(200).json({ user: mapPublicUser(updated) });
      return;
    }

    if (req.method === 'DELETE') {
      if (target.id === actor.id || target.role === 'super_admin') {
        res.status(403).json({ error: 'Super Admin accounts cannot be deleted.' });
        return;
      }

      if (actor.role === 'admin' && target.role !== 'worker') {
        res.status(403).json({
          error: 'Admins can only delete Worker accounts. Only Super Admin can manage Admins.',
        });
        return;
      }

      const deleted = await supabaseDeleteUser(target.id);
      if (!deleted) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      res.status(200).json({ deleted: true });
      return;
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to update user.',
    });
  }
}
