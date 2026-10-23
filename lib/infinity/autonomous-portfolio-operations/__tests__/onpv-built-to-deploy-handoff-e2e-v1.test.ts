import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../durable/async-venture-deployment-reconciliation-v1", async (importOriginal) => {
  const original = await importOriginal<typeof import("../durable/async-venture-deployment-reconciliation-v1")>();
  return {
    ...original,
    executeBoundedVentureDeploy: vi.fn(async () => ({
      phase: "COMPLETED" as const,
      ok: true,
      deployment_id: "dpl_onpv_handoff_e2e_test",
      production_url: "https://occupancynpv.com/blog/leasing/how-ti-amortization-affects-occupancy-cost-for-tenants/",
      safe_error: null,
      provider_post_count: 1,
      frozen_bundle_manifest_hash: "test-manifest",
    })),
  };
});
import {
  enqueueOnpvBlogBuildFromCreationAction,
  resolveOnpvDailyCreationAction,
} from "../onpv-daily-creation-priority-v1";
import { resetOnpvDurableOpportunityStoreForTests } from "../occupancynpv-durable-opportunity-catalog-v1";
import {
  classifyOnpvCommittedSeedSourceEvidence,
  listOnpvCommittedDurableOpportunities,
} from "../occupancynpv-durable-opportunity-catalog-v1";
import { selectNextOnpvMaterializableOpportunity } from "../occupancynpv-opportunity-materialization-v1";
import {
  onpvMaterializedBacklogOverlayArticleCountForTests,
  resetOnpvMaterializedBacklogOverlayForTests,
} from "../occupancynpv-materialized-backlog-overlay-v1";
import {
  clearOnpvOpportunityModuleReadCachesForTests,
  getDurableOnpvOpportunityState,
  markOnpvOpportunityBuilt,
  readOnpvOpportunityLifecycle,
} from "../onpv-durable-opportunity-state-v1";
import {
  onpvPrepublishDurableArticleResolutionDisabled,
  resolveOccupancyNpvTargetArticleForPrepublish,
} from "../onpv-target-article-resolution-v1";
import { evaluateOccupancyNpvTargetPrepublishQc, pickOccupancyNpvAutonomousBacklogCandidate } from "../portfolio-operating-backlog-publish-v1";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  enqueuePortfolioJob,
  listTestPortfolioJobQueueForTests,
  resetTestPortfolioJobQueueForTests,
} from "../durable/autonomous-portfolio-job-queue-v1";
import { executePortfolioJobRowForTests } from "../durable/portfolio-job-worker-v1";

const OPPORTUNITY_ID = "onpv-opp-ti-amortization-occupancy-cost-v1";
const SLUG = "how-ti-amortization-affects-occupancy-cost-for-tenants";
const PATH = `/blog/leasing/${SLUG}/`;
const MATERIALIZED_KEY = `onpv-materialized-${OPPORTUNITY_ID}`;

describe("onpv built to deploy durable handoff e2e v1", () => {
  beforeEach(() => {
    resetOnpvDurableOpportunityStoreForTests();
    resetOnpvMaterializedBacklogOverlayForTests();
    resetTestPortfolioJobQueueForTests();
    delete process.env.ONPV_PREPUBLISH_DISABLE_DURABLE_ARTICLE_RESOLUTION;
  });

  afterEach(() => {
    delete process.env.ONPV_PREPUBLISH_DISABLE_DURABLE_ARTICLE_RESOLUTION;
  });

  async function seedBuiltCycle1Fixture(): Promise<void> {
    const action = await resolveOnpvDailyCreationAction({
      blog_floor_unmet: true,
      daily_blog_target_met: false,
    });
    expect(action.kind).toBe("MATERIALIZE_AND_BUILD");
    if (action.kind !== "MATERIALIZE_AND_BUILD") return;
    const buildSpec = await enqueueOnpvBlogBuildFromCreationAction({
      cycle_id: "cycle-built-deploy-handoff",
      venture_id: CRE_VENTURE_ID,
      creation: action,
    });
    await enqueuePortfolioJob({
      cycle_id: "cycle-built-deploy-handoff",
      venture_id: CRE_VENTURE_ID,
      job_type: "BLOG_BUILD",
      idempotency_key: buildSpec!.idempotency_key,
      input_lineage: buildSpec!.input_lineage,
    });
    const blogJob = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "BLOG_BUILD")!;
    await executePortfolioJobRowForTests({ ...blogJob, status: "RUNNING", attempt_count: 0 });
    expect(readOnpvOpportunityLifecycle(OPPORTUNITY_ID)).toBe("BUILT");
  }

  it("ONPV_BUILT_TO_DEPLOY_DURABLE_HANDOFF_E2E_QC", async () => {
    await seedBuiltCycle1Fixture();
    const deployJob = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "VENTURE_DEPLOY")!;
    expect(deployJob.input_lineage.work_type).toBe("NEW_PUBLICATION");

    resetOnpvMaterializedBacklogOverlayForTests();
    clearOnpvOpportunityModuleReadCachesForTests();
    expect(onpvMaterializedBacklogOverlayArticleCountForTests()).toBe(0);

    const staticPre = evaluateOccupancyNpvTargetPrepublishQc({
      path: PATH,
      work_type: "NEW_PUBLICATION",
    });
    expect(staticPre.reasons).toContain("ARTICLE_NOT_FOUND");

    await executePortfolioJobRowForTests({ ...deployJob, status: "RUNNING", attempt_count: 0 });
    const finished = listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!;
    expect(finished.safe_error ?? "").not.toMatch(/ARTICLE_NOT_FOUND/);
    expect(finished.output_lineage?.reasons ?? []).not.toContain("ARTICLE_NOT_FOUND");
  });

  it("ONPV_DEPLOY_HANDOFF_TEST_FAILS_WITH_OLD_LOOKUP_BEHAVIOR", async () => {
    await seedBuiltCycle1Fixture();
    const deployJob = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "VENTURE_DEPLOY")!;
    resetOnpvMaterializedBacklogOverlayForTests();
    clearOnpvOpportunityModuleReadCachesForTests();
    process.env.ONPV_PREPUBLISH_DISABLE_DURABLE_ARTICLE_RESOLUTION = "1";
    expect(onpvPrepublishDurableArticleResolutionDisabled()).toBe(true);

    await executePortfolioJobRowForTests({ ...deployJob, status: "RUNNING", attempt_count: 0 });
    const finished = listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!;
    expect(finished.status).toBe("FAILED");
    expect(String(finished.safe_error)).toContain("ARTICLE_NOT_FOUND");
  });

  it("ONPV_PREPUBLISH_LINEAGE_FAIL_CLOSED_QC", async () => {
    await seedBuiltCycle1Fixture();
    const mismatchOpp = await resolveOccupancyNpvTargetArticleForPrepublish({
      path: PATH,
      work_type: "NEW_PUBLICATION",
      opportunity_id: "wrong-opportunity",
      materialized_candidate_key: MATERIALIZED_KEY,
      slug: SLUG,
    });
    expect(mismatchOpp.article).toBeNull();
    expect(mismatchOpp.fail_reasons).toContain("LINEAGE_OPPORTUNITY_ID_MISMATCH");

    const mismatchKey = await resolveOccupancyNpvTargetArticleForPrepublish({
      path: PATH,
      work_type: "NEW_PUBLICATION",
      opportunity_id: OPPORTUNITY_ID,
      materialized_candidate_key: "wrong-key",
      slug: SLUG,
    });
    expect(mismatchKey.fail_reasons).toContain("LINEAGE_MATERIALIZED_CANDIDATE_KEY_MISMATCH");

    const mismatchSlug = await resolveOccupancyNpvTargetArticleForPrepublish({
      path: PATH,
      work_type: "NEW_PUBLICATION",
      opportunity_id: OPPORTUNITY_ID,
      materialized_candidate_key: MATERIALIZED_KEY,
      slug: "wrong-slug",
    });
    expect(mismatchSlug.fail_reasons).toContain("LINEAGE_SLUG_MISMATCH");
  });

  it("ONPV_DEPLOY_HANDOFF_IDEMPOTENCY_QC", async () => {
    await seedBuiltCycle1Fixture();
    const deployJob = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "VENTURE_DEPLOY")!;
    resetOnpvMaterializedBacklogOverlayForTests();
    clearOnpvOpportunityModuleReadCachesForTests();
    await executePortfolioJobRowForTests({ ...deployJob, status: "RUNNING", attempt_count: 0 });
    const states = await getDurableOnpvOpportunityState(OPPORTUNITY_ID);
    expect(states?.materialized_candidate_key).toBe(MATERIALIZED_KEY);
    expect(listTestPortfolioJobQueueForTests().filter((j) => j.job_type === "BLOG_BUILD")).toHaveLength(1);
  });

  it("ONPV_BUILT_STATE_RESUMABLE_QC", async () => {
    await seedBuiltCycle1Fixture();
    resetOnpvMaterializedBacklogOverlayForTests();
    clearOnpvOpportunityModuleReadCachesForTests();
    await markOnpvOpportunityBuilt({ opportunity_id: OPPORTUNITY_ID });
    const ready = pickOccupancyNpvAutonomousBacklogCandidate();
    expect(ready?.slug).toBe(SLUG);
    expect(selectNextOnpvMaterializableOpportunity()).toBeNull();
  });

  it("ONPV_SEED_SOURCE_LINEAGE_SEMANTICS_QC", () => {
    const seed = listOnpvCommittedDurableOpportunities()[0]!;
    expect(classifyOnpvCommittedSeedSourceEvidence(seed.source_evidence)).toBe(
      "COMMITTED_SEED_FROM_DISCOVERY_EVIDENCE",
    );
  });
});
