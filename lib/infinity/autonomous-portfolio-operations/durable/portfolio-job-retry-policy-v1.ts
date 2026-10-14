import type { PortfolioJobTypeV1 } from "./autonomous-portfolio-job-queue-v1";

export type PortfolioJobRetryPolicy = {
  max_attempts: number;
  retry_delay_ms: number;
  retryable_errors: string[];
  terminal_errors: string[];
};

const DEFAULT: PortfolioJobRetryPolicy = {
  max_attempts: 3,
  retry_delay_ms: 60_000,
  retryable_errors: [
    "VERCEL_DEPLOYMENT_NOT_READY",
    "DEPLOY_IN_PROGRESS",
    "TRANSIENT_PROVIDER",
    "LEASE_CONFLICT",
  ],
  terminal_errors: [
    "NO_PUBLISH_ELIGIBLE_BACKLOG_CANDIDATE",
    "DEPLOY_AUTHORITY_OR_IDENTITY_BLOCKED",
    "VERCEL_TOKEN_MISSING_ON_RUNTIME",
    "UNSUPPORTED_PUBLISH_PATH",
    "DUPLICATE_PUBLICATION",
    "PRINT_PRODUCTION_QC_HOLD",
    "CREATIVE_BUDGET_EXHAUSTED",
    "LIVE_CREATIVE_NOT_AUTHORIZED",
    "BAD_CONTENT_TERMINAL",
  ],
};

const BY_TYPE: Partial<Record<PortfolioJobTypeV1, Partial<PortfolioJobRetryPolicy>>> = {
  VENTURE_DEPLOY: {
    max_attempts: 8,
    retry_delay_ms: 45_000,
    retryable_errors: [...DEFAULT.retryable_errors, "BUNDLE_BUILD_SLOW"],
  },
  PRODUCTION_VERIFY: { max_attempts: 5, retry_delay_ms: 30_000 },
  PRODUCT_CREATIVE: { max_attempts: 2, retry_delay_ms: 120_000 },
  CREATIVE_SELF_HEAL: { max_attempts: 3, retry_delay_ms: 90_000 },
  CONTENT_SELF_HEAL: { max_attempts: 3, retry_delay_ms: 45_000 },
};

export function resolvePortfolioJobRetryPolicy(jobType: PortfolioJobTypeV1): PortfolioJobRetryPolicy {
  const overlay = BY_TYPE[jobType] ?? {};
  return {
    max_attempts: overlay.max_attempts ?? DEFAULT.max_attempts,
    retry_delay_ms: overlay.retry_delay_ms ?? DEFAULT.retry_delay_ms,
    retryable_errors: overlay.retryable_errors ?? DEFAULT.retryable_errors,
    terminal_errors: overlay.terminal_errors ?? DEFAULT.terminal_errors,
  };
}

export function classifyPortfolioJobRetry(input: {
  job_type: PortfolioJobTypeV1;
  safe_error: string | null;
  attempt_count: number;
}): { disposition: "RETRY" | "TERMINAL" | "IN_PROGRESS"; eligible_at: string } {
  const policy = resolvePortfolioJobRetryPolicy(input.job_type);
  const err = input.safe_error ?? "";
  const now = Date.now();
  if (err === "DEPLOY_IN_PROGRESS" || err === "VERCEL_DEPLOYMENT_NOT_READY") {
    return {
      disposition: "IN_PROGRESS",
      eligible_at: new Date(now + policy.retry_delay_ms).toISOString(),
    };
  }
  if (policy.terminal_errors.some((t) => err.includes(t))) {
    return { disposition: "TERMINAL", eligible_at: new Date(now).toISOString() };
  }
  if (input.attempt_count >= policy.max_attempts) {
    return { disposition: "TERMINAL", eligible_at: new Date(now).toISOString() };
  }
  if (policy.retryable_errors.some((t) => err.includes(t)) || !err) {
    return {
      disposition: "RETRY",
      eligible_at: new Date(now + policy.retry_delay_ms).toISOString(),
    };
  }
  return { disposition: "TERMINAL", eligible_at: new Date(now).toISOString() };
}

export function portfolioJobRetryPolicyQc(): "PASS" | "FAIL" {
  const deploy = resolvePortfolioJobRetryPolicy("VENTURE_DEPLOY");
  const creative = resolvePortfolioJobRetryPolicy("CREATIVE_SELF_HEAL");
  return deploy.max_attempts >= 3 && creative.max_attempts >= 1 ? "PASS" : "FAIL";
}
