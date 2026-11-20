import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Search,
  Trash2,
  Eye,
  X,
  Plus,
  AlertCircle,
} from 'lucide-react';
import {
  ClientOnboardingRecord,
  OnboardingWorkflowStatus,
  PlatformChannelStatus,
  WORKFLOW_STATUSES,
} from '../types';

interface AgencyDatabaseProps {
  onGoToIntake: () => void;
  refreshSignal: number;
}

const FILTER_OPTIONS: ('All' | OnboardingWorkflowStatus)[] = ['All', ...WORKFLOW_STATUSES];

function formatChannelSummary(status: PlatformChannelStatus, primaryText: string): string {
  if (status === 'not_needed') return 'Not needed';
  if (status === 'create_new') {
    return primaryText ? `Create: ${primaryText}` : 'Create new page';
  }
  return primaryText || 'Partner access';
}

function statusTextTone(status: OnboardingWorkflowStatus): string {
  switch (status) {
    case 'Completed':
    case 'Ready for Ads':
      return 'text-emerald-700';
    case 'Partner Access Pending':
      return 'text-amber-700';
    default:
      return 'text-slate-700';
  }
}

export function AgencyDatabase({ onGoToIntake, refreshSignal }: AgencyDatabaseProps) {
  const [records, setRecords] = useState<ClientOnboardingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | OnboardingWorkflowStatus>('All');
  const [selectedRecord, setSelectedRecord] = useState<ClientOnboardingRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function fetchRecords() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/submissions');
      if (!response.ok) {
        throw new Error('Failed to load onboarding database.');
      }
      const data = await response.json();
      setRecords(data.submissions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecords();
  }, [refreshSignal]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((rec) => {
      if (statusFilter !== 'All' && rec.onboardingStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        rec.businessName.toLowerCase().includes(q) ||
        rec.contactName.toLowerCase().includes(q) ||
        rec.contactEmail.toLowerCase().includes(q) ||
        rec.referenceCode.toLowerCase().includes(q) ||
        rec.facebookAccountName.toLowerCase().includes(q) ||
        rec.instagramHandle.toLowerCase().includes(q) ||
        rec.tiktokHandle.toLowerCase().includes(q) ||
        rec.linkedinAccountName.toLowerCase().includes(q)
      );
    });
  }, [records, searchQuery, statusFilter]);

  const metrics = useMemo(() => {
    let pageCreationNeeded = 0;
    let pendingAccess = 0;
    let readyForAds = 0;

    for (const r of records) {
      if (
        r.facebookStatus === 'create_new' ||
        r.instagramStatus === 'create_new' ||
        r.tiktokStatus === 'create_new' ||
        r.linkedinStatus === 'create_new'
      ) {
        pageCreationNeeded += 1;
      }
      if (
        r.onboardingStatus === 'Intake Submitted' ||
        r.onboardingStatus === 'Partner Access Pending'
      ) {
        pendingAccess += 1;
      }
      if (r.onboardingStatus === 'Ready for Ads' || r.onboardingStatus === 'Completed') {
        readyForAds += 1;
      }
    }

    return {
      total: records.length,
      pageCreationNeeded,
      pendingAccess,
      readyForAds,
    };
  }, [records]);

  async function handleStatusChange(id: number, nextStatus: OnboardingWorkflowStatus) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingStatus: nextStatus }),
      });
      if (!response.ok) return;
      const data = await response.json();
      setRecords((prev) => prev.map((item) => (item.id === id ? data.submission : item)));
      if (selectedRecord?.id === id) {
        setSelectedRecord(data.submission);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: number) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      if (!response.ok) return;
      setRecords((prev) => prev.filter((item) => item.id !== id));
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  function buildExportUrl(format: 'xlsx' | 'csv') {
    const params = new URLSearchParams();
    if (statusFilter !== 'All') params.set('status', statusFilter);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    const qs = params.toString();
    return `/api/submissions/export.${format}${qs ? `?${qs}` : ''}`;
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Top workspace header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Netpub Agency Operations · Client Intake Database
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Client Onboarding & Excel Export
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={buildExportUrl('csv')}
            download="netpub-client-onboarding.csv"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Download CSV</span>
          </a>
          <a
            href={buildExportUrl('xlsx')}
            download="netpub-client-onboarding.xlsx"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            <span>Export Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-white p-5">
          <div className="text-xs text-slate-500">Total Onboardings</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {metrics.total}
          </div>
        </div>
        <div className="bg-white p-5">
          <div className="text-xs text-slate-500">Need New Pages</div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {metrics.pageCreationNeeded}
          </div>
        </div>
        <div className="bg-white p-5">
          <div className="text-xs text-slate-500">Pending Partner Access</div>
          <div className="text-2xl font-bold text-amber-700 tabular-nums mt-1">
            {metrics.pendingAccess}
          </div>
        </div>
        <div className="bg-white p-5">
          <div className="text-xs text-slate-500">Ready for Ads / Complete</div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {metrics.readyForAds}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setStatusFilter(opt)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === opt
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search business, email, ref, or handle..."
            aria-label="Search client onboarding records"
            className="w-full pl-9 pr-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
          />
        </div>
      </div>

      {/* Table / Loading / Empty / Error */}
      {error ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-red-700 mx-auto" aria-hidden="true" />
          <p className="text-sm font-medium text-red-900">{error}</p>
          <button
            type="button"
            onClick={fetchRecords}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-200">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="h-12 px-6 flex items-center gap-6 animate-pulse">
                <div className="h-3.5 w-28 bg-slate-200 rounded" />
                <div className="h-3.5 w-44 bg-slate-200 rounded" />
                <div className="h-3.5 w-32 bg-slate-200 rounded" />
                <div className="h-3.5 w-24 bg-slate-200 rounded ml-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {records.length === 0
              ? 'No client onboarding submissions yet'
              : 'No matching client records found'}
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {records.length === 0
              ? 'When prospective clients submit the onboarding landing page form, their business identifiers and platform statuses appear here ready for Excel export.'
              : 'Adjust your search query or status filter to view other client submissions.'}
          </p>
          {records.length === 0 && (
            <button
              type="button"
              onClick={onGoToIntake}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Create First Onboarding Entry</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Ref Code</th>
                  <th className="py-3 px-4 whitespace-nowrap">Business & Contact</th>
                  <th className="py-3 px-4 whitespace-nowrap">Service</th>
                  <th className="py-3 px-4 whitespace-nowrap">Facebook</th>
                  <th className="py-3 px-4 whitespace-nowrap">Instagram</th>
                  <th className="py-3 px-4 whitespace-nowrap">TikTok</th>
                  <th className="py-3 px-4 whitespace-nowrap">LinkedIn</th>
                  <th className="py-3 px-4 whitespace-nowrap">Workflow Status</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {rec.referenceCode}
                    </td>
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="font-medium text-slate-900 truncate max-w-[220px]">
                        {rec.businessName}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[220px]">
                        {rec.contactName} · {rec.contactEmail}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-800">{rec.servicePackage}</div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {rec.monthlyAdBudget}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-[160px] truncate">
                      {formatChannelSummary(rec.facebookStatus, rec.facebookAccountName)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-[140px] truncate">
                      {formatChannelSummary(rec.instagramStatus, rec.instagramHandle)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-[140px] truncate">
                      {formatChannelSummary(
                        rec.tiktokStatus,
                        rec.tiktokHandle || rec.tiktokAccountName,
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-[150px] truncate">
                      {formatChannelSummary(rec.linkedinStatus, rec.linkedinAccountName)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <select
                        aria-label={`Workflow status for ${rec.businessName}`}
                        value={rec.onboardingStatus}
                        disabled={updatingId === rec.id}
                        onChange={(e) =>
                          handleStatusChange(
                            rec.id,
                            e.target.value as OnboardingWorkflowStatus,
                          )
                        }
                        className={`text-xs font-medium bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-800 ${statusTextTone(
                          rec.onboardingStatus,
                        )}`}
                      >
                        {WORKFLOW_STATUSES.map((st) => (
                          <option key={st} value={st} className="text-slate-900">
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          title="Inspect client identifiers"
                          className="p-2 text-slate-600 hover:text-blue-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
                          disabled={updatingId === rec.id}
                          title="Delete submission"
                          className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Slide-Over */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-drawer-title"
        >
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto border-l border-slate-200 p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <div className="font-mono text-xs text-slate-500 tabular-nums">
                  {selectedRecord.referenceCode} ·{' '}
                  {new Date(selectedRecord.createdAt).toLocaleDateString()}
                </div>
                <h2
                  id="detail-drawer-title"
                  className="text-xl font-bold text-slate-900 mt-1"
                >
                  {selectedRecord.businessName}
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  {selectedRecord.industry} · {selectedRecord.servicePackage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close detail panel"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <h3 className="text-xs font-semibold text-slate-500">Contact Details</h3>
              <div className="grid grid-cols-2 gap-3 py-2 border-b border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 block">Primary Contact</span>
                  <span className="font-medium text-slate-900">{selectedRecord.contactName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Phone / WhatsApp</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {selectedRecord.contactPhone}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Work Email</span>
                  <span className="font-medium text-slate-900">{selectedRecord.contactEmail}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Monthly Ad Budget</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {selectedRecord.monthlyAdBudget}
                  </span>
                </div>
              </div>
              {selectedRecord.websiteUrl && (
                <div className="pt-1">
                  <span className="text-xs text-slate-500 block">Website</span>
                  <a
                    href={selectedRecord.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-800 hover:underline break-all"
                  >
                    {selectedRecord.websiteUrl}
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-500">
                Platform Identifiers (Non-Credential)
              </h3>

              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg text-sm">
                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Facebook</span>
                    <span className="text-xs text-slate-500">
                      {selectedRecord.facebookStatus === 'create_new'
                        ? 'Create New Page'
                        : selectedRecord.facebookStatus === 'not_needed'
                          ? 'Not Needed'
                          : 'Has Account'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Page Name: {selectedRecord.facebookAccountName || '—'}
                  </div>
                  <div className="text-xs text-slate-600 break-all">
                    URL: {selectedRecord.facebookPageUrl || '—'}
                  </div>
                  <div className="text-xs font-mono text-slate-700">
                    Meta Business ID: {selectedRecord.metaBusinessId || '—'}
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Instagram</span>
                    <span className="text-xs text-slate-500">
                      {selectedRecord.instagramStatus === 'create_new'
                        ? 'Create New Account'
                        : selectedRecord.instagramStatus === 'not_needed'
                          ? 'Not Needed'
                          : 'Has Account'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Handle: {selectedRecord.instagramHandle || '—'}
                  </div>
                  <div className="text-xs text-slate-600">
                    Category: {selectedRecord.instagramCategory || '—'}
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">TikTok</span>
                    <span className="text-xs text-slate-500">
                      {selectedRecord.tiktokStatus === 'create_new'
                        ? 'Create New Account'
                        : selectedRecord.tiktokStatus === 'not_needed'
                          ? 'Not Needed'
                          : 'Has Account'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Account Name: {selectedRecord.tiktokAccountName || '—'}
                  </div>
                  <div className="text-xs text-slate-600">
                    Handle: {selectedRecord.tiktokHandle || '—'}
                  </div>
                  <div className="text-xs font-mono text-slate-700">
                    Business Center ID: {selectedRecord.tiktokBusinessCenterId || '—'}
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">LinkedIn</span>
                    <span className="text-xs text-slate-500">
                      {selectedRecord.linkedinStatus === 'create_new'
                        ? 'Create New Page'
                        : selectedRecord.linkedinStatus === 'not_needed'
                          ? 'Not Needed'
                          : 'Has Account'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Page Name: {selectedRecord.linkedinAccountName || '—'}
                  </div>
                  <div className="text-xs text-slate-600 break-all">
                    URL: {selectedRecord.linkedinPageUrl || '—'}
                  </div>
                  <div className="text-xs font-mono text-slate-700">
                    Campaign Manager ID: {selectedRecord.linkedinCampaignId || '—'}
                  </div>
                </div>
              </div>
            </div>

            {selectedRecord.notes && (
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-slate-500">Campaign Notes</h3>
                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  {selectedRecord.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
