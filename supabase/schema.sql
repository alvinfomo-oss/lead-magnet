-- Run this SQL in your Supabase project's SQL Editor before deploying to Vercel.

CREATE TABLE IF NOT EXISTS public.client_onboardings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reference_code TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  website_url TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL,
  service_package TEXT NOT NULL,
  monthly_ad_budget TEXT NOT NULL DEFAULT 'Not set yet',
  facebook_status TEXT NOT NULL DEFAULT 'has_account',
  facebook_account_name TEXT NOT NULL DEFAULT '',
  facebook_page_url TEXT NOT NULL DEFAULT '',
  meta_business_id TEXT NOT NULL DEFAULT '',
  instagram_status TEXT NOT NULL DEFAULT 'has_account',
  instagram_handle TEXT NOT NULL DEFAULT '',
  instagram_category TEXT NOT NULL DEFAULT '',
  tiktok_status TEXT NOT NULL DEFAULT 'has_account',
  tiktok_account_name TEXT NOT NULL DEFAULT '',
  tiktok_handle TEXT NOT NULL DEFAULT '',
  tiktok_business_center_id TEXT NOT NULL DEFAULT '',
  linkedin_status TEXT NOT NULL DEFAULT 'has_account',
  linkedin_account_name TEXT NOT NULL DEFAULT '',
  linkedin_page_url TEXT NOT NULL DEFAULT '',
  linkedin_campaign_id TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  onboarding_status TEXT NOT NULL DEFAULT 'Intake Submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_onboardings_status
  ON public.client_onboardings (onboarding_status);

CREATE INDEX IF NOT EXISTS idx_client_onboardings_created_at
  ON public.client_onboardings (created_at DESC);

CREATE TABLE IF NOT EXISTS public.agency_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'worker')),
  title TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_users_role
  ON public.agency_users (role);

-- Enable Row Level Security so public anon keys cannot read or mutate agency data directly.
-- Vercel Serverless Functions use SUPABASE_SERVICE_ROLE_KEY on the server.
ALTER TABLE public.client_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;
