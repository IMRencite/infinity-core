import { describe, expect, it, beforeEach } from "vitest";
import { pickOccupancyNpvAutonomousBacklogCandidate } from "../portfolio-operating-backlog-publish-v1";
import {
  enqueueOnpvBlogBuildFromCreationAction,
  resolveOnpvDailyCreationAction,
} from "../onpv-daily-creation-priority-v1";
import {
  materializeOccupancyNpvContentCandidate,
  onpvCandidateMaterializationIdempotencyQc,
  selectNextOnpvMaterializableOpportunity,
} from "../occupancynpv-opportunity-materialization-v1";
import { resetOnpvDurableOpportunityStoreForTests } from "../occupancynpv-durable-opportunity-catalog-v1";
import { resetOnpvMaterializedBacklogOverlayForTests } from "../occupancynpv-materialized-backlog-overlay-v1";
import { setOnpvOpportunityLifecycleForTests } from "../onpv-durable-opportunity-test-helpers-v1";
import { evaluateNoDistinctQualifiedOpportunityProof } from "../no-distinct-qualified-opportunity-proof-v1";
import { resolveLiveVentureContentContinuityV1 } from "../live-venture-content-continuity-v1";
import {
  evaluateDailyBlogFloorQc,
  evaluateLiveVentureDailyOutputFloorQc,
  evaluateLiveVentureDailyOutputOrchestrationQc,
} from "../venture-daily-output-v1";
import { evaluateOccupancyNpvTargetPrepublishQc } from "../portfolio-operating-backlog-publish-v1";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { cyclePublicationCounterSemanticsQc } from "../durable/autonomous-portfolio-durable-execution-v1";
import {
  enqueuePortfolioJob,
  listTestPortfolioJobQueueForTests,
  resetTestPortfolioJobQueueForTests,
} from "../durable/autonomous-portfolio-job-queue-v1";
import { executePortfolioJobRowForTests } from "../durable/portfolio-job-worker-v1";
import { listOnpvCommittedDurableOpportunities } from "../occupancynpv-durable-opportunity-catalog-v1";
import { clearOnpvOpportunityModuleReadCachesForTests } from "../onpv-durable-opportunity-state-v1";

describe("business output semantic gaps e2e v1", () => {
  beforeEach(() => {
    resetOnpvDurableOpportunityStoreForTests();
    resetOnpvMaterializedBacklogOverlayForTests();
    resetTestPortfolioJobQueueForTests();
  });

  it("ONPV_EMPTY_BACKLOG_DISCOVERY_REFILL_E2E_QC", async () => {
    expect(pickOccupancyNpvAutonomousBacklogCandidate()).toBeNull();
    const action = await resolveOnpvDailyCreationAction({
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
    const readyAfterMaterialize = pickOccupancyNpvAutonomousBacklogCandidate();
    expect(readyAfterMaterialize?.slug).toBe(action.candidate.slug);

    const buildSpec = await enqueueOnpvBlogBuildFromCreationAction({
      cycle_id: "cycle-onpv-refill-e2e",
      venture_id: CRE_VENTURE_ID,
      creation: action,
    });
    expect(buildSpec?.job_type).toBe("BLOG_BUILD");
    const enqueued = await enqueuePortfolioJob({
      cycle_id: "cycle-onpv-refill-e2e",
      venture_id: CRE_VENTURE_ID,
      job_type: "BLOG_BUILD",
      idempotency_key: buildSpec!.idempotency_key,
      input_lineage: buildSpec!.input_lineage,
    });
    expect(enqueued.skipped).toBe(false);
    const jobs = listTestPortfolioJobQueueForTests();
    expect(jobs.some((j) => j.job_type === "BLOG_BUILD" && j.venture_id === CRE_VENTURE_ID)).toBe(true);
    const blogJob = jobs.find((j) => j.job_type === "BLOG_BUILD")!;
    expect(blogJob.input_lineage.opportunity_id).toBe("onpv-opp-ti-amortization-occupancy-cost-v1");
    expect(blogJob.input_lineage.materialized_candidate_key).toBe(action.candidate.asset_id);

    resetOnpvMaterializedBacklogOverlayForTests();
    clearOnpvOpportunityModuleReadCachesForTests();
    await executePortfolioJobRowForTests({ ...blogJob, status: "RUNNING", attempt_count: 0 });
    const finished = listTestPortfolioJobQueueForTests().find((j) => j.job_id === blogJob.job_id)!;
    expect(finished.status).toBe("COMPLETED");
  });

  it("ONPV_OPPORTUNITY_DUPLICATION_E2E_QC", async () => {
    const id = "onpv-opp-ti-amortization-occupancy-cost-v1";
    expect(await onpvCandidateMaterializationIdempotencyQc(id)).toBe("PASS");
    const second = await materializeOccupancyNpvContentCandidate({ opportunity_id: id });
    expect(second.outcome).toBe("ALREADY_MATERIALIZED");
    const action = await resolveOnpvDailyCreationAction({
      blog_floor_unmet: true,
      daily_blog_target_met: false,
    });
    expect(action.kind === "MATERIALIZE_AND_BUILD" || action.kind === "PUBLISH_READY").toBe(true);
  });

  it("ONPV_TRUE_NO_OPPORTUNITY_WAIVER_E2E_QC", async () => {
    for (const opp of listOnpvCommittedDurableOpportunities()) {
      await setOnpvOpportunityLifecycleForTests(opp.opportunity_id, "PUBLISHED");
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
    const action = await resolveOnpvDailyCreationAction({
      blog_floor_unmet: true,
      daily_blog_target_met: false,
    });
    expect(action.kind).toBe("MAINTENANCE_INTERNAL_LINK");
  });

  it("DAILY_OUTPUT_FLOOR_SEMANTICS_E2E_QC", async () => {
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
      await setOnpvOpportunityLifecycleForTests(opp.opportunity_id, "PUBLISHED");
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

  it("selectNextOnpvMaterializableOpportunity requires DISCOVERED lifecycle", async () => {
    expect(selectNextOnpvMaterializableOpportunity()).toBeTruthy();
    await setOnpvOpportunityLifecycleForTests("onpv-opp-ti-amortization-occupancy-cost-v1", "PUBLISHED");
    expect(selectNextOnpvMaterializableOpportunity()).toBeNull();
  });
});
