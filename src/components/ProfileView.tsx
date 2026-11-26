import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, User } from 'lucide-react';
import { AgencyUser, ROLE_LABELS } from '../types';

interface ProfileViewProps {
  token: string;
  currentUser: AgencyUser;
  onProfileUpdated: (user: AgencyUser) => void;
  onAuthExpired: () => void;
}

export function ProfileView({
  token,
  currentUser,
  onProfileUpdated,
  onAuthExpired,
}: ProfileViewProps) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [title, setTitle] = useState(currentUser.title);
  const [phone, setPhone] = useState(currentUser.phone);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!name.trim() || !email.trim()) {
      setProfileError('Full name and email are required.');
      return;
    }

    setSavingProfile(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          title: title.trim(),
          phone: phone.trim(),
        }),
      });
      if (response.status === 401) {
        onAuthExpired();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setProfileError(data.error || 'Could not update profile.');
        return;
      }
      onProfileUpdated(data.user);
      setProfileSuccess('Profile details updated.');
    } catch {
      setProfileError('Network error while saving profile changes.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPasswordError(data.error || 'Could not update password.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Login password updated successfully.');
    } catch {
      setPasswordError('Network error while updating password.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <section className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Netpub Agency · {ROLE_LABELS[currentUser.role]} Account
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Profile & Account Security
          </h1>
        </div>
        <div className="text-xs text-slate-500 tabular-nums">
          Member since {new Date(currentUser.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Update Form */}
        <form
          onSubmit={handleProfileSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-slate-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>
          </div>

          {profileError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{profileError}</span>
            </div>
          )}

          {profileSuccess && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{profileSuccess}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-slate-800 mb-1">
                Full Name *
              </label>
              <input
                id="profile-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="block text-sm font-medium text-slate-800 mb-1">
                Agency Email *
              </label>
              <input
                id="profile-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
              />
            </div>

            <div>
              <label htmlFor="profile-title" className="block text-sm font-medium text-slate-800 mb-1">
                Job Title / Department
              </label>
              <input
                id="profile-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Digital Marketing Lead"
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
              />
            </div>

            <div>
              <label htmlFor="profile-phone" className="block text-sm font-medium text-slate-800 mb-1">
                Phone Number
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {savingProfile ? 'Saving Profile...' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* Password Update Form */}
        <form
          onSubmit={handlePasswordSubmit}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <KeyRound className="w-4 h-4 text-slate-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">Change Login Password</h2>
          </div>

          {passwordError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="current-password"
                className="block text-sm font-medium text-slate-800 mb-1"
              >
                Current Password *
              </label>
              <input
                id="current-password"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-800 mb-1">
                New Password *
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={4}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-slate-800 mb-1"
              >
                Confirm New Password *
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={4}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#263547] hover:bg-[#1b2736] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {savingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
