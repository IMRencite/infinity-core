-- =============================================================================
-- Infinity Engine RLS Hardening v1
-- Organic Growth, Creative Media, and Performance Intelligence internal tables
-- Posture: RLS ENABLED, service_role GRANT ALL, no anon/authenticated policies
-- =============================================================================

-- Organic Growth
ALTER TABLE IF EXISTS public.organic_growth_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organic_growth_build_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organic_human_contribution_requests ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.organic_growth_runs TO service_role;
GRANT ALL ON public.organic_growth_build_packages TO service_role;
GRANT ALL ON public.organic_human_contribution_requests TO service_role;

-- Creative Media
ALTER TABLE IF EXISTS public.creative_media_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creative_media_build_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creative_media_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creative_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creative_media_quality_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creative_media_cost_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creative_media_production_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creative_media_traceability_links ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.creative_media_runs TO service_role;
GRANT ALL ON public.creative_media_build_packages TO service_role;
GRANT ALL ON public.creative_media_generation_jobs TO service_role;
GRANT ALL ON public.creative_media_assets TO service_role;
GRANT ALL ON public.creative_media_quality_reviews TO service_role;
GRANT ALL ON public.creative_media_cost_records TO service_role;
GRANT ALL ON public.creative_media_production_artifacts TO service_role;
GRANT ALL ON public.creative_media_traceability_links TO service_role;

-- Performance Intelligence
ALTER TABLE IF EXISTS public.performance_intelligence_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_intelligence_build_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_metric_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_learning_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_traceability_links ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.performance_intelligence_runs TO service_role;
GRANT ALL ON public.performance_intelligence_build_packages TO service_role;
GRANT ALL ON public.performance_sources TO service_role;
GRANT ALL ON public.performance_observations TO service_role;
GRANT ALL ON public.performance_events TO service_role;
GRANT ALL ON public.performance_metric_aggregates TO service_role;
GRANT ALL ON public.performance_learning_decisions TO service_role;
GRANT ALL ON public.performance_traceability_links TO service_role;
