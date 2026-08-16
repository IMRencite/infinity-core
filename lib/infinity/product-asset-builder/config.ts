import { DEFAULT_PAB_LIMITS, PRODUCT_ASSET_BUILDER_VERSION } from "./constants";

export function isProductAssetBuilderEnabled(): boolean {
  return process.env.PRODUCT_ASSET_BUILDER_ENABLED === "true";
}

export function getPabLimits() {
  return {
    maxRepairAttemptsPerTask: Number(process.env.PAB_MAX_REPAIR_ATTEMPTS ?? DEFAULT_PAB_LIMITS.maxRepairAttemptsPerTask),
    maxRepairCostUsd: Number(process.env.PAB_MAX_REPAIR_COST_USD ?? DEFAULT_PAB_LIMITS.maxRepairCostUsd),
    maxBuildCostUsd: Number(process.env.PAB_MAX_BUILD_COST_USD ?? DEFAULT_PAB_LIMITS.maxBuildCostUsd),
    maxTokenUsage: Number(process.env.PAB_MAX_TOKEN_USAGE ?? DEFAULT_PAB_LIMITS.maxTokenUsage),
    maxElapsedMs: Number(process.env.PAB_MAX_ELAPSED_MS ?? DEFAULT_PAB_LIMITS.maxElapsedMs),
  };
}

export function getEngineVersion(): string {
  return PRODUCT_ASSET_BUILDER_VERSION;
}
