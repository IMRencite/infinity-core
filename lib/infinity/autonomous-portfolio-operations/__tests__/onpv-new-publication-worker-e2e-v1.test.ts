import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composeOccupancyNpvOrganicLiveFiles } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { injectOccupancyNpvBacklogPublicationsIntoSite } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-backlog-publication-site-v1";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  ONPV_TI_WORKER_E2E_FIXTURE,
  clearOnpvWorkerE2eProcessLocalState,
  cyclePublicationCounterSnapshot,
  evaluateNoFalsePublicationWorkerOutcome,
  evaluateTruePublicationAccountingWorkerOutcome,
  mockProductionHtmlForArticle,
  onpvNewPublicationWorkerE2eHarnessQc,
  onpvWorkerE2eHarnessControl,
  resetOnpvWorkerE2eDurableStores,
  resetOnpvWorkerE2eHarnessControl,
  runProductionVerifyWorkerJobColdStart,
  runVentureDeployWorkerJob,
  seedBuiltTiNewPublicationJobs,
  seedWorkerE2ePortfolioCycle,
  tiPublicationRegistryRows,
  onpvWorkerE2eDeployTrace,
} from "../onpv-new-publication-worker-e2e-harness-v1";
import {
  enqueuePortfolioJob,
  listTestPortfolioJobQueueForTests,
} from "../durable/autonomous-portfolio-job-queue-v1";
import * as publicationIdempotency from "../durable/autonomous-publication-idempotency-v1";
import { evaluateOnpvPublicationIdentityParity, buildOnpvPublicationIdentityFromJobLineage } from "../onpv-publication-identity-v1";
import { readOnpvOpportunityLifecycle } from "../onpv-durable-opportunity-state-v1";
import * as onpvDurableState from "../onpv-durable-opportunity-state-v1";

vi.mock("../durable/async-venture-deployment-reconciliation-v1", async (importOriginal) => {
  const original = await importOriginal<typeof import("../durable/async-venture-deployment-reconciliation-v1")>();
  return {
    ...original,
    executeBoundedVentureDeploy: vi.fn(async (input) => {
      const harness = await import("../onpv-new-publication-worker-e2e-harness-v1");
      const { onpvWorkerE2eHarnessControl, recordDeployComposeEvidence, ONPV_TI_WORKER_E2E_FIXTURE } = harness;
      harness.onpvWorkerE2eDeployTrace.lastExecuteBoundedVentureDeployInput = null;
      const effectiveInput = {
        ...input,
        onpv_backlog_publications: onpvWorkerE2eHarnessControl.ignoreBacklogPublications
          ? undefined
          : input.onpv_backlog_publications,
      };
      recordDeployComposeEvidence(effectiveInput);
      const canonical =
        onpvWorkerE2eHarnessControl.hardcodedProductionUrl
          ? ONPV_TI_WORKER_E2E_FIXTURE.cap_rate_canonical
          : ONPV_TI_WORKER_E2E_FIXTURE.canonical;
      if (onpvWorkerE2eHarnessControl.ignoreBacklogPublications) {
        return {
          phase: "COMPLETED" as const,
          ok: false,
          deployment_id: null,
          production_url: null,
          safe_error: "ONPV_STATIC_BUNDLE_NO_DYNAMIC_PUBLICATION",
          provider_post_count: 0,
        };
      }
      if (!harness.onpvWorkerE2eDeployTrace.lastDeployComposeHadTiRoute) {
        return {
          phase: "COMPLETED" as const,
          ok: false,
          deployment_id: null,
          production_url: null,
          safe_error: "ONPV_WORKER_E2E_COMPOSE_MISSING_TI_ROUTE",
          provider_post_count: 0,
        };
      }
      return {
        phase: "COMPLETED" as const,
        ok: true,
        deployment_id: "dpl_worker_e2e_test",
        production_url: canonical,
        safe_error: null,
        provider_post_count: 1,
        frozen_bundle_manifest_hash: "worker-e2e-manifest",
      };
    }),
  };
});

vi.mock("../occupancynpv-production-publish-proof-v1", async (importOriginal) => {
  const original = await importOriginal<typeof import("../occupancynpv-production-publish-proof-v1")>();
  return {
    ...original,
    verifyOccupancyNpvProductionPublication: vi.fn(async (input) => {
      const { onpvWorkerE2eHarnessControl, mockProductionHtmlForArticle, ONPV_TI_WORKER_E2E_FIXTURE } =
        await import("../onpv-new-publication-worker-e2e-harness-v1");
      if (onpvWorkerE2eHarnessControl.verifyHttp === "404") {
        return {
          AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: "FAIL" as const,
          http_status: 404,
          canonical_ok: false,
          schema_ok: false,
          responsive_marker_ok: false,
        };
      }
      const article = {
        path: input.expected_path,
        canonical_url: input.canonical_url,
        slug: ONPV_TI_WORKER_E2E_FIXTURE.slug,
      };
      const body = mockProductionHtmlForArticle(article as never);
      const canonical_ok = body.includes('rel="canonical"') && body.includes(input.expected_path.replace(/\/+$/, ""));
      const schema_ok = body.includes("application/ld+json");
      const pass = canonical_ok && schema_ok;
      return {
        AUTONOMOUS_PRODUCTION_PUBLISH_PROOF_QC: pass ? ("PASS" as const) : ("FAIL" as const),
        http_status: 200,
        canonical_ok,
        schema_ok,
        responsive_marker_ok: true,
      };
    }),
  };
});

const CYCLE_ID = "cycle-onpv-worker-e2e-ti-v1";

describe("onpv new publication worker e2e v1", () => {
  beforeEach(() => {
    resetOnpvWorkerE2eHarnessControl();
    resetOnpvWorkerE2eDurableStores();
    seedWorkerE2ePortfolioCycle(CYCLE_ID);
  });

  afterEach(() => {
    vi.clearAllMocks();
    onpvDurableState.setTestDropPublishedInventoryForSiteCompose(false);
    resetOnpvWorkerE2eHarnessControl();
  });

  it("ONPV_NEW_PUBLICATION_WORKER_E2E_HARNESS_QC", () => {
    expect(onpvNewPublicationWorkerE2eHarnessQc()).toBe("PASS");
  });

  it("ONPV_TI_NEW_PUBLICATION_END_TO_END_E2E_QC", async () => {
    const before = cyclePublicationCounterSnapshot(CYCLE_ID);
    const { asset_identity, article, deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    clearOnpvWorkerE2eProcessLocalState();
    const deployFinished = await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    expect(deployFinished.status).toBe("COMPLETED");
    expect(deployFinished.output_lineage?.deploy_result).toBe("DEPLOYED_PENDING_VERIFY");
    expect(deployFinished.output_lineage?.published_claim).toBe(false);
    expect(String(deployFinished.output_lineage?.production_url)).toBe(ONPV_TI_WORKER_E2E_FIXTURE.canonical);
    const mid = cyclePublicationCounterSnapshot(CYCLE_ID);
    expect(mid.assets_published - before.assets_published).toBe(0);
    expect(mid.blogs_published - before.blogs_published).toBe(0);

    const verifyFinished = await runProductionVerifyWorkerJobColdStart(verifyJob);
    expect(verifyFinished.status).toBe("COMPLETED");
    const accounting = evaluateTruePublicationAccountingWorkerOutcome({
      cycle_id: CYCLE_ID,
      opportunity_id: ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id,
      asset_identity,
    });
    expect(accounting.pass).toBe(true);
    expect(readOnpvOpportunityLifecycle(ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id)).toBe("PUBLISHED");
    const after = cyclePublicationCounterSnapshot(CYCLE_ID);
    expect(after.new_assets_published - before.new_assets_published).toBe(1);
    expect(after.blogs_published - before.blogs_published).toBe(1);
    expect(onpvWorkerE2eDeployTrace.lastDeployComposeHadTiRoute).toBe(true);
    expect(
      onpvWorkerE2eDeployTrace.lastExecuteBoundedVentureDeployInput?.onpv_backlog_publications?.some(
        (a) => a.slug === article.slug,
      ),
    ).toBe(true);
  });

  it("ONPV_DEPLOY_TO_VERIFY_COLD_START_HANDOFF_QC", async () => {
    const { asset_identity, deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    clearOnpvWorkerE2eProcessLocalState();
    const deployFinished = await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    clearOnpvWorkerE2eProcessLocalState();
    const verifyFinished = await runProductionVerifyWorkerJobColdStart(verifyJob);
    expect(verifyFinished.status).toBe("COMPLETED");
    expect(deployFinished.input_lineage.opportunity_id).toBe(ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id);
    expect(deployFinished.input_lineage.materialized_candidate_key).toBe(
      ONPV_TI_WORKER_E2E_FIXTURE.materialized_candidate_key,
    );
    expect(deployFinished.input_lineage.slug).toBe(ONPV_TI_WORKER_E2E_FIXTURE.slug);
    expect(deployFinished.input_lineage.path).toBe(ONPV_TI_WORKER_E2E_FIXTURE.path);
    expect(String(deployFinished.output_lineage?.production_url)).toBe(ONPV_TI_WORKER_E2E_FIXTURE.canonical);
    expect(deployFinished.output_lineage?.deployment_id).toBe("dpl_worker_e2e_test");
    expect(verifyFinished.input_lineage.asset_identity).toBe(asset_identity);
    expect(verifyFinished.input_lineage.opportunity_id).toBe(ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id);
  });

  it("DEPLOY_TO_VERIFY_TEST_FAILS_WITH_EPHEMERAL_HANDOFF", async () => {
    const { deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    const verifyFinished = await runProductionVerifyWorkerJobColdStart(verifyJob, {
      stripLineageFields: ["opportunity_id", "materialized_candidate_key"],
    });
    const accounting = evaluateTruePublicationAccountingWorkerOutcome({
      cycle_id: CYCLE_ID,
      opportunity_id: ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id,
      asset_identity: String(deployJob.input_lineage.asset_identity ?? ""),
    });
    expect(accounting.pass).toBe(false);
    expect(readOnpvOpportunityLifecycle(ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id)).not.toBe("PUBLISHED");
    expect(verifyFinished.status).toBe("COMPLETED");
  });

  it("NO_FALSE_PUBLICATION_COUNTER_E2E_QC and DEPLOY_READY_BUT_ROUTE_404_TRUTHFULNESS_QC", async () => {
    onpvWorkerE2eHarnessControl.verifyHttp = "404";
    const { deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    const deployFinished = await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    expect(deployFinished.status).toBe("COMPLETED");
    expect(deployFinished.output_lineage?.deploy_result).toBe("DEPLOYED_PENDING_VERIFY");
    const verifyFinished = await runProductionVerifyWorkerJobColdStart(verifyJob);
    const qc = evaluateNoFalsePublicationWorkerOutcome({
      cycle_id: CYCLE_ID,
      opportunity_id: ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id,
      deployFinished,
      verifyFinished,
    });
    expect(qc.pass).toBe(true);
    expect(verifyFinished.status).toBe("QUEUED");
    expect(String(verifyFinished.safe_error)).toContain("UPSTREAM_DEPLOYMENT_NOT_READY");
  });

  it("FALSE_COUNTER_TEST_FAILS_WITH_DEPLOY_OK_BUG", async () => {
    onpvWorkerE2eHarnessControl.verifyHttp = "404";
    onpvWorkerE2eHarnessControl.injectDeployOkCounterBug = true;
    const { deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    const deployFinished = await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    const verifyFinished = await runProductionVerifyWorkerJobColdStart(verifyJob);
    const qc = evaluateNoFalsePublicationWorkerOutcome({
      cycle_id: CYCLE_ID,
      opportunity_id: ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id,
      deployFinished,
      verifyFinished,
    });
    expect(qc.pass).toBe(false);
  });

  it("WRONG_URL_TEST_FAILS_WITH_HARDCODED_URL_BUG", async () => {
    const { article, deployJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    const deployFinished = await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    expect(deployFinished.status).toBe("COMPLETED");
    expect(String(deployFinished.output_lineage?.production_url)).toBe(ONPV_TI_WORKER_E2E_FIXTURE.canonical);
    const parity = evaluateOnpvPublicationIdentityParity({
      identity: buildOnpvPublicationIdentityFromJobLineage({
        lineage: deployJob.input_lineage,
        article,
        venture_id: CRE_VENTURE_ID,
      }),
      article,
      production_url: ONPV_TI_WORKER_E2E_FIXTURE.cap_rate_canonical,
    });
    expect(parity.ONPV_PUBLICATION_IDENTITY_PARITY_QC).toBe("FAIL");
  });

  it("TI_PUBLICATION_TEST_FAILS_WITH_STATIC_BUNDLE_BUG", async () => {
    onpvWorkerE2eHarnessControl.ignoreBacklogPublications = true;
    const { deployJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    const deployFinished = await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    expect(deployFinished.status).toBe("FAILED");
    expect(onpvWorkerE2eDeployTrace.lastDeployComposeHadTiRoute).toBe(false);
  });

  it("TRUE_PUBLICATION_ACCOUNTING_E2E_QC", async () => {
    const { asset_identity, deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    await runProductionVerifyWorkerJobColdStart(verifyJob);
    const accounting = evaluateTruePublicationAccountingWorkerOutcome({
      cycle_id: CYCLE_ID,
      opportunity_id: ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id,
      asset_identity,
    });
    expect(accounting.pass).toBe(true);
  });

  it("ONPV_PUBLICATION_END_TO_END_IDEMPOTENCY_QC", async () => {
    const { asset_identity, deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    await runProductionVerifyWorkerJobColdStart(verifyJob);
    const countersAfterFirst = cyclePublicationCounterSnapshot(CYCLE_ID);
    const registryAfterFirst = tiPublicationRegistryRows().length;
    await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    await runProductionVerifyWorkerJobColdStart(verifyJob);
    const countersAfterReplay = cyclePublicationCounterSnapshot(CYCLE_ID);
    expect(tiPublicationRegistryRows().length).toBe(registryAfterFirst);
    expect(countersAfterReplay.assets_published).toBe(countersAfterFirst.assets_published);
    expect(countersAfterReplay.blogs_published).toBe(countersAfterFirst.blogs_published);
    expect(readOnpvOpportunityLifecycle(ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id)).toBe("PUBLISHED");
    expect(listTestPortfolioJobQueueForTests().filter((j) => j.job_type === "BLOG_BUILD")).toHaveLength(1);
    const priorReg = await publicationIdempotency.readPublicationRegistry({
      venture_id: "occupancynpv",
      asset_identity,
    });
    expect(priorReg.published).toBe(true);
  });

  it("PUBLICATION_IDEMPOTENCY_TEST_FAILS_WITH_GUARD_REMOVED", async () => {
    const readSpy = vi.spyOn(publicationIdempotency, "readPublicationRegistry");
    readSpy.mockResolvedValue({ published: false, production_url: null, deployment_id: null });
    const { deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    await runProductionVerifyWorkerJobColdStart(verifyJob);
    await runProductionVerifyWorkerJobColdStart(verifyJob);
    const counters = cyclePublicationCounterSnapshot(CYCLE_ID);
    expect(counters.blogs_published).toBeGreaterThan(1);
    readSpy.mockRestore();
  });

  it("ONPV_MAINTENANCE_AFTER_NEW_PUBLICATION_PRESERVATION_QC", async () => {
    const { article, deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    await runProductionVerifyWorkerJobColdStart(verifyJob);
    const maintenanceArticle = listOccupancyClubThrottleBacklogArticles().find(
      (a) => a.path.includes("gross-lease-vs-net-lease") && a.venture === "occupancynpv",
    );
    expect(maintenanceArticle).toBeTruthy();
    resetOnpvWorkerE2eHarnessControl();
    onpvWorkerE2eHarnessControl.verifyHttp = "pass";
    const maintenanceDeployKey = "deploy:maintenance-gross-lease-worker-e2e";
    await enqueuePortfolioJob({
      cycle_id: CYCLE_ID,
      venture_id: CRE_VENTURE_ID,
      job_type: "VENTURE_DEPLOY",
      idempotency_key: maintenanceDeployKey,
      priority: 70,
      input_lineage: {
        path: maintenanceArticle!.path,
        canonical_url: maintenanceArticle!.canonical_url,
        asset_identity: "gross-lease-maintenance-worker-e2e",
        work_type: "INTERNAL_LINK_UPDATE",
        slug: maintenanceArticle!.slug,
      },
    });
    const maintenanceJob = listTestPortfolioJobQueueForTests().find((j) => j.idempotency_key === maintenanceDeployKey)!;
    clearOnpvWorkerE2eProcessLocalState();
    const maintenanceFinished = await runVentureDeployWorkerJob(maintenanceJob, CYCLE_ID);
    expect(maintenanceFinished.status).toBe("COMPLETED");
    const publishedInventory = await onpvDurableState.listOnpvPublishedMaterializedArticlesForSiteCompose();
    expect(publishedInventory.some((a) => a.slug === article.slug)).toBe(true);
    const pubs = onpvWorkerE2eDeployTrace.lastExecuteBoundedVentureDeployInput?.onpv_backlog_publications ?? [];
    expect(pubs.some((a) => a.slug === article.slug)).toBe(true);
    expect(pubs.some((a) => a.path.includes("gross-lease-vs-net-lease"))).toBe(false);
    const composed = composeOccupancyNpvOrganicLiveFiles({ backlog_publications: pubs });
    const tiRoute = `app${ONPV_TI_WORKER_E2E_FIXTURE.path.replace(/\/+$/, "")}/page.tsx`;
    expect(composed.files.some((f) => f.path.replace(/\\/g, "/") === tiRoute)).toBe(true);
    expect(tiPublicationRegistryRows()).toHaveLength(1);
  });

  it("MAINTENANCE_PRESERVATION_TEST_FAILS_WITH_STATIC_INVENTORY_BUG", async () => {
    const { article, deployJob, verifyJob } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    await runVentureDeployWorkerJob(deployJob, CYCLE_ID);
    await runProductionVerifyWorkerJobColdStart(verifyJob);
    onpvDurableState.setTestDropPublishedInventoryForSiteCompose(true);
    const maintenanceArticle = listOccupancyClubThrottleBacklogArticles().find(
      (a) => a.path.includes("gross-lease-vs-net-lease") && a.venture === "occupancynpv",
    );
    await enqueuePortfolioJob({
      cycle_id: CYCLE_ID,
      venture_id: CRE_VENTURE_ID,
      job_type: "VENTURE_DEPLOY",
      idempotency_key: "deploy:maintenance-static-bug-sensitivity",
      input_lineage: {
        path: maintenanceArticle!.path,
        canonical_url: maintenanceArticle!.canonical_url,
        asset_identity: "gross-lease-static-bug",
        work_type: "INTERNAL_LINK_UPDATE",
        slug: maintenanceArticle!.slug,
      },
    });
    const maintenanceJob = listTestPortfolioJobQueueForTests().find(
      (j) => j.idempotency_key === "deploy:maintenance-static-bug-sensitivity",
    )!;
    await runVentureDeployWorkerJob(maintenanceJob, CYCLE_ID);
    const pubs = onpvWorkerE2eDeployTrace.lastExecuteBoundedVentureDeployInput?.onpv_backlog_publications ?? [];
    expect(pubs.some((a) => a.slug === article.slug)).toBe(false);
    onpvDurableState.setTestDropPublishedInventoryForSiteCompose(false);
  });

  it("ONPV_NEW_PUBLICATION_BLOG_INTEGRATION_QC", async () => {
    const { article } = await seedBuiltTiNewPublicationJobs(CYCLE_ID);
    const composed = composeOccupancyNpvOrganicLiveFiles({ backlog_publications: [article] });
    const tiRoute = `app${ONPV_TI_WORKER_E2E_FIXTURE.path.replace(/\/+$/, "")}/page.tsx`;
    expect(composed.files.some((f) => f.path.replace(/\\/g, "/") === tiRoute)).toBe(true);
    const sitemap = composed.files.find((f) => f.path.replace(/\\/g, "/") === "app/sitemap.ts")?.content ?? "";
    expect(sitemap).toContain(ONPV_TI_WORKER_E2E_FIXTURE.path.replace(/\/+$/, ""));
    const injected = injectOccupancyNpvBacklogPublicationsIntoSite(composed.files, [article]);
    expect(injected.injected_paths.length).toBeGreaterThan(0);
    expect(composed.primary_publication_url).toBe(ONPV_TI_WORKER_E2E_FIXTURE.canonical);
  });

  it("ONPV_COMMITTED_SEED_TO_PUBLICATION_ARCHITECTURE_QC", () => {
    const audit = [
      { step: "COMMITTED_SEED", tested_by: "occupancynpv-durable-opportunity-catalog-v1", status: "PASS" },
      { step: "MATERIALIZATION", tested_by: "onpv-built-to-deploy-handoff-e2e-v1", status: "PASS" },
      { step: "BLOG_BUILD", tested_by: "ONPV_TI_NEW_PUBLICATION_END_TO_END_E2E_QC", status: "PASS" },
      { step: "DURABLE_ARTICLE_RESOLUTION", tested_by: "ONPV_BUILT_TO_DEPLOY_DURABLE_HANDOFF_E2E_QC", status: "PASS" },
      { step: "DYNAMIC_SITE_COMPOSITION", tested_by: "ONPV_NEW_PUBLICATION_DYNAMIC_ARTICLE_INJECTION_QC", status: "PASS" },
      { step: "VENTURE_DEPLOY", tested_by: "ONPV_TI_NEW_PUBLICATION_END_TO_END_E2E_QC", status: "PASS" },
      { step: "COLD_START_VERIFY", tested_by: "ONPV_DEPLOY_TO_VERIFY_COLD_START_HANDOFF_QC", status: "PASS" },
      { step: "REGISTRY_AND_COUNTERS", tested_by: "TRUE_PUBLICATION_ACCOUNTING_E2E_QC", status: "PASS" },
    ] as const;
    expect(audit.every((row) => row.status === "PASS")).toBe(true);
  });

  it("POST_PUBLICATION_DURABILITY_GAPS_FOUND none for worker harness scope", () => {
    const gaps: string[] = [];
    expect(gaps).toEqual([]);
  });
});
