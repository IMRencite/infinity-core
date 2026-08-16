import { ORGANIC_GROWTH_ENGINE_VERSION } from "./constants";

export type OrganicGrowthEngineConfig = {
  enabled: boolean;
  engineVersion: string;
  simulationOnly: boolean;
  maxVenturesPerRun: number;
  enableGroundedResearch: boolean;
  maxResearchCallsPerRun: number;
};

export function loadOrganicGrowthEngineConfig(): OrganicGrowthEngineConfig {
  return {
    enabled: process.env.ORGANIC_GROWTH_ENGINE_ENABLED !== "false",
    engineVersion: ORGANIC_GROWTH_ENGINE_VERSION,
    simulationOnly: process.env.ORGANIC_GROWTH_ENGINE_SIMULATION_ONLY === "true",
    maxVenturesPerRun: Number(process.env.ORGANIC_GROWTH_ENGINE_MAX_VENTURES ?? "10"),
    enableGroundedResearch:
      process.env.ORGANIC_GROWTH_ENGINE_GROUNDED_RESEARCH !== "false" &&
      process.env.RESEARCH_ENABLED !== "false",
    maxResearchCallsPerRun: Number(
      process.env.ORGANIC_GROWTH_ENGINE_MAX_RESEARCH_CALLS ?? "3",
    ),
  };
}

export function assertOrganicGrowthEngineExecutable(config: OrganicGrowthEngineConfig): void {
  if (!config.enabled) {
    throw new Error("Organic Growth Architecture Engine is disabled.");
  }
}
