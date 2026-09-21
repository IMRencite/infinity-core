import { DAILY_BLOG_TARGET, MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY } from "../blog-os/contract";
import { projectSystemBlogHq, projectVentureBlogLiveWork } from "../blog-os/live-work";
import { productionCrossSystemIsolationEvidence } from "./gates";
import { getOrganicGrowthSchedulerState } from "./scheduler";

export function projectOrganicRuntimeHq(now = new Date().toISOString()) {
  const state = getOrganicGrowthSchedulerState();
  const isolation = productionCrossSystemIsolationEvidence();
  const counts = {
    new: state.obligations.filter((row) => row.decision === "NEW_PAGE").length,
    expand: state.obligations.filter((row) => row.decision === "EXPAND_EXISTING").length,
    refresh: state.obligations.filter((row) => row.decision === "REFRESH_EXISTING").length,
    do_not_publish: state.obligations.filter((row) => row.state === "DO_NOT_PUBLISH" || row.decision === "DO_NOT_PUBLISH").length,
    published: state.obligations.filter((row) => row.state === "PUBLISHED" || row.state === "VERIFIED").length,
    failed: state.logs.filter((row) => row.reason.includes("FAIL")).length,
    escalated: state.obligations.filter((row) => row.state === "ESCALATED").length,
  };
  const latest = [...state.obligations].reverse().find((row) => row.state === "VERIFIED" || row.state === "PUBLISHED");
  const oldest = state.obligations
    .filter((row) => row.state !== "VERIFIED" && row.state !== "DO_NOT_PUBLISH" && row.state !== "CANCELLED" && row.state !== "SUPERSEDED")
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))[0];
  const hold = state.publishing_hold;
  const paused = Boolean(hold);
  return {
    organic_growth: "ACTIVE",
    publishing: hold ?? "LIVE",
    first_autonomous_canary: state.first_canary_status,
    second_autonomous_canary: state.second_canary_status,
    qc_escapes: state.qc_escape_count,
    current_repair: paused ? "IN_PROGRESS" : "REPAIRED",
    scheduler: state.last_tick_at ? "ACTIVE" : "ARMED",
    worker: "ACTIVE",
    watchdog: state.business_loop,
    business_loop: paused ? "DEGRADED" : state.business_loop,
    qc_health: paused ? "DEGRADED" : "HEALTHY",
    publishing_health: hold ?? "HEALTHY",
    runtime_isolation: isolation.result,
    todays_run: state.last_tick_at ? "RAN" : "PENDING",
    opportunities_evaluated: state.obligations.length,
    ...counts,
    oldest_active_work: oldest ? Date.parse(now) - Date.parse(oldest.created_at) : 0,
    latest_published_title: latest?.title ?? null,
    latest_url: latest ? `https://occupancynpv.com${latest.route}` : null,
    next_run: state.next_run_at,
    next_publish: paused ? "BLOCKED_QC_REPAIR" : state.next_run_at,
    cursor_required: false,
    founder_required: false,
    execute_publish_authorized: true,
    execute_publish: !paused,
    daily_new_asset_ceiling: 2,
    daily_blog_target: DAILY_BLOG_TARGET,
    max_other_new_high_value_assets: MAX_OTHER_NEW_HIGH_VALUE_ASSETS_PER_DAY,
    blog_os: projectVentureBlogLiveWork("occupancynpv", now),
    system_blog: projectSystemBlogHq(now),
    screenshot_capture: state.qc_repair?.screenshot_capture ?? "NOT_RUN",
    visual_inspection: state.qc_repair?.visual_inspection ?? "NOT_RUN",
    element_contrast: state.qc_repair?.element_contrast ?? "NOT_RUN",
    rendered_text_visibility: state.qc_repair?.rendered_text_visibility ?? "NOT_RUN",
    layout: state.qc_repair?.layout ?? "NOT_RUN",
    content_density_visual: state.qc_repair?.content_density_visual ?? "NOT_RUN",
    intent_coverage: state.qc_repair?.intent_coverage ?? "NOT_RUN",
    human_resource_depth: state.qc_repair?.human_resource_depth ?? "NOT_RUN",
    thin_content: state.qc_repair?.thin_content ?? "NOT_RUN",
    contrast: state.qc_repair?.contrast ?? "NOT_RUN",
    metadata: state.qc_repair?.metadata ?? "NOT_RUN",
    public_internal_language: state.qc_repair?.public_internal_language ?? "NOT_RUN",
    product_maturity_truth: state.qc_repair?.product_maturity_truth ?? "NOT_RUN",
    post_publish: state.qc_repair?.post_publish ?? "NOT_RUN",
    browser_qc: state.qc_repair?.browser_qc ?? "NOT_RUN",
    desktop: state.qc_repair?.desktop ?? "NOT_RUN",
    tablet: state.qc_repair?.tablet ?? "NOT_RUN",
    mobile: state.qc_repair?.mobile ?? "NOT_RUN",
    next_candidate: state.obligations.find((row) => row.state === "SCHEDULED" || row.state === "CLAIMED")?.state
      ?? state.obligations.find((row) => row.state !== "VERIFIED" && row.state !== "PUBLISHED" && row.state !== "DO_NOT_PUBLISH" && row.state !== "CANCELLED" && row.state !== "SUPERSEDED")?.state
      ?? "NONE",
  };
}
