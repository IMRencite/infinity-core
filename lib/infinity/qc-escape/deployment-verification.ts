import type { QcGateResult } from "./contract";

export const DEPLOYMENT_VERIFICATION_CONTRACT = "DEPLOYMENT_VERIFICATION_STATE" as const;

export const DEPLOYMENT_VERIFICATION_LIFECYCLE = [
  "DEPLOYED",
  "ALIAS_ASSIGNED",
  "PROPAGATING",
  "LIVE_VERIFIED",
] as const;
export type DeploymentVerificationLifecycle = (typeof DEPLOYMENT_VERIFICATION_LIFECYCLE)[number];

export const DEPLOYMENT_VERIFICATION_RESULTS = [
  "PASS",
  "FAIL",
  "PROPAGATING",
  "NOT_PROVEN",
  "NOT_APPLICABLE",
] as const;
export type DeploymentVerificationResult = (typeof DEPLOYMENT_VERIFICATION_RESULTS)[number];

export const DEFAULT_DEPLOYMENT_PROPAGATION_WINDOW_MS = 180_000;
export const DEFAULT_DEPLOYMENT_PROPAGATION_POLL_MS = 8_000;

export type DeploymentVerificationInput = {
  applicable?: boolean;
  deployed?: boolean;
  deployFailed?: boolean;
  aliased?: boolean;
  deploymentUrl?: string | null;
  canonicalUrl?: string | null;
  deploymentArtifactCorrect?: boolean | null;
  canonicalServesNewArtifact?: boolean | null;
  elapsedMs?: number;
  propagationWindowMs?: number;
};

export type DeploymentVerification = {
  contract: typeof DEPLOYMENT_VERIFICATION_CONTRACT;
  lifecycle: DeploymentVerificationLifecycle | null;
  result: DeploymentVerificationResult;
  reasons: string[];
  deployment_host: string | null;
  canonical_host: string | null;
  hosts_differ: boolean;
};

export function qcResultFromDeploymentVerification(result: DeploymentVerificationResult): QcGateResult | "PROPAGATING" {
  return result;
}

export function hostnameOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function deploymentHostsDiffer(deploymentUrl?: string | null, canonicalUrl?: string | null): boolean {
  const deployment = hostnameOf(deploymentUrl);
  const canonical = hostnameOf(canonicalUrl);
  if (!deployment || !canonical) return Boolean(deploymentUrl && canonicalUrl);
  return deployment !== canonical;
}

export function evaluateDeploymentVerificationState(
  input: DeploymentVerificationInput,
): DeploymentVerification {
  const deploymentHost = hostnameOf(input.deploymentUrl);
  const canonicalHost = hostnameOf(input.canonicalUrl);
  const hostsDiffer = deploymentHostsDiffer(input.deploymentUrl, input.canonicalUrl);
  const windowMs = input.propagationWindowMs ?? DEFAULT_DEPLOYMENT_PROPAGATION_WINDOW_MS;
  const elapsed = input.elapsedMs ?? 0;
  const withinWindow = elapsed < windowMs;
  const base = {
    contract: DEPLOYMENT_VERIFICATION_CONTRACT,
    deployment_host: deploymentHost,
    canonical_host: canonicalHost,
    hosts_differ: hostsDiffer,
  };

  if (input.applicable === false) {
    return { ...base, lifecycle: null, result: "NOT_APPLICABLE", reasons: ["NOT_APPLICABLE"] };
  }
  if (input.deployFailed) {
    return { ...base, lifecycle: null, result: "FAIL", reasons: ["DEPLOYMENT_FAILED"] };
  }
  if (!input.deployed) {
    return { ...base, lifecycle: null, result: "NOT_PROVEN", reasons: ["NOT_DEPLOYED"] };
  }

  if (!input.aliased) {
    return { ...base, lifecycle: "DEPLOYED", result: "NOT_PROVEN", reasons: ["ALIAS_NOT_ASSIGNED"] };
  }

  if (input.deploymentArtifactCorrect === false) {
    return {
      ...base,
      lifecycle: "ALIAS_ASSIGNED",
      result: "FAIL",
      reasons: ["DEPLOYMENT_ARTIFACT_INCORRECT"],
    };
  }

  if (input.canonicalServesNewArtifact === true) {
    return {
      ...base,
      lifecycle: "LIVE_VERIFIED",
      result: "PASS",
      reasons: ["CANONICAL_SERVES_NEW_ARTIFACT"],
    };
  }

  if (input.deploymentArtifactCorrect == null && input.canonicalServesNewArtifact == null) {
    return {
      ...base,
      lifecycle: "ALIAS_ASSIGNED",
      result: "NOT_PROVEN",
      reasons: ["ARTIFACT_NOT_INSPECTED"],
    };
  }

  if (input.canonicalServesNewArtifact === false && input.deploymentArtifactCorrect == null) {
    return {
      ...base,
      lifecycle: "ALIAS_ASSIGNED",
      result: "NOT_PROVEN",
      reasons: ["DEPLOYMENT_ARTIFACT_NOT_COMPARED", "FIRST_CANONICAL_FETCH_STALE_NOT_FAIL"],
    };
  }

  if (!hostsDiffer && input.deploymentArtifactCorrect === true && input.canonicalServesNewArtifact !== false) {
    return {
      ...base,
      lifecycle: "LIVE_VERIFIED",
      result: "PASS",
      reasons: ["DEPLOYMENT_URL_IS_CANONICAL"],
    };
  }

  if (withinWindow) {
    return {
      ...base,
      lifecycle: "PROPAGATING",
      result: "PROPAGATING",
      reasons: [
        "CANONICAL_PROPAGATING",
        "FIRST_CANONICAL_FETCH_STALE_NOT_FAIL",
        hostsDiffer ? "DEPLOYMENT_URL_AND_CANONICAL_ALIAS_DIFFER" : "CANONICAL_NOT_YET_UPDATED",
      ],
    };
  }

  return {
    ...base,
    lifecycle: "PROPAGATING",
    result: "FAIL",
    reasons: ["CANONICAL_STILL_STALE_AFTER_WINDOW"],
  };
}

export async function waitForCanonicalPropagation(input: {
  inspectDeployment: () => Promise<boolean>;
  inspectCanonical: () => Promise<boolean>;
  deployed: boolean;
  aliased: boolean;
  deployFailed?: boolean;
  deploymentUrl?: string | null;
  canonicalUrl?: string | null;
  windowMs?: number;
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}): Promise<DeploymentVerification & {
  attempts: number;
  elapsed_ms: number;
  deployment_artifact_correct: boolean | null;
  canonical_serves_new_artifact: boolean | null;
}> {
  const started = (input.now ?? Date.now)();
  const windowMs = input.windowMs ?? DEFAULT_DEPLOYMENT_PROPAGATION_WINDOW_MS;
  const pollMs = input.pollMs ?? DEFAULT_DEPLOYMENT_PROPAGATION_POLL_MS;
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let attempts = 0;
  let deploymentArtifactCorrect: boolean | null = null;
  let canonicalServesNewArtifact: boolean | null = null;
  let verification = evaluateDeploymentVerificationState({
    deployed: input.deployed,
    deployFailed: input.deployFailed,
    aliased: input.aliased,
    deploymentUrl: input.deploymentUrl,
    canonicalUrl: input.canonicalUrl,
    elapsedMs: 0,
    propagationWindowMs: windowMs,
  });

  while (true) {
    attempts += 1;
    if (deploymentArtifactCorrect !== true) {
      deploymentArtifactCorrect = await input.inspectDeployment();
    }
    canonicalServesNewArtifact = await input.inspectCanonical();
    const elapsedMs = (input.now ?? Date.now)() - started;
    verification = evaluateDeploymentVerificationState({
      deployed: input.deployed,
      deployFailed: input.deployFailed,
      aliased: input.aliased,
      deploymentUrl: input.deploymentUrl,
      canonicalUrl: input.canonicalUrl,
      deploymentArtifactCorrect,
      canonicalServesNewArtifact,
      elapsedMs,
      propagationWindowMs: windowMs,
    });
    if (verification.result !== "PROPAGATING") {
      return {
        ...verification,
        attempts,
        elapsed_ms: elapsedMs,
        deployment_artifact_correct: deploymentArtifactCorrect,
        canonical_serves_new_artifact: canonicalServesNewArtifact,
      };
    }
    if (elapsedMs + pollMs >= windowMs) {
      const finalElapsed = Math.max(elapsedMs, windowMs);
      const finalVerification = evaluateDeploymentVerificationState({
        deployed: input.deployed,
        deployFailed: input.deployFailed,
        aliased: input.aliased,
        deploymentUrl: input.deploymentUrl,
        canonicalUrl: input.canonicalUrl,
        deploymentArtifactCorrect,
        canonicalServesNewArtifact,
        elapsedMs: finalElapsed,
        propagationWindowMs: windowMs,
      });
      return {
        ...finalVerification,
        attempts,
        elapsed_ms: finalElapsed,
        deployment_artifact_correct: deploymentArtifactCorrect,
        canonical_serves_new_artifact: canonicalServesNewArtifact,
      };
    }
    await sleep(pollMs);
  }
}
