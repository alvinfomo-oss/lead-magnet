import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { AgencyUser, ROLE_LABELS, UserRole } from '../types';

interface TeamManagementProps {
  token: string;
  currentUser: AgencyUser;
  onAuthExpired: () => void;
}

export function TeamManagement({
  token,
  currentUser,
  onAuthExpired,
}: TeamManagementProps) {
  const isSuperAdmin = currentUser.role === 'super_admin';

  const [users, setUsers] = useState<AgencyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'worker' | 'admin'>('worker');
  const [creating, setCreating] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        onAuthExpired();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load agency team members.');
      }
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch team list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const counts = useMemo(() => {
    let superAdmins = 0;
    let admins = 0;
    let workers = 0;
    for (const u of users) {
      if (u.role === 'super_admin') superAdmins += 1;
      else if (u.role === 'admin') admins += 1;
      else workers += 1;
    }
    return { total: users.length, superAdmins, admins, workers };
  }, [users]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setActionNotice(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Full name, email, and initial password are required.');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          title: title.trim(),
          phone: phone.trim(),
          password,
          role: isSuperAdmin ? role : 'worker',
        }),
      });
      if (response.status === 401) {
        onAuthExpired();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not create team member.');
        return;
      }
      setUsers((prev) => [...prev, data.user]);
      setName('');
      setEmail('');
      setTitle('');
      setPhone('');
      setPassword('');
      setRole('worker');
      setActionNotice(`Added ${data.user.name} (${ROLE_LABELS[data.user.role as UserRole]}).`);
    } catch {
      setError('Network error while creating team member.');
    } finally {
      setCreating(false);
    }
  }

  async function handleChangeRole(target: AgencyUser, nextRole: 'admin' | 'worker') {
    setError(null);
    setActionNotice(null);
    setBusyId(target.id);
    try {
      const response = await fetch(`/api/users/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: nextRole }),
      });
      if (response.status === 401) {
        onAuthExpired();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to update role.');
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === target.id ? data.user : u)));
      setActionNotice(
        `${target.name} is now assigned the ${ROLE_LABELS[nextRole]} role.`,
      );
    } catch {
      setError('Network error while updating role.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteUser(target: AgencyUser) {
    setError(null);
    setActionNotice(null);
    setBusyId(target.id);
    try {
      const response = await fetch(`/api/users/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        onAuthExpired();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to delete user.');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      setActionNotice(`Removed ${target.name} from the agency directory.`);
    } catch {
      setError('Network error while deleting user.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="pb-6 border-b border-slate-200">
        <p className="text-xs font-medium text-slate-500">
          Netpub Agency · {ROLE_LABELS[currentUser.role]} Console
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          {isSuperAdmin ? 'Team & Admin Management' : 'Worker Management'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {isSuperAdmin
            ? 'Add or remove workers, promote workers to Admin, or demote Admins back to Worker.'
            : 'Add new Worker accounts or remove Workers from the agency directory. Admin promotion is restricted to Super Admin.'}
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-white p-5">
          <div className="text-xs text-slate-500">Total Agency Accounts</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {counts.total}
          </div>
        </div>
        <div className="bg-white p-5">
          <div className="text-xs text-slate-500">Super Admins</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {counts.superAdmins}
          </div>
        </div>
        <div className="bg-white p-5">
          <div className="text-xs text-slate-500">Admins</div>
          <div className="text-2xl font-bold text-blue-800 tabular-nums mt-1">
            {counts.admins}
          </div>
        </div>
        <div className="bg-white p-5">
          <div className="text-xs text-slate-500">Workers</div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {counts.workers}
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm"
        >
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {actionNotice && (
        <div className="flex items-start gap-2.5 p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Create User Form */}
      <form
        onSubmit={handleCreateUser}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <UserPlus className="w-4 h-4 text-slate-600" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">
            {isSuperAdmin ? 'Add Worker or Admin' : 'Add New Worker'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="new-user-name" className="block text-xs font-medium text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              id="new-user-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Samuel Ndongo"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
            />
          </div>

          <div>
            <label htmlFor="new-user-email" className="block text-xs font-medium text-slate-700 mb-1">
              Agency Email *
            </label>
            <input
              id="new-user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="worker6@netpud.com"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
            />
          </div>

          <div>
            <label
              htmlFor="new-user-password"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Initial Password *
            </label>
            <input
              id="new-user-password"
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 4 characters"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
            />
          </div>

          <div>
            <label htmlFor="new-user-title" className="block text-xs font-medium text-slate-700 mb-1">
              Job Title (Optional)
            </label>
            <input
              id="new-user-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Campaign Analyst"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
            />
          </div>

          <div>
            <label htmlFor="new-user-phone" className="block text-xs font-medium text-slate-700 mb-1">
              Phone (Optional)
            </label>
            <input
              id="new-user-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
            />
          </div>

          <div>
            <label htmlFor="new-user-role" className="block text-xs font-medium text-slate-700 mb-1">
              Assigned Role *
            </label>
            {isSuperAdmin ? (
              <select
                id="new-user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'worker' | 'admin')}
                className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
              >
                <option value="worker">Worker</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <input
                id="new-user-role"
                type="text"
                readOnly
                value="Worker"
                className="w-full px-3 py-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{creating ? 'Creating Account...' : 'Create Account'}</span>
          </button>
        </div>
      </form>

      {/* Team Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-200">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="h-12 px-6 flex items-center gap-6 animate-pulse">
                <div className="h-3.5 w-36 bg-slate-200 rounded" />
                <div className="h-3.5 w-48 bg-slate-200 rounded" />
                <div className="h-3.5 w-24 bg-slate-200 rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Member</th>
                  <th className="py-3 px-4 whitespace-nowrap">Email</th>
                  <th className="py-3 px-4 whitespace-nowrap">Title</th>
                  <th className="py-3 px-4 whitespace-nowrap">Role</th>
                  <th className="py-3 px-4 whitespace-nowrap">Joined</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {users.map((member) => {
                  const canDelete =
                    member.id !== currentUser.id &&
                    member.role !== 'super_admin' &&
                    (isSuperAdmin || member.role === 'worker');

                  const canPromoteDemote =
                    isSuperAdmin &&
                    member.id !== currentUser.id &&
                    member.role !== 'super_admin';

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {member.name}
                        {member.id === currentUser.id ? ' (You)' : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono text-xs whitespace-nowrap">
                        {member.email}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                        {member.title || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                        <span
                          className={
                            member.role === 'super_admin'
                              ? 'text-slate-900'
                              : member.role === 'admin'
                                ? 'text-blue-800'
                                : 'text-emerald-700'
                          }
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {canPromoteDemote && member.role === 'worker' && (
                            <button
                              type="button"
                              disabled={busyId === member.id}
                              onClick={() => handleChangeRole(member, 'admin')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Promote to Admin</span>
                            </button>
                          )}
                          {canPromoteDemote && member.role === 'admin' && (
                            <button
                              type="button"
                              disabled={busyId === member.id}
                              onClick={() => handleChangeRole(member, 'worker')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Demote to Worker</span>
                            </button>
                          )}
                          {canDelete ? (
                            <button
                              type="button"
                              disabled={busyId === member.id}
                              onClick={() => handleDeleteUser(member)}
                              title={`Delete ${member.name}`}
                              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          ) : (
                            !canPromoteDemote && (
                              <span className="text-xs text-slate-400">—</span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
