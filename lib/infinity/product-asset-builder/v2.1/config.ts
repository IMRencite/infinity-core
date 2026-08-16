import { DEFAULT_V21_BUDGET } from "./constants";

export function isPabV21Enabled(): boolean {
  return process.env.PRODUCT_ASSET_BUILDER_V21_ENABLED !== "false";
}

export function isPabV21LiveMode(): boolean {
  return process.env.PAB_V21_LIVE_MODE === "true" || process.env.RUN_PRODUCT_ASSET_BUILDER_V21_TEST === "true";
}

export function getV21Budget() {
  return {
    maxAICostUsd: Number(process.env.PAB_V21_MAX_AI_COST_USD ?? DEFAULT_V21_BUDGET.maxAICostUsd),
    maxProviderCalls: Number(process.env.PAB_V21_MAX_PROVIDER_CALLS ?? DEFAULT_V21_BUDGET.maxProviderCalls),
    maxTokens: Number(process.env.PAB_V21_MAX_TOKENS ?? DEFAULT_V21_BUDGET.maxTokens),
    maxRepairAttempts: Number(process.env.PAB_V21_MAX_REPAIR_ATTEMPTS ?? DEFAULT_V21_BUDGET.maxRepairAttempts),
    maxElapsedMs: Number(process.env.PAB_V21_MAX_ELAPSED_MS ?? DEFAULT_V21_BUDGET.maxElapsedMs),
  };
}

export function requireLiveCodingVerification(): boolean {
  return process.env.RUN_PRODUCT_ASSET_BUILDER_V21_TEST === "true";
}
