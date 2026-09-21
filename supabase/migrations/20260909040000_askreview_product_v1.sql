-- AskReview product v1. Independent of other venture product tables and types.
-- Uses the existing Supabase project. RLS isolates rows to the owning auth user.

CREATE TABLE public.askreview_customers (
  customer_id TEXT PRIMARY KEY,
  venture_id TEXT NOT NULL DEFAULT 'askreview',
  auth_identity_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  qa_access BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.askreview_locations (
  location_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.askreview_customers (customer_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  place_id TEXT,
  maps_url TEXT,
  review_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX askreview_locations_customer_updated_idx
  ON public.askreview_locations (customer_id, status, updated_at DESC);

CREATE TABLE public.askreview_kits (
  kit_id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL REFERENCES public.askreview_locations (location_id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.askreview_customers (customer_id) ON DELETE CASCADE,
  review_url TEXT NOT NULL,
  request_copy TEXT NOT NULL,
  copy_variants JSONB NOT NULL DEFAULT '{}'::jsonb,
  qr_svg TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX askreview_kits_location_created_idx
  ON public.askreview_kits (customer_id, location_id, created_at DESC);

CREATE TABLE public.askreview_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  account_id TEXT,
  location_id TEXT,
  outcome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.askreview_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.askreview_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.askreview_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.askreview_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY askreview_customers_own ON public.askreview_customers
  FOR ALL TO authenticated
  USING (auth_identity_id = auth.uid())
  WITH CHECK (auth_identity_id = auth.uid());

CREATE POLICY askreview_locations_own ON public.askreview_locations
  FOR ALL TO authenticated
  USING (customer_id IN (SELECT customer_id FROM public.askreview_customers WHERE auth_identity_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT customer_id FROM public.askreview_customers WHERE auth_identity_id = auth.uid()));

CREATE POLICY askreview_kits_own ON public.askreview_kits
  FOR ALL TO authenticated
  USING (customer_id IN (SELECT customer_id FROM public.askreview_customers WHERE auth_identity_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT customer_id FROM public.askreview_customers WHERE auth_identity_id = auth.uid()));

CREATE POLICY askreview_events_own ON public.askreview_events
  FOR ALL TO authenticated
  USING (account_id IN (SELECT customer_id FROM public.askreview_customers WHERE auth_identity_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT customer_id FROM public.askreview_customers WHERE auth_identity_id = auth.uid()));

GRANT ALL ON public.askreview_customers TO service_role;
GRANT ALL ON public.askreview_locations TO service_role;
GRANT ALL ON public.askreview_kits TO service_role;
GRANT ALL ON public.askreview_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.askreview_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.askreview_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.askreview_kits TO authenticated;
GRANT SELECT, INSERT ON public.askreview_events TO authenticated;
