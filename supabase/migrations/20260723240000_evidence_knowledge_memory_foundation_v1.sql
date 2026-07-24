-- =============================================================================
-- Evidence, Knowledge, and Memory Foundation v1
-- =============================================================================
-- Institutional intelligence layer: provenance, evidence, claims, knowledge,
-- memory, lessons, and procedures.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- evidence_sources
-- -----------------------------------------------------------------------------

CREATE TABLE public.evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  source_type TEXT NOT NULL,
  name TEXT NOT NULL,
  external_url TEXT,
  external_identifier TEXT,
  provider TEXT,

  credibility_score NUMERIC,
  reliability_status TEXT NOT NULL DEFAULT 'unknown',

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT evidence_sources_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT evidence_sources_type_valid CHECK (
    source_type IN (
      'webpage', 'api', 'dataset', 'document', 'social_post', 'forum_thread',
      'news_article', 'filing', 'government_record', 'academic_source',
      'internal_metric', 'internal_event', 'worker_output', 'human_input',
      'experiment_result', 'other'
    )
  ),
  CONSTRAINT evidence_sources_reliability_status_valid CHECK (
    reliability_status IN (
      'unknown', 'trusted', 'generally_reliable', 'mixed', 'low_reliability',
      'blocked', 'deprecated'
    )
  ),
  CONSTRAINT evidence_sources_credibility_score_range CHECK (
    credibility_score IS NULL OR (credibility_score >= 0 AND credibility_score <= 100)
  )
);

COMMENT ON TABLE public.evidence_sources IS
  'Origin of evidence with provenance and reliability tracking.';

CREATE INDEX evidence_sources_organization_id_idx
  ON public.evidence_sources (organization_id);
CREATE INDEX evidence_sources_source_type_idx
  ON public.evidence_sources (organization_id, source_type);
CREATE INDEX evidence_sources_reliability_status_idx
  ON public.evidence_sources (organization_id, reliability_status);
CREATE INDEX evidence_sources_provider_idx
  ON public.evidence_sources (organization_id, provider);
CREATE INDEX evidence_sources_created_at_idx
  ON public.evidence_sources (organization_id, created_at DESC);

CREATE UNIQUE INDEX evidence_sources_org_external_identifier_uidx
  ON public.evidence_sources (organization_id, external_identifier)
  WHERE external_identifier IS NOT NULL;

CREATE TRIGGER evidence_sources_set_updated_at
  BEFORE UPDATE ON public.evidence_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- evidence_records
-- -----------------------------------------------------------------------------

CREATE TABLE public.evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  source_id UUID NOT NULL REFERENCES public.evidence_sources (id) ON DELETE RESTRICT,

  evidence_type TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  raw_content TEXT,
  structured_data JSONB NOT NULL DEFAULT '{}'::JSONB,

  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_published_at TIMESTAMPTZ,

  relevance_score NUMERIC,
  credibility_score NUMERIC,
  confidence_score NUMERIC,
  freshness_score NUMERIC,
  supports_claim BOOLEAN,

  content_hash TEXT,
  language TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT evidence_records_type_valid CHECK (
    evidence_type IN (
      'market_signal', 'customer_pain', 'trend', 'competitor', 'pricing',
      'regulation', 'technology', 'search_demand', 'social_discussion',
      'product_demand', 'funding', 'financial_result', 'experiment_result',
      'operational_result', 'asset_metric', 'venture_metric', 'decision_context',
      'other'
    )
  ),
  CONSTRAINT evidence_records_useful_content CHECK (
    (title IS NOT NULL AND BTRIM(title) <> '')
    OR (summary IS NOT NULL AND BTRIM(summary) <> '')
    OR (raw_content IS NOT NULL AND BTRIM(raw_content) <> '')
    OR (structured_data IS NOT NULL AND structured_data <> '{}'::JSONB)
  ),
  CONSTRAINT evidence_records_relevance_score_range CHECK (
    relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 100)
  ),
  CONSTRAINT evidence_records_credibility_score_range CHECK (
    credibility_score IS NULL OR (credibility_score >= 0 AND credibility_score <= 100)
  ),
  CONSTRAINT evidence_records_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  ),
  CONSTRAINT evidence_records_freshness_score_range CHECK (
    freshness_score IS NULL OR (freshness_score >= 0 AND freshness_score <= 100)
  )
);

COMMENT ON TABLE public.evidence_records IS
  'Individual evidence items linked to a source.';

CREATE INDEX evidence_records_organization_id_idx
  ON public.evidence_records (organization_id);
CREATE INDEX evidence_records_source_id_idx
  ON public.evidence_records (source_id);
CREATE INDEX evidence_records_evidence_type_idx
  ON public.evidence_records (organization_id, evidence_type);
CREATE INDEX evidence_records_captured_at_idx
  ON public.evidence_records (organization_id, captured_at DESC);
CREATE INDEX evidence_records_content_hash_idx
  ON public.evidence_records (organization_id, content_hash);

CREATE UNIQUE INDEX evidence_records_org_content_hash_uidx
  ON public.evidence_records (organization_id, content_hash)
  WHERE content_hash IS NOT NULL;

CREATE TRIGGER evidence_records_set_updated_at
  BEFORE UPDATE ON public.evidence_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- claims
-- -----------------------------------------------------------------------------

CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  subject_type TEXT NOT NULL,
  subject_id UUID,
  predicate TEXT NOT NULL,
  object_text TEXT,
  object_entity_type TEXT,
  object_entity_id UUID,

  claim_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unverified',
  confidence_score NUMERIC,

  validity_start TIMESTAMPTZ,
  validity_end TIMESTAMPTZ,
  superseded_by_claim_id UUID REFERENCES public.claims (id) ON DELETE SET NULL,

  reasoning TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT claims_predicate_not_blank CHECK (BTRIM(predicate) <> ''),
  CONSTRAINT claims_subject_type_not_blank CHECK (BTRIM(subject_type) <> ''),
  CONSTRAINT claims_type_valid CHECK (
    claim_type IN (
      'verified_fact', 'estimate', 'assumption', 'ai_inference', 'opinion',
      'hypothesis', 'forecast', 'unknown'
    )
  ),
  CONSTRAINT claims_status_valid CHECK (
    status IN (
      'unverified', 'supported', 'contradicted', 'mixed', 'superseded',
      'rejected', 'accepted'
    )
  ),
  CONSTRAINT claims_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  ),
  CONSTRAINT claims_no_self_supersede CHECK (
    superseded_by_claim_id IS NULL OR superseded_by_claim_id <> id
  )
);

COMMENT ON TABLE public.claims IS
  'Specific assertions that can be supported, contradicted, or superseded.';

CREATE INDEX claims_organization_id_idx ON public.claims (organization_id);
CREATE INDEX claims_subject_type_idx ON public.claims (organization_id, subject_type);
CREATE INDEX claims_subject_id_idx ON public.claims (organization_id, subject_id);
CREATE INDEX claims_predicate_idx ON public.claims (organization_id, predicate);
CREATE INDEX claims_status_idx ON public.claims (organization_id, status);
CREATE INDEX claims_claim_type_idx ON public.claims (organization_id, claim_type);

CREATE TRIGGER claims_set_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- claim_evidence
-- -----------------------------------------------------------------------------

CREATE TABLE public.claim_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,
  claim_id UUID NOT NULL REFERENCES public.claims (id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES public.evidence_records (id) ON DELETE CASCADE,

  relationship TEXT NOT NULL,
  weight_score NUMERIC,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT claim_evidence_relationship_not_blank CHECK (BTRIM(relationship) <> ''),
  CONSTRAINT claim_evidence_relationship_valid CHECK (
    relationship IN (
      'supports', 'contradicts', 'contextualizes', 'weakens', 'supersedes',
      'derived_from', 'related_to'
    )
  ),
  CONSTRAINT claim_evidence_weight_score_range CHECK (
    weight_score IS NULL OR (weight_score >= 0 AND weight_score <= 100)
  ),
  CONSTRAINT claim_evidence_unique_identity UNIQUE (claim_id, evidence_id, relationship)
);

COMMENT ON TABLE public.claim_evidence IS
  'Links between claims and evidence with relationship semantics.';

CREATE INDEX claim_evidence_organization_id_idx ON public.claim_evidence (organization_id);
CREATE INDEX claim_evidence_claim_id_idx ON public.claim_evidence (claim_id);
CREATE INDEX claim_evidence_evidence_id_idx ON public.claim_evidence (evidence_id);
CREATE INDEX claim_evidence_relationship_idx
  ON public.claim_evidence (organization_id, relationship);

-- -----------------------------------------------------------------------------
-- knowledge_records
-- -----------------------------------------------------------------------------

CREATE TABLE public.knowledge_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  knowledge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  confidence_score NUMERIC,

  source_claim_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  source_evidence_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  scope JSONB NOT NULL DEFAULT '{}'::JSONB,

  validity_start TIMESTAMPTZ,
  validity_end TIMESTAMPTZ,
  version TEXT NOT NULL,
  superseded_by_id UUID REFERENCES public.knowledge_records (id) ON DELETE SET NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT knowledge_records_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT knowledge_records_summary_not_blank CHECK (BTRIM(summary) <> ''),
  CONSTRAINT knowledge_records_version_not_blank CHECK (BTRIM(version) <> ''),
  CONSTRAINT knowledge_records_type_valid CHECK (
    knowledge_type IN (
      'market', 'customer', 'competitor', 'pricing', 'channel', 'product',
      'operational', 'technical', 'legal', 'financial', 'asset', 'venture',
      'portfolio', 'worker', 'source_reliability', 'procedure', 'other'
    )
  ),
  CONSTRAINT knowledge_records_status_valid CHECK (
    status IN ('draft', 'active', 'disputed', 'deprecated', 'superseded', 'archived')
  ),
  CONSTRAINT knowledge_records_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  ),
  CONSTRAINT knowledge_records_no_self_supersede CHECK (
    superseded_by_id IS NULL OR superseded_by_id <> id
  )
);

COMMENT ON TABLE public.knowledge_records IS
  'Structured reusable knowledge derived from claims and evidence.';

CREATE INDEX knowledge_records_organization_id_idx
  ON public.knowledge_records (organization_id);
CREATE INDEX knowledge_records_knowledge_type_idx
  ON public.knowledge_records (organization_id, knowledge_type);
CREATE INDEX knowledge_records_status_idx
  ON public.knowledge_records (organization_id, status);
CREATE INDEX knowledge_records_created_at_idx
  ON public.knowledge_records (organization_id, created_at DESC);

CREATE TRIGGER knowledge_records_set_updated_at
  BEFORE UPDATE ON public.knowledge_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- memory_records
-- -----------------------------------------------------------------------------

CREATE TABLE public.memory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  memory_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,

  source_entity_type TEXT,
  source_entity_id UUID,

  importance_score NUMERIC,
  confidence_score NUMERIC,

  occurred_at TIMESTAMPTZ,
  learned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  applies_to JSONB NOT NULL DEFAULT '{}'::JSONB,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT memory_records_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT memory_records_summary_not_blank CHECK (BTRIM(summary) <> ''),
  CONSTRAINT memory_records_type_valid CHECK (
    memory_type IN (
      'episodic', 'semantic', 'procedural', 'portfolio', 'venture', 'asset',
      'worker_performance', 'source_reliability', 'decision_outcome',
      'experiment_outcome', 'failure', 'success', 'lesson', 'other'
    )
  ),
  CONSTRAINT memory_records_importance_score_range CHECK (
    importance_score IS NULL OR (importance_score >= 0 AND importance_score <= 100)
  ),
  CONSTRAINT memory_records_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  )
);

COMMENT ON TABLE public.memory_records IS
  'Append-only institutional memory of outcomes and execution history.';

CREATE INDEX memory_records_organization_id_idx ON public.memory_records (organization_id);
CREATE INDEX memory_records_memory_type_idx
  ON public.memory_records (organization_id, memory_type);
CREATE INDEX memory_records_source_entity_idx
  ON public.memory_records (organization_id, source_entity_type, source_entity_id);
CREATE INDEX memory_records_occurred_at_idx
  ON public.memory_records (organization_id, occurred_at DESC);
CREATE INDEX memory_records_learned_at_idx
  ON public.memory_records (organization_id, learned_at DESC);

CREATE UNIQUE INDEX memory_records_org_source_entity_uidx
  ON public.memory_records (organization_id, source_entity_type, source_entity_id)
  WHERE source_entity_type IS NOT NULL AND source_entity_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- lessons
-- -----------------------------------------------------------------------------

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  title TEXT NOT NULL,
  lesson TEXT NOT NULL,
  lesson_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  confidence_score NUMERIC,

  supporting_memory_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  supporting_claim_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  applies_to JSONB NOT NULL DEFAULT '{}'::JSONB,
  recommended_action TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT lessons_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT lessons_lesson_not_blank CHECK (BTRIM(lesson) <> ''),
  CONSTRAINT lessons_type_valid CHECK (
    lesson_type IN (
      'strategy', 'market', 'product', 'pricing', 'distribution', 'growth',
      'operations', 'technical', 'financial', 'risk', 'worker', 'portfolio', 'other'
    )
  ),
  CONSTRAINT lessons_status_valid CHECK (
    status IN ('draft', 'active', 'disputed', 'deprecated', 'superseded', 'archived')
  ),
  CONSTRAINT lessons_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  )
);

COMMENT ON TABLE public.lessons IS
  'Distilled learning derived from outcomes and memory.';

CREATE INDEX lessons_organization_id_idx ON public.lessons (organization_id);
CREATE INDEX lessons_lesson_type_idx ON public.lessons (organization_id, lesson_type);
CREATE INDEX lessons_status_idx ON public.lessons (organization_id, status);
CREATE INDEX lessons_created_at_idx ON public.lessons (organization_id, created_at DESC);

CREATE TRIGGER lessons_set_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- procedures
-- -----------------------------------------------------------------------------

CREATE TABLE public.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE RESTRICT,

  name TEXT NOT NULL,
  description TEXT NOT NULL,
  capability_key TEXT,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',

  steps JSONB NOT NULL DEFAULT '[]'::JSONB,
  preconditions JSONB NOT NULL DEFAULT '{}'::JSONB,
  expected_outputs JSONB NOT NULL DEFAULT '{}'::JSONB,
  success_metrics JSONB NOT NULL DEFAULT '{}'::JSONB,

  confidence_score NUMERIC,
  source_lesson_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT procedures_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT procedures_description_not_blank CHECK (BTRIM(description) <> ''),
  CONSTRAINT procedures_version_not_blank CHECK (BTRIM(version) <> ''),
  CONSTRAINT procedures_status_valid CHECK (
    status IN ('draft', 'active', 'experimental', 'deprecated', 'archived')
  ),
  CONSTRAINT procedures_confidence_score_range CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  )
);

COMMENT ON TABLE public.procedures IS
  'Reusable operational patterns learned from experience.';

CREATE INDEX procedures_organization_id_idx ON public.procedures (organization_id);
CREATE INDEX procedures_status_idx ON public.procedures (organization_id, status);
CREATE INDEX procedures_capability_key_idx
  ON public.procedures (organization_id, capability_key);
CREATE INDEX procedures_created_at_idx ON public.procedures (organization_id, created_at DESC);

CREATE TRIGGER procedures_set_updated_at
  BEFORE UPDATE ON public.procedures
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Cross-table organization consistency
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_evidence_record_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.evidence_sources AS s
    WHERE s.id = NEW.source_id
      AND s.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'evidence_records.source_id must belong to organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER evidence_records_validate_organization
  BEFORE INSERT OR UPDATE OF source_id, organization_id ON public.evidence_records
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_evidence_record_organization();

CREATE OR REPLACE FUNCTION public.validate_claim_evidence_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.claims AS c
    WHERE c.id = NEW.claim_id
      AND c.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'claim_evidence.claim_id must belong to organization_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.evidence_records AS e
    WHERE e.id = NEW.evidence_id
      AND e.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'claim_evidence.evidence_id must belong to organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER claim_evidence_validate_organization
  BEFORE INSERT OR UPDATE OF claim_id, evidence_id, organization_id ON public.claim_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_claim_evidence_organization();

-- -----------------------------------------------------------------------------
-- Append-only memory_records
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_memory_records_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'memory_records are append-only and cannot be modified or deleted';
END;
$$;

CREATE TRIGGER memory_records_prevent_update
  BEFORE UPDATE ON public.memory_records
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_memory_records_mutation();

CREATE TRIGGER memory_records_prevent_delete
  BEFORE DELETE ON public.memory_records
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_memory_records_mutation();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY evidence_sources_select_member
  ON public.evidence_sources FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY evidence_records_select_member
  ON public.evidence_records FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY claims_select_member
  ON public.claims FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY claim_evidence_select_member
  ON public.claim_evidence FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY knowledge_records_select_member
  ON public.knowledge_records FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY memory_records_select_member
  ON public.memory_records FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY lessons_select_member
  ON public.lessons FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY procedures_select_member
  ON public.procedures FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

GRANT SELECT ON public.evidence_sources TO authenticated;
GRANT SELECT ON public.evidence_records TO authenticated;
GRANT SELECT ON public.claims TO authenticated;
GRANT SELECT ON public.claim_evidence TO authenticated;
GRANT SELECT ON public.knowledge_records TO authenticated;
GRANT SELECT ON public.memory_records TO authenticated;
GRANT SELECT ON public.lessons TO authenticated;
GRANT SELECT ON public.procedures TO authenticated;
