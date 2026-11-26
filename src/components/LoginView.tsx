import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Lock } from 'lucide-react';
import { AgencyUser, ROLE_LABELS, UserRole } from '../types';

interface LoginViewProps {
  onLoginSuccess: (token: string, user: AgencyUser) => void;
  onCancel: () => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string; summary: string }[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    summary: 'Full access to Agency Database, Worker CRUD, Admin promotion/demotion, and Profile.',
  },
  {
    value: 'admin',
    label: 'Admin',
    summary: 'Access to Agency Database, Worker management (create & delete), and Profile.',
  },
  {
    value: 'worker',
    label: 'Worker',
    summary: 'Access to analyse the Agency Database, export spreadsheets, and update Profile.',
  },
];

export function LoginView({ onLoginSuccess, onCancel }: LoginViewProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('worker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRoleInfo =
    ROLE_OPTIONS.find((opt) => opt.value === selectedRole) ?? ROLE_OPTIONS[2];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role: selectedRole,
        }),
      });

      const rawText = await response.text();
      let data: { error?: string; token?: string; user?: AgencyUser } = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        setErrorMessage(data.error || `Sign-in failed (HTTP ${response.status}).`);
        return;
      }

      if (!data.token || !data.user) {
        setErrorMessage('Unexpected server response while signing in.');
        return;
      }

      onLoginSuccess(data.token, data.user);
    } catch {
      setErrorMessage('Network error while contacting authentication service.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-lg mx-auto px-6 py-14 md:py-20">
      <div className="mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Client Onboarding</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-6">
        <div className="space-y-1.5 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Netpub Agency · Restricted Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Access Agency Details
          </h1>
          <p className="text-sm text-slate-600">
            Select your assigned agency role and sign in to view client onboarding records and
            your dashboard.
          </p>
        </div>

        {/* Role Selector */}
        <div className="space-y-2.5">
          <span className="block text-xs font-semibold text-slate-700">
            Select Agency Role
          </span>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedRole(opt.value);
                  setErrorMessage(null);
                }}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedRole === opt.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">{activeRoleInfo.summary}</p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm"
          >
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-800 mb-1.5">
              Agency Email *
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={
                selectedRole === 'super_admin'
                  ? 'superadmin@netpud.com'
                  : selectedRole === 'admin'
                    ? 'admin1@netpud.com'
                    : 'worker1@netpud.com'
              }
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Password *
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#263547] hover:bg-[#1b2736] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            {submitting
              ? 'Verifying Credentials...'
              : `Sign In as ${ROLE_LABELS[selectedRole]}`}
          </button>
        </form>
      </div>
    </section>
  );
}
