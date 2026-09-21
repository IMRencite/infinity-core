import type {
  BLOG_FAILURE_CLASSES,
  DAILY_BLOG_STATES,
  PUBLIC_BLOG_ACTIVITY,
} from "./contract";

export type DailyBlogState = (typeof DAILY_BLOG_STATES)[number];
export type BlogFailureClass = (typeof BLOG_FAILURE_CLASSES)[number];
export type NamedBlogGate = {
  gate: string;
  result: "PASS" | "FAIL" | "NOT_PROVEN" | "NOT_APPLICABLE" | "PROPAGATING";
  reasons: string[];
};
export type BlogHqStatus = "PASS" | "FAIL" | "N/A";
export type PublicBlogActivity = (typeof PUBLIC_BLOG_ACTIVITY)[number];
export type PublicOccupancyLevel = "ACTIVE" | "MONITORING" | "IDLE";

export type DailyBlogObligation = {
  obligation_id: string;
  venture_id: string;
  operating_day: string;
  candidate_id: string | null;
  topic: string;
  state: DailyBlogState;
  owner: string;
  due_at: string;
  next_action: string;
  next_action_at: string;
  attempt_count: number;
  live_url: string | null;
  live_title: string | null;
  blocker_reason: string | null;
  blocker_evidence: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogBuildAttempt = {
  attempt_id: string;
  obligation_id: string;
  attempt_no: number;
  venture_id: string;
  candidate_id: string | null;
  topic: string;
  stage: DailyBlogState;
  failure_class: BlogFailureClass | null;
  failure_reason: string | null;
  evidence: string[];
  repair_strategy: string | null;
  started_at: string;
  completed_at: string | null;
  next_action: string;
  recovered: boolean;
  created_at: string;
};

export type BlogCandidate = {
  candidate_id: string;
  venture_id: string;
  topic: string;
  question: string;
  score: number;
  provenance: string[];
  distinct_intent: boolean;
  geo_potential: number;
  commercial_relevance: number;
};

export type BlogCategory = {
  id: string;
  venture_id: string;
  name: string;
  slug: string;
  description: string;
  canonical_topic: string;
  authority_cluster_id: string;
  parent_id: string | null;
  status: "ACTIVE" | "MERGED" | "RETIRED";
  created_at: string;
  updated_at: string;
};

export type BlogTag = {
  id: string;
  venture_id: string;
  name: string;
  slug: string;
  description: string;
  canonical_topic: string;
  authority_cluster_id: string;
  parent_id: string | null;
  status: "ACTIVE" | "MERGED" | "RETIRED";
  created_at: string;
  updated_at: string;
};

export type BlogTaxonomyAssignment = {
  id: string;
  venture_id: string;
  article_id: string;
  category_id: string;
  tag_ids: string[];
  authority_cluster_id: string;
  created_at: string;
  updated_at: string;
};

export type BlogRollSurface = {
  featured_latest_id: string | null;
  featured_latest_title: string | null;
  featured_latest_url: string | null;
  featured_latest_published: string | null;
  carousel_ids: string[];
  sidebar_recent_ids: string[];
  topic_cloud: string[];
  category_discovery: string[];
  search_enabled: boolean;
  newest_first: boolean;
  last_synced_at: string | null;
  content_hash: string | null;
};

export type BlogRemediationObligation = {
  obligation_id: string;
  venture_id: string;
  kind: "INFRASTRUCTURE" | "UI" | "TAXONOMY" | "AUTHORITY" | "GEO";
  missing: string[];
  state: "OPEN" | "REPAIRING" | "LIVE_VERIFIED";
  created_at: string;
  updated_at: string;
};

export type VentureBlogCapability = {
  venture_id: string;
  public_name: string;
  active: boolean;
  blog_exists: boolean;
  daily_scheduler: boolean;
  latest_post: boolean;
  featured_latest: boolean;
  latest_carousel: boolean;
  sidebar: boolean;
  topic_cloud: boolean;
  category_discovery: boolean;
  search: boolean | "N/A";
  categories: boolean;
  tags: boolean;
  category_archives: boolean;
  tag_archives: boolean;
  question_graph: boolean;
  citation_readiness: boolean;
  authority_graph: boolean;
  internal_links: boolean;
  related_content: boolean;
  sitemap: boolean;
  premium_ui: boolean;
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
};

export type DualContentLoopCadence = {
  daily_blog_target: typeof import("./contract").DAILY_BLOG_TARGET;
  max_other_new_high_value_assets: typeof import("./contract").MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY;
  blogs_due: number;
  blogs_allowed: number;
  other_allowed: number;
  refresh_and_expand_uncapped: true;
  reason: string;
};

export type VentureBlogOsState = {
  venture_id: string;
  public_name: string;
  operating_day: string;
  obligation: DailyBlogObligation | null;
  attempts: BlogBuildAttempt[];
  candidates: BlogCandidate[];
  categories: BlogCategory[];
  tags: BlogTag[];
  assignments: BlogTaxonomyAssignment[];
  roll: BlogRollSurface;
  remediations: BlogRemediationObligation[];
  other_high_value_today: number;
  blogs_live_verified_today: number;
  first_canary_live: boolean;
  always_on_proven: boolean;
  updated_at: string;
};

export type VentureBlogLiveWork = {
  venture_id: string;
  public_name: string;
  blog: "ACTIVE" | "REMEDIATING" | "MISSING";
  today: DailyBlogState | "NONE";
  latest_article: string | null;
  latest_article_url: string | null;
  latest_published: string | null;
  latest_at_top: BlogHqStatus;
  featured_latest: BlogHqStatus;
  latest_carousel: BlogHqStatus;
  sidebar: BlogHqStatus;
  topic_cloud: BlogHqStatus;
  category_discovery: BlogHqStatus;
  question_coverage: BlogHqStatus;
  citation_readiness: BlogHqStatus;
  geo: BlogHqStatus;
  category: string | null;
  tags: string[];
  authority_cluster: string | null;
  internal_links: BlogHqStatus;
  taxonomy: BlogHqStatus;
  rendered_qc: BlogHqStatus;
  next_blog: string;
  other_high_value_assets_today: number;
  public_activity: PublicBlogActivity;
  public_occupancy: PublicOccupancyLevel;
  hq_current_work: string;
};

export type SystemBlogHqView = {
  active_ventures: number;
  ventures_with_blogs: number;
  blog_coverage: string;
  blogs_due_today: number;
  blogs_live_verified: number;
  blogs_in_repair: number;
  external_blog_blockers: number;
  silent_misses: number;
  premium_blog_experience: BlogHqStatus;
  taxonomy_health: BlogHqStatus;
  authority_graph: BlogHqStatus;
  geo_authority: BlogHqStatus;
  daily_publishing_health: BlogHqStatus;
  current_work: string;
  public_occupancy: PublicOccupancyLevel;
};
