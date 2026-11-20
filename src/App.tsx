import React, { useState } from 'react';
import { ArrowRight, Building2, Check, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { ActiveView, Header } from './components/Header';
import { OnboardingForm } from './components/OnboardingForm';
import { AgencyDatabase } from './components/AgencyDatabase';

import heroStudioImg from './assets/images/hero_netpub_africa_1794599329965.jpg';
import workflowReviewImg from './assets/images/workflow_netpub_africa_1794599330733.jpg';

const HERO_IMAGE_PATH = heroStudioImg;
const WORKFLOW_IMAGE_PATH = workflowReviewImg;

const PLATFORM_SPEC_ROWS = [
  {
    platform: 'Facebook',
    identifiers: 'Page Name · Public Page URL · Meta Business Portfolio ID',
    accessMethod: 'Meta Business Suite Partner Request',
    newPageFlow: 'Created inside Netpub Business Portfolio & transferred to client',
  },
  {
    platform: 'Instagram',
    identifiers: 'Instagram @Handle · Business Category',
    accessMethod: 'Linked via Meta Business Portfolio',
    newPageFlow: 'Converted to Professional Account & connected to Facebook Page',
  },
  {
    platform: 'TikTok',
    identifiers: 'TikTok Account Name · @Handle · Business Center ID',
    accessMethod: 'TikTok Business Center Partner Role',
    newPageFlow: 'Provisioned under TikTok Business Center with Advertiser role',
  },
  {
    platform: 'LinkedIn',
    identifiers: 'Company Page Name · Page URL · Campaign Manager ID',
    accessMethod: 'Company Page Content Admin & Campaign Manager Access',
    newPageFlow: 'Company Page structured & handed over with Super Admin rights',
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('landing');
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [workflowImgFailed, setWorkflowImgFailed] = useState(false);

  function handleNavigateView(view: ActiveView, sectionId?: string) {
    setActiveView(view);
    if (view === 'landing') {
      requestAnimationFrame(() => {
        if (!sectionId || sectionId === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const target = document.getElementById(sectionId);
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header activeView={activeView} onNavigateView={handleNavigateView} />

      <main className="flex-1">
        {activeView === 'database' ? (
          <AgencyDatabase
            refreshSignal={refreshSignal}
            onGoToIntake={() => handleNavigateView('landing', 'intake-form')}
          />
        ) : (
          <>
            {/* Hero Section */}
            <section className="bg-white border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
                  <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
                    <div className="space-y-5">
                      <p className="text-xs font-medium text-slate-500">
                        Netpub Agency · Client Onboarding & Partner Access
                      </p>
                      <h1
                        className="font-bold text-slate-900 tracking-tight leading-[1.1]"
                        style={{
                          fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)',
                          textWrap: 'balance',
                        }}
                      >
                        Launch client business pages and ads without sharing passwords
                      </h1>
                      <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-xl">
                        Submit your brand details, public social handles, and Business IDs in one
                        structured intake. Netpub receives instant records ready for Excel export
                        and guides you through official Partner Access.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <a
                        href="#intake-form"
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavigateView('landing', 'intake-form');
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>Begin Client Intake</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleNavigateView('database')}
                        className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-slate-500" aria-hidden="true" />
                        <span>Open Agency Export Database</span>
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="h-full min-h-[280px] lg:min-h-[380px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      {heroImgFailed ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <Building2 className="w-10 h-10 text-slate-400 mb-3" aria-hidden="true" />
                          <p className="text-sm font-medium text-slate-700">
                            Netpub Agency Campaign & Onboarding Studio
                          </p>
                        </div>
                      ) : (
                        <img
                          src={HERO_IMAGE_PATH}
                          alt="Netpub Agency digital marketing strategists collaborating on client campaign launches in a modern studio"
                          referrerPolicy="no-referrer"
                          onError={() => setHeroImgFailed(true)}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Full-width 4-column outcome strip below the hero split */}
                <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">4 Channels</div>
                    <p className="text-sm text-slate-600 mt-1">
                      Facebook, Instagram, TikTok, and LinkedIn covered in one intake
                    </p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">
                      Zero Passwords
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      Delegated Partner Access eliminates 2FA lockouts and credential risk
                    </p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">Under 4 Min</div>
                    <p className="text-sm text-slate-600 mt-1">
                      Structured client details captured immediately for rapid page setup
                    </p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">1-Click .xlsx</div>
                    <p className="text-sm text-slate-600 mt-1">
                      Every submission persists to the agency database for Excel export
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Mechanism Section */}
            <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-16 md:py-20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-5">
                  <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    {workflowImgFailed ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <ShieldCheck className="w-10 h-10 text-slate-400 mb-3" aria-hidden="true" />
                        <p className="text-sm font-medium text-slate-700">
                          Delegated Partner Access Review
                        </p>
                      </div>
                    ) : (
                      <img
                        src={WORKFLOW_IMAGE_PATH}
                        alt="Digital marketing specialists reviewing social media brand assets and ad layouts"
                        referrerPolicy="no-referrer"
                        onError={() => setWorkflowImgFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-8">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">Onboarding Workflow</p>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                      Built to eliminate client onboarding delays
                    </h2>
                  </div>

                  <div className="divide-y divide-slate-200 border-y border-slate-200">
                    <div className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-6">
                      <div className="sm:col-span-4 font-semibold text-slate-900 text-sm">
                        01. Capture Public Identifiers
                      </div>
                      <p className="sm:col-span-8 text-sm text-slate-600">
                        Clients enter their brand details, existing page names or @handles, and
                        specify which business pages need to be created from scratch.
                      </p>
                    </div>
                    <div className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-6">
                      <div className="sm:col-span-4 font-semibold text-slate-900 text-sm">
                        02. Connect via Business IDs
                      </div>
                      <p className="sm:col-span-8 text-sm text-slate-600">
                        Instead of risky password sharing, clients provide Meta Business Portfolio,
                        TikTok Business Center, or LinkedIn Campaign Manager IDs and follow an
                        instant Partner Access checklist.
                      </p>
                    </div>
                    <div className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-6">
                      <div className="sm:col-span-4 font-semibold text-slate-900 text-sm">
                        03. Export Straight to Excel
                      </div>
                      <p className="sm:col-span-8 text-sm text-slate-600">
                        Netpub account managers track onboarding status in the Agency Database and
                        export structured .xlsx or .csv sheets with a single click.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Platforms Matrix Section */}
            <section id="platforms" className="bg-white border-y border-slate-200">
              <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 space-y-8">
                <div className="max-w-2xl space-y-2">
                  <p className="text-xs font-medium text-slate-500">Supported Channels</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                    What Netpub collects for each platform
                  </h2>
                  <p className="text-sm md:text-base text-slate-600">
                    Every field maps cleanly to an official agency workflow and exports into its own
                    dedicated spreadsheet column.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                          <th className="py-3.5 px-5">Platform</th>
                          <th className="py-3.5 px-5">Identifiers Collected</th>
                          <th className="py-3.5 px-5">Existing Account Access</th>
                          <th className="py-3.5 px-5">New Page Creation Flow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {PLATFORM_SPEC_ROWS.map((item) => (
                          <tr key={item.platform} className="bg-white">
                            <td className="py-4 px-5 font-semibold text-slate-900 whitespace-nowrap">
                              {item.platform}
                            </td>
                            <td className="py-4 px-5 text-slate-700">{item.identifiers}</td>
                            <td className="py-4 px-5 text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                                <span>{item.accessMethod}</span>
                              </span>
                            </td>
                            <td className="py-4 px-5 text-slate-600">{item.newPageFlow}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* Intake Form Section */}
            <section id="intake-form" className="max-w-5xl mx-auto px-6 py-16 md:py-20 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Client Intake Portal</p>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  Complete your brand onboarding profile
                </h2>
              </div>

              <OnboardingForm
                onSubmitted={() => setRefreshSignal((prev) => prev + 1)}
                onOpenDatabase={() => handleNavigateView('database')}
              />
            </section>
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-sm text-slate-900">Netpub</span>
            <span aria-hidden="true">·</span>
            <span>Client Onboarding & Partner Access Portal</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleNavigateView('landing', 'intake-form')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Client Intake
            </button>
            <button
              type="button"
              onClick={() => handleNavigateView('database')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Agency Database & Excel Export
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
