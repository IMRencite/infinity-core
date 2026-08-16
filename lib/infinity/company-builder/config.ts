import {
  COMPANY_BUILDER_LIMITS,
  COMPANY_BUILDER_VERSION,
  DEFAULT_READINESS_THRESHOLDS,
  VENTURE_BLUEPRINT_VERSION,
} from "./constants";

export type CompanyBuilderConfig = ReturnType<typeof loadCompanyBuilderConfig>;

export function loadCompanyBuilderConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    enabled: env.COMPANY_BUILDER_ENABLED !== "false",
    engineVersion: COMPANY_BUILDER_VERSION,
    blueprintVersion: VENTURE_BLUEPRINT_VERSION,
    maxHandoffsPerRun: Number(env.COMPANY_BUILDER_MAX_HANDOFFS ?? COMPANY_BUILDER_LIMITS.maxHandoffsPerRun),
    maxEstimatedCostUsd: Number(
      env.COMPANY_BUILDER_MAX_ESTIMATED_COST_USD ?? COMPANY_BUILDER_LIMITS.maxEstimatedCostUsd,
    ),
    runAiEnrichment: env.COMPANY_BUILDER_RUN_AI_ENRICHMENT === "true",
    allowSimulationMode: env.COMPANY_BUILDER_ALLOW_SIMULATION !== "false",
    readinessThresholds: {
      ...DEFAULT_READINESS_THRESHOLDS,
      maxEstimatedBuildCostUsd: Number(
        env.COMPANY_BUILDER_MAX_BUILD_COST_USD ?? DEFAULT_READINESS_THRESHOLDS.maxEstimatedBuildCostUsd,
      ),
    },
  };
}

export function assertCompanyBuilderExecutable(config: CompanyBuilderConfig): void {
  if (!config.enabled) {
    throw new Error("Company Builder is disabled (COMPANY_BUILDER_ENABLED=false).");
  }
}
