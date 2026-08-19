-- =============================================================================
-- Commercialization Control Plane v1 — Venture Treasury, Domain, Revenue, Fulfillment
-- Posture: service_role writes; RLS enabled; no authenticated mutation policies
-- =============================================================================

CREATE TABLE public.commercialization_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  venture_blueprint_id UUID,
  selected_candidate_id UUID,
  mission_id UUID,
  cycle_key TEXT,
  brand_name TEXT NOT NULL,
  product_type TEXT,
  business_model TEXT,
  domain_requirements JSONB NOT NULL DEFAULT '{}'::JSONB,
  hosting_requirements JSONB NOT NULL DEFAULT '{}'::JSONB,
  payment_model JSONB NOT NULL DEFAULT '{}'::JSONB,
  pricing JSONB NOT NULL DEFAULT '{}'::JSONB,
  fulfillment_model JSONB NOT NULL DEFAULT '{}'::JSONB,
  expected_infrastructure_spend JSONB NOT NULL DEFAULT '{}'::JSONB,
  external_action_requirements JSONB NOT NULL DEFAULT '[]'::JSONB,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  current_stage TEXT NOT NULL DEFAULT 'PLAN',
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commercialization_plans_status_valid CHECK (
    status IN ('DRAFT', 'READY', 'EXECUTING', 'ACTIVE', 'BLOCKED', 'FAILED')
  ),
  CONSTRAINT commercialization_plans_stage_valid CHECK (
    current_stage IN ('PLAN', 'DOMAIN', 'INFRASTRUCTURE', 'DEPLOY', 'REVENUE_ACTIVATION', 'VERIFY', 'READY')
  ),
  CONSTRAINT commercialization_plans_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX commercialization_plans_org_idempotency_uidx
  ON public.commercialization_plans (organization_id, idempotency_key);

CREATE INDEX commercialization_plans_org_venture_idx
  ON public.commercialization_plans (organization_id, venture_id, created_at DESC);

-- -----------------------------------------------------------------------------

CREATE TABLE public.venture_commercial_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  authorized_budget_usd NUMERIC(14, 6),
  actual_spend_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  actual_revenue_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  budget_truth TEXT NOT NULL DEFAULT 'UNKNOWN',
  revenue_truth TEXT NOT NULL DEFAULT 'UNKNOWN',
  policy_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venture_commercial_budgets_truth_valid CHECK (
    budget_truth IN ('ACTUAL', 'ESTIMATE', 'UNKNOWN')
    AND revenue_truth IN ('ACTUAL', 'ESTIMATE', 'UNKNOWN')
  )
);

CREATE UNIQUE INDEX venture_commercial_budgets_org_venture_uidx
  ON public.venture_commercial_budgets (organization_id, venture_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.spend_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  mission_id UUID,
  commercialization_plan_id UUID REFERENCES public.commercialization_plans (id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  provider TEXT NOT NULL,
  capability TEXT NOT NULL,
  purpose TEXT NOT NULL,
  requested_amount_usd NUMERIC(14, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  estimated_recurring_amount_usd NUMERIC(14, 6),
  reversibility TEXT NOT NULL,
  expected_value JSONB NOT NULL DEFAULT '{}'::JSONB,
  policy_decision TEXT,
  authority_source TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT spend_intents_category_valid CHECK (
    category IN (
      'DOMAIN_REGISTRATION', 'DOMAIN_RENEWAL', 'HOSTING', 'EMAIL',
      'SAAS_INFRASTRUCTURE', 'PAYMENT_PROCESSING', 'CREATIVE', 'MARKETING', 'OTHER'
    )
  ),
  CONSTRAINT spend_intents_policy_valid CHECK (
    policy_decision IS NULL OR policy_decision IN ('AUTO_ALLOWED', 'CONDITIONALLY_ALLOWED', 'HITL_REQUIRED', 'DENIED')
  ),
  CONSTRAINT spend_intents_status_valid CHECK (
    status IN ('PENDING', 'AUTHORIZED', 'DENIED', 'EXECUTED', 'FAILED', 'CANCELLED')
  ),
  CONSTRAINT spend_intents_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX spend_intents_org_idempotency_uidx
  ON public.spend_intents (organization_id, idempotency_key);

CREATE INDEX spend_intents_org_venture_idx
  ON public.spend_intents (organization_id, venture_id, created_at DESC);

-- -----------------------------------------------------------------------------

CREATE TABLE public.spend_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  spend_intent_id UUID NOT NULL REFERENCES public.spend_intents (id) ON DELETE CASCADE,
  external_action_id UUID,
  authorized_amount_usd NUMERIC(14, 6) NOT NULL,
  policy_outcome TEXT NOT NULL,
  authority_source TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT spend_authorizations_policy_valid CHECK (
    policy_outcome IN ('AUTO_ALLOWED', 'CONDITIONALLY_ALLOWED', 'HITL_REQUIRED', 'DENIED')
  )
);

CREATE UNIQUE INDEX spend_authorizations_intent_uidx ON public.spend_authorizations (spend_intent_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.spend_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  spend_intent_id UUID NOT NULL REFERENCES public.spend_intents (id) ON DELETE CASCADE,
  spend_authorization_id UUID NOT NULL REFERENCES public.spend_authorizations (id) ON DELETE CASCADE,
  external_action_id UUID,
  provider TEXT NOT NULL,
  capability TEXT NOT NULL,
  execution_status TEXT NOT NULL DEFAULT 'PENDING',
  actual_cost_usd NUMERIC(14, 6),
  cost_truth TEXT NOT NULL DEFAULT 'UNKNOWN',
  provider_reference TEXT,
  idempotency_key TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT spend_executions_status_valid CHECK (
    execution_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'BLOCKED')
  ),
  CONSTRAINT spend_executions_cost_truth_valid CHECK (
    cost_truth IN ('ACTUAL', 'ESTIMATE', 'UNKNOWN')
  ),
  CONSTRAINT spend_executions_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX spend_executions_org_idempotency_uidx
  ON public.spend_executions (organization_id, idempotency_key);

-- -----------------------------------------------------------------------------

CREATE TABLE public.commercial_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  entry_type TEXT NOT NULL,
  amount_usd NUMERIC(14, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  truth TEXT NOT NULL DEFAULT 'UNKNOWN',
  category TEXT,
  source_type TEXT NOT NULL,
  source_id UUID,
  idempotency_key TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commercial_ledger_entry_type_valid CHECK (
    entry_type IN (
      'MODEL_SPEND', 'DOMAIN_SPEND', 'HOSTING_SPEND', 'PAYMENT_PROCESSING_FEES',
      'MARKETING_SPEND', 'OTHER_EXTERNAL_SPEND', 'GROSS_REVENUE', 'REFUNDS', 'NET_REVENUE'
    )
  ),
  CONSTRAINT commercial_ledger_truth_valid CHECK (truth IN ('ACTUAL', 'ESTIMATE', 'UNKNOWN')),
  CONSTRAINT commercial_ledger_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX commercial_ledger_org_idempotency_uidx
  ON public.commercial_ledger_entries (organization_id, idempotency_key);

CREATE INDEX commercial_ledger_org_venture_idx
  ON public.commercial_ledger_entries (organization_id, venture_id, recorded_at DESC);

-- -----------------------------------------------------------------------------

CREATE TABLE public.domain_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  commercialization_plan_id UUID REFERENCES public.commercialization_plans (id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  business_description TEXT,
  preferred_keywords JSONB NOT NULL DEFAULT '[]'::JSONB,
  preferred_tlds JSONB NOT NULL DEFAULT '[".com"]'::JSONB,
  max_length INTEGER,
  avoid_hyphens BOOLEAN NOT NULL DEFAULT TRUE,
  avoid_numbers BOOLEAN NOT NULL DEFAULT FALSE,
  brandability_priority NUMERIC(4, 3),
  seo_priority NUMERIC(4, 3),
  maximum_purchase_price_usd NUMERIC(14, 6),
  renewal_price_constraint_usd NUMERIC(14, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX domain_requirements_org_venture_idx
  ON public.domain_requirements (organization_id, venture_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.domain_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  domain_requirement_id UUID NOT NULL REFERENCES public.domain_requirements (id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  tld TEXT NOT NULL,
  available BOOLEAN,
  registration_price_usd NUMERIC(14, 6),
  renewal_price_usd NUMERIC(14, 6),
  price_truth TEXT NOT NULL DEFAULT 'UNKNOWN',
  total_score NUMERIC(6, 3) NOT NULL,
  score_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
  selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT domain_candidates_price_truth_valid CHECK (price_truth IN ('ACTUAL', 'ESTIMATE', 'UNKNOWN'))
);

CREATE INDEX domain_candidates_requirement_idx
  ON public.domain_candidates (domain_requirement_id, total_score DESC);

-- -----------------------------------------------------------------------------

CREATE TABLE public.domain_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  domain TEXT NOT NULL,
  registrar TEXT NOT NULL,
  registrar_domain_id TEXT,
  registration_price_usd NUMERIC(14, 6),
  renewal_price_usd NUMERIC(14, 6),
  price_truth TEXT NOT NULL DEFAULT 'UNKNOWN',
  currency TEXT NOT NULL DEFAULT 'USD',
  registered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  nameserver_mode TEXT,
  dns_provider TEXT,
  verification_state TEXT NOT NULL DEFAULT 'UNKNOWN',
  spend_execution_id UUID REFERENCES public.spend_executions (id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT domain_assets_status_valid CHECK (
    status IN ('PENDING', 'REGISTERED', 'FAILED', 'EXPIRED', 'TRANSFERRED')
  ),
  CONSTRAINT domain_assets_price_truth_valid CHECK (price_truth IN ('ACTUAL', 'ESTIMATE', 'UNKNOWN')),
  CONSTRAINT domain_assets_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX domain_assets_org_idempotency_uidx
  ON public.domain_assets (organization_id, idempotency_key);

CREATE UNIQUE INDEX domain_assets_org_domain_uidx
  ON public.domain_assets (organization_id, domain);

-- -----------------------------------------------------------------------------

CREATE TABLE public.dns_desired_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  domain_asset_id UUID REFERENCES public.domain_assets (id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dns_desired_states_status_valid CHECK (
    status IN ('PENDING', 'RECONCILING', 'SYNCED', 'DEGRADED', 'FAILED')
  ),
  CONSTRAINT dns_desired_states_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX dns_desired_states_org_idempotency_uidx
  ON public.dns_desired_states (organization_id, idempotency_key);

-- -----------------------------------------------------------------------------

CREATE TABLE public.dns_records_desired (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  dns_desired_state_id UUID NOT NULL REFERENCES public.dns_desired_states (id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  ttl INTEGER NOT NULL DEFAULT 300,
  purpose TEXT,
  CONSTRAINT dns_records_desired_type_valid CHECK (
    record_type IN ('A', 'AAAA', 'CNAME', 'TXT', 'MX', 'CAA')
  )
);

CREATE INDEX dns_records_desired_state_idx ON public.dns_records_desired (dns_desired_state_id);

-- -----------------------------------------------------------------------------

CREATE TABLE public.venture_deployment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  provider TEXT NOT NULL,
  project_id TEXT,
  deployment_id TEXT,
  environment TEXT NOT NULL DEFAULT 'production',
  status TEXT NOT NULL DEFAULT 'PENDING',
  deployment_url TEXT,
  custom_domain TEXT,
  artifact_id UUID,
  commit_hash TEXT,
  production_ready BOOLEAN NOT NULL DEFAULT FALSE,
  deployed BOOLEAN NOT NULL DEFAULT FALSE,
  domain_attached BOOLEAN NOT NULL DEFAULT FALSE,
  publicly_launched BOOLEAN NOT NULL DEFAULT FALSE,
  rollback_reference TEXT,
  verified_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venture_deployment_assets_status_valid CHECK (
    status IN ('PENDING', 'PRODUCTION_READY', 'DEPLOYED', 'DOMAIN_ATTACHED', 'PUBLICLY_LAUNCHED', 'FAILED', 'ROLLED_BACK')
  ),
  CONSTRAINT venture_deployment_assets_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX venture_deployment_assets_org_idempotency_uidx
  ON public.venture_deployment_assets (organization_id, idempotency_key);

-- -----------------------------------------------------------------------------

CREATE TABLE public.revenue_activation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  commercialization_plan_id UUID REFERENCES public.commercialization_plans (id) ON DELETE SET NULL,
  monetization_plan_id UUID,
  monetization_run_id UUID,
  business_model TEXT NOT NULL,
  pricing_model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT revenue_activation_plans_status_valid CHECK (
    status IN ('DRAFT', 'CONFIGURING', 'READY', 'ACTIVE', 'BLOCKED', 'FAILED')
  ),
  CONSTRAINT revenue_activation_plans_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX revenue_activation_plans_org_idempotency_uidx
  ON public.revenue_activation_plans (organization_id, idempotency_key);

-- -----------------------------------------------------------------------------

CREATE TABLE public.commercial_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  revenue_activation_plan_id UUID REFERENCES public.revenue_activation_plans (id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_product_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  business_model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  monetization_plan_id UUID,
  monetization_run_id UUID,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commercial_products_status_valid CHECK (
    status IN ('DRAFT', 'CONFIGURED', 'ACTIVE', 'ARCHIVED')
  ),
  CONSTRAINT commercial_products_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX commercial_products_org_idempotency_uidx
  ON public.commercial_products (organization_id, idempotency_key);

-- -----------------------------------------------------------------------------

CREATE TABLE public.commercial_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  commercial_product_id UUID NOT NULL REFERENCES public.commercial_products (id) ON DELETE CASCADE,
  provider_price_id TEXT,
  amount_usd NUMERIC(14, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  interval TEXT,
  pricing_type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  estimate_source TEXT,
  monetization_plan_id UUID,
  lineage JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commercial_prices_type_valid CHECK (
    pricing_type IN ('ONE_TIME', 'SUBSCRIPTION', 'USAGE_BASED', 'LEAD_GENERATION', 'SERVICE_DEPOSIT', 'FREE_WITH_UPGRADE')
  ),
  CONSTRAINT commercial_prices_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX commercial_prices_org_idempotency_uidx
  ON public.commercial_prices (organization_id, idempotency_key);

-- -----------------------------------------------------------------------------

CREATE TABLE public.commercial_checkout_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  commercial_product_id UUID NOT NULL REFERENCES public.commercial_products (id) ON DELETE CASCADE,
  commercial_price_id UUID NOT NULL REFERENCES public.commercial_prices (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  checkout_url TEXT,
  success_url TEXT,
  cancel_url TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  venture_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commercial_checkout_status_valid CHECK (
    status IN ('DRAFT', 'READY', 'ACTIVE', 'FAILED')
  ),
  CONSTRAINT commercial_checkout_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX commercial_checkout_org_idempotency_uidx
  ON public.commercial_checkout_configurations (organization_id, idempotency_key);

-- -----------------------------------------------------------------------------

CREATE TABLE public.commercial_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  commercial_product_id UUID REFERENCES public.commercial_products (id) ON DELETE SET NULL,
  commercial_price_id UUID REFERENCES public.commercial_prices (id) ON DELETE SET NULL,
  gross_amount_usd NUMERIC(14, 6),
  fee_amount_usd NUMERIC(14, 6),
  net_amount_usd NUMERIC(14, 6),
  amount_truth TEXT NOT NULL DEFAULT 'ACTUAL',
  currency TEXT NOT NULL DEFAULT 'USD',
  customer_reference TEXT,
  payload_sanitized JSONB NOT NULL DEFAULT '{}'::JSONB,
  processed_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commercial_payment_events_type_valid CHECK (
    event_type IN (
      'CHECKOUT_COMPLETED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED',
      'SUBSCRIPTION_STARTED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_CANCELLED', 'REFUND_CREATED'
    )
  ),
  CONSTRAINT commercial_payment_events_amount_truth_valid CHECK (amount_truth IN ('ACTUAL', 'ESTIMATE', 'UNKNOWN')),
  CONSTRAINT commercial_payment_events_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX commercial_payment_events_provider_event_uidx
  ON public.commercial_payment_events (organization_id, provider, provider_event_id);

CREATE UNIQUE INDEX commercial_payment_events_org_idempotency_uidx
  ON public.commercial_payment_events (organization_id, idempotency_key);

-- -----------------------------------------------------------------------------

CREATE TABLE public.commercial_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID NOT NULL,
  customer_id TEXT NOT NULL,
  commercial_product_id UUID NOT NULL REFERENCES public.commercial_products (id) ON DELETE CASCADE,
  commercial_price_id UUID REFERENCES public.commercial_prices (id) ON DELETE SET NULL,
  provider_subscription_id TEXT,
  entitlement_type TEXT NOT NULL DEFAULT 'SAAS_ENTITLEMENT',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  payment_event_id UUID REFERENCES public.commercial_payment_events (id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL,
  CONSTRAINT commercial_entitlements_status_valid CHECK (
    status IN ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED')
  ),
  CONSTRAINT commercial_entitlements_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX commercial_entitlements_org_idempotency_uidx
  ON public.commercial_entitlements (organization_id, idempotency_key);

-- -----------------------------------------------------------------------------

ALTER TABLE public.commercialization_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_commercial_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spend_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spend_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spend_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dns_desired_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dns_records_desired ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_deployment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_activation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_checkout_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_entitlements ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.commercialization_plans TO service_role;
GRANT ALL ON public.venture_commercial_budgets TO service_role;
GRANT ALL ON public.spend_intents TO service_role;
GRANT ALL ON public.spend_authorizations TO service_role;
GRANT ALL ON public.spend_executions TO service_role;
GRANT ALL ON public.commercial_ledger_entries TO service_role;
GRANT ALL ON public.domain_requirements TO service_role;
GRANT ALL ON public.domain_candidates TO service_role;
GRANT ALL ON public.domain_assets TO service_role;
GRANT ALL ON public.dns_desired_states TO service_role;
GRANT ALL ON public.dns_records_desired TO service_role;
GRANT ALL ON public.venture_deployment_assets TO service_role;
GRANT ALL ON public.revenue_activation_plans TO service_role;
GRANT ALL ON public.commercial_products TO service_role;
GRANT ALL ON public.commercial_prices TO service_role;
GRANT ALL ON public.commercial_checkout_configurations TO service_role;
GRANT ALL ON public.commercial_payment_events TO service_role;
GRANT ALL ON public.commercial_entitlements TO service_role;

COMMENT ON TABLE public.commercialization_plans IS
  'Persisted commercialization plan before any external spend or mutation.';
