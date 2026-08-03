-- Website Build Worker Foundation v1 — internal website source only (not deployed)

CREATE TABLE public.website_build_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  build_id UUID NOT NULL REFERENCES public.builds (id) ON DELETE RESTRICT,
  project_type TEXT NOT NULL,
  framework TEXT NOT NULL,
  route_manifest JSONB NOT NULL DEFAULT '[]'::JSONB,
  component_manifest JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  sitemap_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  accessibility_status TEXT NOT NULL DEFAULT 'unknown',
  seo_status TEXT NOT NULL DEFAULT 'unknown',
  security_status TEXT NOT NULL DEFAULT 'unknown',
  qa_status TEXT NOT NULL DEFAULT 'pending',
  internal_package_artifact_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT website_build_metadata_build_uidx UNIQUE (build_id)
);

CREATE INDEX website_build_metadata_org_build_idx
  ON public.website_build_metadata (organization_id, build_id);

ALTER TABLE public.website_build_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY website_build_metadata_select_member
  ON public.website_build_metadata FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

GRANT SELECT ON public.website_build_metadata TO authenticated;

CREATE TRIGGER website_build_metadata_set_updated_at
  BEFORE UPDATE ON public.website_build_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.website_build_metadata IS
  'Summaries for internal website builds — source packages are not deployed.';

-- Website worker capabilities (governed runtime)
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
    ('website.generate_structure', '1.0.0', 'Generate Website Structure', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('website.generate_components', '1.0.0', 'Generate Website Components', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('website.generate_pages', '1.0.0', 'Generate Website Pages', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('website.generate_styles', '1.0.0', 'Generate Website Styles', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('website.generate_metadata', '1.0.0', 'Generate Website Metadata', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('website.generate_sitemap', '1.0.0', 'Generate Website Sitemap', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('website.generate_robots', '1.0.0', 'Generate Website Robots', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('website.validate_structure', '1.0.0', 'Validate Website Structure', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object","required":["valid"]}', '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}', 'internal_read'),
    ('website.validate_accessibility', '1.0.0', 'Validate Website Accessibility', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object","required":["valid"]}', '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}', 'internal_read'),
    ('website.validate_seo', '1.0.0', 'Validate Website SEO', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object","required":["valid"]}', '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}', 'internal_read'),
    ('website.validate_security', '1.0.0', 'Validate Website Security', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object","required":["valid"]}', '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}', 'internal_read'),
    ('website.package_internal_source', '1.0.0', 'Package Internal Website Source', '{"type":"object","required":["organization_id","build_id"]}', '{"type":"object"}', '{"requires_active_mission":true,"side_effect_class":"internal_write","zero_cost":true}', 'internal_write'),
    ('qa.verify_internal_website', '1.0.0', 'QA Verify Internal Website', '{"type":"object","required":["organization_id","build_id","plan_step_id","worker_result_id"]}', '{"type":"object","required":["verdict"]}', '{"requires_active_mission":true,"side_effect_class":"internal_read","zero_cost":true}', 'internal_read')
) AS v(capability_key, version, display_name, input_schema, output_schema, policy_requirements, side_effect)
ON CONFLICT DO NOTHING;
