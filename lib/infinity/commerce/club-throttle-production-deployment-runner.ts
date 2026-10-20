import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import {
  VercelDomainBindingAdapter,
  type VercelDomainBindingAdapter as VercelAdapterType,
} from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import {
  CLUB_THROTTLE_ARTWORK_PATH,
  CLUB_THROTTLE_STOREFRONT_PROJECT,
  composeClubThrottleStorefrontFiles,
} from "./club-throttle-storefront-compose";
import { evaluateBlogBacklogDeployGuard } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-deploy-guard";
import { listOccupancyClubThrottleBacklogArticles } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";
import { buildBacklogRenderedEvidenceMap } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-compose-evidence";
import { buildBlockedBlackGarmentArt } from "./club-throttle-dark-garment-art-adaptation";
import { runClubThrottleColorMerchPipeline } from "./club-throttle-storefront-color-merch-pipeline";
import {
  EMBEDDED_CHECKOUT_REQUIRES_STRIPE_PUBLISHABLE_KEY,
  resolveStripePublishableKeyForClubThrottle,
  syncClubThrottleStripePublishableToVercel,
} from "./club-throttle-embedded-checkout-env-v1.ts";
import { evaluateClubThrottleProductionDeployGates } from "./club-throttle-production-deploy-gates-v1";
import type { ResponsiveCapabilityEvidenceV1 } from "@/lib/infinity/organic-growth-engine/continuous/public-page-capability-contract-v1";
import type { PublicCapabilityQcBoundary } from "@/lib/infinity/organic-growth-engine/continuous/public-page-capability-contract-v1";
const CLUB_THROTTLE_DEPLOY_EVIDENCE_PATH =
  ".infinity/blog-os/v52-club-throttle-production-deploy.json" as const;

export type ClubThrottleComposedStorefront = ReturnType<typeof composeClubThrottleStorefrontFiles>;

const SMOKE_PATHS = [
  "/",
  "/shop",
  "/shop/sport-track",
  "/shop/garage-culture",
  "/products/apex-line-tee",
  "/t-shirts",
  "/products",
  "/products/lot-line-tee",
  "/products/knee-down-tee",
  "/cart",
  "/suggest-a-design",
  "/journal",
  "/blog",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/sitemap",
  "/api/health",
  CLUB_THROTTLE_ARTWORK_PATH,
  "/commerce-founder-review/lot-line-dark-garment-v13-comparison.png",
  "/commerce-founder-review/bagger-send-dark-garment-v13-comparison.png",
];

function writeIsolatedBundle(dest: string, files: ClubThrottleComposedStorefront["files"]) {
  for (const stale of ["app", "lib", "public"]) {
    rmSync(join(dest, stale), { recursive: true, force: true });
  }
  for (const file of files) {
    const target = join(dest, file.path);
    mkdirSync(dirname(target), { recursive: true });
    if (file.sourceAbs) copyFileSync(file.sourceAbs, target);
    else if (file.encoding === "base64") writeFileSync(target, Buffer.from(file.content ?? "", "base64"));
    else writeFileSync(target, file.content ?? "");
  }
}

export type ClubThrottleProductionDeploymentRunnerInput = {
  deploy?: boolean;
  dest?: string;
  persistEvidence?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
  aliasProduction?: boolean;
  rebuildDarkGarmentArt?: boolean;
  browser_capability_evidence?: ResponsiveCapabilityEvidenceV1 | null;
  /** Injectable Vercel adapter (tests only). */
  vercel_adapter?: VercelAdapterType;
  /** When set, skip env reload and Stripe sync (tests only). */
  skip_production_env_bootstrap?: boolean;
};

export type ClubThrottleProductionDeploymentTestInput = ClubThrottleProductionDeploymentRunnerInput & {
  composed_override: ClubThrottleComposedStorefront;
  capability_boundary?: PublicCapabilityQcBoundary;
  skip_backlog_deploy_guard?: boolean;
};

export async function runClubThrottleProductionDeployment(
  input: ClubThrottleProductionDeploymentRunnerInput,
): Promise<{
  composed: ClubThrottleComposedStorefront;
  evidence: Record<string, unknown>;
  deployed: boolean;
  deploymentUrl: string | null;
  projectId: string | null;
  dest: string;
  safeError: string | null;
}> {
  const aliasProduction = input.aliasProduction !== false;
  if (input.deploy !== false && !input.skip_production_env_bootstrap) {
    loadServerEnvFromLocalFile();
    reloadVercelFromLocalFile();
  }
  if (input.deploy !== false && input.rebuildDarkGarmentArt !== false && !input.skip_production_env_bootstrap) {
    await buildBlockedBlackGarmentArt();
    await runClubThrottleColorMerchPipeline();
    spawnSync(process.execPath, ["scripts/emit-founder-dark-garment-comparison-v13.mjs"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  }
  const composed = composeClubThrottleStorefrontFiles();
  const publishableBound = composed.files.find((f) => f.path === "lib/stripe-publishable-runtime.ts")?.content ?? "";
  const dest = input.dest ?? join(process.env.TEMP ?? "/tmp", "infinity-club-throttle-isolated-v1");
  writeIsolatedBundle(dest, composed.files);

  const vercel = input.vercel_adapter ?? new VercelDomainBindingAdapter();
  let projectId: string | null = null;
  let projectReused = false;
  let deploymentId: string | null = null;
  let deploymentUrl: string | null = null;
  let readyState = "NOT_RUN";
  let deployed = false;
  let safeError: string | null = null;
  const smoke: Record<string, number> = {};

  if (input.deploy !== false && !safeError) {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const guard = evaluateBlogBacklogDeployGuard({
      articles,
      rendered_by_path: buildBacklogRenderedEvidenceMap(articles),
      scoped_backlog_publication_authorized: true,
    });
    if (!guard.bundle_deploy_allowed) {
      safeError = `BLOG_BACKLOG_DEPLOY_BLOCKED:${guard.reasons.slice(0, 12).join(",")}`;
    }
  }

  if (input.deploy !== false && !safeError) {
    const capabilityGates = evaluateClubThrottleProductionDeployGates({
      composed,
      browser_capability_evidence: input.browser_capability_evidence ?? null,
      capability_boundary: "PRODUCTION_DEPLOY",
    });
    if (capabilityGates.result !== "PASS") {
      safeError = `${capabilityGates.stable_reason ?? "CT_DEPLOY_CAPABILITY_BLOCKED"}:${capabilityGates.reasons.slice(0, 12).join(",")}`;
    }
  }

  if (
    input.deploy !== false &&
    !safeError &&
    !publishableBound.includes('STRIPE_PUBLISHABLE_KEY_RUNTIME = "pk_') &&
    !publishableBound.includes("STRIPE_PUBLISHABLE_KEY_RUNTIME = 'pk_")
  ) {
    safeError = EMBEDDED_CHECKOUT_REQUIRES_STRIPE_PUBLISHABLE_KEY;
  }

  if (input.deploy !== false && !safeError && !input.skip_production_env_bootstrap) {
    const publishableKey = await resolveStripePublishableKeyForClubThrottle(process.env);
    if (publishableKey) {
      process.env.STRIPE_PUBLISHABLE_KEY = publishableKey;
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = publishableKey;
      await syncClubThrottleStripePublishableToVercel(publishableKey);
    }
  }

  if (input.deploy !== false && !safeError) {
    const project = await vercel.createProject(CLUB_THROTTLE_STOREFRONT_PROJECT);
    projectId = project.id === "UNKNOWN" ? null : project.id;
    projectReused = project.reused;
    if (!project.ok) safeError = project.safeError ?? "VERCEL_PROJECT_CREATE_FAILED";

    if (!safeError) {
      for (const file of composed.files) {
        const uploaded = await vercel.uploadSourceFile(file);
        if (!uploaded.ok) {
          safeError = uploaded.safeError ?? "VERCEL_FILE_UPLOAD_FAILED";
          break;
        }
      }
    }

    if (!safeError) {
      const created = await vercel.createSourceBundleDeployment({
        projectName: CLUB_THROTTLE_STOREFRONT_PROJECT,
        files: composed.files,
        target: "production",
        projectSettings: {
          framework: "nextjs",
          buildCommand: "next build",
        },
      });
      if (!created.ok || created.id === "UNKNOWN") {
        safeError = created.safeError ?? "VERCEL_DEPLOYMENT_CREATE_FAILED";
      } else {
        deploymentId = created.id;
        deploymentUrl = created.url.startsWith("http") ? created.url : `https://${created.url}`;
        for (let attempt = 0; attempt < (input.pollAttempts ?? 60); attempt += 1) {
          const status = await vercel.getDeployment(created.id);
          readyState = status.readyState;
          if (status.url && status.url !== "UNKNOWN") {
            deploymentUrl = status.url.startsWith("http") ? status.url : `https://${status.url}`;
          }
          if (status.readyState === "READY") {
            deployed = true;
            if (aliasProduction && projectId) {
              const aliasApex = await vercel.assignDeploymentAlias(created.id, "clubthrottle.com");
              await vercel.assignDeploymentAlias(created.id, "www.clubthrottle.com");
              const promoted = await vercel.promoteDeployment(projectId, created.id);
              deployed = aliasApex.ok;
              if (!aliasApex.ok) safeError = aliasApex.safeError ?? "VERCEL_ALIAS_APEX_FAILED";
              else if (!promoted.ok) safeError = promoted.safeError ?? "VERCEL_PROMOTE_FAILED_NON_BLOCKING";
            }
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

    if (deployed && deploymentUrl) {
      for (const path of SMOKE_PATHS) {
        try {
          const response = await fetch(`${deploymentUrl}${path}`, { redirect: "follow" });
          smoke[path] = response.status;
        } catch {
          smoke[path] = 0;
        }
      }
      try {
        const missing = await fetch(`${deploymentUrl}/this-road-is-closed-${Date.now()}`);
        smoke["404"] = missing.status;
      } catch {
        smoke["404"] = 0;
      }
    }
  }

  let domainAliasDeploymentId: string | null = null;
  let productionTargetDeploymentId: string | null = null;
  if (input.deploy !== false && vercel.tokenPresent()) {
    const aliasProbe = await vercel.getAlias("clubthrottle.com");
    domainAliasDeploymentId = aliasProbe.deploymentId === "NONE" ? null : aliasProbe.deploymentId;
    const projectMeta = projectId ? await vercel.getProject(CLUB_THROTTLE_STOREFRONT_PROJECT) : null;
    productionTargetDeploymentId =
      projectMeta?.productionDeploymentId && projectMeta.productionDeploymentId !== "NONE" ?
        projectMeta.productionDeploymentId
      : null;
  }

  const evidence = {
    vercel_project: projectId ? "PASS" : "FAIL",
    vercel_project_name: CLUB_THROTTLE_STOREFRONT_PROJECT,
    vercel_project_id: projectId,
    project_reused: projectReused,
    production_deployment: deployed ? "PASS" : "FAIL",
    deployment_id: deploymentId,
    deployment_url: deploymentUrl,
    ready_state: readyState,
    domain_alias_deployment_id: domainAliasDeploymentId,
    production_target_deployment_id: productionTargetDeploymentId,
    domain_points_to_latest_production:
      deploymentId && domainAliasDeploymentId ? domainAliasDeploymentId === deploymentId : "UNKNOWN",
    storefront_version: composed.storefront_version ?? "UNKNOWN",
    compose_digest: composed.compose_digest ?? composed.digest,
    existing_brand_logo: composed.logo_bound ? "BOUND" : "ASSET_REQUIRED",
    artwork_public_path: CLUB_THROTTLE_ARTWORK_PATH,
    founder_dirty_tree_deployed: false,
    isolated_dest: dest,
    digest: composed.digest,
    smoke,
    safe_error: safeError,
  };

  if (input.persistEvidence !== false) {
    mkdirSync(dirname(CLUB_THROTTLE_DEPLOY_EVIDENCE_PATH), { recursive: true });
    writeFileSync(CLUB_THROTTLE_DEPLOY_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  }

  return { composed, evidence, deployed, deploymentUrl, projectId, dest, safeError };
}

/** @internal Vitest-only — not imported by production deploy callers. */
export async function runClubThrottleProductionDeploymentForTest(
  input: ClubThrottleProductionDeploymentTestInput,
) {
  const aliasProduction = input.aliasProduction !== false;
  const composed = input.composed_override;
  const publishableBound = composed.files.find((f) => f.path === "lib/stripe-publishable-runtime.ts")?.content ?? "";
  const dest = input.dest ?? join(process.env.TEMP ?? "/tmp", "infinity-club-throttle-isolated-v1");
  writeIsolatedBundle(dest, composed.files);

  const vercel = input.vercel_adapter ?? new VercelDomainBindingAdapter();
  let projectId: string | null = null;
  let deploymentId: string | null = null;
  let deployed = false;
  let safeError: string | null = null;

  if (input.deploy !== false && !input.skip_backlog_deploy_guard) {
    const articles = listOccupancyClubThrottleBacklogArticles();
    const guard = evaluateBlogBacklogDeployGuard({
      articles,
      rendered_by_path: buildBacklogRenderedEvidenceMap(articles),
      scoped_backlog_publication_authorized: true,
    });
    if (!guard.bundle_deploy_allowed) {
      safeError = `BLOG_BACKLOG_DEPLOY_BLOCKED:${guard.reasons.slice(0, 12).join(",")}`;
    }
  }

  if (input.deploy !== false && !safeError) {
    const capabilityGates = evaluateClubThrottleProductionDeployGates({
      composed,
      browser_capability_evidence: input.browser_capability_evidence ?? null,
      capability_boundary: input.capability_boundary ?? "UNIT_HELPER",
    });
    if (capabilityGates.result !== "PASS") {
      safeError = `${capabilityGates.stable_reason ?? "CT_DEPLOY_CAPABILITY_BLOCKED"}:${capabilityGates.reasons.slice(0, 12).join(",")}`;
    }
  }

  if (
    input.deploy !== false &&
    !safeError &&
    !input.skip_production_env_bootstrap &&
    !publishableBound.includes('STRIPE_PUBLISHABLE_KEY_RUNTIME = "pk_') &&
    !publishableBound.includes("STRIPE_PUBLISHABLE_KEY_RUNTIME = 'pk_")
  ) {
    safeError = EMBEDDED_CHECKOUT_REQUIRES_STRIPE_PUBLISHABLE_KEY;
  }

  if (input.deploy !== false && !safeError) {
    const project = await vercel.createProject(CLUB_THROTTLE_STOREFRONT_PROJECT);
    projectId = project.id === "UNKNOWN" ? null : project.id;
    if (!project.ok) safeError = project.safeError ?? "VERCEL_PROJECT_CREATE_FAILED";
    if (!safeError) {
      for (const file of composed.files) {
        const uploaded = await vercel.uploadSourceFile(file);
        if (!uploaded.ok) {
          safeError = uploaded.safeError ?? "VERCEL_FILE_UPLOAD_FAILED";
          break;
        }
      }
    }
    if (!safeError) {
      const created = await vercel.createSourceBundleDeployment({
        projectName: CLUB_THROTTLE_STOREFRONT_PROJECT,
        files: composed.files,
        target: "production",
      });
      if (!created.ok || created.id === "UNKNOWN") {
        safeError = created.safeError ?? "VERCEL_DEPLOYMENT_CREATE_FAILED";
      } else {
        deploymentId = created.id;
        if (aliasProduction && projectId) {
          await vercel.assignDeploymentAlias(created.id, "clubthrottle.com");
          await vercel.promoteDeployment(projectId, created.id);
        }
        deployed = true;
      }
    }
  }

  return {
    composed,
    evidence: { safe_error: safeError, deployment_id: deploymentId },
    deployed,
    deploymentUrl: null as string | null,
    projectId,
    dest,
    safeError,
  };
}
