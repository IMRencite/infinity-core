import type {
  AnswerMatchState,
  DuplicateIntentOutcome,
  OrganicContentType,
  OrganicQueueStage,
} from "./contract";

export type TopicNode = {
  id: string;
  label: string;
  kind: "pillar" | "cluster" | "subtopic" | "question" | "entity";
  parent_id: string | null;
  search_intent: string;
  geo_intent: boolean;
  commercial_intent: boolean;
  existing_urls: string[];
  gap: boolean;
};

export type VentureTopicGraph = {
  venture_id: string;
  nodes: TopicNode[];
  questions: string[];
  entities: string[];
  content_gaps: string[];
  internal_links: Array<{ from: string; to: string; rel: string }>;
  authority_sources: string[];
  sales_relevance: Record<string, number>;
  refresh_state: Record<string, "fresh" | "stale" | "declining">;
};

export type VoiceOfCustomerQuestion = {
  question: string;
  normalized_intent: string;
  source_channel: string;
  venture_id: string;
  topic: string;
  frequency: number;
  first_seen: string;
  last_seen: string;
  related_objections: string[];
  related_prospect_count: number;
  existing_content_match: string | null;
  answer_state: AnswerMatchState;
  content_gap_score: number;
  commercial_relevance: number;
  sales_relevance: number;
};

export type ContentDemandSignal = {
  signal_id: string;
  venture_id: string;
  normalized_intent: string;
  question: string;
  topic: string;
  reason: "UNANSWERED" | "ANSWERED_WEAKLY" | "SALES_GAP";
  at: string;
};

export type ContentOpportunity = {
  opportunity_id: string;
  venture_id: string;
  content_type: OrganicContentType;
  topic: string;
  cluster: string;
  pillar: string;
  question: string;
  intent: string;
  score: number;
  reasons: string[];
  existing_url: string | null;
};

export type PlannedOrganicUrl = {
  path: string;
  slug: string;
  breadcrumbs: string[];
  parent_path: string | null;
  depth: number;
  distinct: boolean;
};

export type OrganicAsset = {
  asset_id: string;
  venture_id: string;
  url: string;
  title: string;
  content_type: OrganicContentType;
  topic: string;
  cluster: string;
  question_answered: string;
  intent: string;
  status: "DRAFT" | "VALIDATED" | "PUBLISHED" | "REFRESHED" | "REJECTED";
  published_at: string | null;
  updated_at: string;
  quality_score: number;
  evidence_status: "PASS" | "FAIL" | "NOT_REQUIRED";
  internal_links: string[];
  taxonomy: { categories: string[]; tags: string[] };
  creative_plan?: {
    heroRequired: boolean;
    featuredRequired: boolean;
    supportingVisualRequired: boolean;
    categoryCreative: boolean;
    topicCreative: boolean;
    conflictingExistingAsset: boolean;
    designCoreJobNeeded: boolean;
  };
  sales_relevance: number;
  objections_addressed: string[];
  indexation: "published" | "discovered" | "crawled" | "indexed" | "not_indexed" | "deindexed";
};

export type OrganicQueueItem = {
  item_id: string;
  venture_id: string;
  stage: OrganicQueueStage;
  opportunity_id: string;
  work_kind: "NEW_URL" | "REFRESH" | "EXPAND" | "INTERNAL_LINK" | "CONSOLIDATE";
};

export type OrganicCadenceDecision = {
  target_min: number;
  target_max: number;
  allowed_new_urls: number;
  refresh_slots: number;
  reason: string;
};

export type OrganicContinuousState = {
  venture_id: string;
  graph: VentureTopicGraph;
  questions: VoiceOfCustomerQuestion[];
  opportunities: ContentOpportunity[];
  demand_signals: ContentDemandSignal[];
  queue: OrganicQueueItem[];
  assets: OrganicAsset[];
  sales_assets: OrganicAsset[];
  published_today: number;
  refreshed_today: number;
  rejected_quality: number;
  rejected_duplicate: number;
  last_tick_at: string | null;
  remediation_queue: Array<{
    url: string;
    classification: "COMPLETE" | "NEEDS_EXPANSION" | "THIN" | "DUPLICATIVE";
    priority: "HIGH" | "NORMAL" | "LOW";
    reason: string;
  }>;
  blog_readiness: "BLOG_READY" | "BLOG_PARTIAL" | "BLOG_MISSING" | "EXEMPT";
  schema_remediation_queue: Array<{
    url: string;
    classification: "SCHEMA_COMPLETE" | "SCHEMA_PARTIAL" | "SCHEMA_MISSING" | "SCHEMA_CONFLICT";
    priority: "HIGH" | "NORMAL" | "LOW";
    missing_types: string[];
    reason: string;
  }>;
  schema_readiness: "SCHEMA_READY" | "SCHEMA_PARTIAL" | "SCHEMA_MISSING";
  blog_editorial_quality: "PASS" | "NEEDS_REMEDIATION" | "UNKNOWN";
  blog_remediation_queue: Array<{
    url: string;
    classification: "BLOG_COMPLETE" | "BLOG_NEEDS_EXPANSION" | "BLOG_THIN" | "BLOG_VISUAL_MISSING" | "BLOG_UX_INCOMPLETE" | "BLOG_NAVIGATION_INCOMPLETE" | "BLOG_TAXONOMY_INCOMPLETE" | "BLOG_DISCOVERY_INCOMPLETE" | "BLOG_CONTRAST_FAIL" | "BLOG_SPACING_FAIL";
    priority: "HIGH" | "NORMAL" | "LOW";
    reasons: string[];
  }>;
};

export type OrganicQcResult = "PASS" | "FAIL" | "NOT_PROVEN" | "NOT_APPLICABLE";

export type OrganicNamedGate = { gate: string; result: OrganicQcResult; reasons: string[] };

export type OrganicPublisherAdapter = {
  id: "wordpress" | "nextjs_repository" | "headless_cms" | "static_site" | "venture_cms";
  createDraft: (asset: OrganicAsset) => Promise<{ ok: boolean; draft_id: string }>;
  updateDraft: (draft_id: string, asset: OrganicAsset) => Promise<{ ok: boolean }>;
  publish: (draft_id: string) => Promise<{ ok: boolean; url: string }>;
  updatePublishedContent: (url: string, asset: OrganicAsset) => Promise<{ ok: boolean }>;
  addInternalLinks: (url: string, links: string[]) => Promise<{ ok: boolean }>;
  setTaxonomy: (url: string, taxonomy: OrganicAsset["taxonomy"]) => Promise<{ ok: boolean }>;
  setMetadata: (url: string, title: string) => Promise<{ ok: boolean }>;
  setSchema: (url: string, schema: string[]) => Promise<{ ok: boolean }>;
  getPublicationState: (url: string) => Promise<"DRAFT" | "PUBLISHED" | "UNKNOWN">;
};
