import { describe, expect, it, beforeEach } from "vitest";
import {
  materializeOccupancyNpvContentCandidate,
  selectNextOnpvMaterializableOpportunity,
} from "../occupancynpv-opportunity-materialization-v1";
import { resetOnpvDurableOpportunityStoreForTests } from "../occupancynpv-durable-opportunity-catalog-v1";
import {
  onpvMaterializedBacklogOverlayArticleCountForTests,
  resetOnpvMaterializedBacklogOverlayForTests,
} from "../occupancynpv-materialized-backlog-overlay-v1";
import {
  clearOnpvOpportunityModuleReadCachesForTests,
  getDurableOnpvOpportunityState,
  listDurableOnpvOpportunityStates,
  readOnpvOpportunityLifecycle,
} from "../onpv-durable-opportunity-state-v1";
import {
  enqueuePortfolioJob,
  listTestPortfolioJobQueueForTests,
  resetTestPortfolioJobQueueForTests,
} from "../durable/autonomous-portfolio-job-queue-v1";
import { executePortfolioJobRowForTests } from "../durable/portfolio-job-worker-v1";
import { enqueueOnpvBlogBuildFromCreationAction, resolveOnpvDailyCreationAction } from "../onpv-daily-creation-priority-v1";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";

describe("onpv durable cold start e2e v1", () => {
  beforeEach(() => {
    resetOnpvDurableOpportunityStoreForTests();
    resetOnpvMaterializedBacklogOverlayForTests();
    resetTestPortfolioJobQueueForTests();
  });

  it("ONPV_OPPORTUNITY_COLD_START_IDEMPOTENCY_QC", async () => {
    const id = "onpv-opp-ti-amortization-occupancy-cost-v1";
    expect(selectNextOnpvMaterializableOpportunity()).toBeTruthy();
    await materializeOccupancyNpvContentCandidate({ opportunity_id: id });
    expect(readOnpvOpportunityLifecycle(id)).toBe("MATERIALIZED");

    resetOnpvMaterializedBacklogOverlayForTests();
    clearOnpvOpportunityModuleReadCachesForTests();

    expect(selectNextOnpvMaterializableOpportunity()).toBeNull();
    const durable = await getDurableOnpvOpportunityState(id);
    expect(durable?.materialized_article?.slug).toBe("how-ti-amortization-affects-occupancy-cost-for-tenants");
    expect(readOnpvOpportunityLifecycle(id)).toBe("MATERIALIZED");
  });

  it("ONPV_OPPORTUNITY_CONCURRENT_MATERIALIZATION_E2E_QC", async () => {
    const id = "onpv-opp-ti-amortization-occupancy-cost-v1";
    const [a, b] = await Promise.all([
      materializeOccupancyNpvContentCandidate({ opportunity_id: id }),
      materializeOccupancyNpvContentCandidate({ opportunity_id: id }),
    ]);
    const outcomes = [a.outcome, b.outcome].sort();
    expect(outcomes).toEqual(["ALREADY_MATERIALIZED", "MATERIALIZED"]);
    const durable = await getDurableOnpvOpportunityState(id);
    expect(durable?.materialized_candidate_key).toBe(`onpv-materialized-${id}`);
  });

  it("ONPV_BLOG_BUILD_CROSS_PROCESS_HANDOFF_QC", async () => {
    const expectedOpportunityId = "onpv-opp-ti-amortization-occupancy-cost-v1";
    const expectedSlug = "how-ti-amortization-affects-occupancy-cost-for-tenants";
    const expectedMaterializedKey = `onpv-materialized-${expectedOpportunityId}`;

    const action = await resolveOnpvDailyCreationAction({
      blog_floor_unmet: true,
      daily_blog_target_met: false,
    });
    expect(action.kind).toBe("MATERIALIZE_AND_BUILD");
    if (action.kind !== "MATERIALIZE_AND_BUILD") return;
    expect(action.opportunity_id).toBe(expectedOpportunityId);
    expect(action.candidate.slug).toBe(expectedSlug);
    expect(action.candidate.asset_id).toBe(expectedMaterializedKey);

    const buildSpec = await enqueueOnpvBlogBuildFromCreationAction({
      cycle_id: "cycle-cross-process",
      venture_id: CRE_VENTURE_ID,
      creation: action,
    });
    expect(buildSpec?.job_type).toBe("BLOG_BUILD");
    await enqueuePortfolioJob({
      cycle_id: "cycle-cross-process",
      venture_id: CRE_VENTURE_ID,
      job_type: "BLOG_BUILD",
      idempotency_key: buildSpec!.idempotency_key,
      input_lineage: buildSpec!.input_lineage,
    });

    const blogJob = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "BLOG_BUILD")!;
    expect(blogJob.venture_id).toBe(CRE_VENTURE_ID);
    expect(blogJob.input_lineage.opportunity_id).toBe(expectedOpportunityId);
    expect(blogJob.input_lineage.materialized_candidate_key).toBe(expectedMaterializedKey);
    expect(blogJob.input_lineage.slug).toBe(expectedSlug);

    resetOnpvMaterializedBacklogOverlayForTests();
    clearOnpvOpportunityModuleReadCachesForTests();

    expect(onpvMaterializedBacklogOverlayArticleCountForTests()).toBe(0);

    const dup = await enqueuePortfolioJob({
      cycle_id: "cycle-cross-process",
      venture_id: CRE_VENTURE_ID,
      job_type: "BLOG_BUILD",
      idempotency_key: buildSpec!.idempotency_key,
      input_lineage: buildSpec!.input_lineage,
    });
    expect(dup.skipped).toBe(true);
    expect(listTestPortfolioJobQueueForTests().filter((j) => j.job_type === "BLOG_BUILD")).toHaveLength(1);

    const persistedJob = listTestPortfolioJobQueueForTests().find((j) => j.job_id === blogJob.job_id)!;
    expect(persistedJob.input_lineage.opportunity_id).toBe(expectedOpportunityId);
    expect(persistedJob.input_lineage.materialized_candidate_key).toBe(expectedMaterializedKey);

    await executePortfolioJobRowForTests({ ...persistedJob, status: "RUNNING", attempt_count: 0 });

    const finished = listTestPortfolioJobQueueForTests().find((j) => j.job_id === blogJob.job_id)!;
    expect(finished.status).toBe("COMPLETED");
    expect(finished.output_lineage?.slug).toBe(expectedSlug);
    expect(finished.output_lineage?.opportunity_id).toBe(expectedOpportunityId);
    expect(finished.output_lineage?.materialized_candidate_key).toBe(expectedMaterializedKey);
    expect(finished.output_lineage?.materialized).toBe(true);

    const deployJobs = listTestPortfolioJobQueueForTests().filter((j) => j.job_type === "VENTURE_DEPLOY");
    expect(deployJobs.length).toBeGreaterThan(0);
    expect(deployJobs.some((j) => j.input_lineage.work_type === "NEW_PUBLICATION")).toBe(true);

    const durableStates = await listDurableOnpvOpportunityStates();
    expect(durableStates).toHaveLength(1);
    expect(durableStates[0]?.opportunity_id).toBe(expectedOpportunityId);
    expect(durableStates[0]?.materialized_candidate_key).toBe(expectedMaterializedKey);
    expect(durableStates[0]?.materialized_article?.slug).toBe(expectedSlug);
    expect(durableStates[0]?.materialized_slug).toBe(expectedSlug);

    expect(readOnpvOpportunityLifecycle(expectedOpportunityId)).toBe("BUILT");
    const durableAfter = await getDurableOnpvOpportunityState(expectedOpportunityId);
    expect(durableAfter?.opportunity_lifecycle).toBe("BUILT");
  });
});
