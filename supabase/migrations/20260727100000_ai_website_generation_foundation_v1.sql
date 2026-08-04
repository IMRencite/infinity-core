-- AI Website Generation Foundation v1 — advisory plans only (no direct file writes)

CREATE TABLE public.ai_website_generation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  mission_id UUID NOT NULL REFERENCES public.missions (id) ON DELETE RESTRICT,
  runtime_instance_id UUID NULL REFERENCES public.mission_runtime_instances (id) ON DELETE SET NULL,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities (id) ON DELETE RESTRICT,
  venture_blueprint_id UUID NOT NULL REFERENCES public.venture_blueprints (id) ON DELETE RESTRICT,
  build_id UUID NOT NULL REFERENCES public.builds (id) ON DELETE RESTRICT,
  build_specification_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  mode TEXT NOT NULL,
  plan_version TEXT NOT NULL DEFAULT '1',
  prompt_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  review_status TEXT NOT NULL DEFAULT 'pending',
  context_manifest JSONB NOT NULL DEFAULT '[]'::JSONB,
  context_hash TEXT NOT NULL,
  structured_plan JSONB NULL,
  output_hash TEXT NULL,
  translation_hash TEXT NULL,
  recommendation TEXT NULL,
  confidence NUMERIC NULL,
  usage JSONB NULL,
  estimated_cost NUMERIC NOT NULL DEFAULT 0,
  latency_ms INTEGER NULL,
  policy_results JSONB NULL,
  validation_results JSONB NULL,
  error TEXT NULL,
  correlation_id UUID NULL,
  reasoning_session_id UUID NULL REFERENCES public.reasoning_sessions (id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  rejected_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_website_plans_mode_valid CHECK (
    mode IN ('mock', 'shadow', 'advisory', 'disabled')
  ),
  CONSTRAINT ai_website_plans_idempotency_not_blank CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT ai_website_plans_context_hash_not_blank CHECK (BTRIM(context_hash) <> '')
);

CREATE UNIQUE INDEX ai_website_plans_org_idempotency_uidx
  ON public.ai_website_generation_plans (organization_id, idempotency_key);

CREATE INDEX ai_website_plans_org_build_idx
  ON public.ai_website_generation_plans (organization_id, build_id, created_at DESC);

CREATE INDEX ai_website_plans_org_mission_idx
  ON public.ai_website_generation_plans (organization_id, mission_id, created_at DESC);

CREATE INDEX ai_website_plans_org_status_idx
  ON public.ai_website_generation_plans (organization_id, status, created_at DESC);

CREATE INDEX ai_website_plans_org_provider_idx
  ON public.ai_website_generation_plans (organization_id, provider, created_at DESC);

ALTER TABLE public.ai_website_generation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_website_plans_select_member
  ON public.ai_website_generation_plans FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

GRANT SELECT ON public.ai_website_generation_plans TO authenticated;

CREATE TRIGGER ai_website_plans_set_updated_at
  BEFORE UPDATE ON public.ai_website_generation_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.ai_website_generation_plans IS
  'Advisory AI website generation plans — deterministic workers translate approved plans; not deployed.';

-- Worker capabilities (governed runtime)
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
  v.capability_key,
  v.version,
  v.display_name,
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  v.input_schema::JSONB,
  v.output_schema::JSONB,
  v.policy_requirements::JSONB,
  jsonb_build_object('implementation_key', 'workers.governed.v1', 'side_effect_class', v.side_effect)
FROM (
  VALUES
    ('ai_website.build_context', '1.0.0', 'Build AI Website Context', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}', 'internal_read'),
    ('ai_website.generate_plan', '1.0.0', 'Generate AI Website Plan', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}', 'internal_read'),
    ('ai_website.validate_plan', '1.0.0', 'Validate AI Website Plan', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object","required":["valid"]}', '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}', 'internal_read'),
    ('ai_website.request_review', '1.0.0', 'Request AI Website Plan Review', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}', 'internal_read'),
    ('ai_website.translate_approved_plan', '1.0.0', 'Translate Approved AI Website Plan', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('website.generate_ai_planned_pages', '1.0.0', 'Generate AI Planned Pages', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('website.generate_ai_planned_content', '1.0.0', 'Generate AI Planned Content', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('qa.verify_ai_generated_website', '1.0.0', 'QA Verify AI Generated Website', '{"type":"object","required":["organization_id","build_id","plan_step_id","worker_result_id"]}', '{"type":"object","required":["verdict"]}', '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}', 'internal_read')
) AS v(capability_key, version, display_name, input_schema, output_schema, policy_requirements, side_effect)
ON CONFLICT DO NOTHING;
