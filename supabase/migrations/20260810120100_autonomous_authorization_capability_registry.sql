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
  'launch.evaluate_external_authorization',
  '1.0.0',
  'Evaluate External Authorization',
  'worker',
  'worker_capability_engine',
  'active',
  'healthy',
  TRUE,
  'workers.governed.v1',
  '{"type":"object","required":["organization_id","mission_id","external_action_id"],"properties":{"organization_id":{"type":"string"},"mission_id":{"type":"string"},"external_action_id":{"type":"string"},"intent":{"type":"string"}}}'::JSONB,
  '{"type":"object","required":["decision","execution_status"],"properties":{"decision":{"type":"string"},"execution_status":{"type":"string"}}}'::JSONB,
  '{"requires_active_mission":true,"side_effect_class":"internal_write"}'::JSONB,
  jsonb_build_object('implementation_key', 'workers.governed.v1', 'gateway_only', true)
WHERE NOT EXISTS (
  SELECT 1 FROM public.capability_registry cr
  WHERE cr.capability_key = 'launch.evaluate_external_authorization' AND cr.version = '1.0.0'
);
