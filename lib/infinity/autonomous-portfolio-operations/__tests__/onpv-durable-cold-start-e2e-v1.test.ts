import { describe, expect, it, beforeEach } from "vitest";
import {
  materializeOccupancyNpvContentCandidate,
  selectNextOnpvMaterializableOpportunity,
} from "../occupancynpv-opportunity-materialization-v1";
import { resetOnpvDurableOpportunityStoreForTests } from "../occupancynpv-durable-opportunity-catalog-v1";
import { resetOnpvMaterializedBacklogOverlayForTests } from "../occupancynpv-materialized-backlog-overlay-v1";
import {
  clearOnpvOpportunityModuleReadCachesForTests,
  getDurableOnpvOpportunityState,
  readOnpvOpportunityLifecycle,
} from "../onpv-durable-opportunity-state-v1";
import {
  enqueuePortfolioJob,
  listTestPortfolioJobQueueForTests,
  resetTestPortfolioJobQueueForTests,
} from "../durable/autonomous-portfolio-job-queue-v1";
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
    const action = await resolveOnpvDailyCreationAction({
      blog_floor_unmet: true,
      daily_blog_target_met: false,
    });
    expect(action.kind).toBe("MATERIALIZE_AND_BUILD");
    if (action.kind !== "MATERIALIZE_AND_BUILD") return;

    const buildSpec = await enqueueOnpvBlogBuildFromCreationAction({
      cycle_id: "cycle-cross-process",
      venture_id: CRE_VENTURE_ID,
      creation: action,
    });
    await enqueuePortfolioJob({
      cycle_id: "cycle-cross-process",
      venture_id: CRE_VENTURE_ID,
      job_type: "BLOG_BUILD",
      idempotency_key: buildSpec!.idempotency_key,
      input_lineage: buildSpec!.input_lineage,
    });

    resetOnpvMaterializedBacklogOverlayForTests();
    clearOnpvOpportunityModuleReadCachesForTests();

    const dup = await enqueuePortfolioJob({
      cycle_id: "cycle-cross-process",
      venture_id: CRE_VENTURE_ID,
      job_type: "BLOG_BUILD",
      idempotency_key: buildSpec!.idempotency_key,
      input_lineage: buildSpec!.input_lineage,
    });
    expect(dup.skipped).toBe(true);
    expect(listTestPortfolioJobQueueForTests().filter((j) => j.job_type === "BLOG_BUILD")).toHaveLength(1);
  });
});
