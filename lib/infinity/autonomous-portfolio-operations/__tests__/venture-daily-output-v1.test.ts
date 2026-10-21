import { describe, expect, it, beforeEach } from "vitest";
import {
  CT_DAILY_OUTPUT_BLOCK_ROOT_CAUSE,
  ONPV_CONTENT_PRIORITY_ROOT_CAUSE,
  evaluateCtExhaustedCandidateReselectionQc,
  evaluateCtShirtConceptRotationQc,
  evaluateDailyBlogFloorQc,
  evaluateDailyOutputCounterSemanticsQc,
  evaluateDailyOutputFailClosedFixtureQc,
  evaluateDiscoveryBuildContinuationQc,
  evaluateExhaustedQuarantineWithReadySuccessorQc,
  evaluateLiveVentureDailyOutputQc,
  evaluateOnpvContentPriorityInversionQc,
  evaluateQuarantinedCandidateReselectionBlockQc,
  evaluateSameCycleCandidateRotationQc,
  evaluateStorefrontManufacturingSeparationQc,
  DAILY_BLOG_TARGET,
} from "../venture-daily-output-v1";
import {
  CANDIDATE_RETRY_BUDGET,
  candidateQuarantineKey,
  isCandidateQuarantined,
  quarantineCandidateQcExhausted,
  resetCandidateQuarantineStoreForTests,
} from "../venture-candidate-quarantine-v1";
import type { VentureContentContinuityReport } from "../live-venture-content-continuity-v1";
import { resolveLiveVentureContentContinuityV1 } from "../live-venture-content-continuity-v1";
function baseContinuity(overrides: Partial<VentureContentContinuityReport>): VentureContentContinuityReport {
  return {
    venture_id: "occupancynpv",
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
    content_lane_stop_reason: null,
    deploy_candidate: null,
    daily_quarantined_candidates: 0,
    LIVE_VENTURE_PREMATURE_IDLE_QC: "PASS",
    ...overrides,
  };
}

describe("venture daily output v1", () => {
  beforeEach(() => {
    resetCandidateQuarantineStoreForTests();
  });

  it("documents traced root causes", () => {
    expect(CT_DAILY_OUTPUT_BLOCK_ROOT_CAUSE).toContain("ACTIVE_CONTINUATION_IN_PROGRESS");
    expect(ONPV_CONTENT_PRIORITY_ROOT_CAUSE).toContain("INTERNAL_LINK_UPDATE");
  });

  it("regression A: second candidate advances when first fails editorial QC in same cycle", () => {
    expect(
      evaluateSameCycleCandidateRotationQc({
        first_candidate_failed: true,
        second_candidate_publishable: true,
        published_or_advanced_slug: "evergreen-guide-b",
        second_candidate_slug: "evergreen-guide-b",
      }),
    ).toBe("PASS");
  });

  it("regression B: exhausted candidate quarantined and ready successor selected", () => {
    const slugA = "garage-culture-as-rider-social-life";
    const slugB = "night-riding-cluster";
    quarantineCandidateQcExhausted({
      venture_id: "club-throttle",
      candidate_key: candidateQuarantineKey({ venture_id: "club-throttle", slug: slugA }),
      failure_reasons: ["EDITORIAL_QC_FAIL"],
      attempt_count: CANDIDATE_RETRY_BUDGET,
    });
    expect(
      evaluateExhaustedQuarantineWithReadySuccessorQc({
        exhausted_slug: slugA,
        quarantined: isCandidateQuarantined({
          venture_id: "club-throttle",
          candidate_key: candidateQuarantineKey({ venture_id: "club-throttle", slug: slugA }),
        }),
        ready_slug: slugB,
        selected_slug: slugB,
      }),
    ).toBe("PASS");
  });

  it("regression C: discovery continuation when no ready candidate and floor unmet", () => {
    expect(
      evaluateDiscoveryBuildContinuationQc({
        daily_floor_unmet: true,
        ready_candidates: 0,
        discovery_opportunity_legitimate: true,
        enqueued_build_or_qc: true,
      }),
    ).toBe("PASS");
  });

  it("regression D: ONPV publish outranks maintenance when blog floor unmet", () => {
    expect(
      evaluateOnpvContentPriorityInversionQc({
        daily_blog_target_met: false,
        qualified_ready_publish_count: 10,
        selected_work_type: "INTERNAL_LINK_UPDATE",
      }),
    ).toBe("FAIL");
    expect(
      evaluateOnpvContentPriorityInversionQc({
        daily_blog_target_met: false,
        qualified_ready_publish_count: 3,
        selected_work_type: "EVERGREEN_GUIDE",
      }),
    ).toBe("PASS");
  });

  it("regression E: second shirt concept proceeds after first fails art QC", () => {
    expect(
      evaluateCtShirtConceptRotationQc({
        first_concept_art_qc_fail: true,
        second_concept_passes: true,
        selected_concept_id: "concept-2",
        second_concept_id: "concept-2",
      }),
    ).toBe("PASS");
  });

  it("regression F: print hold does not block storefront when listing QC passes", () => {
    const sep = evaluateStorefrontManufacturingSeparationQc({
      print_production_qc_hold: true,
      storefront_listing_qc_pass: true,
    });
    expect(sep.STOREFRONT_PUBLICATION_BLOCKED_BY_PRINT_HOLD).toBe(false);
    expect(sep.MANUFACTURING_AUTHORIZED).toBe(false);
  });

  it("regression G: truthful no-op passes daily output QC", () => {
    const continuity = baseContinuity({
      content_lane_stop_reason: "NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN",
      discovery_ran: true,
      opportunities_examined: 3,
    });
    const qc = evaluateLiveVentureDailyOutputQc({ venture_id: "occupancynpv", continuity });
    expect(qc.result).toBe("PASS");
  });

  it("regression H: quarantined candidate skipped on next cycle selection", () => {
    const slug = "garage-culture-as-rider-social-life";
    quarantineCandidateQcExhausted({
      venture_id: "club-throttle",
      candidate_key: candidateQuarantineKey({ venture_id: "club-throttle", slug }),
      failure_reasons: ["EDITORIAL_QC_FAIL"],
    });
    expect(
      evaluateQuarantinedCandidateReselectionBlockQc({
        quarantined_key: candidateQuarantineKey({ venture_id: "club-throttle", slug }),
        selected_repair_key: candidateQuarantineKey({ venture_id: "club-throttle", slug: "other-slug" }),
      }),
    ).toBe("PASS");
    const nextDay = resolveLiveVentureContentContinuityV1({
      venture_id: "club-throttle",
      blogs_published_today: 0,
      assets_published_today: 0,
    });
    expect(nextDay.self_heal_candidate_slug).not.toBe(slug);
  });

  it("regression I: ACTIVE_CONTINUATION without forward progress fails closed", () => {
    const qc = evaluateLiveVentureDailyOutputQc({
      venture_id: "club-throttle",
      continuity: baseContinuity({
        venture_id: "club-throttle",
        content_lane_stop_reason: "ACTIVE_CONTINUATION_IN_PROGRESS",
        discovery_ran: false,
        deploy_candidate: null,
        self_heal_candidate_slug: null,
      }),
    });
    expect(qc.result).toBe("FAIL");
    expect(qc.reasons).toContain("ACTIVE_CONTINUATION_WITHOUT_FORWARD_PROGRESS");
  });

  it("quarantine durability across cycle boundary (next operating day)", () => {
    quarantineCandidateQcExhausted({
      venture_id: "club-throttle",
      candidate_key: candidateQuarantineKey({ venture_id: "club-throttle", slug: "stuck-slug" }),
      failure_reasons: ["QC_EXHAUSTED"],
      now: "2026-10-20T05:00:00.000Z",
    });
    expect(
      isCandidateQuarantined({
        venture_id: "club-throttle",
        candidate_key: candidateQuarantineKey({ venture_id: "club-throttle", slug: "stuck-slug" }),
        operating_day_utc: "2026-10-21",
      }),
    ).toBe(true);
  });

  it("daily blog floor fails when qualified candidates exist but blog count below target", () => {
    const qc = evaluateDailyBlogFloorQc({
      daily_blog_published: 0,
      qualified_publish_candidates: 5,
      stop_reason: null,
    });
    expect(qc.result).toBe("FAIL");
    expect(DAILY_BLOG_TARGET).toBe(1);
  });

  it("daily counter semantics reject inflated publish counts", () => {
    expect(
      evaluateDailyOutputCounterSemanticsQc({
        published_assets: 2,
        successful_publish_events: 2,
        failed_candidates: 1,
        maintenance_actions: 0,
        retry_attempts: 4,
      }),
    ).toBe("PASS");
    expect(
      evaluateDailyOutputCounterSemanticsQc({
        published_assets: 3,
        successful_publish_events: 1,
        failed_candidates: 0,
        maintenance_actions: 0,
        retry_attempts: 0,
      }),
    ).toBe("FAIL");
  });

  it("fail-closed daily output fixtures", () => {
    const fc = evaluateDailyOutputFailClosedFixtureQc();
    expect(fc.DAILY_OUTPUT_FAIL_CLOSED_FIXTURE_QC).toBe("PASS");
  });

  it("CT exhausted candidate reselection when quarantined and new opportunity selected", () => {
    quarantineCandidateQcExhausted({
      venture_id: "club-throttle",
      candidate_key: candidateQuarantineKey({ venture_id: "club-throttle", slug: "garage-culture-as-rider-social-life" }),
      failure_reasons: ["EDITORIAL_QC_FAIL"],
    });
    expect(
      evaluateCtExhaustedCandidateReselectionQc({
        self_heal_candidate_slug: "other-slug",
        quarantined_slugs: ["slug:garage-culture-as-rider-social-life"],
        selected_new_opportunity: "ct-night-riding-cluster",
        deploy_candidate_present: false,
      }),
    ).toBe("PASS");
  });
});
