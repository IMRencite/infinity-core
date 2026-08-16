import { DEFAULT_V2_BUDGET, PAB_V2_VERSION } from "./constants";

export function isPabV2Enabled(): boolean {
  return process.env.PRODUCT_ASSET_BUILDER_V2_ENABLED === "true";
}

export function isPabV2LiveMode(): boolean {
  return process.env.PAB_V2_LIVE_MODE === "true" || process.env.RUN_PRODUCT_ASSET_BUILDER_V2_TEST === "true";
}

export function getV2Budget() {
  return {
    maxAICostUsd: Number(process.env.PAB_V2_MAX_AI_COST_USD ?? DEFAULT_V2_BUDGET.maxAICostUsd),
    maxProviderCalls: Number(process.env.PAB_V2_MAX_PROVIDER_CALLS ?? DEFAULT_V2_BUDGET.maxProviderCalls),
    maxTokens: Number(process.env.PAB_V2_MAX_TOKENS ?? DEFAULT_V2_BUDGET.maxTokens),
    maxRepairAttempts: Number(process.env.PAB_V2_MAX_REPAIR_ATTEMPTS ?? DEFAULT_V2_BUDGET.maxRepairAttempts),
    maxElapsedMs: Number(process.env.PAB_V2_MAX_ELAPSED_MS ?? DEFAULT_V2_BUDGET.maxElapsedMs),
  };
}

export function getEngineVersion(): string {
  return PAB_V2_VERSION;
}

export function requireLiveExecutionForVerification(): boolean {
  return isPabV2LiveMode() && process.env.PAB_V2_ALLOW_MOCK_FALLBACK !== "true";
}
