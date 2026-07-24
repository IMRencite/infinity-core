-- =============================================================================
-- Asset Foundation v1
-- =============================================================================
-- First-class portfolio assets, relationships, metrics, and versioned valuations.
-- Ventures: public.companies | Initiatives: public.projects
-- =============================================================================

-- -----------------------------------------------------------------------------
-- assets
-- -----------------------------------------------------------------------------

CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  venture_id UUID REFERENCES public.companies (id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES public.projects (id) ON DELETE SET NULL,
  parent_asset_id UUID REFERENCES public.assets (id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  lifecycle_stage TEXT NOT NULL DEFAULT 'planned',
  ownership_type TEXT NOT NULL DEFAULT 'owned',

  description TEXT,
  external_url TEXT,
  external_identifier TEXT,
  provider TEXT,
  acquisition_source TEXT,

  acquired_at TIMESTAMPTZ,
  launched_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,

  currency TEXT,
  acquisition_cost NUMERIC,
  build_cost NUMERIC,
  monthly_operating_cost NUMERIC,
  monthly_revenue NUMERIC,
  estimated_value NUMERIC,
  verified_value NUMERIC,

  valuation_method TEXT,
  valuation_version TEXT,
  valuation_as_of TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT assets_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT assets_slug_not_blank CHECK (BTRIM(slug) <> ''),
  CONSTRAINT assets_type_valid CHECK (
    asset_type IN (
      'domain', 'brand', 'website', 'ecommerce_store', 'saas_application',
      'mobile_application', 'api', 'database', 'dataset', 'ai_model', 'ai_worker',
      'automation', 'content_library', 'article', 'video', 'image_library',
      'newsletter', 'email_list', 'social_account', 'community', 'marketplace',
      'directory', 'course', 'book', 'intellectual_property', 'patent',
      'trademark', 'customer_list', 'ad_account', 'analytics_property', 'crm',
      'codebase', 'infrastructure', 'legal_entity', 'contract', 'partnership',
      'acquisition', 'other'
    )
  ),
  CONSTRAINT assets_status_valid CHECK (
    status IN (
      'planned', 'building', 'active', 'paused', 'under_review', 'for_sale',
      'sold', 'archived', 'retired', 'failed'
    )
  ),
  CONSTRAINT assets_lifecycle_stage_valid CHECK (
    lifecycle_stage IN (
      'proposed', 'planned', 'acquiring', 'building', 'testing', 'launched',
      'operating', 'optimizing', 'scaling', 'harvesting', 'exiting', 'archived',
      'retired'
    )
  ),
  CONSTRAINT assets_ownership_type_valid CHECK (
    ownership_type IN (
      'owned', 'licensed', 'leased', 'partnered', 'managed', 'acquired', 'external'
    )
  ),
  CONSTRAINT assets_acquisition_cost_non_negative CHECK (
    acquisition_cost IS NULL OR acquisition_cost >= 0
  ),
  CONSTRAINT assets_build_cost_non_negative CHECK (
    build_cost IS NULL OR build_cost >= 0
  ),
  CONSTRAINT assets_monthly_operating_cost_non_negative CHECK (
    monthly_operating_cost IS NULL OR monthly_operating_cost >= 0
  ),
  CONSTRAINT assets_monthly_revenue_non_negative CHECK (
    monthly_revenue IS NULL OR monthly_revenue >= 0
  ),
  CONSTRAINT assets_estimated_value_non_negative CHECK (
    estimated_value IS NULL OR estimated_value >= 0
  ),
  CONSTRAINT assets_verified_value_non_negative CHECK (
    verified_value IS NULL OR verified_value >= 0
  ),
  CONSTRAINT assets_unique_slug UNIQUE (organization_id, slug)
);

COMMENT ON TABLE public.assets IS
  'First-class portfolio assets owned, managed, or tracked by Infinity.';

COMMENT ON COLUMN public.assets.venture_id IS
  'Optional operating venture (companies). Must belong to the same organization.';

COMMENT ON COLUMN public.assets.initiative_id IS
  'Optional originating initiative (projects). Must belong to the same organization.';

CREATE INDEX assets_organization_id_idx ON public.assets (organization_id);
CREATE INDEX assets_venture_id_idx ON public.assets (venture_id);
CREATE INDEX assets_initiative_id_idx ON public.assets (initiative_id);
CREATE INDEX assets_asset_type_idx ON public.assets (organization_id, asset_type);
CREATE INDEX assets_status_idx ON public.assets (organization_id, status);
CREATE INDEX assets_lifecycle_stage_idx ON public.assets (organization_id, lifecycle_stage);
CREATE INDEX assets_parent_asset_id_idx ON public.assets (parent_asset_id);
CREATE INDEX assets_created_at_idx ON public.assets (organization_id, created_at DESC);
CREATE INDEX assets_estimated_value_idx ON public.assets (organization_id, estimated_value);

CREATE TRIGGER assets_set_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- asset_relationships
-- -----------------------------------------------------------------------------

CREATE TABLE public.asset_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  source_asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  target_asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,

  relationship_type TEXT NOT NULL,
  strength_score NUMERIC,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT asset_relationships_type_not_blank CHECK (BTRIM(relationship_type) <> ''),
  CONSTRAINT asset_relationships_distinct_assets CHECK (
    source_asset_id <> target_asset_id
  ),
  CONSTRAINT asset_relationships_type_valid CHECK (
    relationship_type IN (
      'owns', 'depends_on', 'powers', 'publishes_to', 'distributes', 'redirects_to',
      'links_to', 'shares_audience_with', 'shares_data_with', 'supports',
      'bundles_with', 'derived_from', 'replaces', 'licensed_to', 'monetizes',
      'promotes', 'deployed_on', 'managed_by', 'related_to'
    )
  ),
  CONSTRAINT asset_relationships_strength_score_range CHECK (
    strength_score IS NULL OR (strength_score >= 0 AND strength_score <= 100)
  ),
  CONSTRAINT asset_relationships_unique_identity UNIQUE (
    organization_id,
    source_asset_id,
    target_asset_id,
    relationship_type
  )
);

COMMENT ON TABLE public.asset_relationships IS
  'Explicit relationships between portfolio assets within an organization.';

CREATE INDEX asset_relationships_organization_id_idx
  ON public.asset_relationships (organization_id);
CREATE INDEX asset_relationships_source_asset_id_idx
  ON public.asset_relationships (source_asset_id);
CREATE INDEX asset_relationships_target_asset_id_idx
  ON public.asset_relationships (target_asset_id);
CREATE INDEX asset_relationships_relationship_type_idx
  ON public.asset_relationships (organization_id, relationship_type);

-- -----------------------------------------------------------------------------
-- asset_metrics
-- -----------------------------------------------------------------------------

CREATE TABLE public.asset_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,

  metric_key TEXT NOT NULL,
  metric_value NUMERIC,
  metric_text TEXT,
  unit TEXT,
  source TEXT,
  measured_at TIMESTAMPTZ NOT NULL,
  confidence_score NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT asset_metrics_key_not_blank CHECK (BTRIM(metric_key) <> ''),
  CONSTRAINT asset_metrics_value_or_text_present CHECK (
    metric_value IS NOT NULL OR (metric_text IS NOT NULL AND BTRIM(metric_text) <> '')
  ),
  CONSTRAINT asset_metrics_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  )
);

COMMENT ON TABLE public.asset_metrics IS
  'Append-only time-series metrics for portfolio assets.';

CREATE INDEX asset_metrics_organization_id_idx ON public.asset_metrics (organization_id);
CREATE INDEX asset_metrics_asset_id_idx ON public.asset_metrics (asset_id);
CREATE INDEX asset_metrics_metric_key_idx ON public.asset_metrics (asset_id, metric_key);
CREATE INDEX asset_metrics_measured_at_idx ON public.asset_metrics (asset_id, measured_at DESC);

-- -----------------------------------------------------------------------------
-- asset_valuations
-- -----------------------------------------------------------------------------

CREATE TABLE public.asset_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,

  valuation_type TEXT NOT NULL,
  valuation_method TEXT NOT NULL,
  estimated_value NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  confidence_score NUMERIC,
  assumptions JSONB NOT NULL DEFAULT '{}'::JSONB,
  inputs JSONB NOT NULL DEFAULT '{}'::JSONB,
  reasoning TEXT,
  valuation_version TEXT NOT NULL,
  valued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT asset_valuations_type_not_blank CHECK (BTRIM(valuation_type) <> ''),
  CONSTRAINT asset_valuations_method_not_blank CHECK (BTRIM(valuation_method) <> ''),
  CONSTRAINT asset_valuations_version_not_blank CHECK (BTRIM(valuation_version) <> ''),
  CONSTRAINT asset_valuations_currency_not_blank CHECK (BTRIM(currency) <> ''),
  CONSTRAINT asset_valuations_estimated_value_non_negative CHECK (estimated_value >= 0),
  CONSTRAINT asset_valuations_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  ),
  CONSTRAINT asset_valuations_type_valid CHECK (
    valuation_type IN (
      'projected', 'internal', 'verified', 'market_comparable', 'income_based',
      'cost_based', 'strategic', 'liquidation'
    )
  )
);

COMMENT ON TABLE public.asset_valuations IS
  'Versioned valuation records for portfolio assets. History is preserved.';

CREATE INDEX asset_valuations_organization_id_idx
  ON public.asset_valuations (organization_id);
CREATE INDEX asset_valuations_asset_id_idx ON public.asset_valuations (asset_id);
CREATE INDEX asset_valuations_valued_at_idx ON public.asset_valuations (asset_id, valued_at DESC);
CREATE INDEX asset_valuations_valuation_type_idx
  ON public.asset_valuations (organization_id, valuation_type);

-- -----------------------------------------------------------------------------
-- Cross-table organization consistency
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_asset_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.venture_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.companies AS c
    WHERE c.id = NEW.venture_id
      AND c.organization_id = NEW.organization_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'assets.venture_id must reference a venture in the same organization';
  END IF;

  IF NEW.initiative_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.projects AS p
    WHERE p.id = NEW.initiative_id
      AND p.organization_id = NEW.organization_id
      AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'assets.initiative_id must reference an initiative in the same organization';
  END IF;

  IF NEW.parent_asset_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.assets AS a
    WHERE a.id = NEW.parent_asset_id
      AND a.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'assets.parent_asset_id must reference an asset in the same organization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER assets_validate_organization
  BEFORE INSERT OR UPDATE OF venture_id, initiative_id, parent_asset_id, organization_id
  ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_asset_organization();

CREATE OR REPLACE FUNCTION public.validate_asset_relationship_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.assets AS s
    WHERE s.id = NEW.source_asset_id
      AND s.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'asset_relationships.source_asset_id must belong to organization_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.assets AS t
    WHERE t.id = NEW.target_asset_id
      AND t.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'asset_relationships.target_asset_id must belong to organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_relationships_validate_organization
  BEFORE INSERT OR UPDATE OF source_asset_id, target_asset_id, organization_id
  ON public.asset_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_asset_relationship_organization();

CREATE OR REPLACE FUNCTION public.validate_asset_metric_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.assets AS a
    WHERE a.id = NEW.asset_id
      AND a.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'asset_metrics.asset_id must belong to organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_metrics_validate_organization
  BEFORE INSERT OR UPDATE OF asset_id, organization_id
  ON public.asset_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_asset_metric_organization();

CREATE OR REPLACE FUNCTION public.validate_asset_valuation_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.assets AS a
    WHERE a.id = NEW.asset_id
      AND a.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'asset_valuations.asset_id must belong to organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_valuations_validate_organization
  BEFORE INSERT OR UPDATE OF asset_id, organization_id
  ON public.asset_valuations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_asset_valuation_organization();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY assets_select_member
  ON public.assets FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY assets_insert_member
  ON public.assets FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY assets_update_member
  ON public.assets FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY asset_relationships_select_member
  ON public.asset_relationships FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY asset_metrics_select_member
  ON public.asset_metrics FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY asset_valuations_select_member
  ON public.asset_valuations FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.assets TO authenticated;
GRANT SELECT ON public.asset_relationships TO authenticated;
GRANT SELECT ON public.asset_metrics TO authenticated;
GRANT SELECT ON public.asset_valuations TO authenticated;
