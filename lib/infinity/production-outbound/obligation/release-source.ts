import { createHash } from "node:crypto";
import type { NamedOutboundLoopGate } from "../closed-loop";

export type DeployableUnit = "infinity-runtime" | "infinity-hq";

export type ReleaseSourceIdentity = {
  RELEASE_SHA: string;
  RELEASE_TREE_HASH: string;
  RELEASE_DIRTY: boolean;
  BUILD_GRAPH_HASH: string;
  DEPLOYABLE_UNIT: DeployableUnit;
  DEPLOYMENT_ID: string | null;
  CUTOVER_EPOCH_SEEN: string | null;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateCleanReleaseSourceGate(input: {
  dirty: boolean;
  emergency?: boolean;
  uploaded_includes_unrelated_blog_os?: boolean;
}): NamedOutboundLoopGate {
  if (input.uploaded_includes_unrelated_blog_os) {
    return named("CleanReleaseSourceGate", "FAIL", ["DIRTY_SHARED_RELEASE_SOURCE"]);
  }
  if (input.dirty && !input.emergency) {
    return named("CleanReleaseSourceGate", "FAIL", ["DIRTY_TREE_PROHIBITED"]);
  }
  return named("CleanReleaseSourceGate", "PASS", [input.emergency ? "EMERGENCY_OVERRIDE" : "CLEAN"]);
}

export function evaluateCommunicationBuildGraphIsolationGate(input: {
  includes_blog_os: boolean;
  includes_organic_growth: boolean;
  includes_geo_engine: boolean;
  blocking_import_edge: string | null;
}): NamedOutboundLoopGate {
  const coupled = input.includes_blog_os || input.includes_organic_growth || input.includes_geo_engine || Boolean(input.blocking_import_edge);
  return named("CommunicationBuildGraphIsolationGate", coupled ? "FAIL" : "PASS", [
    input.blocking_import_edge ?? "NO_BLOG_OS_EDGE",
  ]);
}

export function evaluateDeployableSourceHealthGate(input: {
  repository_tests: "PASS" | "FAIL";
  runtime_typecheck: "PASS" | "FAIL";
  runtime_build: "PASS" | "FAIL";
  hq_typecheck: "PASS" | "FAIL";
  hq_build: "PASS" | "FAIL";
}): {
  RepositoryTests: "PASS" | "FAIL";
  RuntimeTypecheck: "PASS" | "FAIL";
  RuntimeBuild: "PASS" | "FAIL";
  HQTypecheck: "PASS" | "FAIL";
  HQBuild: "PASS" | "FAIL";
  DeployableSourceHealthGate: NamedOutboundLoopGate;
} {
  const runtimeOk = input.repository_tests === "PASS" && input.runtime_typecheck === "PASS" && input.runtime_build === "PASS";
  return {
    RepositoryTests: input.repository_tests,
    RuntimeTypecheck: input.runtime_typecheck,
    RuntimeBuild: input.runtime_build,
    HQTypecheck: input.hq_typecheck,
    HQBuild: input.hq_build,
    DeployableSourceHealthGate: named("DeployableSourceHealthGate", runtimeOk ? "PASS" : "FAIL", [
      `tests:${input.repository_tests}`,
      `runtime_tsc:${input.runtime_typecheck}`,
      `runtime_build:${input.runtime_build}`,
      `hq_tsc:${input.hq_typecheck}`,
      `hq_build:${input.hq_build}`,
    ]),
  };
}

export function evaluateRuntimeReleaseParityGate(input: {
  intended_sha: string | null;
  observed_sha: string | null;
  intended_deployment: string | null;
  observed_deployment: string | null;
  dirty: boolean;
}): NamedOutboundLoopGate {
  const pass = Boolean(input.intended_sha)
    && input.intended_sha === input.observed_sha
    && Boolean(input.intended_deployment)
    && input.intended_deployment === input.observed_deployment
    && !input.dirty;
  return named("RuntimeReleaseParityGate", pass ? "PASS" : "FAIL", [
    input.intended_sha ?? "NO_INTENDED",
    input.observed_sha ?? "NO_OBSERVED",
    input.intended_deployment ?? "NO_INTENDED_DPL",
    input.observed_deployment ?? "NO_OBSERVED_DPL",
    input.dirty ? "DIRTY" : "CLEAN",
  ]);
}

export function evaluateHQReleaseParityGate(input: {
  intended_deployment: string | null;
  observed_deployment: string | null;
}): NamedOutboundLoopGate {
  if (!input.intended_deployment || !input.observed_deployment) {
    return named("HQReleaseParityGate", "NOT_PROVEN", ["HQ_NOT_REQUIRED_FOR_RUNTIME"]);
  }
  return named("HQReleaseParityGate", input.intended_deployment === input.observed_deployment ? "PASS" : "FAIL", [
    input.intended_deployment,
    input.observed_deployment,
  ]);
}

export function evaluatePostDeployRuntimeVerificationGate(input: {
  expected: ReleaseSourceIdentity;
  heartbeat: Partial<ReleaseSourceIdentity> | null;
}): NamedOutboundLoopGate {
  if (!input.heartbeat) return named("PostDeployRuntimeVerificationGate", "FAIL", ["HEARTBEAT_ABSENT"]);
  const mismatches = [
    input.expected.RELEASE_SHA !== input.heartbeat.RELEASE_SHA ? "SHA" : null,
    input.expected.RELEASE_TREE_HASH !== input.heartbeat.RELEASE_TREE_HASH ? "TREE_HASH" : null,
    input.expected.DEPLOYMENT_ID !== input.heartbeat.DEPLOYMENT_ID ? "DEPLOYMENT" : null,
    input.expected.BUILD_GRAPH_HASH !== input.heartbeat.BUILD_GRAPH_HASH ? "BUILD_GRAPH" : null,
    input.expected.DEPLOYABLE_UNIT !== input.heartbeat.DEPLOYABLE_UNIT ? "UNIT" : null,
  ].filter(Boolean);
  return named("PostDeployRuntimeVerificationGate", mismatches.length ? "FAIL" : "PASS", mismatches.length ? mismatches as string[] : ["HEARTBEAT_MATCH"]);
}

export function hashReleaseTree(files: Array<{ path: string; contents: string }>): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(file.contents);
    hash.update("\n");
  }
  return hash.digest("hex").slice(0, 16);
}

export function evaluateNotProvenCoercionGate(input: { from: string; to: string }): NamedOutboundLoopGate {
  const coerced = input.from === "NOT_PROVEN" && (input.to === "PASS" || input.to === "FAIL");
  return named("NotProvenCoercionGate", coerced ? "FAIL" : "PASS", [input.from, input.to]);
}
