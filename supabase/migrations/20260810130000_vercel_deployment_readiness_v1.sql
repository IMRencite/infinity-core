-- Vercel deployment readiness v1: deployment manifest + clean-room build persistence

ALTER TABLE public.production_artifacts
  ADD COLUMN IF NOT EXISTS deployment_manifest JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS package_manager TEXT,
  ADD COLUMN IF NOT EXISTS clean_room_install_result JSONB,
  ADD COLUMN IF NOT EXISTS clean_room_build_result JSONB,
  ADD COLUMN IF NOT EXISTS clean_room_build_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS framework_detection JSONB,
  ADD COLUMN IF NOT EXISTS output_summary JSONB,
  ADD COLUMN IF NOT EXISTS vercel_readiness_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS vercel_readiness_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS deployment_source_identity JSONB,
  ADD COLUMN IF NOT EXISTS last_readiness_evaluated_at TIMESTAMPTZ;

CREATE INDEX production_artifacts_vercel_readiness_idx
  ON public.production_artifacts (organization_id, vercel_readiness_status);
