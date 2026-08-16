import type { ProviderDeploymentState } from "@/lib/infinity/production-artifact/constants";

export type DeploymentPollConfig = {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
};

export const DEFAULT_DEPLOYMENT_POLL: DeploymentPollConfig = {
  maxAttempts: 36,
  initialDelayMs: 5000,
  maxDelayMs: 20000,
};

export function normalizeVercelReadyState(readyState?: string): ProviderDeploymentState {
  if (!readyState) return "submitted";
  if (readyState === "READY") return "ready";
  if (readyState === "ERROR" || readyState === "CANCELED") return "failed";
  if (readyState === "BUILDING" || readyState === "INITIALIZING" || readyState === "QUEUED") {
    return "building";
  }
  return "submitted";
}

export async function pollWithBackoff<T>(
  fn: () => Promise<{ done: boolean; value?: T; state?: ProviderDeploymentState }>,
  config: DeploymentPollConfig = DEFAULT_DEPLOYMENT_POLL,
): Promise<{ value: T | null; state: ProviderDeploymentState; attempts: number }> {
  let delay = config.initialDelayMs;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    const result = await fn();
    if (result.done && result.value !== undefined) {
      return { value: result.value, state: result.state ?? "ready", attempts: attempt };
    }
    if (result.state === "failed" || result.state === "cancelled") {
      return { value: result.value ?? null, state: result.state, attempts: attempt };
    }
    if (attempt < config.maxAttempts) {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, config.maxDelayMs);
    }
  }
  return { value: null, state: "timed_out", attempts: config.maxAttempts };
}

export type HttpVerificationResult = {
  verified: boolean;
  statusCode: number | null;
  url: string;
  secretExposureDetected: boolean;
  artifactHashCorrelated: boolean;
  verifiedAt: string;
};

export async function verifyLiveHttp(input: {
  url: string;
  expectedArtifactHash?: string;
}): Promise<HttpVerificationResult> {
  const verifiedAt = new Date().toISOString();
  let normalized = input.url.trim();
  if (!normalized.startsWith("http")) {
    normalized = `https://${normalized}`;
  }

  try {
    const res = await fetch(normalized, { redirect: "follow" });
    const body = await res.text();
    const secretExposureDetected = /ghp_[a-zA-Z0-9]{20,}|GITHUB_TOKEN|VERCEL_TOKEN/i.test(body);
    const artifactHashCorrelated = input.expectedArtifactHash
      ? body.includes(input.expectedArtifactHash.slice(0, 12))
      : body.length > 0;
    return {
      verified: res.ok && !secretExposureDetected,
      statusCode: res.status,
      url: normalized,
      secretExposureDetected,
      artifactHashCorrelated,
      verifiedAt,
    };
  } catch {
    return {
      verified: false,
      statusCode: null,
      url: normalized,
      secretExposureDetected: false,
      artifactHashCorrelated: false,
      verifiedAt,
    };
  }
}
