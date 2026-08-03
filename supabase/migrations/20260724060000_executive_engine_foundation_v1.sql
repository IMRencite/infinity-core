-- Executive Decision Engine Foundation v1 (deterministic, no LLM)

CREATE TABLE public.executive_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID REFERENCES public.missions (id) ON DELETE SET NULL,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,
  validation_run_id UUID NOT NULL REFERENCES public.validation_runs (id) ON DELETE RESTRICT,

  reasoning_version TEXT NOT NULL,
  executive_policy_version TEXT NOT NULL,
  decision TEXT NOT NULL,
  priority_score NUMERIC(12, 4) NOT NULL DEFAULT 0,
  rationale JSONB NOT NULL DEFAULT '[]'::JSONB,
  policy_results JSONB NOT NULL DEFAULT '{}'::JSONB,
  capital_context JSONB NOT NULL DEFAULT '{}'::JSONB,
  correlation_id UUID,
  record_status TEXT NOT NULL DEFAULT 'active',
  planning_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  dedup_key TEXT NOT NULL,
  supersedes_id UUID REFERENCES public.executive_decisions (id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT executive_decisions_decision_valid CHECK (
    decision IN ('approve', 'defer', 'reject', 'queue', 'research_more')
  ),
  CONSTRAINT executive_decisions_record_status_valid CHECK (
    record_status IN ('active', 'superseded')
  )
);

COMMENT ON TABLE public.executive_decisions IS
  'Append-only executive decisions; supersession updates record_status only.';

CREATE UNIQUE INDEX executive_decisions_org_dedup_key_uidx
  ON public.executive_decisions (organization_id, dedup_key);

CREATE INDEX executive_decisions_org_opportunity_created_idx
  ON public.executive_decisions (organization_id, opportunity_id, created_at DESC);

CREATE INDEX executive_decisions_org_active_idx
  ON public.executive_decisions (organization_id, opportunity_id)
  WHERE record_status = 'active';

CREATE TABLE public.enterprise_queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,
  executive_decision_id UUID NOT NULL REFERENCES public.executive_decisions (id) ON DELETE RESTRICT,

  queue_position INTEGER NOT NULL DEFAULT 0,
  queue_priority NUMERIC(12, 4) NOT NULL DEFAULT 0,
  entry_status TEXT NOT NULL DEFAULT 'queued',
  planning_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  ordering_rationale JSONB NOT NULL DEFAULT '[]'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT enterprise_queue_entries_status_valid CHECK (
    entry_status IN ('queued', 'deferred', 'approved', 'removed', 'superseded')
  )
);

COMMENT ON TABLE public.enterprise_queue_entries IS
  'Prioritized enterprise build queue entries referencing immutable executive decisions.';

CREATE INDEX enterprise_queue_entries_org_priority_idx
  ON public.enterprise_queue_entries (organization_id, entry_status, queue_priority DESC);

CREATE UNIQUE INDEX enterprise_queue_entries_org_opportunity_active_uidx
  ON public.enterprise_queue_entries (organization_id, opportunity_id)
  WHERE entry_status IN ('queued', 'deferred', 'approved');

CREATE OR REPLACE FUNCTION public.validate_executive_decision_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.validation_runs AS v
    WHERE v.id = NEW.validation_run_id
      AND v.organization_id = NEW.organization_id
      AND v.opportunity_id = NEW.opportunity_id
  ) THEN
    RAISE EXCEPTION 'executive_decisions.validation_run_id must match organization and opportunity';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER executive_decisions_validate_organization
  BEFORE INSERT OR UPDATE OF validation_run_id, organization_id, opportunity_id
  ON public.executive_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_executive_decision_organization();

CREATE OR REPLACE FUNCTION public.validate_enterprise_queue_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.executive_decisions AS d
    WHERE d.id = NEW.executive_decision_id
      AND d.organization_id = NEW.organization_id
      AND d.opportunity_id = NEW.opportunity_id
  ) THEN
    RAISE EXCEPTION 'enterprise_queue_entries.executive_decision_id must match organization and opportunity';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enterprise_queue_entries_validate_organization
  BEFORE INSERT OR UPDATE OF executive_decision_id, organization_id, opportunity_id
  ON public.enterprise_queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_enterprise_queue_organization();

INSERT INTO public.capability_registry (
  organization_id,
  capability_key,
  version,
  display_name,
  capability_type,
  engine_name,
  status,
  health_status,
  is_default,
  implementation_key,
  input_schema,
  output_schema,
  policy_requirements,
  provider_metadata
)
SELECT
  NULL,
  'executive.evaluate_opportunity',
  '1.0.0',
  'Executive Opportunity Evaluation',
  'worker',
  'executive_engine',
  'active',
  'healthy',
  TRUE,
  'executive.evaluate_opportunity.v1',
  '{"type":"object","required":["opportunity_id"],"properties":{"opportunity_id":{"type":"string"},"validation_run_id":{"type":"string"}}}'::JSONB,
  '{"type":"object","properties":{"executive_decision_id":{"type":"string"},"decision":{"type":"string"}}}'::JSONB,
  '{"requires_validation_approved_for_planning":true,"requires_deterministic_reasoning":true}'::JSONB,
  '{"implementation_key":"executive.evaluate_opportunity.v1"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1
  FROM public.capability_registry
  WHERE organization_id IS NULL
    AND capability_key = 'executive.evaluate_opportunity'
    AND version = '1.0.0'
);

CREATE INDEX IF NOT EXISTS engine_jobs_pending_executive_idx
  ON public.engine_jobs (organization_id, status, available_at)
  WHERE capability_key LIKE 'executive.%'
    AND status IN ('queued', 'waiting', 'running');

ALTER TABLE public.executive_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_queue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY executive_decisions_select_member
  ON public.executive_decisions FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY enterprise_queue_entries_select_member
  ON public.enterprise_queue_entries FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));
