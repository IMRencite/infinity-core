-- =============================================================================
-- Infinity Opportunity Engine v1 — Database Foundation
-- =============================================================================
-- Autonomous market scanning, opportunity discovery, evidence, versioned scoring,
-- and auditable engine events. All tables are organization-scoped with RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- opportunity_scans
-- -----------------------------------------------------------------------------

CREATE TABLE public.opportunity_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  status TEXT NOT NULL DEFAULT 'queued',
  scan_type TEXT NOT NULL,
  objective TEXT,

  search_scope JSONB NOT NULL DEFAULT '{}'::JSONB,
  constraints JSONB NOT NULL DEFAULT '{}'::JSONB,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  opportunities_discovered INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunity_scans_status_valid CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT opportunity_scans_scan_type_valid CHECK (
    scan_type IN (
      'broad_market',
      'industry',
      'trend',
      'problem',
      'keyword',
      'competitor',
      'regulatory',
      'technology',
      'manual_test'
    )
  ),
  CONSTRAINT opportunity_scans_opportunities_discovered_non_negative CHECK (
    opportunities_discovered >= 0
  )
);

COMMENT ON TABLE public.opportunity_scans IS
  'One autonomous market-scanning run executed by the Opportunity Engine.';

COMMENT ON COLUMN public.opportunity_scans.organization_id IS
  'Owning organization. Required for tenant isolation.';

COMMENT ON COLUMN public.opportunity_scans.status IS
  'Run lifecycle: queued, running, completed, failed, or cancelled.';

COMMENT ON COLUMN public.opportunity_scans.scan_type IS
  'Scan strategy such as broad_market, industry, trend, or manual_test.';

COMMENT ON COLUMN public.opportunity_scans.objective IS
  'Human-readable objective for the scan run.';

COMMENT ON COLUMN public.opportunity_scans.search_scope IS
  'JSON document describing markets, geographies, keywords, or sources to scan.';

COMMENT ON COLUMN public.opportunity_scans.constraints IS
  'JSON document describing budget, timing, and exclusion rules for the scan.';

COMMENT ON COLUMN public.opportunity_scans.opportunities_discovered IS
  'Count of opportunities linked to this scan when completed.';

CREATE INDEX opportunity_scans_organization_id_idx
  ON public.opportunity_scans (organization_id);

CREATE INDEX opportunity_scans_organization_status_idx
  ON public.opportunity_scans (organization_id, status);

CREATE INDEX opportunity_scans_organization_created_at_idx
  ON public.opportunity_scans (organization_id, created_at DESC);

CREATE INDEX opportunity_scans_organization_started_at_idx
  ON public.opportunity_scans (organization_id, started_at DESC)
  WHERE started_at IS NOT NULL;

CREATE TRIGGER opportunity_scans_set_updated_at
  BEFORE UPDATE ON public.opportunity_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- opportunities
-- -----------------------------------------------------------------------------

CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  scan_id UUID REFERENCES public.opportunity_scans (id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  problem TEXT,
  target_customer TEXT,
  industry TEXT,
  category TEXT,
  business_model TEXT,
  recommended_builder TEXT,

  status TEXT NOT NULL DEFAULT 'discovered',
  decision TEXT NOT NULL DEFAULT 'pending',

  confidence_score NUMERIC(5, 2),
  overall_score NUMERIC(5, 2),

  estimated_startup_cost_min NUMERIC(14, 2),
  estimated_startup_cost_max NUMERIC(14, 2),
  estimated_monthly_revenue NUMERIC(14, 2),
  estimated_time_to_revenue_months INTEGER,

  assumptions JSONB NOT NULL DEFAULT '{}'::JSONB,
  risks JSONB NOT NULL DEFAULT '[]'::JSONB,
  monetization_models JSONB NOT NULL DEFAULT '[]'::JSONB,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,

  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunities_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT opportunities_slug_not_blank CHECK (BTRIM(slug) <> ''),
  CONSTRAINT opportunities_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT opportunities_status_valid CHECK (
    status IN (
      'discovered',
      'researching',
      'scored',
      'validating',
      'recommended',
      'approved',
      'rejected',
      'held',
      'converted'
    )
  ),
  CONSTRAINT opportunities_decision_valid CHECK (
    decision IN ('pending', 'reject', 'hold', 'research_more', 'validate', 'build')
  ),
  CONSTRAINT opportunities_recommended_builder_valid CHECK (
    recommended_builder IS NULL
    OR recommended_builder IN (
      'saas',
      'ecommerce',
      'marketplace',
      'affiliate',
      'media',
      'directory',
      'course',
      'community',
      'newsletter',
      'mobile_app',
      'ai_tool',
      'browser_extension',
      'local_service',
      'custom'
    )
  ),
  CONSTRAINT opportunities_confidence_score_range CHECK (
    confidence_score IS NULL
    OR (confidence_score >= 0 AND confidence_score <= 100)
  ),
  CONSTRAINT opportunities_overall_score_range CHECK (
    overall_score IS NULL
    OR (overall_score >= 0 AND overall_score <= 100)
  ),
  CONSTRAINT opportunities_estimated_time_to_revenue_months_non_negative CHECK (
    estimated_time_to_revenue_months IS NULL
    OR estimated_time_to_revenue_months >= 0
  ),
  CONSTRAINT opportunities_organization_slug_unique UNIQUE (organization_id, slug)
);

COMMENT ON TABLE public.opportunities IS
  'Business opportunity discovered by Infinity before any Project or Company exists.';

COMMENT ON COLUMN public.opportunities.scan_id IS
  'Optional originating scan run. Must belong to the same organization.';

COMMENT ON COLUMN public.opportunities.recommended_builder IS
  'Suggested builder archetype such as saas or marketplace; custom allowed via text check.';

COMMENT ON COLUMN public.opportunities.status IS
  'Pipeline status from discovered through converted.';

COMMENT ON COLUMN public.opportunities.decision IS
  'Recommendation decision: pending, reject, hold, research_more, validate, or build.';

COMMENT ON COLUMN public.opportunities.source_snapshot IS
  'JSON snapshot of source signals at discovery time.';

CREATE INDEX opportunities_organization_id_idx
  ON public.opportunities (organization_id);

CREATE INDEX opportunities_organization_status_idx
  ON public.opportunities (organization_id, status);

CREATE INDEX opportunities_organization_decision_idx
  ON public.opportunities (organization_id, decision);

CREATE INDEX opportunities_scan_id_idx
  ON public.opportunities (scan_id)
  WHERE scan_id IS NOT NULL;

CREATE INDEX opportunities_organization_overall_score_idx
  ON public.opportunities (organization_id, overall_score DESC NULLS LAST);

CREATE INDEX opportunities_organization_discovered_at_idx
  ON public.opportunities (organization_id, discovered_at DESC);

CREATE INDEX opportunities_organization_created_at_idx
  ON public.opportunities (organization_id, created_at DESC);

CREATE TRIGGER opportunities_set_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- opportunity_evidence
-- -----------------------------------------------------------------------------

CREATE TABLE public.opportunity_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,

  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,

  source_url TEXT,
  source_name TEXT,
  source_published_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  raw_content TEXT,
  extracted_data JSONB NOT NULL DEFAULT '{}'::JSONB,

  relevance_score NUMERIC(5, 2),
  credibility_score NUMERIC(5, 2),
  supports_opportunity BOOLEAN,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunity_evidence_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT opportunity_evidence_type_valid CHECK (
    evidence_type IN (
      'market_signal',
      'customer_pain',
      'search_demand',
      'competitor',
      'trend',
      'pricing',
      'regulation',
      'technology',
      'social_discussion',
      'product_demand',
      'funding',
      'other'
    )
  ),
  CONSTRAINT opportunity_evidence_relevance_score_range CHECK (
    relevance_score IS NULL
    OR (relevance_score >= 0 AND relevance_score <= 100)
  ),
  CONSTRAINT opportunity_evidence_credibility_score_range CHECK (
    credibility_score IS NULL
    OR (credibility_score >= 0 AND credibility_score <= 100)
  )
);

COMMENT ON TABLE public.opportunity_evidence IS
  'Evidence and source material supporting evaluation of an opportunity.';

COMMENT ON COLUMN public.opportunity_evidence.source_url IS
  'Optional source URL; omitted for API or structured dataset evidence.';

COMMENT ON COLUMN public.opportunity_evidence.supports_opportunity IS
  'Whether this evidence supports or contradicts the opportunity thesis.';

CREATE INDEX opportunity_evidence_organization_id_idx
  ON public.opportunity_evidence (organization_id);

CREATE INDEX opportunity_evidence_opportunity_id_idx
  ON public.opportunity_evidence (opportunity_id);

CREATE INDEX opportunity_evidence_organization_opportunity_idx
  ON public.opportunity_evidence (organization_id, opportunity_id);

CREATE INDEX opportunity_evidence_organization_created_at_idx
  ON public.opportunity_evidence (organization_id, created_at DESC);

CREATE TRIGGER opportunity_evidence_set_updated_at
  BEFORE UPDATE ON public.opportunity_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- opportunity_scores
-- -----------------------------------------------------------------------------

CREATE TABLE public.opportunity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,

  scoring_version TEXT NOT NULL,

  demand_score NUMERIC(5, 2),
  competition_score NUMERIC(5, 2),
  profitability_score NUMERIC(5, 2),
  startup_cost_score NUMERIC(5, 2),
  time_to_revenue_score NUMERIC(5, 2),
  automation_score NUMERIC(5, 2),
  seo_score NUMERIC(5, 2),
  ai_search_score NUMERIC(5, 2),
  defensibility_score NUMERIC(5, 2),
  distribution_score NUMERIC(5, 2),
  operational_complexity_score NUMERIC(5, 2),
  risk_score NUMERIC(5, 2),
  validation_score NUMERIC(5, 2),

  overall_score NUMERIC(5, 2),
  confidence_score NUMERIC(5, 2),

  weighted_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
  reasoning TEXT,

  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT opportunity_scores_scoring_version_not_blank CHECK (
    BTRIM(scoring_version) <> ''
  ),
  CONSTRAINT opportunity_scores_demand_score_range CHECK (
    demand_score IS NULL OR (demand_score >= 0 AND demand_score <= 100)
  ),
  CONSTRAINT opportunity_scores_competition_score_range CHECK (
    competition_score IS NULL OR (competition_score >= 0 AND competition_score <= 100)
  ),
  CONSTRAINT opportunity_scores_profitability_score_range CHECK (
    profitability_score IS NULL
    OR (profitability_score >= 0 AND profitability_score <= 100)
  ),
  CONSTRAINT opportunity_scores_startup_cost_score_range CHECK (
    startup_cost_score IS NULL
    OR (startup_cost_score >= 0 AND startup_cost_score <= 100)
  ),
  CONSTRAINT opportunity_scores_time_to_revenue_score_range CHECK (
    time_to_revenue_score IS NULL
    OR (time_to_revenue_score >= 0 AND time_to_revenue_score <= 100)
  ),
  CONSTRAINT opportunity_scores_automation_score_range CHECK (
    automation_score IS NULL OR (automation_score >= 0 AND automation_score <= 100)
  ),
  CONSTRAINT opportunity_scores_seo_score_range CHECK (
    seo_score IS NULL OR (seo_score >= 0 AND seo_score <= 100)
  ),
  CONSTRAINT opportunity_scores_ai_search_score_range CHECK (
    ai_search_score IS NULL OR (ai_search_score >= 0 AND ai_search_score <= 100)
  ),
  CONSTRAINT opportunity_scores_defensibility_score_range CHECK (
    defensibility_score IS NULL
    OR (defensibility_score >= 0 AND defensibility_score <= 100)
  ),
  CONSTRAINT opportunity_scores_distribution_score_range CHECK (
    distribution_score IS NULL
    OR (distribution_score >= 0 AND distribution_score <= 100)
  ),
  CONSTRAINT opportunity_scores_operational_complexity_score_range CHECK (
    operational_complexity_score IS NULL
    OR (operational_complexity_score >= 0 AND operational_complexity_score <= 100)
  ),
  CONSTRAINT opportunity_scores_risk_score_range CHECK (
    risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)
  ),
  CONSTRAINT opportunity_scores_validation_score_range CHECK (
    validation_score IS NULL
    OR (validation_score >= 0 AND validation_score <= 100)
  ),
  CONSTRAINT opportunity_scores_overall_score_range CHECK (
    overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)
  ),
  CONSTRAINT opportunity_scores_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  )
);

COMMENT ON TABLE public.opportunity_scores IS
  'Versioned scoring results for an opportunity; prior scores are retained.';

COMMENT ON COLUMN public.opportunity_scores.scoring_version IS
  'Identifier for the scoring model version used for this result.';

COMMENT ON COLUMN public.opportunity_scores.weighted_breakdown IS
  'JSON document describing dimension weights and computed contributions.';

CREATE INDEX opportunity_scores_organization_id_idx
  ON public.opportunity_scores (organization_id);

CREATE INDEX opportunity_scores_opportunity_id_idx
  ON public.opportunity_scores (opportunity_id);

CREATE INDEX opportunity_scores_opportunity_scored_at_idx
  ON public.opportunity_scores (opportunity_id, scored_at DESC);

CREATE INDEX opportunity_scores_organization_overall_score_idx
  ON public.opportunity_scores (organization_id, overall_score DESC NULLS LAST);

CREATE INDEX opportunity_scores_organization_created_at_idx
  ON public.opportunity_scores (organization_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- engine_events
-- -----------------------------------------------------------------------------

CREATE TABLE public.engine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  engine_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,

  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT engine_events_engine_name_not_blank CHECK (BTRIM(engine_name) <> ''),
  CONSTRAINT engine_events_event_type_not_blank CHECK (BTRIM(event_type) <> ''),
  CONSTRAINT engine_events_entity_type_not_blank CHECK (BTRIM(entity_type) <> ''),
  CONSTRAINT engine_events_message_not_blank CHECK (BTRIM(message) <> ''),
  CONSTRAINT engine_events_severity_valid CHECK (
    severity IN ('debug', 'info', 'warning', 'error', 'critical')
  )
);

COMMENT ON TABLE public.engine_events IS
  'Append-only auditable event stream for autonomous engine activity.';

COMMENT ON COLUMN public.engine_events.engine_name IS
  'Engine emitting the event, such as opportunity_engine.';

COMMENT ON COLUMN public.engine_events.entity_type IS
  'Type of related entity such as opportunity_scan or opportunity.';

COMMENT ON COLUMN public.engine_events.entity_id IS
  'Optional UUID of the related entity record.';

CREATE INDEX engine_events_organization_id_idx
  ON public.engine_events (organization_id);

CREATE INDEX engine_events_organization_created_at_idx
  ON public.engine_events (organization_id, created_at DESC);

CREATE INDEX engine_events_organization_event_type_idx
  ON public.engine_events (organization_id, event_type);

CREATE INDEX engine_events_organization_engine_name_idx
  ON public.engine_events (organization_id, engine_name);

CREATE INDEX engine_events_entity_idx
  ON public.engine_events (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Cross-table organization consistency
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_opportunity_scan_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.scan_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.opportunity_scans AS s
      WHERE s.id = NEW.scan_id
        AND s.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION
        'opportunities.scan_id must reference a scan in the same organization';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_opportunity_scan_organization() IS
  'Ensures opportunities.scan_id belongs to the same organization.';

CREATE TRIGGER opportunities_validate_scan_organization
  BEFORE INSERT OR UPDATE OF scan_id, organization_id ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_opportunity_scan_organization();

CREATE OR REPLACE FUNCTION public.validate_opportunity_child_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.opportunities AS o
    WHERE o.id = NEW.opportunity_id
      AND o.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION
      'opportunity_id must reference an opportunity in the same organization';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_opportunity_child_organization() IS
  'Ensures child opportunity records match organization_id on the parent opportunity.';

CREATE TRIGGER opportunity_evidence_validate_opportunity_organization
  BEFORE INSERT OR UPDATE OF opportunity_id, organization_id ON public.opportunity_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_opportunity_child_organization();

CREATE TRIGGER opportunity_scores_validate_opportunity_organization
  BEFORE INSERT OR UPDATE OF opportunity_id, organization_id ON public.opportunity_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_opportunity_child_organization();

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.opportunity_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY opportunity_scans_select_member
  ON public.opportunity_scans
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY opportunity_scans_insert_member
  ON public.opportunity_scans
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY opportunity_scans_update_member
  ON public.opportunity_scans
  FOR UPDATE
  TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY opportunity_scans_delete_member
  ON public.opportunity_scans
  FOR DELETE
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY opportunities_select_member
  ON public.opportunities
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY opportunities_insert_member
  ON public.opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY opportunities_update_member
  ON public.opportunities
  FOR UPDATE
  TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY opportunities_delete_member
  ON public.opportunities
  FOR DELETE
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY opportunity_evidence_select_member
  ON public.opportunity_evidence
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY opportunity_evidence_insert_member
  ON public.opportunity_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY opportunity_evidence_update_member
  ON public.opportunity_evidence
  FOR UPDATE
  TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY opportunity_evidence_delete_member
  ON public.opportunity_evidence
  FOR DELETE
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY opportunity_scores_select_member
  ON public.opportunity_scores
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY opportunity_scores_insert_member
  ON public.opportunity_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY opportunity_scores_update_member
  ON public.opportunity_scores
  FOR UPDATE
  TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY opportunity_scores_delete_member
  ON public.opportunity_scores
  FOR DELETE
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY engine_events_select_member
  ON public.engine_events
  FOR SELECT
  TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY engine_events_insert_member
  ON public.engine_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY engine_events_update_member
  ON public.engine_events
  FOR UPDATE
  TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY engine_events_delete_member
  ON public.engine_events
  FOR DELETE
  TO authenticated
  USING (public.is_organization_member(organization_id));

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_scans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_evidence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engine_events TO authenticated;
