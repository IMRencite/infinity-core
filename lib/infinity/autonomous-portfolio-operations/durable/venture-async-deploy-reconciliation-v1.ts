import { frozenSemanticNavWidthMutedTextDeploySuccessorManifestHash } from "@/lib/infinity/market-validation-experiment/read-frozen-semantic-nav-width-muted-text-deploy-successor-snapshot";
import {
  createPortfolioDurableSupabase,
  PORTFOLIO_DURABLE_TABLES,
} from "./portfolio-durable-supabase-v1";
import { listTestPortfolioJobQueueForTests, type PortfolioJobRow } from "./autonomous-portfolio-job-queue-v1";

export const ONE_PROVIDER_DEPLOYMENT_PER_FROZEN_REVISION_V1 =
  "ONE_PROVIDER_DEPLOYMENT_PER_FROZEN_REVISION_V1" as const;

export type FrozenVentureDeployRevision = {
  venture_id: string;
  asset_id: string;
  asset_revision: string;
  frozen_bundle_manifest_hash: string;
  canonical_path?: string;
};

export type VentureDeployOutputLineage = {
  deployment_id?: string | null;
  authoritative_deployment_id?: string | null;
  frozen_bundle_manifest_hash?: string;
  asset_identity?: string;
  superseded_deployment_ids?: string[];
  production_url?: string | null;
  provider_post_count?: number;
  submitted_at?: string;
  deploy_result?: string;
  publication_result?: string;
  published_claim?: boolean;
};

const ACTIVE_VERCEL_STATES = new Set(["QUEUED", "BUILDING", "INITIALIZING", "READY"]);

export function frozenRevisionForOccupancyDeployJob(job: PortfolioJobRow): FrozenVentureDeployRevision {
  const input = job.input_lineage ?? {};
  const assetId = String(input.asset_identity ?? "");
  return {
    venture_id: job.venture_id,
    asset_id: assetId,
    asset_revision: assetId,
    frozen_bundle_manifest_hash: frozenSemanticNavWidthMutedTextDeploySuccessorManifestHash(),
    canonical_path: String(input.path ?? ""),
  };
}

export function readPriorDeploymentIdFromLineage(
  lineage: Record<string, unknown> | VentureDeployOutputLineage | null | undefined,
): string | null {
  if (!lineage) return null;
  const auth = lineage.authoritative_deployment_id ?? lineage.deployment_id;
  const id = typeof auth === "string" ? auth.trim() : "";
  return id.startsWith("dpl_") ? id : null;
}

export function mergeVentureDeployOutputLineage(
  existing: Record<string, unknown> | undefined,
  patch: VentureDeployOutputLineage,
): Record<string, unknown> {
  const prev = (existing ?? {}) as VentureDeployOutputLineage;
  const superseded = new Set([...(prev.superseded_deployment_ids ?? []), ...(patch.superseded_deployment_ids ?? [])]);
  if (prev.deployment_id && patch.deployment_id && prev.deployment_id !== patch.deployment_id) {
    superseded.add(prev.deployment_id);
  }
  if (prev.authoritative_deployment_id && patch.authoritative_deployment_id && prev.authoritative_deployment_id !== patch.authoritative_deployment_id) {
    superseded.add(prev.authoritative_deployment_id);
  }
  const authoritative = patch.authoritative_deployment_id ?? patch.deployment_id ?? prev.authoritative_deployment_id ?? prev.deployment_id;
  return {
    ...prev,
    ...patch,
    authoritative_deployment_id: authoritative ?? null,
    deployment_id: patch.deployment_id ?? prev.deployment_id ?? authoritative ?? null,
    superseded_deployment_ids: [...superseded].filter((id) => id && id !== authoritative),
  };
}

export function assertPriorDeploymentBundleIdentityParity(input: {
  prior_deployment_id: string;
  revision: FrozenVentureDeployRevision;
  persisted: VentureDeployOutputLineage | Record<string, unknown> | undefined;
}): { ok: true } | { ok: false; safe_error: string } {
  const persisted = (input.persisted ?? {}) as VentureDeployOutputLineage;
  if (persisted.asset_identity && persisted.asset_identity !== input.revision.asset_id) {
    return { ok: false, safe_error: "PRIOR_DEPLOYMENT_ASSET_IDENTITY_MISMATCH" };
  }
  if (
    persisted.frozen_bundle_manifest_hash &&
    persisted.frozen_bundle_manifest_hash !== input.revision.frozen_bundle_manifest_hash
  ) {
    return { ok: false, safe_error: "PRIOR_DEPLOYMENT_FROZEN_MANIFEST_MISMATCH" };
  }
  if (!input.prior_deployment_id.startsWith("dpl_")) {
    return { ok: false, safe_error: "PRIOR_DEPLOYMENT_ID_INVALID" };
  }
  return { ok: true };
}

export function isActiveVercelReadyState(readyState: string): boolean {
  return ACTIVE_VERCEL_STATES.has(readyState.toUpperCase());
}

export function isTerminalVercelReadyState(readyState: string): boolean {
  const s = readyState.toUpperCase();
  return s === "ERROR" || s === "CANCELED" || s === "MISSING";
}

export async function listDeploymentIdsForJob(job_id: string): Promise<
  Array<{ deployment_id: string; created_at: string; build_status: string | null }>
> {
  const client = createPortfolioDurableSupabase();
  if (!client) return [];
  const { data } = await client
    .from(PORTFOLIO_DURABLE_TABLES.deployTelemetry)
    .select("vercel_deployment_id, created_at, build_status")
    .eq("job_id", job_id)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  const seen = new Set<string>();
  const out: Array<{ deployment_id: string; created_at: string; build_status: string | null }> = [];
  for (const row of rows) {
    const id = typeof row.vercel_deployment_id === "string" ? row.vercel_deployment_id : "";
    if (!id.startsWith("dpl_") || seen.has(id)) continue;
    seen.add(id);
    out.push({
      deployment_id: id,
      created_at: String(row.created_at ?? ""),
      build_status: row.build_status ?? null,
    });
  }
  return out;
}

/** Prefer durable output lineage id; telemetry supplies superseded duplicates only. */
export function resolveAuthoritativeDeploymentId(input: {
  output_lineage: Record<string, unknown> | undefined;
  telemetry_deployments: Array<{ deployment_id: string; created_at: string; build_status: string | null }>;
}): { authoritative_deployment_id: string | null; superseded_deployment_ids: string[]; selection_reason: string } {
  const fromLineage = readPriorDeploymentIdFromLineage(input.output_lineage);
  const lineageSuperseded = Array.isArray(input.output_lineage?.superseded_deployment_ids)
    ? (input.output_lineage!.superseded_deployment_ids as string[]).filter((id) => typeof id === "string")
    : [];
  if (fromLineage) {
    const superseded = new Set<string>(lineageSuperseded.filter((id) => id !== fromLineage));
    for (const row of input.telemetry_deployments) {
      if (row.deployment_id !== fromLineage) superseded.add(row.deployment_id);
    }
    return {
      authoritative_deployment_id: fromLineage,
      superseded_deployment_ids: [...superseded],
      selection_reason: "OUTPUT_LINEAGE_AUTHORITATIVE",
    };
  }
  if (input.telemetry_deployments.length > 0) {
    const earliest = input.telemetry_deployments[0]!.deployment_id;
    const superseded = input.telemetry_deployments.slice(1).map((row) => row.deployment_id);
    return {
      authoritative_deployment_id: earliest,
      superseded_deployment_ids: superseded.filter((id) => id !== earliest),
      selection_reason: "EARLIEST_TELEMETRY_DEPLOYMENT",
    };
  }
  return { authoritative_deployment_id: null, superseded_deployment_ids: [], selection_reason: "NO_TELEMETRY" };
}

export async function findVentureDeployJobForAsset(input: {
  cycle_id: string;
  asset_identity: string;
}): Promise<PortfolioJobRow | null> {
  const client = createPortfolioDurableSupabase();
  if (!client) {
    const rows = listTestPortfolioJobQueueForTests().filter(
      (row) => row.cycle_id === input.cycle_id && row.job_type === "VENTURE_DEPLOY",
    );
    return (
      rows.find(
        (row) => String((row.input_lineage as Record<string, unknown>)?.asset_identity ?? "") === input.asset_identity,
      ) ?? null
    );
  }
  const { data } = await client
    .from(PORTFOLIO_DURABLE_TABLES.jobs)
    .select("*")
    .eq("cycle_id", input.cycle_id)
    .eq("job_type", "VENTURE_DEPLOY");
  const match = (data ?? []).find(
    (row) => String((row.input_lineage as Record<string, unknown>)?.asset_identity ?? "") === input.asset_identity,
  );
  return (match as PortfolioJobRow) ?? null;
}

export function upstreamDeployBlocksProductionVerify(deployJob: PortfolioJobRow | null): {
  blocked: boolean;
  reason: string | null;
} {
  if (!deployJob) return { blocked: true, reason: "UPSTREAM_VENTURE_DEPLOY_MISSING" };
  if (deployJob.status === "COMPLETED") return { blocked: false, reason: null };
  if (deployJob.status === "FAILED") {
    return { blocked: true, reason: "UPSTREAM_VENTURE_DEPLOY_FAILED" };
  }
  return { blocked: true, reason: "UPSTREAM_DEPLOYMENT_NOT_READY" };
}

export function classifyProductionVerifyHttpOutcome(input: {
  http_status: number;
  upstream_blocked: boolean;
}): { terminal: boolean; safe_error: string | null } {
  if (input.upstream_blocked) {
    return { terminal: false, safe_error: "UPSTREAM_DEPLOYMENT_NOT_READY" };
  }
  if (input.http_status === 404) {
    return { terminal: false, safe_error: "UPSTREAM_DEPLOYMENT_NOT_READY" };
  }
  if (input.http_status >= 200 && input.http_status < 300) {
    return { terminal: true, safe_error: null };
  }
  return { terminal: true, safe_error: "PRODUCTION_VERIFY_FAILED" };
}
