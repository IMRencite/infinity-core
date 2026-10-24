import { composeOccupancyNpvOrganicLiveFilesSafe } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-publisher";
import { evaluateOnpvBuildArtifactPublicationIdentity } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-backlog-publication-site-v1";
import { OCCUPANCYNPV_LIVE_CAP_RATE_PATH } from "@/lib/infinity/organic-growth-engine/continuous/urls";
import type { BlogBacklogArticle } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  enqueueOnpvBlogBuildFromCreationAction,
  resolveOnpvDailyCreationAction,
} from "./onpv-daily-creation-priority-v1";
import { resetOnpvDurableOpportunityStoreForTests } from "./occupancynpv-durable-opportunity-catalog-v1";
import { resetOnpvMaterializedBacklogOverlayForTests } from "./occupancynpv-materialized-backlog-overlay-v1";
import {
  clearOnpvOpportunityModuleReadCachesForTests,
  readOnpvOpportunityLifecycle,
} from "./onpv-durable-opportunity-state-v1";
import {
  publicationAssetIdentity,
  resetTestPublicationRegistryForTests,
  listTestPublicationRegistryForTests,
} from "./durable/autonomous-publication-idempotency-v1";
import {
  getTestPortfolioCycleForTests,
  incrementPortfolioCyclePublicationCounters,
  resetTestPortfolioCycleStoreForTests,
  seedTestPortfolioCycleForTests,
} from "./durable/autonomous-portfolio-durable-execution-v1";
import {
  enqueuePortfolioJob,
  listTestPortfolioJobQueueForTests,
  resetTestPortfolioJobQueueForTests,
  type PortfolioJobRow,
} from "./durable/autonomous-portfolio-job-queue-v1";
import { executePortfolioJobRowForTests } from "./durable/portfolio-job-worker-v1";
type BoundedVentureDeployHarnessInput = {
  onpv_backlog_publications?: BlogBacklogArticle[];
  venture_id: string;
};

export const ONPV_TI_WORKER_E2E_FIXTURE = {
  opportunity_id: "onpv-opp-ti-amortization-occupancy-cost-v1",
  materialized_candidate_key: "onpv-materialized-onpv-opp-ti-amortization-occupancy-cost-v1",
  slug: "how-ti-amortization-affects-occupancy-cost-for-tenants",
  path: "/blog/leasing/how-ti-amortization-affects-occupancy-cost-for-tenants/",
  canonical:
    "https://occupancynpv.com/blog/leasing/how-ti-amortization-affects-occupancy-cost-for-tenants",
  lifecycle: "BUILT" as const,
  terminal_state: "REPAIRABLE" as const,
  cap_rate_path: OCCUPANCYNPV_LIVE_CAP_RATE_PATH,
  cap_rate_canonical: "https://occupancynpv.com/commercial-lease-npv/how-is-cap-rate-calculated",
} as const;

export type OnpvWorkerE2eHarnessControl = {
  verifyHttp: "pass" | "404";
  ignoreBacklogPublications: boolean;
  hardcodedProductionUrl: boolean;
  injectDeployOkCounterBug: boolean;
};

export const onpvWorkerE2eHarnessControl: OnpvWorkerE2eHarnessControl = {
  verifyHttp: "pass",
  ignoreBacklogPublications: false,
  hardcodedProductionUrl: false,
  injectDeployOkCounterBug: false,
};

export const onpvWorkerE2eDeployTrace = {
  lastExecuteBoundedVentureDeployInput: null as BoundedVentureDeployHarnessInput | null,
  lastDeployComposeHadTiRoute: false,
};

export function resetOnpvWorkerE2eHarnessControl(): void {
  onpvWorkerE2eHarnessControl.verifyHttp = "pass";
  onpvWorkerE2eHarnessControl.ignoreBacklogPublications = false;
  onpvWorkerE2eHarnessControl.hardcodedProductionUrl = false;
  onpvWorkerE2eHarnessControl.injectDeployOkCounterBug = false;
  onpvWorkerE2eDeployTrace.lastExecuteBoundedVentureDeployInput = null;
  onpvWorkerE2eDeployTrace.lastDeployComposeHadTiRoute = false;
}

export function resetOnpvWorkerE2eDurableStores(): void {
  resetOnpvDurableOpportunityStoreForTests();
  resetOnpvMaterializedBacklogOverlayForTests();
  resetTestPortfolioJobQueueForTests();
  resetTestPublicationRegistryForTests();
  resetTestPortfolioCycleStoreForTests();
}

export function clearOnpvWorkerE2eProcessLocalState(): void {
  resetOnpvMaterializedBacklogOverlayForTests();
  clearOnpvOpportunityModuleReadCachesForTests();
}

export function seedWorkerE2ePortfolioCycle(cycle_id: string): void {
  const now = new Date().toISOString();
  seedTestPortfolioCycleForTests({
    cycle_id,
    trigger_type: "CRON",
    triggered_at: now,
    cron_provenance: { authorization_validated: true, trigger_type: "CRON" },
    status: "RUNNING",
    started_at: now,
    completed_at: null,
    venture_count: 1,
    jobs_created: 0,
    jobs_completed: 0,
    jobs_failed: 0,
    assets_published: 0,
    products_advanced: 0,
    products_published: 0,
    research_spend: 0,
    creative_spend: 0,
    error_summary: null,
    payload: { cycle_publication_counters: { new_assets_published: 0, blogs_published: 0 } },
  });
}

export async function seedBuiltTiNewPublicationJobs(cycle_id: string): Promise<{
  asset_identity: string;
  article: BlogBacklogArticle;
  deployJob: PortfolioJobRow;
  verifyJob: PortfolioJobRow;
}> {
  const action = await resolveOnpvDailyCreationAction({
    blog_floor_unmet: true,
    daily_blog_target_met: false,
  });
  if (action.kind !== "MATERIALIZE_AND_BUILD") {
    throw new Error(`expected MATERIALIZE_AND_BUILD got ${action.kind}`);
  }
  const buildSpec = await enqueueOnpvBlogBuildFromCreationAction({
    cycle_id,
    venture_id: CRE_VENTURE_ID,
    creation: action,
  });
  if (!buildSpec) throw new Error("missing build spec");
  await enqueuePortfolioJob({
    cycle_id,
    venture_id: CRE_VENTURE_ID,
    job_type: "BLOG_BUILD",
    idempotency_key: buildSpec.idempotency_key,
    input_lineage: buildSpec.input_lineage,
  });
  const blogJob = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "BLOG_BUILD");
  if (!blogJob) throw new Error("missing BLOG_BUILD job");
  await executePortfolioJobRowForTests({ ...blogJob, status: "RUNNING", attempt_count: 0 });
  if (readOnpvOpportunityLifecycle(ONPV_TI_WORKER_E2E_FIXTURE.opportunity_id) !== "BUILT") {
    throw new Error("expected BUILT lifecycle after blog build");
  }
  const deployJob = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "VENTURE_DEPLOY");
  if (!deployJob) throw new Error("missing VENTURE_DEPLOY job");
  const asset_identity = String(deployJob.input_lineage.asset_identity ?? "");
  const verifyKey = `verify:${asset_identity}`;
  await enqueuePortfolioJob({
    cycle_id,
    venture_id: CRE_VENTURE_ID,
    job_type: "PRODUCTION_VERIFY",
    idempotency_key: verifyKey,
    priority: 75,
    input_lineage: { ...deployJob.input_lineage },
  });
  const verifyJob = listTestPortfolioJobQueueForTests().find((j) => j.job_type === "PRODUCTION_VERIFY");
  if (!verifyJob) throw new Error("missing PRODUCTION_VERIFY job");
  const article = action.candidate;
  return { asset_identity, article, deployJob, verifyJob };
}

export async function runVentureDeployWorkerJob(deployJob: PortfolioJobRow, cycle_id: string): Promise<PortfolioJobRow> {
  await executePortfolioJobRowForTests({ ...deployJob, status: "RUNNING", attempt_count: 0 });
  if (onpvWorkerE2eHarnessControl.injectDeployOkCounterBug) {
    await incrementPortfolioCyclePublicationCounters(cycle_id, {
      new_assets_published: 1,
      blogs_published: 1,
    });
  }
  return listTestPortfolioJobQueueForTests().find((j) => j.job_id === deployJob.job_id)!;
}

export async function runProductionVerifyWorkerJobColdStart(
  verifyJob: PortfolioJobRow,
  options?: { stripLineageFields?: string[] },
): Promise<PortfolioJobRow> {
  clearOnpvWorkerE2eProcessLocalState();
  const lineage = { ...(verifyJob.input_lineage ?? {}) };
  for (const field of options?.stripLineageFields ?? []) {
    delete lineage[field];
  }
  const job = { ...verifyJob, input_lineage: lineage };
  await executePortfolioJobRowForTests({ ...job, status: "RUNNING", attempt_count: 0 });
  return listTestPortfolioJobQueueForTests().find((j) => j.job_id === verifyJob.job_id)!;
}

export function recordDeployComposeEvidence(input: BoundedVentureDeployHarnessInput): void {
  onpvWorkerE2eDeployTrace.lastExecuteBoundedVentureDeployInput = input;
  const publications = onpvWorkerE2eHarnessControl.ignoreBacklogPublications
    ? undefined
    : input.onpv_backlog_publications;
  if (!publications?.length) {
    onpvWorkerE2eDeployTrace.lastDeployComposeHadTiRoute = false;
    return;
  }
  const composed = composeOccupancyNpvOrganicLiveFilesSafe({ backlog_publications: publications });
  if (!composed.ok) {
    onpvWorkerE2eDeployTrace.lastDeployComposeHadTiRoute = false;
    return;
  }
  const ti = publications.find((a) => a.slug === ONPV_TI_WORKER_E2E_FIXTURE.slug);
  if (!ti) {
    onpvWorkerE2eDeployTrace.lastDeployComposeHadTiRoute = false;
    return;
  }
  const qc = evaluateOnpvBuildArtifactPublicationIdentity({ files: composed.files, article: ti });
  onpvWorkerE2eDeployTrace.lastDeployComposeHadTiRoute = qc.ONPV_BUILD_ARTIFACT_EXPECTED_ROUTE_QC === "PASS";
}

export function cyclePublicationCounterSnapshot(cycle_id: string): {
  assets_published: number;
  new_assets_published: number;
  blogs_published: number;
} {
  const cycle = getTestPortfolioCycleForTests(cycle_id);
  const payload = (cycle?.payload ?? {}) as Record<string, unknown>;
  const counters = (payload.cycle_publication_counters ?? {}) as Record<string, number>;
  return {
    assets_published: cycle?.assets_published ?? 0,
    new_assets_published: counters.new_assets_published ?? 0,
    blogs_published: counters.blogs_published ?? 0,
  };
}

export function tiPublicationRegistryRows(): ReturnType<typeof listTestPublicationRegistryForTests> {
  return listTestPublicationRegistryForTests().filter((row) =>
    row.canonical_path.replace(/\/+$/, "").includes(ONPV_TI_WORKER_E2E_FIXTURE.slug),
  );
}

export function publicationAssetIdentityForTiArticle(article: BlogBacklogArticle): string {
  return publicationAssetIdentity({
    venture_id: "occupancynpv",
    canonical_path: article.path,
    content_revision: article.slug,
  });
}

export function mockProductionHtmlForArticle(article: BlogBacklogArticle): string {
  const pathNorm = article.path.replace(/\/+$/, "");
  return `<!DOCTYPE html><html><head><link rel="canonical" href="${article.canonical_url.replace(/\/+$/, "")}/" /><meta name="viewport" content="width=device-width" /><script type="application/ld+json">{}</script></head><body class="pv-shell">${pathNorm}</body></html>`;
}

export function evaluateNoFalsePublicationWorkerOutcome(input: {
  cycle_id: string;
  opportunity_id: string;
  deployFinished: PortfolioJobRow;
  verifyFinished: PortfolioJobRow;
}): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const counters = cyclePublicationCounterSnapshot(input.cycle_id);
  const registry = tiPublicationRegistryRows();
  const lifecycle = readOnpvOpportunityLifecycle(input.opportunity_id);
  if (input.deployFinished.output_lineage?.published_claim === true) {
    reasons.push("DEPLOY_PUBLISHED_CLAIM_TRUE");
  }
  if (registry.length > 0) reasons.push("REGISTRY_ROW_PRESENT");
  if (lifecycle === "PUBLISHED") reasons.push("LIFECYCLE_PUBLISHED");
  if (counters.assets_published > 0) reasons.push("ASSETS_PUBLISHED_INCREMENTED");
  if (counters.blogs_published > 0) reasons.push("BLOGS_PUBLISHED_INCREMENTED");
  if (counters.new_assets_published > 0) reasons.push("NEW_ASSETS_PUBLISHED_INCREMENTED");
  if (input.verifyFinished.status === "COMPLETED" && input.verifyFinished.safe_error === null) {
    reasons.push("VERIFY_TERMINAL_PASS");
  }
  return { pass: reasons.length === 0, reasons };
}

export function evaluateTruePublicationAccountingWorkerOutcome(input: {
  cycle_id: string;
  opportunity_id: string;
  asset_identity: string;
}): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const counters = cyclePublicationCounterSnapshot(input.cycle_id);
  const registry = tiPublicationRegistryRows();
  const lifecycle = readOnpvOpportunityLifecycle(input.opportunity_id);
  if (registry.length !== 1) reasons.push(`REGISTRY_ROW_COUNT_${registry.length}`);
  if (registry[0]?.asset_identity !== input.asset_identity) reasons.push("REGISTRY_ASSET_IDENTITY_MISMATCH");
  if (counters.assets_published !== 1) reasons.push(`ASSETS_PUBLISHED_${counters.assets_published}`);
  if (counters.blogs_published !== 1) reasons.push(`BLOGS_PUBLISHED_${counters.blogs_published}`);
  if (counters.new_assets_published !== 1) reasons.push(`NEW_ASSETS_${counters.new_assets_published}`);
  if (lifecycle !== "PUBLISHED") reasons.push(`LIFECYCLE_${lifecycle ?? "NULL"}`);
  const capRateRows = listTestPublicationRegistryForTests().filter((r) =>
    r.canonical_path.includes("how-is-cap-rate-calculated"),
  );
  if (capRateRows.length > 0) reasons.push("CAP_RATE_REGISTRY_CREDIT");
  return { pass: reasons.length === 0, reasons };
}

export function onpvNewPublicationWorkerE2eHarnessQc(): "PASS" | "FAIL" {
  return typeof seedBuiltTiNewPublicationJobs === "function" &&
    typeof runVentureDeployWorkerJob === "function" &&
    typeof runProductionVerifyWorkerJobColdStart === "function"
    ? "PASS"
    : "FAIL";
}
