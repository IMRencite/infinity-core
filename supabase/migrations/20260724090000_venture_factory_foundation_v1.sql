-- =============================================================================
-- Venture Factory Foundation v1 — venture blueprints (no build execution)
-- =============================================================================

CREATE TABLE public.venture_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE RESTRICT,

  venture_type TEXT NOT NULL,
  template_key TEXT NOT NULL,
  template_version TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT 'venture_blueprint_v1',
  status TEXT NOT NULL DEFAULT 'validated',

  blueprint JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT venture_blueprints_status_valid CHECK (
    status IN ('draft', 'validated', 'archived')
  ),
  CONSTRAINT venture_blueprints_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> '')
);

CREATE UNIQUE INDEX venture_blueprints_org_idempotency_uidx
  ON public.venture_blueprints (organization_id, idempotency_key);

CREATE UNIQUE INDEX venture_blueprints_org_opportunity_schema_uidx
  ON public.venture_blueprints (organization_id, opportunity_id, schema_version);

CREATE INDEX venture_blueprints_organization_id_idx
  ON public.venture_blueprints (organization_id, created_at DESC);

CREATE INDEX venture_blueprints_opportunity_id_idx
  ON public.venture_blueprints (opportunity_id);

CREATE TRIGGER venture_blueprints_set_updated_at
  BEFORE UPDATE ON public.venture_blueprints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.venture_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY venture_blueprints_select_member
  ON public.venture_blueprints FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members AS m
      WHERE m.organization_id = venture_blueprints.organization_id
        AND m.user_id = auth.uid()
        AND m.deleted_at IS NULL
    )
  );

GRANT SELECT ON public.venture_blueprints TO authenticated;

COMMENT ON TABLE public.venture_blueprints IS
  'Structured venture execution blueprints generated from approved opportunities. Does not execute builds.';
