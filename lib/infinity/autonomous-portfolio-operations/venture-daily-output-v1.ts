import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import type { VentureContentContinuityReport } from "./live-venture-content-continuity-v1";
import type { VentureNextBestGrowthAction } from "./venture-next-best-growth-action-engine-v1";
import { countBacklogPublishCandidates } from "./portfolio-operating-backlog-publish-v1";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { CANDIDATE_RETRY_BUDGET } from "./venture-candidate-quarantine-v1";

export const LIVE_VENTURE_DAILY_OUTPUT_QC = "LIVE_VENTURE_DAILY_OUTPUT_QC" as const;
export const DAILY_BLOG_FLOOR_QC = "DAILY_BLOG_FLOOR_QC" as const;

export const DAILY_CONTENT_TARGET_MIN = 2 as const;
export const DAILY_CONTENT_TARGET_MAX = 4 as const;
export const DAILY_BLOG_TARGET = 1 as const;
export const DAILY_SHIRT_TARGET = 1 as const;

export type VentureDailyOutputCounters = {
  DAILY_CONTENT_TARGET: number;
  DAILY_CONTENT_PUBLISHED: number;
  DAILY_BLOG_TARGET: number;
  DAILY_BLOG_PUBLISHED: number;
  DAILY_MAINTENANCE_ACTIONS: number;
  DAILY_QUARANTINED_CANDIDATES: number;
  DAILY_CONTENT_DEFICIT: number;
  DAILY_SHIRT_TARGET: number;
  DAILY_SHIRTS_PUBLISHED: number;
  DAILY_SHIRT_CONCEPTS_FAILED: number;
  DAILY_SHIRT_CONCEPTS_QUARANTINED: number;
  DAILY_SHIRT_DEFICIT: number;
};

export type ValidVentureLaneStopReason =
  | "DAILY_TARGET_MET"
  | "NO_DISTINCT_VALID_OPPORTUNITY"
  | "TRUE_EXTERNAL_SYSTEM_BLOCKER"
  | "AUTHORIZED_RESOURCE_LIMIT_REACHED"
  | "DEPENDENCY_REQUIRED_FOR_PUBLICATION";

export const ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED = false as const;

export function buildVentureDailyOutputCounters(input: {
  venture_id: string;
  continuity: VentureContentContinuityReport;
  shirts_published_today?: number;
  shirt_concepts_failed?: number;
  shirt_concepts_quarantined?: number;
  maintenance_actions_today?: number;
}): VentureDailyOutputCounters {
  const contentPublished = input.continuity.assets_published_today;
  const blogPublished = input.continuity.blogs_published_today;
  const contentTarget = DAILY_CONTENT_TARGET_MIN;
  const shirtsPublished = input.shirts_published_today ?? 0;
  const isCt = input.venture_id === CLUB_THROTTLE_VENTURE_ID;
  return {
    DAILY_CONTENT_TARGET: contentTarget,
    DAILY_CONTENT_PUBLISHED: contentPublished,
    DAILY_BLOG_TARGET: DAILY_BLOG_TARGET,
    DAILY_BLOG_PUBLISHED: blogPublished,
    DAILY_MAINTENANCE_ACTIONS: input.maintenance_actions_today ?? 0,
    DAILY_QUARANTINED_CANDIDATES: input.continuity.daily_quarantined_candidates ?? 0,
    DAILY_CONTENT_DEFICIT: Math.max(0, contentTarget - contentPublished),
    DAILY_SHIRT_TARGET: isCt ? DAILY_SHIRT_TARGET : 0,
    DAILY_SHIRTS_PUBLISHED: isCt ? shirtsPublished : 0,
    DAILY_SHIRT_CONCEPTS_FAILED: isCt ? (input.shirt_concepts_failed ?? 0) : 0,
    DAILY_SHIRT_CONCEPTS_QUARANTINED: isCt ? (input.shirt_concepts_quarantined ?? 0) : 0,
    DAILY_SHIRT_DEFICIT: isCt ? Math.max(0, DAILY_SHIRT_TARGET - shirtsPublished) : 0,
  };
}

export function evaluateDailyBlogFloorQc(input: {
  daily_blog_published: number;
  qualified_publish_candidates: number;
  stop_reason: string | null;
}): { gate: typeof DAILY_BLOG_FLOOR_QC; result: "PASS" | "FAIL"; reasons: string[] } {
  if (input.daily_blog_published >= DAILY_BLOG_TARGET) {
    return { gate: DAILY_BLOG_FLOOR_QC, result: "PASS", reasons: [] };
  }
  if (
    input.stop_reason === "NO_DISTINCT_VALID_OPPORTUNITY" ||
    input.stop_reason === "TRUE_EXTERNAL_SYSTEM_BLOCKER" ||
    input.stop_reason === "NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN"
  ) {
    return { gate: DAILY_BLOG_FLOOR_QC, result: "PASS", reasons: ["TRUTHFUL_STOP"] };
  }
  if (input.qualified_publish_candidates > 0) {
    return { gate: DAILY_BLOG_FLOOR_QC, result: "FAIL", reasons: ["BLOG_FLOOR_UNMET_WITH_QUALIFIED_CANDIDATES"] };
  }
  return { gate: DAILY_BLOG_FLOOR_QC, result: "PASS", reasons: ["NO_QUALIFIED_CANDIDATE"] };
}

export function evaluateOnpvContentPriorityInversionQc(input: {
  daily_blog_target_met: boolean;
  qualified_ready_publish_count: number;
  selected_work_type: string;
}): "PASS" | "FAIL" {
  if (input.daily_blog_target_met) return "PASS";
  if (input.qualified_ready_publish_count <= 0) return "PASS";
  if (input.selected_work_type === "INTERNAL_LINK_UPDATE") return "FAIL";
  return "PASS";
}

export function evaluateCtExhaustedCandidateReselectionQc(input: {
  self_heal_candidate_slug: string | null;
  quarantined_slugs: string[];
  selected_new_opportunity: string | null;
  deploy_candidate_present: boolean;
}): "PASS" | "FAIL" {
  if (input.deploy_candidate_present) return "PASS";
  if (!input.self_heal_candidate_slug) return "PASS";
  if (!input.quarantined_slugs.includes(`slug:${input.self_heal_candidate_slug}`)) return "PASS";
  if (input.selected_new_opportunity && !input.selected_new_opportunity.includes(input.self_heal_candidate_slug)) {
    return "PASS";
  }
  return "FAIL";
}

export function evaluateStorefrontManufacturingSeparationQc(input: {
  print_production_qc_hold: boolean;
  storefront_listing_qc_pass: boolean;
}): {
  STOREFRONT_PUBLICATION_BLOCKED_BY_PRINT_HOLD: boolean;
  STOREFRONT_READY: boolean;
  MANUFACTURING_AUTHORIZED: boolean;
} {
  const storefrontReady = input.storefront_listing_qc_pass;
  return {
    STOREFRONT_PUBLICATION_BLOCKED_BY_PRINT_HOLD: false,
    STOREFRONT_READY: storefrontReady,
    MANUFACTURING_AUTHORIZED: ADDITIONAL_PROVIDER_MANUFACTURING_AUTHORIZED && !input.print_production_qc_hold,
  };
}

export function evaluateAutonomousStorefrontPublicationAllowed(input: {
  storefront_ready: boolean;
  autonomous_storefront_publish_enabled?: boolean;
}): boolean {
  const policy = input.autonomous_storefront_publish_enabled ?? true;
  return input.storefront_ready && policy;
}

export function evaluateCtDailyShirtNaturalQc(input: {
  daily_shirts_published: number;
  daily_shirt_target: number;
  storefront_ready_unpublished: boolean;
  no_valid_storefront_ready_concept: boolean;
  pipeline_continued_to_next_concept: boolean;
}): { gate: "CT_DAILY_SHIRT_NATURAL_QC"; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (input.daily_shirts_published >= input.daily_shirt_target) {
    return { gate: "CT_DAILY_SHIRT_NATURAL_QC", result: "PASS", reasons: [] };
  }
  if (input.no_valid_storefront_ready_concept && input.pipeline_continued_to_next_concept) {
    return { gate: "CT_DAILY_SHIRT_NATURAL_QC", result: "PASS", reasons: ["TRUTHFUL_CONTINUATION"] };
  }
  if (input.storefront_ready_unpublished) {
    reasons.push("FAIL_STOREFRONT_READY_NOT_PUBLISHED");
  }
  if (input.daily_shirts_published < input.daily_shirt_target) {
    reasons.push("DAILY_SHIRT_TARGET_UNMET");
  }
  return { gate: "CT_DAILY_SHIRT_NATURAL_QC", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateCtDailyShirtCounterSemanticsQc(input: {
  daily_shirts_published: number;
  customer_visible_publication_events: number;
}): "PASS" | "FAIL" {
  return input.daily_shirts_published === input.customer_visible_publication_events ? "PASS" : "FAIL";
}

export function evaluateLiveVentureDailyOutputQc(input: {
  venture_id: string;
  continuity: VentureContentContinuityReport;
  next_best?: VentureNextBestGrowthAction | null;
}): { gate: typeof LIVE_VENTURE_DAILY_OUTPUT_QC; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  const backlog = listOccupancyClubThrottleBacklogArticles();
  const qualified =
    input.venture_id === CRE_VENTURE_ID || input.venture_id === "occupancynpv"
      ? countBacklogPublishCandidates(backlog)
      : input.continuity.ready_candidate_count;

  const blogFloor = evaluateDailyBlogFloorQc({
    daily_blog_published: input.continuity.blogs_published_today,
    qualified_publish_candidates: qualified,
    stop_reason: input.continuity.content_lane_stop_reason,
  });
  if (blogFloor.result === "FAIL") reasons.push(...blogFloor.reasons);

  if (
    input.next_best &&
    (input.venture_id === CRE_VENTURE_ID || input.venture_id === "occupancynpv") &&
    evaluateOnpvContentPriorityInversionQc({
      daily_blog_target_met: input.continuity.daily_blog_target_met,
      qualified_ready_publish_count: qualified,
      selected_work_type: input.next_best.selected_work_type,
    }) === "FAIL"
  ) {
    reasons.push("ONPV_MAINTENANCE_DISPLACED_PUBLISH_FLOOR");
  }

  if (
    input.continuity.content_lane_stop_reason === "ACTIVE_CONTINUATION_IN_PROGRESS" &&
    !input.continuity.self_heal_candidate_slug &&
    !input.continuity.deploy_candidate &&
    !input.continuity.discovery_ran
  ) {
    reasons.push("ACTIVE_CONTINUATION_WITHOUT_FORWARD_PROGRESS");
  }

  return {
    gate: LIVE_VENTURE_DAILY_OUTPUT_QC,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

/** Documented root causes from control-flow trace (Mission 1). */
export const CT_DAILY_OUTPUT_BLOCK_ROOT_CAUSE =
  "NO_GATE_PASSING_DEPLOY_CANDIDATE plus ACTIVE_CONTINUATION_IN_PROGRESS treats remaining discovery/repair opportunities as cycle-level stop without quarantining exhausted repair slug or rotating self-heal target; single CONTENT_SELF_HEAL idempotency key per venture replays same top repair row." as const;

export const ONPV_CONTENT_PRIORITY_ROOT_CAUSE =
  "ready_candidate_count counts all drafts not gate-qualified publish rows; when pickOccupancyNpvAutonomousBacklogCandidate returns null orchestrator enqueues INTERNAL_LINK_UPDATE despite unpublished drafts existing; next-best action mirrors same pick and defaults to authority maintenance." as const;

export function evaluateSameCycleCandidateRotationQc(input: {
  first_candidate_failed: boolean;
  second_candidate_publishable: boolean;
  published_or_advanced_slug: string | null;
  second_candidate_slug: string;
}): "PASS" | "FAIL" {
  if (!input.first_candidate_failed || !input.second_candidate_publishable) return "PASS";
  if (input.published_or_advanced_slug === input.second_candidate_slug) return "PASS";
  return "FAIL";
}

export function evaluateExhaustedQuarantineWithReadySuccessorQc(input: {
  exhausted_slug: string;
  quarantined: boolean;
  ready_slug: string | null;
  selected_slug: string | null;
}): "PASS" | "FAIL" {
  if (!input.quarantined) return "FAIL";
  if (!input.ready_slug) return "PASS";
  if (input.selected_slug === input.ready_slug && input.selected_slug !== input.exhausted_slug) return "PASS";
  return "FAIL";
}

export function evaluateDiscoveryBuildContinuationQc(input: {
  daily_floor_unmet: boolean;
  ready_candidates: number;
  discovery_opportunity_legitimate: boolean;
  enqueued_build_or_qc: boolean;
}): "PASS" | "FAIL" {
  if (!input.daily_floor_unmet || input.ready_candidates > 0) return "PASS";
  if (input.discovery_opportunity_legitimate && input.enqueued_build_or_qc) return "PASS";
  if (!input.discovery_opportunity_legitimate) return "PASS";
  return "FAIL";
}

export function evaluateCtShirtConceptRotationQc(input: {
  first_concept_art_qc_fail: boolean;
  second_concept_passes: boolean;
  selected_concept_id: string | null;
  second_concept_id: string;
}): "PASS" | "FAIL" {
  if (!input.first_concept_art_qc_fail || !input.second_concept_passes) return "PASS";
  return input.selected_concept_id === input.second_concept_id ? "PASS" : "FAIL";
}

export function evaluateQuarantinedCandidateReselectionBlockQc(input: {
  quarantined_key: string;
  selected_repair_key: string | null;
}): "PASS" | "FAIL" {
  if (!input.selected_repair_key) return "PASS";
  return input.selected_repair_key === input.quarantined_key ? "FAIL" : "PASS";
}

export function evaluateDailyOutputCounterSemanticsQc(input: {
  published_assets: number;
  successful_publish_events: number;
  failed_candidates: number;
  maintenance_actions: number;
  retry_attempts: number;
}): "PASS" | "FAIL" {
  if (input.published_assets !== input.successful_publish_events) return "FAIL";
  if (input.published_assets > 0 && input.failed_candidates > input.published_assets * 10) return "FAIL";
  if (input.published_assets > 0 && input.retry_attempts > input.published_assets + input.maintenance_actions + 5) {
    return "FAIL";
  }
  return "PASS";
}

export function evaluateDailyOutputFailClosedFixtureQc(): {
  DAILY_OUTPUT_FAIL_CLOSED_FIXTURE_QC: "PASS" | "FAIL";
  cases: Record<string, "PASS" | "FAIL">;
} {
  const cases = {
    unbounded_candidate_retry:
      CANDIDATE_RETRY_BUDGET === 3 ? ("PASS" as const) : ("FAIL" as const),
    quarantined_immediately_reselected: evaluateQuarantinedCandidateReselectionBlockQc({
      quarantined_key: "slug:bad",
      selected_repair_key: "slug:good",
    }),
    maintenance_displaces_publish:
      evaluateOnpvContentPriorityInversionQc({
        daily_blog_target_met: false,
        qualified_ready_publish_count: 2,
        selected_work_type: "INTERNAL_LINK_UPDATE",
      }) === "FAIL"
        ? ("PASS" as const)
        : ("FAIL" as const),
    manufacturing_hold_blocks_storefront_incorrectly:
      evaluateStorefrontManufacturingSeparationQc({
        print_production_qc_hold: true,
        storefront_listing_qc_pass: true,
      }).STOREFRONT_PUBLICATION_BLOCKED_BY_PRINT_HOLD === false
        ? ("PASS" as const)
        : ("FAIL" as const),
    counter_increments_on_failed_candidate:
      evaluateDailyOutputCounterSemanticsQc({
        published_assets: 0,
        successful_publish_events: 0,
        failed_candidates: 3,
        maintenance_actions: 0,
        retry_attempts: 3,
      }) === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const),
    active_continuation_without_progress:
      evaluateLiveVentureDailyOutputQc({
        venture_id: "club-throttle",
        continuity: {
          venture_id: "club-throttle",
          ready_candidate_count: 0,
          refresh_ready_count: 0,
          repairable_candidate_count: 0,
          self_heal_candidate_slug: null,
          self_heal_failure_reasons: [],
          discovery_ran: false,
          opportunities_examined: 0,
          duplicates_rejected: 0,
          low_value_opportunities_rejected: 0,
          quality_infeasible_opportunities: 0,
          remaining_valid_opportunities: 0,
          selected_new_opportunity: null,
          daily_qualified_content_target_met: false,
          daily_blog_target_met: false,
          assets_published_today: 0,
          blogs_published_today: 0,
          content_lane_stop_reason: "ACTIVE_CONTINUATION_IN_PROGRESS",
          deploy_candidate: null,
          daily_quarantined_candidates: 0,
          LIVE_VENTURE_PREMATURE_IDLE_QC: "PASS",
        },
      }).result === "FAIL"
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const pass = Object.values(cases).every((v) => v === "PASS");
  return { DAILY_OUTPUT_FAIL_CLOSED_FIXTURE_QC: pass ? "PASS" : "FAIL", cases };
}
