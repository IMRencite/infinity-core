-- =============================================================================
-- Commercial Provider Verification identity uniqueness
-- Canonical current-state: one row per organization + category + provider_key.
-- All three columns are NOT NULL; UNIQUE is not defeated by nulls.
-- No data mutation. No RLS / grant / policy changes.
-- =============================================================================

ALTER TABLE public.commercial_provider_verifications
  ADD CONSTRAINT commercial_provider_verifications_org_category_key_unique
  UNIQUE (organization_id, provider_category, provider_key);
