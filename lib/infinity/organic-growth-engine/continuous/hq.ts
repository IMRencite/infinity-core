import { DAILY_BLOG_TARGET, MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY } from "../blog-os/contract";
import { projectSystemBlogHq, projectVentureBlogLiveWork } from "../blog-os/live-work";
import { ORGANIC_CADENCE_DEFAULT } from "./contract";
import type { OrganicContinuousState } from "./types";

export type OrganicGrowthHqView = {
  room_id: "growth_department";
  occupancy: "ACTIVE_WORK" | "WAITING_EXTERNAL" | "PRESENT_IDLE";
  visual_state: "ACTIVE" | "MONITORING" | "IDLE";
  current_work: string;
  ventures_active: number;
  today_target: string;
  published_today: number;
  queued_today: number;
  researching: number;
  writing: number;
  validating: number;
  publishing: number;
  refreshing: number;
  topic_coverage: number;
  content_gaps: number;
  question_demand: number;
  voc_signals: number;
  indexation_health: string;
  organic_impressions: number;
  organic_leads: number;
  geo_visibility: number;
  top_assets: string[];
  sales_used_content: number;
  content_velocity: string;
  quality_rejects: number;
  duplicate_intent_rejects: number;
  live_url: string | null;
  content_type: string | null;
  topic: string | null;
  queue_state: string;
  quality_state: string;
  blog_readiness: string;
  schema_readiness: string;
  schema_remediation_queue: number;
  blog_editorial_quality: string;
  blog_index_readiness: string;
  blog_value_first_failures: number;
  blog_depth_completeness: string;
  blog_question_cluster: string;
  blog_sidebar_ux: string;
  blog_sequential_navigation: string;
  blog_latest_carousel: string;
  blog_article_discovery: string;
  blog_carousel_controls: string;
  content_quality_state: string;
  thin_content_queue: number;
  completeness_failures: number;
  refresh_priority: string;
  blog_os?: ReturnType<typeof projectVentureBlogLiveWork>;
  system_blog?: ReturnType<typeof projectSystemBlogHq>;
  daily_blog_target?: number;
  max_other_new_high_value_assets?: number;
};

export function projectOrganicGrowthHq(state: OrganicContinuousState | null): OrganicGrowthHqView {
  const queue = state?.queue ?? [];
  const published = (state?.assets.filter((row) => row.status === "PUBLISHED" || row.status === "REFRESHED") ?? []);
  const latest = published[published.length - 1] ?? null;
  const conservativeLive = Boolean(latest?.url.includes("/commercial-lease-npv/how-is-cap-rate-calculated"));
  const visual =
    queue.some((row) => ["WRITE", "VALIDATE", "PUBLISH"].includes(row.stage))
      ? "ACTIVE"
      : queue.length || published.length
        ? "MONITORING"
        : "IDLE";
  const indexation =
    published.some((row) => row.indexation === "not_indexed" || row.indexation === "deindexed")
      ? "ATTENTION"
      : published.some((row) => row.indexation === "published" || row.indexation === "discovered" || row.indexation === "crawled")
        ? "PENDING"
        : published.length
          ? "HEALTHY"
          : "UNKNOWN";
  return {
    room_id: "growth_department",
    occupancy: visual === "ACTIVE" ? "ACTIVE_WORK" : visual === "MONITORING" ? "WAITING_EXTERNAL" : "PRESENT_IDLE",
    visual_state: visual,
    current_work:
      visual === "ACTIVE"
        ? "Writing and validating organic educational resources."
        : visual === "MONITORING"
          ? "Monitoring topic coverage, indexation, and refresh backlog."
          : "Ready to expand venture knowledge when a distinct opportunity exists.",
    ventures_active: state ? 1 : 0,
    today_target: conservativeLive ? "1–2" : `${ORGANIC_CADENCE_DEFAULT.target_min}–${ORGANIC_CADENCE_DEFAULT.target_max}`,
    published_today: state?.published_today ?? 0,
    queued_today: queue.length,
    researching: queue.filter((row) => row.stage === "RESEARCH" || row.stage === "DISCOVER").length,
    writing: queue.filter((row) => row.stage === "WRITE").length,
    validating: queue.filter((row) => ["VALIDATE", "SEO_REVIEW", "GEO_REVIEW"].includes(row.stage)).length,
    publishing: queue.filter((row) => row.stage === "PUBLISH").length,
    refreshing: queue.filter((row) => row.stage === "REFRESH").length,
    topic_coverage: state ? Math.max(0, 1 - state.graph.content_gaps.length / Math.max(1, state.graph.nodes.length)) : 0,
    content_gaps: state?.graph.content_gaps.length ?? 0,
    question_demand: state?.questions.reduce((sum, row) => sum + row.frequency, 0) ?? 0,
    voc_signals: state?.questions.length ?? 0,
    indexation_health: indexation,
    organic_impressions: 0,
    organic_leads: 0,
    geo_visibility: 0,
    top_assets: published.slice(0, 5).map((row) => row.title),
    sales_used_content: state?.sales_assets.length ?? 0,
    content_velocity: conservativeLive ? "1–2/day" : `${ORGANIC_CADENCE_DEFAULT.target_min}–${ORGANIC_CADENCE_DEFAULT.target_max}/day`,
    quality_rejects: state?.rejected_quality ?? 0,
    duplicate_intent_rejects: state?.rejected_duplicate ?? 0,
    live_url: latest ? `https://occupancynpv.com${latest.url.replace(/\/+$/, "")}` : null,
    content_type: latest?.content_type ?? null,
    topic: latest?.topic ?? null,
    queue_state: queue[0]?.stage ?? (published.length ? "INDEX_MONITOR" : "IDLE"),
    quality_state: latest ? (latest.quality_score >= 80 && latest.evidence_status === "PASS" ? "PASS" : "ATTENTION") : "NONE",
    blog_readiness: state?.blog_readiness ?? "BLOG_MISSING",
    schema_readiness: state?.schema_readiness ?? "SCHEMA_MISSING",
    schema_remediation_queue: (state?.schema_remediation_queue ?? []).length,
    blog_editorial_quality: state?.blog_editorial_quality ?? "UNKNOWN",
    blog_index_readiness: (state?.blog_editorial_quality ?? "UNKNOWN") === "PASS" ? "PASS" : "ATTENTION",
    blog_value_first_failures: (state?.blog_remediation_queue ?? []).filter((row) => row.classification === "BLOG_THIN").length,
    blog_depth_completeness: (state?.blog_editorial_quality ?? "UNKNOWN") === "PASS" ? "PASS" : "ATTENTION",
    blog_question_cluster: (state?.blog_editorial_quality ?? "UNKNOWN") === "PASS" ? "COVERED" : "ATTENTION",
    blog_sidebar_ux: (state?.blog_editorial_quality ?? "UNKNOWN") === "PASS" ? "PASS" : "ATTENTION",
    blog_sequential_navigation: (state?.blog_editorial_quality ?? "UNKNOWN") === "PASS" ? "PASS" : "ATTENTION",
    blog_latest_carousel: (state?.blog_editorial_quality ?? "UNKNOWN") === "PASS" ? "PASS" : "ATTENTION",
    blog_article_discovery: (state?.blog_editorial_quality ?? "UNKNOWN") === "PASS" ? "PASS" : "ATTENTION",
    blog_carousel_controls: (state?.blog_editorial_quality ?? "UNKNOWN") === "PASS" ? "PASS" : "ATTENTION",
    content_quality_state:
      (state?.remediation_queue ?? []).some((row) => row.url.includes("how-is-cap-rate-calculated") && row.classification !== "COMPLETE")
        ? "NEEDS_EXPANSION / REFRESH_PRIORITY_HIGH"
        : latest
          ? "PUBLISHED"
          : "NONE",
    thin_content_queue: (state?.remediation_queue ?? []).filter((row) => row.classification === "THIN" || row.classification === "NEEDS_EXPANSION").length,
    completeness_failures: state?.rejected_quality ?? 0,
    refresh_priority: (state?.remediation_queue ?? []).find((row) => row.url.includes("how-is-cap-rate-calculated"))?.priority ?? "NORMAL",
    blog_os: projectVentureBlogLiveWork(state?.venture_id ?? "occupancynpv"),
    system_blog: projectSystemBlogHq(),
    daily_blog_target: DAILY_BLOG_TARGET,
    max_other_new_high_value_assets: MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY,
  };
}
