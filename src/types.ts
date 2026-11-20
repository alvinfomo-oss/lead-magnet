export type PlatformChannelStatus = 'has_account' | 'create_new' | 'not_needed';

export type OnboardingWorkflowStatus =
  | 'Intake Submitted'
  | 'Partner Access Pending'
  | 'Ready for Ads'
  | 'Completed';

export const WORKFLOW_STATUSES: OnboardingWorkflowStatus[] = [
  'Intake Submitted',
  'Partner Access Pending',
  'Ready for Ads',
  'Completed',
];

export const SERVICE_PACKAGES = [
  'Full Social Launch & Ads',
  'Business Page Creation',
  'Paid Ads Management',
  'Multi-Channel Audit',
] as const;

export const BUDGET_RANGES = [
  'Not set yet',
  'Under $500 / mo',
  '$500 - $2,000 / mo',
  '$2,000 - $10,000 / mo',
  '$10,000+ / mo',
] as const;

export interface ClientOnboardingPayload {
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  industry: string;
  servicePackage: string;
  monthlyAdBudget: string;
  facebookStatus: PlatformChannelStatus;
  facebookAccountName: string;
  facebookPageUrl: string;
  metaBusinessId: string;
  instagramStatus: PlatformChannelStatus;
  instagramHandle: string;
  instagramCategory: string;
  tiktokStatus: PlatformChannelStatus;
  tiktokAccountName: string;
  tiktokHandle: string;
  tiktokBusinessCenterId: string;
  linkedinStatus: PlatformChannelStatus;
  linkedinAccountName: string;
  linkedinPageUrl: string;
  linkedinCampaignId: string;
  notes: string;
}

export interface ClientOnboardingRecord extends ClientOnboardingPayload {
  id: number;
  referenceCode: string;
  onboardingStatus: OnboardingWorkflowStatus;
  createdAt: string;
}
