import { LIVE_DEPLOYMENT_PARITY_GATE, type HqNamedGate } from "@/lib/infinity/hq-production-deployment/contract";
import {
  evaluateDeploymentVerificationState,
  type DeploymentVerificationResult,
} from "@/lib/infinity/qc-escape/deployment-verification";

export {
  DEFAULT_DEPLOYMENT_PROPAGATION_WINDOW_MS,
  DEFAULT_DEPLOYMENT_PROPAGATION_POLL_MS,
  DEPLOYMENT_VERIFICATION_CONTRACT,
  DEPLOYMENT_VERIFICATION_LIFECYCLE,
  DEPLOYMENT_VERIFICATION_RESULTS,
  evaluateDeploymentVerificationState,
  waitForCanonicalPropagation,
} from "@/lib/infinity/qc-escape/deployment-verification";
export type {
  DeploymentVerification,
  DeploymentVerificationInput,
  DeploymentVerificationLifecycle,
  DeploymentVerificationResult,
} from "@/lib/infinity/qc-escape/deployment-verification";

export type LiveDeploymentLifecycleState =
  | "IMPLEMENTED"
  | "DEPLOYED"
  | "ALIAS_ASSIGNED"
  | "PROPAGATING"
  | "LIVE_VERIFIED";

export function evaluateLiveDeploymentParityGate(input: {
  implemented: boolean;
  productionArtifactIncludesChanges: boolean;
  deploymentCompleted: boolean;
  canonicalDomainServesNewVersion: boolean;
  liveHtmlMatches: boolean;
  noStaleAlias: boolean;
  cdnNotStale: boolean;
  deploymentArtifactCorrect?: boolean | null;
  propagationElapsedMs?: number;
}): HqNamedGate {
  const verification = evaluateDeploymentVerificationState({
    deployed: input.deploymentCompleted,
    aliased: input.noStaleAlias || input.canonicalDomainServesNewVersion,
    deploymentArtifactCorrect: input.deploymentArtifactCorrect,
    canonicalServesNewArtifact: input.canonicalDomainServesNewVersion && input.liveHtmlMatches && input.cdnNotStale,
    elapsedMs: input.propagationElapsedMs,
  });
  if (
    input.deploymentCompleted
    && input.implemented
    && input.productionArtifactIncludesChanges
    && input.deploymentArtifactCorrect === true
    && verification.result === "PROPAGATING"
  ) {
    return {
      gate: LIVE_DEPLOYMENT_PARITY_GATE,
      result: "PASS",
      reasons: ["COMPOSE_AND_DEPLOYMENT_MATCH", ...verification.reasons],
    };
  }
  const checks: Array<[string, boolean]> = [
    ["IMPLEMENTED", input.implemented],
    ["PRODUCTION_ARTIFACT_INCLUDES_CHANGES", input.productionArtifactIncludesChanges],
    ["DEPLOYMENT_COMPLETED", input.deploymentCompleted],
    ["CANONICAL_DOMAIN_UPDATED", input.canonicalDomainServesNewVersion],
    ["LIVE_HTML_MATCHES", input.liveHtmlMatches],
    ["NO_STALE_ALIAS", input.noStaleAlias],
    ["CDN_NOT_STALE", input.cdnNotStale],
  ];
  const reasons = checks.filter(([, ok]) => !ok).map(([name]) => name);
  return {
    gate: LIVE_DEPLOYMENT_PARITY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["COMPOSE_AND_LIVE_MATCH"],
  };
}

export function liveFeatureStatus(input: {
  implemented: boolean;
  deployed: boolean;
  liveVerified: boolean;
  propagating?: boolean;
}): {
  implemented: LiveDeploymentLifecycleState | "FAIL";
  deployed: "PASS" | "FAIL";
  live_verified: DeploymentVerificationResult;
  production: DeploymentVerificationResult;
} {
  const live_verified: DeploymentVerificationResult = input.liveVerified
    ? "PASS"
    : input.propagating
      ? "PROPAGATING"
      : "FAIL";
  return {
    implemented: input.implemented ? "IMPLEMENTED" : "FAIL",
    deployed: input.deployed ? "PASS" : "FAIL",
    live_verified,
    production: input.implemented && input.deployed && input.liveVerified
      ? "PASS"
      : input.propagating
        ? "NOT_PROVEN"
        : "FAIL",
  };
}