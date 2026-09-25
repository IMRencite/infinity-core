import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { VercelDomainBindingAdapter } from "@/lib/infinity/commercialization/providers/vercel/domain-binding-adapter";
import { loadServerEnvFromLocalFile, reloadVercelFromLocalFile } from "@/lib/infinity/communication-provider/load-local-env";
import {
  CLUB_THROTTLE_ARTWORK_PATH,
  CLUB_THROTTLE_STOREFRONT_PROJECT,
  composeClubThrottleStorefrontFiles,
} from "./club-throttle-storefront-compose";

export const CLUB_THROTTLE_DEPLOY_EVIDENCE_PATH =
  ".infinity/blog-os/v52-club-throttle-production-deploy.json" as const;

const SMOKE_PATHS = [
  "/",
  "/shop",
  "/collections",
  "/t-shirts",
  "/products",
  "/products/club-throttle-core-tee",
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
];

function writeIsolatedBundle(dest: string, files: ReturnType<typeof composeClubThrottleStorefrontFiles>["files"]) {
  for (const stale of ["app", "lib", "public"]) {
    rmSync(join(dest, stale), { recursive: true, force: true });
  }
  for (const file of files) {
    const target = join(dest, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.encoding === "base64" ? Buffer.from(file.content, "base64") : file.content);
  }
}

export async function executeClubThrottleProductionDeployment(input: {
  deploy?: boolean;
  dest?: string;
  persistEvidence?: boolean;
  pollAttempts?: number;
  pollDelayMs?: number;
} = {}) {
  if (input.deploy !== false) {
    loadServerEnvFromLocalFile();
    reloadVercelFromLocalFile();
  }
  const composed = composeClubThrottleStorefrontFiles();
  const dest = input.dest ?? join(process.env.TEMP ?? "/tmp", "infinity-club-throttle-isolated-v1");
  writeIsolatedBundle(dest, composed.files);

  const vercel = new VercelDomainBindingAdapter();
  let projectId: string | null = null;
  let projectReused = false;
  let deploymentId: string | null = null;
  let deploymentUrl: string | null = null;
  let readyState = "NOT_RUN";
  let deployed = false;
  let safeError: string | null = null;
  const smoke: Record<string, number> = {};

  if (input.deploy !== false) {
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
            const alias = await vercel.assignDeploymentAlias(created.id, "clubthrottle.com");
            deployed = alias.ok;
            if (!alias.ok) safeError = alias.safeError ?? "VERCEL_ALIAS_FAILED";
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

  const evidence = {
    vercel_project: projectId ? "PASS" : "FAIL",
    vercel_project_name: CLUB_THROTTLE_STOREFRONT_PROJECT,
    vercel_project_id: projectId,
    project_reused: projectReused,
    production_deployment: deployed ? "PASS" : "FAIL",
    deployment_id: deploymentId,
    deployment_url: deploymentUrl,
    ready_state: readyState,
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
