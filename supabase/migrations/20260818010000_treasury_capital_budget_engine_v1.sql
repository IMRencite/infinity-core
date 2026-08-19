-- =============================================================================
-- Treasury + Capital / Budget Engine V1
-- Posture: service_role writes; RLS enabled; no authenticated mutation policies
-- Provider connections store safe account IDs only — never credentials.
-- =============================================================================

CREATE TABLE public.treasury_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  connection_status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  external_account_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  capabilities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT treasury_provider_connections_status_valid CHECK (
    connection_status IN ('NOT_CONFIGURED', 'CONFIGURED', 'DEGRADED', 'UNAVAILABLE')
  )
);

CREATE UNIQUE INDEX treasury_provider_connections_org_provider_uidx
  ON public.treasury_provider_connections (organization_id, provider);

CREATE TABLE public.treasury_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  account_kind TEXT NOT NULL DEFAULT 'OTHER',
  status TEXT NOT NULL DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX treasury_accounts_org_provider_ext_uidx
  ON public.treasury_accounts (organization_id, provider, external_account_id);

CREATE TABLE public.treasury_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  account_id UUID NOT NULL,
  available_amount NUMERIC(14, 6),
  available_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  current_amount NUMERIC(14, 6),
  current_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT NOT NULL DEFAULT 'CACHE',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT treasury_balance_snapshots_actuality_valid CHECK (
    available_actuality IN ('ACTUAL', 'ESTIMATE', 'UNKNOWN')
    AND current_actuality IN ('ACTUAL', 'ESTIMATE', 'UNKNOWN')
  ),
  CONSTRAINT treasury_balance_snapshots_source_valid CHECK (source IN ('PROVIDER', 'CACHE'))
);

CREATE INDEX treasury_balance_snapshots_org_account_idx
  ON public.treasury_balance_snapshots (organization_id, account_id, captured_at DESC);

CREATE TABLE public.treasury_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID,
  account_id UUID,
  provider TEXT NOT NULL,
  provider_transaction_id TEXT NOT NULL,
  amount NUMERIC(14, 6),
  amount_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  currency TEXT NOT NULL DEFAULT 'USD',
  classification TEXT NOT NULL,
  merchant TEXT,
  category TEXT,
  purpose TEXT,
  financial_action_request_id UUID,
  authorization_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'POSTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT treasury_transactions_class_valid CHECK (
    classification IN ('EXPENSE', 'REVENUE', 'TRANSFER', 'CAPITAL_CONTRIBUTION', 'REFUND', 'CHARGEBACK', 'UNKNOWN')
  )
);

CREATE UNIQUE INDEX treasury_transactions_org_provider_txn_uidx
  ON public.treasury_transactions (organization_id, provider, provider_transaction_id);

CREATE TABLE public.treasury_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  scope_type TEXT NOT NULL,
  venture_id UUID,
  mission_id UUID,
  category TEXT,
  provider TEXT,
  period TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  allocated_amount NUMERIC(14, 6),
  allocated_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  spent_amount NUMERIC(14, 6),
  spent_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  reserved_amount NUMERIC(14, 6),
  reserved_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  committed_amount NUMERIC(14, 6),
  committed_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  available_amount NUMERIC(14, 6),
  available_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT treasury_budgets_scope_valid CHECK (
    scope_type IN ('GLOBAL', 'CATEGORY', 'VENTURE', 'MISSION', 'ACTION', 'PROVIDER', 'DAILY', 'MONTHLY')
  )
);

CREATE INDEX treasury_budgets_org_scope_idx
  ON public.treasury_budgets (organization_id, scope_type, venture_id, category);

CREATE TABLE public.treasury_budget_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  budget_id UUID NOT NULL REFERENCES public.treasury_budgets (id) ON DELETE CASCADE,
  financial_action_request_id UUID NOT NULL,
  amount NUMERIC(14, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  spent_at TIMESTAMPTZ,
  CONSTRAINT treasury_budget_reservations_status_valid CHECK (status IN ('ACTIVE', 'SPENT', 'RELEASED', 'EXPIRED'))
);

CREATE INDEX treasury_budget_reservations_org_budget_idx
  ON public.treasury_budget_reservations (organization_id, budget_id, status);

CREATE TABLE public.venture_capital_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  capital_allocated NUMERIC(14, 6),
  capital_allocated_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  capital_spent NUMERIC(14, 6),
  capital_spent_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  capital_reserved NUMERIC(14, 6),
  capital_reserved_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  capital_committed NUMERIC(14, 6),
  capital_committed_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  capital_available NUMERIC(14, 6),
  capital_available_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  expected_revenue NUMERIC(14, 6),
  expected_revenue_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  actual_revenue NUMERIC(14, 6),
  actual_revenue_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  expected_profit NUMERIC(14, 6),
  expected_profit_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  actual_profit NUMERIC(14, 6),
  actual_profit_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  expected_roi NUMERIC(14, 6),
  expected_roi_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  actual_roi NUMERIC(14, 6),
  actual_roi_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  selection_score NUMERIC(8, 4),
  monetization_score NUMERIC(8, 4),
  risk NUMERIC(8, 4),
  stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX venture_capital_allocations_org_venture_uidx
  ON public.venture_capital_allocations (organization_id, venture_id);

CREATE TABLE public.financial_action_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID,
  mission_id UUID,
  opportunity_id UUID,
  purpose TEXT NOT NULL,
  category TEXT NOT NULL,
  action_type TEXT NOT NULL,
  merchant TEXT,
  provider TEXT,
  recipient TEXT,
  amount NUMERIC(14, 6),
  amount_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  currency TEXT NOT NULL DEFAULT 'USD',
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence JSONB,
  expected_value NUMERIC(14, 6),
  expected_value_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  economic_justification TEXT,
  required_for_mvp BOOLEAN NOT NULL DEFAULT FALSE,
  alternatives JSONB NOT NULL DEFAULT '[]'::JSONB,
  risk TEXT NOT NULL DEFAULT 'UNKNOWN',
  budget_source TEXT,
  maximum_authorized_amount NUMERIC(14, 6),
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROPOSED',
  spend_intent_id UUID,
  media_requirement_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT financial_action_requests_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX financial_action_requests_org_idempotency_uidx
  ON public.financial_action_requests (organization_id, idempotency_key);

CREATE INDEX financial_action_requests_org_venture_idx
  ON public.financial_action_requests (organization_id, venture_id, created_at DESC);

CREATE TABLE public.financial_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  financial_action_request_id UUID NOT NULL REFERENCES public.financial_action_requests (id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  authorized_amount NUMERIC(14, 6),
  authorized_amount_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  currency TEXT NOT NULL DEFAULT 'USD',
  policy_version TEXT NOT NULL,
  reason_codes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  authorization_source TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT financial_authorizations_decision_valid CHECK (
    decision IN ('AUTO_AUTHORIZE', 'REQUIRE_POLICY_ESCALATION', 'BLOCK')
  ),
  CONSTRAINT financial_authorizations_source_valid CHECK (
    authorization_source IN ('POLICY_ENGINE', 'POLICY_ESCALATION', 'OTHER_GOVERNED_SOURCE')
  )
);

CREATE INDEX financial_authorizations_org_request_idx
  ON public.financial_authorizations (organization_id, financial_action_request_id);

CREATE TABLE public.financial_action_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  financial_action_request_id UUID NOT NULL REFERENCES public.financial_action_requests (id) ON DELETE CASCADE,
  authorization_id UUID NOT NULL REFERENCES public.financial_authorizations (id) ON DELETE CASCADE,
  reservation_id UUID,
  external_action_id UUID,
  provider TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  provider_reference TEXT,
  idempotency_key TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT financial_action_executions_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX financial_action_executions_org_idempotency_uidx
  ON public.financial_action_executions (organization_id, idempotency_key);

CREATE TABLE public.treasury_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID,
  mission_id UUID,
  entry_type TEXT NOT NULL,
  subtype TEXT,
  amount NUMERIC(14, 6),
  amount_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT,
  provider_transaction_id TEXT,
  financial_action_request_id UUID,
  authorization_id UUID,
  external_action_id UUID,
  commercial_payment_event_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key TEXT NOT NULL,
  CONSTRAINT treasury_ledger_entries_type_valid CHECK (
    entry_type IN ('EXPENSE', 'REVENUE', 'CAPITAL_CONTRIBUTION', 'TRANSFER', 'REFUND', 'CHARGEBACK')
  ),
  CONSTRAINT treasury_ledger_entries_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX treasury_ledger_entries_org_idempotency_uidx
  ON public.treasury_ledger_entries (organization_id, idempotency_key);

CREATE INDEX treasury_ledger_entries_org_venture_idx
  ON public.treasury_ledger_entries (organization_id, venture_id, occurred_at DESC);

CREATE TABLE public.treasury_recurring_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID,
  vendor TEXT NOT NULL,
  provider TEXT,
  purpose TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14, 6),
  amount_actuality TEXT NOT NULL DEFAULT 'UNKNOWN',
  currency TEXT NOT NULL DEFAULT 'USD',
  frequency TEXT NOT NULL,
  monthly_equivalent NUMERIC(14, 6),
  annual_equivalent NUMERIC(14, 6),
  next_expected_charge TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  business_value TEXT,
  cancellation_mechanism TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  financial_action_request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX treasury_recurring_commitments_org_idx
  ON public.treasury_recurring_commitments (organization_id, status);

CREATE TABLE public.treasury_control_state (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations (id) ON DELETE RESTRICT,
  financial_autonomy_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_financial_freeze BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: enabled, service_role only, no blanket authenticated policies
ALTER TABLE public.treasury_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_budget_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_capital_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_recurring_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_control_state ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.treasury_provider_connections TO service_role;
GRANT ALL ON public.treasury_accounts TO service_role;
GRANT ALL ON public.treasury_balance_snapshots TO service_role;
GRANT ALL ON public.treasury_transactions TO service_role;
GRANT ALL ON public.treasury_budgets TO service_role;
GRANT ALL ON public.treasury_budget_reservations TO service_role;
GRANT ALL ON public.venture_capital_allocations TO service_role;
GRANT ALL ON public.financial_action_requests TO service_role;
GRANT ALL ON public.financial_authorizations TO service_role;
GRANT ALL ON public.financial_action_executions TO service_role;
GRANT ALL ON public.treasury_ledger_entries TO service_role;
GRANT ALL ON public.treasury_recurring_commitments TO service_role;
GRANT ALL ON public.treasury_control_state TO service_role;
