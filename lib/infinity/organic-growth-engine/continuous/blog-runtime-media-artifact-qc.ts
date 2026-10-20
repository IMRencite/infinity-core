import { existsSync } from "node:fs";
import path from "node:path";
import { listAuthorizedBacklogMediaBundles } from "./blog-article-media-registry";
import { BLOG_MEDIA_DEPLOY_ARTIFACT_QC } from "./blog-deploy-media-bundle";
import {
  buildClubThrottleAutonomousPublishCycleDiagnostic,
  pickClubThrottleAutonomousBacklogCandidate,
  CLUB_THROTTLE_AFTER_DARK_REFRESH_PROBE_SLUG,
} from "@/lib/infinity/autonomous-portfolio-operations/portfolio-operating-backlog-publish-v1";

export const BLOG_RUNTIME_MEDIA_ARTIFACT_QC = "BlogRuntimeMediaArtifactQc" as const;
export const CT_SERVERLESS_MEDIA_STARVATION_REGRESSION_QC = "CtServerlessMediaStarvationRegressionQc" as const;

export const CT_AFTER_DARK_RUNTIME_HERO_REL = "public/visual/journal-hero-night-ride.webp" as const;

export function listRequiredRuntimeBlogMediaRelPaths(): string[] {
  const required = new Set<string>();
  for (const bundle of listAuthorizedBacklogMediaBundles()) {
    for (const deployPath of bundle.deploy_paths) {
      const normalized = deployPath.replace(/\\/g, "/");
      if (normalized.startsWith("public/")) required.add(normalized);
    }
  }
  return [...required].sort();
}

/** Filesystem manifest for isolated infinity-runtime dest (same invariant as venture deploy artifact QC). */
export function evaluateBlogRuntimeMediaArtifactQc(input: { artifact_root: string }): {
  gate: typeof BLOG_RUNTIME_MEDIA_ARTIFACT_QC;
  result: "PASS" | "FAIL";
  reasons: string[];
  missing: string[];
  INFINITY_RUNTIME_PUBLIC_VISUAL_COPY_QC: "PASS" | "FAIL";
  INFINITY_RUNTIME_PUBLIC_MEDIA_COPY_QC: "PASS" | "FAIL";
  CT_AFTER_DARK_RUNTIME_MEDIA_PATH: string;
  CT_AFTER_DARK_RUNTIME_MEDIA_EXISTS: boolean;
} {
  const root = path.resolve(input.artifact_root);
  const visualRoot = path.join(root, "public/visual");
  const mediaRoot = path.join(root, "public/media");
  const visualCopyOk = existsSync(visualRoot);
  const mediaCopyOk = existsSync(mediaRoot);
  const missing: string[] = [];
  for (const rel of listRequiredRuntimeBlogMediaRelPaths()) {
    if (!existsSync(path.join(root, rel))) missing.push(rel);
  }
  const afterDarkAbs = path.join(root, CT_AFTER_DARK_RUNTIME_HERO_REL);
  const afterDarkExists = existsSync(afterDarkAbs);
  const reasons: string[] = [];
  if (!visualCopyOk) reasons.push("public_visual_tree_missing");
  if (!mediaCopyOk) reasons.push("public_media_tree_missing");
  if (missing.length) reasons.push(...missing.map((m) => `runtime_artifact_missing:${m}`));
  if (!afterDarkExists) reasons.push(`runtime_artifact_missing:${CT_AFTER_DARK_RUNTIME_HERO_REL}`);
  return {
    gate: BLOG_RUNTIME_MEDIA_ARTIFACT_QC,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
    missing,
    INFINITY_RUNTIME_PUBLIC_VISUAL_COPY_QC: visualCopyOk ? "PASS" : "FAIL",
    INFINITY_RUNTIME_PUBLIC_MEDIA_COPY_QC: mediaCopyOk ? "PASS" : "FAIL",
    CT_AFTER_DARK_RUNTIME_MEDIA_PATH: afterDarkAbs,
    CT_AFTER_DARK_RUNTIME_MEDIA_EXISTS: afterDarkExists,
  };
}

export function evaluateBlogRuntimeAfterDarkPredeployProbe(input: { artifact_root: string }): {
  CT_RUNTIME_PREDEPLOY_PUBLISH_ALLOWED: boolean;
  CT_RUNTIME_PREDEPLOY_DEPLOY_ALLOWED: boolean;
  CT_RUNTIME_PREDEPLOY_REASONS: string[];
  CT_RUNTIME_PICKED_CANDIDATE: string | null;
} {
  const prev = process.cwd();
  const prevCloud = process.env.INFINITY_CLOUD_RUNTIME;
  const prevVercel = process.env.VERCEL;
  try {
    process.chdir(path.resolve(input.artifact_root));
    delete process.env.INFINITY_CLOUD_RUNTIME;
    delete process.env.VERCEL;
    const diagnostic = buildClubThrottleAutonomousPublishCycleDiagnostic();
    const probe = diagnostic.ct_refresh_probe;
    const candidate = pickClubThrottleAutonomousBacklogCandidate();
    return {
      CT_RUNTIME_PREDEPLOY_PUBLISH_ALLOWED: probe?.publish_allowed ?? false,
      CT_RUNTIME_PREDEPLOY_DEPLOY_ALLOWED: probe?.deploy_allowed ?? false,
      CT_RUNTIME_PREDEPLOY_REASONS: probe?.reasons ?? ["probe_missing"],
      CT_RUNTIME_PICKED_CANDIDATE:
        candidate?.slug === CLUB_THROTTLE_AFTER_DARK_REFRESH_PROBE_SLUG ? candidate.slug : candidate?.slug ?? null,
    };
  } finally {
    process.chdir(prev);
    if (prevCloud !== undefined) process.env.INFINITY_CLOUD_RUNTIME = prevCloud;
    else delete process.env.INFINITY_CLOUD_RUNTIME;
    if (prevVercel !== undefined) process.env.VERCEL = prevVercel;
    else delete process.env.VERCEL;
  }
}

function isMediaStarvationPredeployReason(reason: string): boolean {
  return /asset_missing_on_disk|runtime_artifact_missing|BLOG_MEDIA|ENOENT.*public\/visual/i.test(reason);
}

export function evaluateCtServerlessMediaStarvationRegressionQc(input: {
  artifact_root: string;
  simulate_missing_after_dark_hero?: boolean;
}): {
  gate: typeof CT_SERVERLESS_MEDIA_STARVATION_REGRESSION_QC;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const artifact = evaluateBlogRuntimeMediaArtifactQc({ artifact_root: input.artifact_root });
  if (input.simulate_missing_after_dark_hero) {
    if (artifact.result !== "FAIL") reasons.push("expected_artifact_fail_when_hero_missing");
    const probe = evaluateBlogRuntimeAfterDarkPredeployProbe({ artifact_root: input.artifact_root });
    if (probe.CT_RUNTIME_PREDEPLOY_DEPLOY_ALLOWED) reasons.push("expected_deploy_blocked_when_hero_missing");
    if (!probe.CT_RUNTIME_PREDEPLOY_REASONS.some((r) => r.includes("asset_missing_on_disk") || r.includes("BLOG_MEDIA"))) {
      reasons.push("expected_asset_missing_on_disk_reason");
    }
  } else {
    if (artifact.result !== "PASS") reasons.push(...artifact.reasons);
    const probe = evaluateBlogRuntimeAfterDarkPredeployProbe({ artifact_root: input.artifact_root });
    const mediaStarvationReasons = probe.CT_RUNTIME_PREDEPLOY_REASONS.filter(isMediaStarvationPredeployReason);
    if (mediaStarvationReasons.length) reasons.push(...mediaStarvationReasons);
    // Isolated runtime deploy gate: hero/media on disk must not be silently dropped.
    // Render/browser/capability blocks are enforced elsewhere and may legitimately keep deploy_allowed false.
  }
  return {
    gate: CT_SERVERLESS_MEDIA_STARVATION_REGRESSION_QC,
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

/** Alias for promotion reports — reuses venture artifact gate name on filesystem manifest. */
export { BLOG_MEDIA_DEPLOY_ARTIFACT_QC };
