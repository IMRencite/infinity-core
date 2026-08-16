import {
  MONETIZATION_ENGINE_VERSION,
  MONETIZATION_LIMITS,
  MONETIZATION_SCORING_VERSION,
} from "./constants";

export type MonetizationEngineConfig = {
  enabled: boolean;
  isProduction: boolean;
  engineVersion: string;
  scoringVersion: string;
  maxCandidatesPerRun: number;
  maxResearchCallsPerRun: number;
  maxEstimatedCostUsd: number;
};

export function loadMonetizationEngineConfig(
  env: NodeJS.ProcessEnv = process.env,
): MonetizationEngineConfig {
  const isProduction = env.NODE_ENV === "production";

  return {
    enabled: env.MONETIZATION_ENGINE_ENABLED !== "false",
    isProduction,
    engineVersion: MONETIZATION_ENGINE_VERSION,
    scoringVersion: MONETIZATION_SCORING_VERSION,
    maxCandidatesPerRun: Number(
      env.MONETIZATION_ENGINE_MAX_CANDIDATES ?? MONETIZATION_LIMITS.maxCandidatesPerRun,
    ),
    maxResearchCallsPerRun: Number(
      env.MONETIZATION_ENGINE_MAX_RESEARCH_CALLS ?? MONETIZATION_LIMITS.maxResearchCallsPerRun,
    ),
    maxEstimatedCostUsd: Number(env.MONETIZATION_ENGINE_MAX_ESTIMATED_COST_USD ?? 12),
  };
}

export function assertMonetizationEngineExecutable(config: MonetizationEngineConfig): void {
  if (!config.enabled) {
    throw new Error("Monetization Engine is disabled (MONETIZATION_ENGINE_ENABLED=false).");
  }
}
