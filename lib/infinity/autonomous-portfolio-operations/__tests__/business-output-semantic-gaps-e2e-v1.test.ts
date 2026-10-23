import { describe, expect, it, beforeEach } from "vitest";
import { pickOccupancyNpvAutonomousBacklogCandidate } from "../portfolio-operating-backlog-publish-v1";
import { resolveOnpvDailyCreationAction } from "../onpv-daily-creation-priority-v1";
import {
  materializeOccupancyNpvContentCandidate,
  onpvCandidateMaterializationIdempotencyQc,
  selectNextOnpvMaterializableOpportunity,
} from "../occupancynpv-opportunity-materialization-v1";
import {
  listOnpvCommittedDurableOpportunities,
  resetOnpvDurableOpportunityStoreForTests,
  setOnpvDurableOpportunityLifecycle,
} from "../occupancynpv-durable-opportunity-catalog-v1";
import { resetOnpvMaterializedBacklogOverlayForTests } from "../occupancynpv-materialized-backlog-overlay-v1";
import { evaluateNoDistinctQualifiedOpportunityProof } from "../no-distinct-qualified-opportunity-proof-v1";
import { resolveLiveVentureContentContinuityV1 } from "../live-venture-content-continuity-v1";
import {
  evaluateDailyBlogFloorQc,
  evaluateLiveVentureDailyOutputFloorQc,
  evaluateLiveVentureDailyOutputOrchestrationQc,
} from "../venture-daily-output-v1";
import { evaluateOccupancyNpvTargetPrepublishQc } from "../portfolio-operating-backlog-publish-v1";
import { rankOccupancyNpvAutonomousPublishRows } from "../portfolio-operating-backlog-publish-v1";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { cyclePublicationCounterSemanticsQc } from "../durable/autonomous-portfolio-durable-execution-v1";

describe("business output semantic gaps e2e v1", () => {
  beforeEach(() => {
    resetOnpvDurableOpportunityStoreForTests();
    resetOnpvMaterializedBacklogOverlayForTests();
  });

  it("ONPV_EMPTY_BACKLOG_DISCOVERY_REFILL_E2E_QC", () => {
    expect(pickOccupancyNpvAutonomousBacklogCandidate()).toBeNull();
    const action = resolveOnpvDailyCreationAction({
      blog_floor_unmet: true,
      daily_blog_target_met: false,
    });
    expect(action.kind).not.toBe("MAINTENANCE_INTERNAL_LINK");
    expect(action.kind).toBe("MATERIALIZE_AND_BUILD");
    if (action.kind !== "MATERIALIZE_AND_BUILD") return;
    expect(action.opportunity_id).toBe("onpv-opp-ti-amortization-occupancy-cost-v1");
    const prepublishNew = evaluateOccupancyNpvTargetPrepublishQc({
      path: action.candidate.path,
      work_type: "NEW_PUBLICATION",
    });
    expect(prepublishNew.reasons.join(",")).not.toContain("NEW_PUBLISH_MAINTENANCE_CONTRACT_REJECTED");
    const prepublishMaint = evaluateOccupancyNpvTargetPrepublishQc({
      path: action.candidate.path,
      work_type: "INTERNAL_LINK_UPDATE",
      articles: [{ ...action.candidate, registry_state: "PUBLISHED" }],
    });
    expect(prepublishMaint.OCCUPANCYNPV_TARGET_PREPUBLISH_QC).toBeDefined();
    const readyAfterMaterialize = pickOccupancyNpvAutonomousBacklogCandidate();
    expect(readyAfterMaterialize?.slug).toBe(action.candidate.slug);
  });

  it("ONPV_OPPORTUNITY_DUPLICATION_E2E_QC", () => {
    const id = "onpv-opp-ti-amortization-occupancy-cost-v1";
    expect(onpvCandidateMaterializationIdempotencyQc(id)).toBe("PASS");
    const second = materializeOccupancyNpvContentCandidate({ opportunity_id: id });
    expect(second.outcome).toBe("ALREADY_MATERIALIZED");
    const action = resolveOnpvDailyCreationAction({
      blog_floor_unmet: true,
      daily_blog_target_met: false,
    });
    expect(action.kind === "MATERIALIZE_AND_BUILD" || action.kind === "PUBLISH_READY").toBe(true);
  });

  it("ONPV_TRUE_NO_OPPORTUNITY_WAIVER_E2E_QC", () => {
    for (const opp of listOnpvCommittedDurableOpportunities()) {
      setOnpvDurableOpportunityLifecycle(opp.opportunity_id, "PUBLISHED");
    }
    const proof = evaluateNoDistinctQualifiedOpportunityProof();
    expect(proof.NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN).toBe(true);
    const continuity = resolveLiveVentureContentContinuityV1({
      venture_id: CRE_VENTURE_ID,
      blogs_published_today: 0,
      assets_published_today: 0,
    });
    expect(continuity.content_lane_stop_reason).toBe("NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN");
    const blogFloor = evaluateDailyBlogFloorQc({
      daily_blog_published: 0,
      qualified_publish_candidates: 0,
      stop_reason: continuity.content_lane_stop_reason,
    });
    expect(blogFloor.result).toBe("PASS");
    const action = resolveOnpvDailyCreationAction({
      blog_floor_unmet: true,
      daily_blog_target_met: false,
    });
    expect(action.kind).toBe("MAINTENANCE_INTERNAL_LINK");
  });

  it("DAILY_OUTPUT_FLOOR_SEMANTICS_E2E_QC", () => {
    const caseA = resolveLiveVentureContentContinuityV1({
      venture_id: CRE_VENTURE_ID,
      blogs_published_today: 0,
      assets_published_today: 0,
    });
    expect(evaluateLiveVentureDailyOutputOrchestrationQc({ venture_id: CRE_VENTURE_ID, continuity: caseA }).result).toBe(
      "PASS",
    );
    expect(evaluateLiveVentureDailyOutputFloorQc({ venture_id: CRE_VENTURE_ID, continuity: caseA }).result).toBe("FAIL");
    expect(caseA.daily_qualified_content_target_met).toBe(false);

    for (const opp of listOnpvCommittedDurableOpportunities()) {
      setOnpvDurableOpportunityLifecycle(opp.opportunity_id, "PUBLISHED");
    }
    const caseB = resolveLiveVentureContentContinuityV1({
      venture_id: CRE_VENTURE_ID,
      blogs_published_today: 0,
      assets_published_today: 0,
    });
    expect(caseB.content_lane_stop_reason).toBe("NO_DISTINCT_QUALIFIED_OPPORTUNITY_EXISTS_PROVEN");
    expect(
      evaluateDailyBlogFloorQc({
        daily_blog_published: 0,
        qualified_publish_candidates: 0,
        stop_reason: caseB.content_lane_stop_reason,
      }).result,
    ).toBe("PASS");

    const caseC = resolveLiveVentureContentContinuityV1({
      venture_id: CRE_VENTURE_ID,
      blogs_published_today: 1,
      assets_published_today: 2,
    });
    expect(caseC.daily_qualified_content_target_met).toBe(true);
    expect(
      evaluateDailyBlogFloorQc({
        daily_blog_published: 1,
        qualified_publish_candidates: 0,
        stop_reason: caseC.content_lane_stop_reason,
      }).result,
    ).toBe("PASS");
  });

  it("CYCLE_PUBLICATION_COUNTER_SEMANTICS_QC", () => {
    expect(cyclePublicationCounterSemanticsQc()).toBe("PASS");
  });

  it("selectNextOnpvMaterializableOpportunity requires DISCOVERED lifecycle", () => {
    expect(selectNextOnpvMaterializableOpportunity()).toBeTruthy();
    setOnpvDurableOpportunityLifecycle("onpv-opp-ti-amortization-occupancy-cost-v1", "PUBLISHED");
    expect(selectNextOnpvMaterializableOpportunity()).toBeNull();
  });
});
