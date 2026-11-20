import React from 'react';

export type ActiveView = 'landing' | 'database';

interface HeaderProps {
  activeView: ActiveView;
  onNavigateView: (view: ActiveView, sectionId?: string) => void;
}

export function Header({ activeView, onNavigateView }: HeaderProps) {
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
          <button
            type="button"
            onClick={() => onNavigateView('database')}
            className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'database' ? 'text-blue-800 font-semibold underline' : ''
            }`}
          >
            Agency Database
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() =>
              activeView === 'database'
                ? onNavigateView('landing', 'intake-form')
                : onNavigateView('landing', 'intake-form')
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Start Onboarding
          </button>
        </div>
      </div>
    </header>
  );
}
