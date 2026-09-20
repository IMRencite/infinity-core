import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
  classifyOverlayProvenance,
  evaluateGrowthArtifactAskReviewIsolationGate,
  evaluateGrowthRuntimeUIIndependenceGate,
} from "./artifact-gates";

export const ISOLATED_PRODUCTION_ARTIFACT_CONTRACT = "IsolatedProductionArtifactContract" as const;
export const PRODUCTION_ARTIFACT_CONTAMINATION_GATE = "ProductionArtifactContaminationGate" as const;
export const KNOWN_GOOD_GROWTH_BASELINE = "07f7b0401edcb8413e23c77cba4fdd66e5c1b308" as const;

export const GROWTH_RUNTIME_OVERLAY_FILES = [
  "lib/infinity/growth-engine/venture-identity.ts",
  "lib/infinity/growth-engine/commercial-readiness.ts",
  "lib/infinity/growth-engine/published-email.ts",
  "lib/infinity/growth-engine/suppression.ts",
  "lib/infinity/growth-engine/gmail-path.ts",
  "lib/infinity/growth-engine/runtime-tick-auth.ts",
  "lib/infinity/growth-engine/runtime-cycle.ts",
  "lib/infinity/growth-engine/stale-schedule.ts",
  "lib/infinity/growth-engine/artifact-gates.ts",
  "lib/infinity/growth-engine/contract.ts",
  "lib/infinity/growth-engine/communication.ts",
  "lib/infinity/growth-engine/funnel.ts",
  "lib/infinity/growth-engine/tactics.ts",
  "lib/infinity/growth-engine/selection.ts",
  "lib/infinity/growth-engine/trial.ts",
  "lib/infinity/growth-engine/outreach.ts",
  "lib/infinity/growth-engine/readiness.ts",
  "lib/infinity/growth-engine/learning.ts",
  "lib/infinity/growth-engine/founder-grant.ts",
  "lib/infinity/growth-engine/source-live-verification.ts",
  "lib/infinity/growth-engine/prospect-source.ts",
  "lib/infinity/growth-engine/qualification.ts",
  "lib/infinity/growth-engine/per-prospect-auth.ts",
  "lib/infinity/growth-engine/scheduler-coverage.ts",
  "lib/infinity/growth-engine/path-gate.ts",
  "lib/infinity/growth-engine/occupancynpv-experiment.ts",
  "lib/infinity/growth-engine/production-readiness.ts",
  "lib/infinity/growth-engine/isolated-artifact.ts",
  "app/api/runtime/tick/route.ts",
  "app/api/runtime/venture-operating-cycle/route.ts",
  "app/api/runtime/operating-state/route.ts",
  "app/api/runtime/wake/route.ts",
  "lib/infinity/cloud-runtime/index.ts",
  "vercel.json",
  ".infinity/growth-engine/occupancynpv-first-experiment.json",
  "lib/infinity/research/public-web/capabilities.ts",
  "lib/infinity/research/public-web/types.ts",
  "lib/infinity/research/public-web/ssrf.ts",
  "lib/infinity/research/public-web/fetch-public-page.ts",
  "lib/infinity/research/public-web/providers/duckduckgo-html.ts",
  "lib/infinity/research/public-web/search-registry.ts",
  ".infinity/venture-operating-scale/occupancynpv-live-checkout-health.json",
  ".infinity/communication-provider/write-verification.json",
] as const;

function listFiles(root: string, relative = ""): string[] {
  const dir = join(root, relative);
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const rel = relative ? `${relative}/${entry}` : entry;
    const full = join(root, rel);
    if (statSync(full).isDirectory()) out.push(...listFiles(root, rel));
    else out.push(rel.replace(/\\/g, "/"));
  }
  return out;
}

export function inspectIsolatedGrowthArtifact(input: {
  workspaceRoot?: string;
  includedPaths?: string[];
  typescriptErrors?: number;
  nextBuild?: "PASS" | "FAIL";
} = {}) {
  const workspace = input.workspaceRoot;
  let baseline = "UNKNOWN";
  try {
    const cwd = workspace ?? process.cwd();
    baseline = execSync("git rev-parse HEAD", { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    baseline = "UNKNOWN";
  }
  const included = input.includedPaths ?? [...GROWTH_RUNTIME_OVERLAY_FILES];
  const reasons: string[] = [];
  if (!workspace) {
    reasons.push("ISOLATED_WORKSPACE_REQUIRED");
    reasons.push("HEAD_MISSING:lib/infinity/growth-engine/occupancynpv-experiment.ts");
    reasons.push("HEAD_MISSING:app/api/runtime/venture-operating-cycle/route.ts");
    reasons.push("DEPENDENCY_CLOSURE_NOT_ON_BASELINE");
  } else {
    if (baseline !== KNOWN_GOOD_GROWTH_BASELINE) reasons.push(`BASELINE_MISMATCH:${baseline}`);
    for (const path of included) {
      if (!existsSync(join(workspace, path))) reasons.push(`OVERLAY_MISSING:${path}`);
    }
  }
  const askReview = evaluateGrowthArtifactAskReviewIsolationGate(included);
  const ui = evaluateGrowthRuntimeUIIndependenceGate(included);
  if (askReview.result !== "PASS") reasons.push("ASKREVIEW_INCLUDED");
  if (ui.result !== "PASS") reasons.push("HQ_UI_INCLUDED");
  const unknown = included.filter((path) => classifyOverlayProvenance(path) === "UNKNOWN");
  if (unknown.length > 0) reasons.push("UNKNOWN_OVERLAY_FILE");
  if ((input.typescriptErrors ?? 0) > 0) reasons.push("TYPESCRIPT_ERRORS");
  if (input.nextBuild === "FAIL") reasons.push("NEXT_BUILD_FAIL");
  const digest = createHash("sha256")
    .update([baseline, ...included].join("|"))
    .digest("hex");
  const isolation = reasons.some((row) =>
    row.startsWith("HEAD_MISSING")
    || row === "DEPENDENCY_CLOSURE_NOT_ON_BASELINE"
    || row === "ISOLATED_WORKSPACE_REQUIRED"
    || row.startsWith("OVERLAY_MISSING")
    || row.startsWith("BASELINE_MISMATCH"),
  ) ? "FAIL" : reasons.length === 0 ? "PASS" : "FAIL";
  return {
    contract: ISOLATED_PRODUCTION_ARTIFACT_CONTRACT,
    baseline,
    included,
    excludedUnrelatedCount: workspace ? 0 : 684,
    askReviewIncluded: askReview.askReviewDependencies,
    digest,
    isolation,
    contamination: askReview.result === "PASS" && ui.result === "PASS" && unknown.length === 0 ? "PASS" : "FAIL",
    reasons,
    strategy: "clean baseline worktree + closed growth-runtime overlay",
    productionTarget: "Infinity production runtime / HQ service that hosts /api/runtime/tick",
    ventureScope: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
    workspaceRoot: workspace ?? null,
    unknownCount: unknown.length,
    overlayFileCount: included.length,
  };
}

export function evaluateIsolatedProductionArtifactContract(
  artifact = inspectIsolatedGrowthArtifact(),
) {
  return {
    gate: ISOLATED_PRODUCTION_ARTIFACT_CONTRACT,
    result: artifact.isolation === "PASS" && artifact.reasons.length === 0 ? "PASS" : "FAIL",
    reasons: artifact.reasons,
    artifact,
  };
}

export function evaluateProductionArtifactContaminationGate(
  artifact = inspectIsolatedGrowthArtifact(),
) {
  return {
    gate: PRODUCTION_ARTIFACT_CONTAMINATION_GATE,
    result: artifact.contamination,
    reasons: [
      ...(artifact.askReviewIncluded > 0 ? ["ASKREVIEW_INCLUDED"] : []),
      ...(artifact.unknownCount > 0 ? ["UNKNOWN_FILE"] : []),
    ],
    artifact,
  };
}

export function workspaceOverlayPaths(root: string): string[] {
  return listFiles(root).filter((path) =>
    path.startsWith("lib/infinity/growth-engine/")
    || path.startsWith("app/api/runtime/")
    || path === "vercel.json"
    || path.startsWith(".infinity/growth-engine/")
    || path.startsWith("lib/infinity/research/public-web/")
    || path === ".infinity/venture-operating-scale/occupancynpv-live-checkout-health.json"
    || path === ".infinity/communication-provider/write-verification.json",
  );
}

export function readOverlayFile(root: string, path: string): string {
  return readFileSync(join(root, path), "utf8");
}
