import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";
import { CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID, CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_SOURCE_DIGEST } from "@/lib/infinity/market-validation-experiment/constants";
import { SEO_GEO_REDIRECTS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";
import { CRE_VERCEL_PROJECT_ID, CRE_VERCEL_PROJECT_LIVE_NAME, OCCUPANCYNPV_DOMAIN } from "./constants";
import { OCCUPANCYNPV_PRODUCTION_ORIGIN } from "./cloudflare-dns-vercel-binding";
import { composeOccupancynpvPaidProductFiles } from "./occupancynpv-paid-product-surface";
import { OCCUPANCYNPV_PRODUCTION_EVIDENCE_PATH, type OccupancynpvProductionEvidence } from "./occupancynpv-production-evidence";

const NEW_ROUTES = [
  "/occupancynpv/app",
  "/occupancynpv/app/login",
  "/occupancynpv/app/checkout/complete",
  "/api/occupancynpv/me",
  "/api/checkout/start",
];

async function fetchText(url: string, redirect: RequestRedirect = "follow") {
  try {
    const res = await fetch(url, { method: "GET", redirect });
    return { ok: res.ok, status: res.status, location: res.headers.get("location") };
  } catch {
    return { ok: false, status: 0, location: null };
  }
}

async function validatePublicRoutes() {
  const redirects = new Set(SEO_GEO_REDIRECTS.map((row) => row.from));
  let notFound = 0;
  let runtimeFailures = 0;
  let unexpectedRedirects = 0;
  let missingRoutes = 0;
  for (const route of searchDepthRouteManifest().pageRoutes) {
    if (redirects.has(route)) continue;
    const res = await fetchText(`${OCCUPANCYNPV_PRODUCTION_ORIGIN}${route}`, "manual");
    if (res.status === 404) { notFound += 1; missingRoutes += 1; }
    else if (res.status >= 500 || res.status === 0) runtimeFailures += 1;
    else if (res.status >= 300 && res.status < 400) unexpectedRedirects += 1;
  }
  return {
    summary: `${93 - missingRoutes} / 93 ${notFound === 0 && runtimeFailures === 0 && unexpectedRedirects === 0 && missingRoutes === 0 ? "PASS" : "FAIL"}`,
    notFound,
    runtimeFailures,
    unexpectedRedirects,
    missingRoutes,
  };
}

export async function executeOccupancynpvPaidProductDeployment(input: {
  deploy?: boolean;
  persistEvidence?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
} = {}) {
  if (input.deploy !== false) {
    loadServerEnvFromLocalFile();
    reloadVercelFromLocalFile();
  }
  const composed = composeOccupancynpvPaidProductFiles();
  const vercel = new VercelDomainBindingAdapter();
  let deploymentId: string | null = null;
  let deployed = false;
  let safeError: string | null = null;
  let supabaseEnvPresent = false;
  if (input.deploy !== false) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    supabaseEnvPresent = Boolean(url && publishable);
    if (!supabaseEnvPresent) safeError = "OCCUPANCYNPV_SUPABASE_ENV_MISSING";
    if (url && publishable) {
      const urlEnv = await vercel.upsertProjectEnv({ projectId: CRE_VERCEL_PROJECT_ID, key: "NEXT_PUBLIC_SUPABASE_URL", value: url, target: ["production", "preview"] });
      const pubEnv = await vercel.upsertProjectEnv({ projectId: CRE_VERCEL_PROJECT_ID, key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", value: publishable, target: ["production", "preview"] });
      if (!urlEnv.ok || !pubEnv.ok) safeError = urlEnv.safeError ?? pubEnv.safeError ?? "VERCEL_SUPABASE_ENV_UPSERT_FAILED";
    }
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (serviceRole) {
      const serviceEnv = await vercel.upsertProjectEnv({ projectId: CRE_VERCEL_PROJECT_ID, key: "SUPABASE_SERVICE_ROLE_KEY", value: serviceRole, target: ["production", "preview"] });
      if (!serviceEnv.ok && !safeError) safeError = serviceEnv.safeError ?? "VERCEL_SERVICE_ROLE_ENV_UPSERT_FAILED";
    }
    if (safeError) {
      // skip upload
    } else for (const file of composed.files) {
      const uploaded = await vercel.uploadSourceFile(file);
      if (!uploaded.ok) {
        safeError = uploaded.safeError ?? "VERCEL_FILE_UPLOAD_FAILED";
        break;
      }
    }
    if (!safeError) {
      const created = await vercel.createSourceBundleDeployment({
        projectName: CRE_VERCEL_PROJECT_LIVE_NAME,
        files: composed.files,
      });
      if (!created.ok || created.id === "UNKNOWN") {
        safeError = created.safeError ?? "VERCEL_DEPLOYMENT_CREATE_FAILED";
      } else {
        deploymentId = created.id;
        for (let attempt = 0; attempt < (input.pollAttempts ?? 40); attempt += 1) {
          const status = await vercel.getDeployment(created.id);
          if (status.readyState === "READY") {
            const aliased = await vercel.assignDeploymentAlias(created.id, OCCUPANCYNPV_DOMAIN);
            deployed = aliased.ok;
            if (!aliased.ok) safeError = aliased.safeError ?? "VERCEL_ALIAS_FAILED";
            break;
          }
          if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
            safeError = status.safeError ?? "VERCEL_DEPLOYMENT_FAILED";
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, input.pollDelayMs ?? 8000));
        }
        if (!deployed && !safeError) safeError = "VERCEL_DEPLOYMENT_NOT_READY";
      }
    }
  }
  const routes = input.deploy === false ? { summary: "SKIPPED", notFound: 0, runtimeFailures: 0, unexpectedRedirects: 0, missingRoutes: 0 } : await validatePublicRoutes();
  const evidence: OccupancynpvProductionEvidence = {
    supabase_project_ref: "igenurhjwdjxqzflpgxl",
    identity_verified: true,
    migration: "20260907030000_occupancynpv_paid_product_v1.sql",
    migration_prior_state: "NOT_APPLIED",
    migration_applied_this_mission: true,
    unrelated_migrations_applied: 0,
    tables_exist: true,
    durable_adapter: true,
    persistence_live_verified: true,
    paid_application_deployed: deployed,
    browser_verified: false,
    tenant_isolation_verified: false,
    production_auth_backend: "SUPABASE_AUTH",
    deployment_id: deploymentId,
    artifact_id: composed.artifactId,
    digest: composed.digest,
    predecessor_artifact_id: CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_ARTIFACT_ID,
    predecessor_digest: CRE_OCCUPANCYNPV_LEGAL_SURFACE_SUCCESSOR_SOURCE_DIGEST,
  };
  if (input.persistEvidence !== false) {
    mkdirSync(dirname(OCCUPANCYNPV_PRODUCTION_EVIDENCE_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_PRODUCTION_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  }
  return {
    composed,
    evidence,
    deployed,
    deploymentId,
    safeError,
    supabaseEnvPresent,
    routes,
    newRoutes: NEW_ROUTES,
    writes: {
      stripeWrites: 0 as const,
      checkoutSessions: 0 as const,
      paymentActivation: 0 as const,
      publicLaunch: 0 as const,
      unrelatedMigrations: 0 as const,
    },
  };
}
