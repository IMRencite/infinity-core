import { CREATIVE_MEDIA_ENGINE_VERSION, DEFAULT_MEDIA_BUDGET } from "./constants";

export type CreativeMediaEngineConfig = {
  enabled: boolean;
  simulationOnly: boolean;
  engineVersion: string;
  maxAssetsPerRun: number;
  maxCostPerRunUsd: number;
  maxRepairAttempts: number;
  enableLiveProviders: boolean;
  enableGroundedResearch: boolean;
};

export function loadCreativeMediaEngineConfig(): CreativeMediaEngineConfig {
  return {
    enabled: process.env.CREATIVE_MEDIA_ENGINE_ENABLED !== "false",
    simulationOnly: process.env.CREATIVE_MEDIA_ENGINE_SIMULATION_ONLY === "true",
    engineVersion: CREATIVE_MEDIA_ENGINE_VERSION,
    maxAssetsPerRun: Number(process.env.CREATIVE_MEDIA_ENGINE_MAX_ASSETS ?? 5),
    maxCostPerRunUsd: Number(process.env.CREATIVE_MEDIA_ENGINE_MAX_COST_USD ?? DEFAULT_MEDIA_BUDGET.maxCostPerRunUsd),
    maxRepairAttempts: Number(process.env.CREATIVE_MEDIA_ENGINE_MAX_REPAIR ?? DEFAULT_MEDIA_BUDGET.maxRepairAttempts),
    enableLiveProviders:
      process.env.CREATIVE_MEDIA_ENGINE_LIVE === "true" ||
      process.env.RUN_CREATIVE_MEDIA_V1_TEST === "true",
    enableGroundedResearch: process.env.CREATIVE_MEDIA_ENGINE_GROUNDED_RESEARCH === "true",
  };
}

export function assertCreativeMediaEngineExecutable(config: CreativeMediaEngineConfig): void {
  if (!config.enabled) {
    throw new Error("Creative Media Engine is disabled (CREATIVE_MEDIA_ENGINE_ENABLED=false)");
  }
}
