import React from 'react';
import type { AgencyUser } from '../types';

export type ActiveView = 'landing' | 'login' | 'database' | 'team' | 'profile';

interface HeaderProps {
  activeView: ActiveView;
  currentUser: AgencyUser | null;
  onNavigateView: (view: ActiveView, sectionId?: string) => void;
  onLogout: () => void;
}

export function Header({
  activeView,
  currentUser,
  onNavigateView,
  onLogout,
}: HeaderProps) {
  const canManageTeam =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateView('landing', 'top');
          }}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          Netpub
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          {currentUser ? (
            <>
              <button
                type="button"
                onClick={() => onNavigateView('landing', 'top')}
                className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'landing' ? 'text-blue-800 font-semibold underline' : ''
                }`}
              >
                Onboarding Home
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('database')}
                className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'database' ? 'text-blue-800 font-semibold underline' : ''
                }`}
              >
                Agency Database
              </button>
              {canManageTeam && (
                <button
                  type="button"
                  onClick={() => onNavigateView('team')}
                  className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeView === 'team' ? 'text-blue-800 font-semibold underline' : ''
                  }`}
                >
                  {currentUser.role === 'super_admin'
                    ? 'Team & Admin Management'
                    : 'Worker Management'}
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateView('profile')}
                className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'profile' ? 'text-blue-800 font-semibold underline' : ''
                }`}
              >
                Profile
              </button>
            </>
          ) : (
            <>
              <a
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateView('landing', 'how-it-works');
                }}
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                How It Works
              </a>
              <a
                href="#platforms"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateView('landing', 'platforms');
                }}
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Platforms
              </a>
              <a
                href="#intake-form"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateView('landing', 'intake-form');
                }}
                className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                Intake Form
              </a>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateView('landing', 'intake-form')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Start Onboarding
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-[#263547] hover:bg-[#1b2736] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateView('login')}
              className="px-4 py-2 text-sm font-medium text-white bg-[#263547] hover:bg-[#1b2736] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            >
              Access Agency Details
            </button>
          )}
        </div>
      </div>

      {/* Mobile secondary bar when logged in */}
      {currentUser && (
        <div className="md:hidden border-t border-slate-100 px-6 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigateView('landing', 'top')}
            className={`whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'landing' ? 'text-blue-800 font-semibold' : ''
            }`}
          >
            Onboarding Home
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('database')}
            className={`whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'database' ? 'text-blue-800 font-semibold' : ''
            }`}
          >
            Agency Database
          </button>
          {canManageTeam && (
            <button
              type="button"
              onClick={() => onNavigateView('team')}
              className={`whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'team' ? 'text-blue-800 font-semibold' : ''
              }`}
            >
              {currentUser.role === 'super_admin' ? 'Team & Admins' : 'Workers'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigateView('profile')}
            className={`whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'profile' ? 'text-blue-800 font-semibold' : ''
            }`}
          >
            Profile
          </button>
        </div>
      )}
    </header>
  );
}
