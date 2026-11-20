import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  BUDGET_RANGES,
  ClientOnboardingPayload,
  ClientOnboardingRecord,
  PlatformChannelStatus,
  SERVICE_PACKAGES,
} from '../types';

interface OnboardingFormProps {
  onSubmitted: (record: ClientOnboardingRecord) => void;
  onOpenDatabase: () => void;
}

const INITIAL_FORM: ClientOnboardingPayload = {
  businessName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  websiteUrl: '',
  industry: '',
  servicePackage: SERVICE_PACKAGES[0],
  monthlyAdBudget: BUDGET_RANGES[0],
  facebookStatus: 'has_account',
  facebookAccountName: '',
  facebookPageUrl: '',
  metaBusinessId: '',
  instagramStatus: 'has_account',
  instagramHandle: '',
  instagramCategory: '',
  tiktokStatus: 'has_account',
  tiktokAccountName: '',
  tiktokHandle: '',
  tiktokBusinessCenterId: '',
  linkedinStatus: 'has_account',
  linkedinAccountName: '',
  linkedinPageUrl: '',
  linkedinCampaignId: '',
  notes: '',
};

const CHANNEL_STATUS_OPTIONS: { value: PlatformChannelStatus; label: string }[] = [
  { value: 'has_account', label: 'Already Have Account' },
  { value: 'create_new', label: 'Need New Page Created' },
  { value: 'not_needed', label: 'Not Needed' },
];

type ValidatedFieldKey =
  | 'businessName'
  | 'contactName'
  | 'contactEmail'
  | 'contactPhone'
  | 'industry'
  | 'websiteUrl'
  | 'servicePackage'
  | 'facebookAccountName'
  | 'facebookPageUrl'
  | 'instagramHandle'
  | 'instagramCategory'
  | 'tiktokAccountName'
  | 'tiktokHandle'
  | 'linkedinAccountName'
  | 'linkedinPageUrl'
  | 'platforms';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form: ClientOnboardingPayload): {
  fieldErrors: Partial<Record<ValidatedFieldKey, string>>;
  missingLabels: string[];
} {
  const fieldErrors: Partial<Record<ValidatedFieldKey, string>> = {};
  const missingLabels: string[] = [];

  if (!form.businessName.trim()) {
    fieldErrors.businessName = 'Business / Brand Name is required.';
    missingLabels.push('Business / Brand Name');
  }
  if (!form.contactName.trim()) {
    fieldErrors.contactName = 'Primary Contact Name is required.';
    missingLabels.push('Primary Contact Name');
  }
  if (!form.contactEmail.trim()) {
    fieldErrors.contactEmail = 'Work Email is required.';
    missingLabels.push('Work Email');
  } else if (!EMAIL_REGEX.test(form.contactEmail.trim())) {
    fieldErrors.contactEmail = 'Enter a valid work email address.';
    missingLabels.push('Valid Work Email');
  }
  if (!form.contactPhone.trim()) {
    fieldErrors.contactPhone = 'Phone / WhatsApp Number is required.';
    missingLabels.push('Phone / WhatsApp Number');
  } else if (form.contactPhone.replace(/\D/g, '').length < 6) {
    fieldErrors.contactPhone = 'Enter a valid phone or WhatsApp number (at least 6 digits).';
    missingLabels.push('Valid Phone Number');
  }
  if (!form.industry.trim()) {
    fieldErrors.industry = 'Industry / Sector is required.';
    missingLabels.push('Industry / Sector');
  }
  if (!form.servicePackage.trim()) {
    fieldErrors.servicePackage = 'Requested Agency Service is required.';
    missingLabels.push('Requested Agency Service');
  }
  if (
    form.websiteUrl.trim() &&
    !/^https?:\/\/.+\..+/i.test(form.websiteUrl.trim())
  ) {
    fieldErrors.websiteUrl = 'Website URL must start with https:// or http://';
    missingLabels.push('Valid Website URL');
  }

  const allNotNeeded =
    form.facebookStatus === 'not_needed' &&
    form.instagramStatus === 'not_needed' &&
    form.tiktokStatus === 'not_needed' &&
    form.linkedinStatus === 'not_needed';

  if (allNotNeeded) {
    fieldErrors.platforms =
      'Select at least one platform (Already Have Account or Need New Page Created).';
    missingLabels.push('At least one Social Platform');
  }

  if (form.facebookStatus !== 'not_needed') {
    if (!form.facebookAccountName.trim()) {
      const label =
        form.facebookStatus === 'create_new'
          ? 'Desired Facebook Page Name'
          : 'Facebook Account / Page Name';
      fieldErrors.facebookAccountName = `${label} is required.`;
      missingLabels.push(label);
    }
    if (form.facebookStatus === 'has_account' && !form.facebookPageUrl.trim()) {
      fieldErrors.facebookPageUrl = 'Facebook Page URL is required for existing accounts.';
      missingLabels.push('Facebook Page URL');
    }
  }

  if (form.instagramStatus !== 'not_needed') {
    if (!form.instagramHandle.trim()) {
      const label =
        form.instagramStatus === 'create_new'
          ? 'Preferred Instagram Handle'
          : 'Instagram @Handle';
      fieldErrors.instagramHandle = `${label} is required.`;
      missingLabels.push(label);
    }
    if (!form.instagramCategory.trim()) {
      fieldErrors.instagramCategory = 'Instagram Business Category is required.';
      missingLabels.push('Instagram Business Category');
    }
  }

  if (form.tiktokStatus !== 'not_needed') {
    if (!form.tiktokAccountName.trim()) {
      const label =
        form.tiktokStatus === 'create_new'
          ? 'Desired TikTok Account Name'
          : 'TikTok Account Name';
      fieldErrors.tiktokAccountName = `${label} is required.`;
      missingLabels.push(label);
    }
    if (!form.tiktokHandle.trim()) {
      fieldErrors.tiktokHandle = 'TikTok @Handle is required.';
      missingLabels.push('TikTok @Handle');
    }
  }

  if (form.linkedinStatus !== 'not_needed') {
    if (!form.linkedinAccountName.trim()) {
      const label =
        form.linkedinStatus === 'create_new'
          ? 'Desired LinkedIn Page Name'
          : 'LinkedIn Account / Page Name';
      fieldErrors.linkedinAccountName = `${label} is required.`;
      missingLabels.push(label);
    }
    if (form.linkedinStatus === 'has_account' && !form.linkedinPageUrl.trim()) {
      fieldErrors.linkedinPageUrl = 'LinkedIn Company Page URL is required for existing accounts.';
      missingLabels.push('LinkedIn Company Page URL');
    }
  }

  return { fieldErrors, missingLabels };
}

export function OnboardingForm({ onSubmitted, onOpenDatabase }: OnboardingFormProps) {
  const [form, setForm] = useState<ClientOnboardingPayload>(INITIAL_FORM);
  const [touched, setTouched] = useState<Partial<Record<ValidatedFieldKey, boolean>>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<ClientOnboardingRecord | null>(null);

  const validation = useMemo(() => validateForm(form), [form]);
  const isFormComplete = validation.missingLabels.length === 0;

  function updateField<K extends keyof ClientOnboardingPayload>(
    key: K,
    value: ClientOnboardingPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errorMessage) setErrorMessage(null);
  }

  function markTouched(key: ValidatedFieldKey) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function getFieldError(key: ValidatedFieldKey): string | undefined {
    if (!attemptedSubmit && !touched[key]) return undefined;
    return validation.fieldErrors[key];
  }

  function inputBorderClass(key: ValidatedFieldKey): string {
    return getFieldError(key)
      ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
      : 'border-slate-300 focus:border-blue-800 focus:ring-blue-800/15';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttemptedSubmit(true);
    setErrorMessage(null);

    if (!isFormComplete) {
      setErrorMessage(
        `Please complete all required (*) fields before submitting: ${validation.missingLabels.join(', ')}.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const rawText = await response.text();
      let data: { error?: string; submission?: ClientOnboardingRecord } = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        setErrorMessage(
          data.error ||
            `Server error (HTTP ${response.status}) while saving onboarding details.`,
        );
        return;
      }

      if (!data.submission) {
        setErrorMessage('Unexpected response from server. Please check API configuration.');
        return;
      }

      const created: ClientOnboardingRecord = data.submission;
      setSubmittedRecord(created);
      onSubmitted(created);
    } catch {
      setErrorMessage('Network error while contacting the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetForNew() {
    setForm(INITIAL_FORM);
    setTouched({});
    setAttemptedSubmit(false);
    setSubmittedRecord(null);
    setErrorMessage(null);
  }

  if (submittedRecord) {
    const needsMetaGuide =
      submittedRecord.facebookStatus === 'has_account' ||
      submittedRecord.instagramStatus === 'has_account';
    const needsTikTokGuide = submittedRecord.tiktokStatus === 'has_account';
    const needsLinkedInGuide = submittedRecord.linkedinStatus === 'has_account';
    const pagesToCreate = [
      submittedRecord.facebookStatus === 'create_new' ? 'Facebook Business Page' : null,
      submittedRecord.instagramStatus === 'create_new' ? 'Instagram Professional Account' : null,
      submittedRecord.tiktokStatus === 'create_new' ? 'TikTok Business Account' : null,
      submittedRecord.linkedinStatus === 'create_new' ? 'LinkedIn Company Page' : null,
    ].filter(Boolean) as string[];

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Client Onboarding Recorded</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {submittedRecord.businessName} is ready for setup
            </h3>
            <p className="text-slate-600 text-sm md:text-base max-w-2xl">
              Your channel identifiers have been saved to the Netpub Agency database. Complete the
              official Partner Access steps below so our team can launch campaigns without password
              delays or 2FA lockouts.
            </p>
          </div>
          <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500">Reference Code</div>
            <div className="font-mono text-base font-medium text-slate-900 tabular-nums mt-0.5">
              {submittedRecord.referenceCode}
            </div>
          </div>
        </div>

        {pagesToCreate.length > 0 && (
          <div className="py-6 border-b border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900">
              New Pages Queued for Netpub Creation
            </h4>
            <p className="text-sm text-slate-600 mt-1">
              Our onboarding team will create and configure:{' '}
              <span className="font-medium text-slate-900">{pagesToCreate.join(', ')}</span>, then
              transfer primary ownership to{' '}
              <span className="font-medium text-slate-900">{submittedRecord.contactEmail}</span>.
            </p>
          </div>
        )}

        <div className="py-8 space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">
              Partner Access Checklist (No Passwords Needed)
            </h4>
            <p className="text-sm text-slate-600 mt-1">
              Grant Netpub Agency official delegated access on your existing channels:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {needsMetaGuide && (
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-3">
                <div className="text-sm font-semibold text-slate-900">
                  01. Meta Business Suite (Facebook & Instagram)
                </div>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Open Meta Business Settings under your Business Portfolio.</li>
                  <li>Select Partners and choose Add Partner by Business ID.</li>
                  <li>Assign your Facebook Page, Instagram account, and Ad Account permissions.</li>
                </ol>
                <a
                  href="https://business.facebook.com/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 hover:underline"
                >
                  <span>Open Meta Business Settings</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            )}

            {needsTikTokGuide && (
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-3">
                <div className="text-sm font-semibold text-slate-900">
                  02. TikTok Business Center
                </div>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Sign in to TikTok Business Center as the account admin.</li>
                  <li>Go to Users, then Partners, and click Add Partner.</li>
                  <li>Link your TikTok Ad Account and Business Profile as Advertiser.</li>
                </ol>
                <a
                  href="https://business.tiktok.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 hover:underline"
                >
                  <span>Open TikTok Business Center</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            )}

            {needsLinkedInGuide && (
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-3">
                <div className="text-sm font-semibold text-slate-900">
                  03. LinkedIn Page & Campaign Manager
                </div>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Visit your LinkedIn Company Page Admin Settings.</li>
                  <li>Add our agency representative as Content Admin or Super Admin.</li>
                  <li>Grant Campaign Manager access under Account Settings.</li>
                </ol>
                <a
                  href="https://www.linkedin.com/campaignmanager/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 hover:underline"
                >
                  <span>Open LinkedIn Campaign Manager</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            )}

            {!needsMetaGuide && !needsTikTokGuide && !needsLinkedInGuide && (
              <div className="md:col-span-3 border border-slate-200 rounded-lg p-5 bg-slate-50/50">
                <p className="text-sm text-slate-700">
                  All selected platforms are marked for new page creation or not needed. Netpub
                  Agency will prepare your new business assets and send partner ownership invites
                  directly to <span className="font-medium">{submittedRecord.contactEmail}</span>.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleResetForNew}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Submit Another Client
          </button>
          <button
            type="button"
            onClick={onOpenDatabase}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open Agency Database & Export Excel</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-xl p-6 md:p-10 space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            Client Social & Ad Account Intake
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Provide your business details, public handles, and Business IDs so Netpub Agency can
            prepare your pages and ad accounts rapidly.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
          <span>No passwords collected — Partner Access only</span>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 text-sm"
        >
          <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section A: Business & Contact Details */}
      <div className="space-y-6">
        <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
          <h4 className="text-base font-semibold text-slate-900">
            01. Business & Contact Information
          </h4>
          <span className="text-xs text-slate-500">All fields marked * are required</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-slate-800 mb-1.5">
              Business / Brand Name *
            </label>
            <input
              id="businessName"
              type="text"
              required
              aria-required="true"
              aria-invalid={Boolean(getFieldError('businessName'))}
              value={form.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              onBlur={() => markTouched('businessName')}
              placeholder="e.g. Horizon Coffee Roasters"
              className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('businessName')}`}
            />
            {getFieldError('businessName') && (
              <p className="mt-1 text-xs text-red-700">{getFieldError('businessName')}</p>
            )}
          </div>

          <div>
            <label htmlFor="contactName" className="block text-sm font-medium text-slate-800 mb-1.5">
              Primary Contact Name *
            </label>
            <input
              id="contactName"
              type="text"
              required
              aria-required="true"
              aria-invalid={Boolean(getFieldError('contactName'))}
              value={form.contactName}
              onChange={(e) => updateField('contactName', e.target.value)}
              onBlur={() => markTouched('contactName')}
              placeholder="e.g. Claire Mbarga"
              className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('contactName')}`}
            />
            {getFieldError('contactName') && (
              <p className="mt-1 text-xs text-red-700">{getFieldError('contactName')}</p>
            )}
          </div>

          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-slate-800 mb-1.5">
              Work Email *
            </label>
            <input
              id="contactEmail"
              type="email"
              required
              aria-required="true"
              aria-invalid={Boolean(getFieldError('contactEmail'))}
              value={form.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              onBlur={() => markTouched('contactEmail')}
              placeholder="name@company.com"
              className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('contactEmail')}`}
            />
            {getFieldError('contactEmail') && (
              <p className="mt-1 text-xs text-red-700">{getFieldError('contactEmail')}</p>
            )}
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-slate-800 mb-1.5">
              Phone / WhatsApp Number *
            </label>
            <input
              id="contactPhone"
              type="tel"
              required
              aria-required="true"
              aria-invalid={Boolean(getFieldError('contactPhone'))}
              value={form.contactPhone}
              onChange={(e) => updateField('contactPhone', e.target.value)}
              onBlur={() => markTouched('contactPhone')}
              placeholder="+237 6XX XXX XXX"
              className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('contactPhone')}`}
            />
            {getFieldError('contactPhone') && (
              <p className="mt-1 text-xs text-red-700">{getFieldError('contactPhone')}</p>
            )}
          </div>

          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-slate-800 mb-1.5">
              Industry / Sector *
            </label>
            <input
              id="industry"
              type="text"
              required
              aria-required="true"
              aria-invalid={Boolean(getFieldError('industry'))}
              value={form.industry}
              onChange={(e) => updateField('industry', e.target.value)}
              onBlur={() => markTouched('industry')}
              placeholder="e.g. E-commerce, Real Estate, Hospitality"
              className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('industry')}`}
            />
            {getFieldError('industry') && (
              <p className="mt-1 text-xs text-red-700">{getFieldError('industry')}</p>
            )}
          </div>

          <div>
            <label htmlFor="websiteUrl" className="block text-sm font-medium text-slate-800 mb-1.5">
              Website URL (Optional)
            </label>
            <input
              id="websiteUrl"
              type="url"
              aria-invalid={Boolean(getFieldError('websiteUrl'))}
              value={form.websiteUrl}
              onChange={(e) => updateField('websiteUrl', e.target.value)}
              onBlur={() => markTouched('websiteUrl')}
              placeholder="https://yourcompany.com"
              className={`w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('websiteUrl')}`}
            />
            {getFieldError('websiteUrl') && (
              <p className="mt-1 text-xs text-red-700">{getFieldError('websiteUrl')}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="servicePackage"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Requested Agency Service *
            </label>
            <select
              id="servicePackage"
              required
              aria-required="true"
              value={form.servicePackage}
              onChange={(e) => updateField('servicePackage', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15"
            >
              {SERVICE_PACKAGES.map((pkg) => (
                <option key={pkg} value={pkg}>
                  {pkg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="monthlyAdBudget"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Planned Monthly Ad Budget (Optional)
            </label>
            <select
              id="monthlyAdBudget"
              value={form.monthlyAdBudget}
              onChange={(e) => updateField('monthlyAdBudget', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15"
            >
              {BUDGET_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section B: Platform Accounts & Public Identifiers */}
      <div className="space-y-8 pt-2">
        <div className="border-b border-slate-100 pb-2">
          <h4 className="text-base font-semibold text-slate-900">
            02. Social Media Accounts & Business IDs
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Required (*) fields apply to every platform unless marked Not Needed.
          </p>
        </div>

        {validation.fieldErrors.platforms && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
            {validation.fieldErrors.platforms}
          </div>
        )}

        {/* Facebook */}
        <div className="space-y-4 pb-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="text-sm font-semibold text-slate-900">Facebook Business Page</h5>
              <p className="text-xs text-slate-500">
                Page identity and Meta Business Portfolio ID for delegated Partner Access
              </p>
            </div>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start">
              {CHANNEL_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('facebookStatus', opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    form.facebookStatus === opt.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.facebookStatus !== 'not_needed' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="facebookAccountName"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {form.facebookStatus === 'create_new'
                    ? 'Desired Facebook Page Name *'
                    : 'Facebook Account / Page Name *'}
                </label>
                <input
                  id="facebookAccountName"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(getFieldError('facebookAccountName'))}
                  value={form.facebookAccountName}
                  onChange={(e) => updateField('facebookAccountName', e.target.value)}
                  onBlur={() => markTouched('facebookAccountName')}
                  placeholder="e.g. Horizon Coffee Official"
                  className={`w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('facebookAccountName')}`}
                />
                {getFieldError('facebookAccountName') && (
                  <p className="mt-1 text-xs text-red-700">
                    {getFieldError('facebookAccountName')}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="facebookPageUrl"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {form.facebookStatus === 'has_account'
                    ? 'Facebook Page URL *'
                    : 'Facebook Page URL'}
                </label>
                <input
                  id="facebookPageUrl"
                  type="text"
                  required={form.facebookStatus === 'has_account'}
                  aria-required={form.facebookStatus === 'has_account'}
                  aria-invalid={Boolean(getFieldError('facebookPageUrl'))}
                  value={form.facebookPageUrl}
                  onChange={(e) => updateField('facebookPageUrl', e.target.value)}
                  onBlur={() => markTouched('facebookPageUrl')}
                  placeholder={
                    form.facebookStatus === 'create_new'
                      ? 'Not required for new page'
                      : 'https://facebook.com/yourpage'
                  }
                  disabled={form.facebookStatus === 'create_new'}
                  className={`w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 ${inputBorderClass('facebookPageUrl')}`}
                />
                {getFieldError('facebookPageUrl') && (
                  <p className="mt-1 text-xs text-red-700">{getFieldError('facebookPageUrl')}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="metaBusinessId"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Meta Business Portfolio ID (Optional)
                </label>
                <input
                  id="metaBusinessId"
                  type="text"
                  value={form.metaBusinessId}
                  onChange={(e) => updateField('metaBusinessId', e.target.value)}
                  placeholder="e.g. 104928374650192"
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* Instagram */}
        <div className="space-y-4 pb-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="text-sm font-semibold text-slate-900">Instagram Professional Account</h5>
              <p className="text-xs text-slate-500">
                Public handle and business category linked via Meta Business Suite
              </p>
            </div>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start">
              {CHANNEL_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('instagramStatus', opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    form.instagramStatus === opt.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.instagramStatus !== 'not_needed' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="instagramHandle"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {form.instagramStatus === 'create_new'
                    ? 'Preferred Instagram Handle *'
                    : 'Instagram @Handle *'}
                </label>
                <input
                  id="instagramHandle"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(getFieldError('instagramHandle'))}
                  value={form.instagramHandle}
                  onChange={(e) => updateField('instagramHandle', e.target.value)}
                  onBlur={() => markTouched('instagramHandle')}
                  placeholder="e.g. @horizoncoffee"
                  className={`w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('instagramHandle')}`}
                />
                {getFieldError('instagramHandle') && (
                  <p className="mt-1 text-xs text-red-700">{getFieldError('instagramHandle')}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="instagramCategory"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Instagram Business Category *
                </label>
                <input
                  id="instagramCategory"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(getFieldError('instagramCategory'))}
                  value={form.instagramCategory}
                  onChange={(e) => updateField('instagramCategory', e.target.value)}
                  onBlur={() => markTouched('instagramCategory')}
                  placeholder="e.g. Cafe & Specialty Goods"
                  className={`w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('instagramCategory')}`}
                />
                {getFieldError('instagramCategory') && (
                  <p className="mt-1 text-xs text-red-700">
                    {getFieldError('instagramCategory')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* TikTok */}
        <div className="space-y-4 pb-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="text-sm font-semibold text-slate-900">TikTok Business Account</h5>
              <p className="text-xs text-slate-500">
                TikTok account name, public handle, and Business Center ID
              </p>
            </div>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start">
              {CHANNEL_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('tiktokStatus', opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    form.tiktokStatus === opt.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.tiktokStatus !== 'not_needed' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="tiktokAccountName"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {form.tiktokStatus === 'create_new'
                    ? 'Desired TikTok Account Name *'
                    : 'TikTok Account Name *'}
                </label>
                <input
                  id="tiktokAccountName"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(getFieldError('tiktokAccountName'))}
                  value={form.tiktokAccountName}
                  onChange={(e) => updateField('tiktokAccountName', e.target.value)}
                  onBlur={() => markTouched('tiktokAccountName')}
                  placeholder="e.g. Horizon Coffee"
                  className={`w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('tiktokAccountName')}`}
                />
                {getFieldError('tiktokAccountName') && (
                  <p className="mt-1 text-xs text-red-700">
                    {getFieldError('tiktokAccountName')}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tiktokHandle"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {form.tiktokStatus === 'create_new'
                    ? 'Preferred TikTok @Handle *'
                    : 'TikTok @Handle *'}
                </label>
                <input
                  id="tiktokHandle"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(getFieldError('tiktokHandle'))}
                  value={form.tiktokHandle}
                  onChange={(e) => updateField('tiktokHandle', e.target.value)}
                  onBlur={() => markTouched('tiktokHandle')}
                  placeholder="e.g. @horizoncoffeecm"
                  className={`w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('tiktokHandle')}`}
                />
                {getFieldError('tiktokHandle') && (
                  <p className="mt-1 text-xs text-red-700">{getFieldError('tiktokHandle')}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tiktokBusinessCenterId"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  TikTok Business Center ID (Optional)
                </label>
                <input
                  id="tiktokBusinessCenterId"
                  type="text"
                  value={form.tiktokBusinessCenterId}
                  onChange={(e) => updateField('tiktokBusinessCenterId', e.target.value)}
                  placeholder="e.g. 7192837461029"
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* LinkedIn */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="text-sm font-semibold text-slate-900">LinkedIn Company Page & Ads</h5>
              <p className="text-xs text-slate-500">
                LinkedIn Page name, public URL, and Campaign Manager Account ID
              </p>
            </div>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start">
              {CHANNEL_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('linkedinStatus', opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    form.linkedinStatus === opt.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.linkedinStatus !== 'not_needed' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="linkedinAccountName"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {form.linkedinStatus === 'create_new'
                    ? 'Desired LinkedIn Page Name *'
                    : 'LinkedIn Account / Page Name *'}
                </label>
                <input
                  id="linkedinAccountName"
                  type="text"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(getFieldError('linkedinAccountName'))}
                  value={form.linkedinAccountName}
                  onChange={(e) => updateField('linkedinAccountName', e.target.value)}
                  onBlur={() => markTouched('linkedinAccountName')}
                  placeholder="e.g. Horizon Coffee Roasters Ltd"
                  className={`w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${inputBorderClass('linkedinAccountName')}`}
                />
                {getFieldError('linkedinAccountName') && (
                  <p className="mt-1 text-xs text-red-700">
                    {getFieldError('linkedinAccountName')}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="linkedinPageUrl"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {form.linkedinStatus === 'has_account'
                    ? 'LinkedIn Company Page URL *'
                    : 'LinkedIn Company Page URL'}
                </label>
                <input
                  id="linkedinPageUrl"
                  type="text"
                  required={form.linkedinStatus === 'has_account'}
                  aria-required={form.linkedinStatus === 'has_account'}
                  aria-invalid={Boolean(getFieldError('linkedinPageUrl'))}
                  value={form.linkedinPageUrl}
                  onChange={(e) => updateField('linkedinPageUrl', e.target.value)}
                  onBlur={() => markTouched('linkedinPageUrl')}
                  placeholder={
                    form.linkedinStatus === 'create_new'
                      ? 'Not required for new page'
                      : 'https://linkedin.com/company/...'
                  }
                  disabled={form.linkedinStatus === 'create_new'}
                  className={`w-full px-3 py-2 text-sm text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 ${inputBorderClass('linkedinPageUrl')}`}
                />
                {getFieldError('linkedinPageUrl') && (
                  <p className="mt-1 text-xs text-red-700">{getFieldError('linkedinPageUrl')}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="linkedinCampaignId"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  LinkedIn Campaign Manager ID (Optional)
                </label>
                <input
                  id="linkedinCampaignId"
                  type="text"
                  value={form.linkedinCampaignId}
                  onChange={(e) => updateField('linkedinCampaignId', e.target.value)}
                  placeholder="e.g. 508291044"
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2 pt-2">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-800">
          Campaign Goals & Onboarding Notes (Optional)
        </label>
        <textarea
          id="notes"
          rows={3}
          value={form.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Target cities, primary products to advertise, or preferred launch date (do not enter any passwords)."
          className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15"
        />
      </div>

      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-lg">
          {!isFormComplete ? (
            <p className="text-xs font-medium text-amber-800">
              {validation.missingLabels.length} required{' '}
              {validation.missingLabels.length === 1 ? 'field' : 'fields'} remaining:{' '}
              <span className="font-normal text-slate-600">
                {validation.missingLabels.join(', ')}
              </span>
            </p>
          ) : (
            <p className="text-xs font-medium text-emerald-700">
              All required fields are complete and ready to submit.
            </p>
          )}
          <p className="text-xs text-slate-500">
            By submitting, your non-credential business identifiers are stored in the Netpub Agency
            onboarding database to initiate page creation or delegated Partner Access.
          </p>
        </div>
        <button
          type="submit"
          disabled={!isFormComplete || submitting}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>{submitting ? 'Saving Onboarding...' : 'Submit Onboarding Details'}</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
