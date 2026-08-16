import {
  DEFAULT_V1_TEST_STRATEGIES,
  OPPORTUNITY_SCANNER_LIMITS,
  OPPORTUNITY_SCANNER_SCORING_VERSION,
  OPPORTUNITY_SCANNER_VERSION,
} from "./constants";

export type OpportunityScannerConfig = {
  enabled: boolean;
  isProduction: boolean;
  scannerVersion: string;
  scoringVersion: string;
  maxStrategiesPerRun: number;
  maxResearchCallsPerRun: number;
  maxCandidatesPerRun: number;
  maxEstimatedCostUsd: number;
  defaultStrategies: typeof DEFAULT_V1_TEST_STRATEGIES;
};

export function loadOpportunityScannerConfig(
  env: NodeJS.ProcessEnv = process.env,
): OpportunityScannerConfig {
  const isProduction = env.NODE_ENV === "production";

  return {
    enabled: env.OPPORTUNITY_SCANNER_ENABLED !== "false",
    isProduction,
    scannerVersion: OPPORTUNITY_SCANNER_VERSION,
    scoringVersion: OPPORTUNITY_SCANNER_SCORING_VERSION,
    maxStrategiesPerRun: Number(
      env.OPPORTUNITY_SCANNER_MAX_STRATEGIES ?? OPPORTUNITY_SCANNER_LIMITS.maxStrategiesPerRun,
    ),
    maxResearchCallsPerRun: Number(
      env.OPPORTUNITY_SCANNER_MAX_RESEARCH_CALLS ?? OPPORTUNITY_SCANNER_LIMITS.maxResearchCallsPerRun,
    ),
    maxCandidatesPerRun: Number(
      env.OPPORTUNITY_SCANNER_MAX_CANDIDATES ?? OPPORTUNITY_SCANNER_LIMITS.maxCandidatesPerRun,
    ),
    maxEstimatedCostUsd: Number(env.OPPORTUNITY_SCANNER_MAX_ESTIMATED_COST_USD ?? 8),
    defaultStrategies: DEFAULT_V1_TEST_STRATEGIES,
  };
}

export function assertOpportunityScannerExecutable(config: OpportunityScannerConfig): void {
  if (!config.enabled) {
    throw new Error("Opportunity Scanner is disabled (OPPORTUNITY_SCANNER_ENABLED=false).");
  }
}
