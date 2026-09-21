-- OccupancyNPV paid product v1: venture customers, entitlements, workspaces, scenarios.
-- RLS isolates rows to the owning auth user. Service role remains available for webhook reconciliation.

CREATE TABLE public.occupancynpv_customers (
  customer_id TEXT PRIMARY KEY,
  venture_id TEXT NOT NULL DEFAULT 'occupancynpv',
  auth_identity_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.occupancynpv_entitlements (
  entitlement_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.occupancynpv_customers (customer_id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL CHECK (offer_id IN ('PROFESSIONAL', 'PER_DEAL')),
  payment_reference TEXT NOT NULL,
  subscription_reference TEXT,
  entitlement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  quantity_remaining INTEGER,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED', 'CONSUMED', 'FAILED')),
  start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX occupancynpv_entitlements_payment_offer_uidx
  ON public.occupancynpv_entitlements (payment_reference, offer_id);

CREATE TABLE public.occupancynpv_deal_workspaces (
  workspace_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.occupancynpv_customers (customer_id) ON DELETE CASCADE,
  entitlement_id TEXT NOT NULL REFERENCES public.occupancynpv_entitlements (entitlement_id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.occupancynpv_lease_scenarios (
  scenario_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES public.occupancynpv_deal_workspaces (workspace_id) ON DELETE CASCADE,
  input_json JSONB NOT NULL,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, scenario_id)
);

CREATE TABLE public.occupancynpv_fulfillment_orders (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.occupancynpv_customers (customer_id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL,
  payment_reference TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.occupancynpv_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupancynpv_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupancynpv_deal_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupancynpv_lease_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupancynpv_fulfillment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY occupancynpv_customers_own ON public.occupancynpv_customers
  FOR ALL TO authenticated
  USING (auth_identity_id = auth.uid())
  WITH CHECK (auth_identity_id = auth.uid());

CREATE POLICY occupancynpv_entitlements_own ON public.occupancynpv_entitlements
  FOR ALL TO authenticated
  USING (customer_id IN (SELECT customer_id FROM public.occupancynpv_customers WHERE auth_identity_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT customer_id FROM public.occupancynpv_customers WHERE auth_identity_id = auth.uid()));

CREATE POLICY occupancynpv_workspaces_own ON public.occupancynpv_deal_workspaces
  FOR ALL TO authenticated
  USING (customer_id IN (SELECT customer_id FROM public.occupancynpv_customers WHERE auth_identity_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT customer_id FROM public.occupancynpv_customers WHERE auth_identity_id = auth.uid()));

CREATE POLICY occupancynpv_scenarios_own ON public.occupancynpv_lease_scenarios
  FOR ALL TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.occupancynpv_deal_workspaces
    WHERE customer_id IN (SELECT customer_id FROM public.occupancynpv_customers WHERE auth_identity_id = auth.uid())
  ))
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.occupancynpv_deal_workspaces
    WHERE customer_id IN (SELECT customer_id FROM public.occupancynpv_customers WHERE auth_identity_id = auth.uid())
  ));

CREATE POLICY occupancynpv_orders_own ON public.occupancynpv_fulfillment_orders
  FOR ALL TO authenticated
  USING (customer_id IN (SELECT customer_id FROM public.occupancynpv_customers WHERE auth_identity_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT customer_id FROM public.occupancynpv_customers WHERE auth_identity_id = auth.uid()));

GRANT ALL ON public.occupancynpv_customers TO service_role;
GRANT ALL ON public.occupancynpv_entitlements TO service_role;
GRANT ALL ON public.occupancynpv_deal_workspaces TO service_role;
GRANT ALL ON public.occupancynpv_lease_scenarios TO service_role;
GRANT ALL ON public.occupancynpv_fulfillment_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.occupancynpv_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.occupancynpv_entitlements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.occupancynpv_deal_workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.occupancynpv_lease_scenarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.occupancynpv_fulfillment_orders TO authenticated;
