import {
  DEFAULT_INTELLIGENCE_BUDGET,
  PERFORMANCE_INTELLIGENCE_ENGINE_VERSION,
} from "./constants";
import type { PerformanceIntelligenceEngineConfig } from "./types";

export function loadPerformanceIntelligenceConfig(): PerformanceIntelligenceEngineConfig {
  return {
    enabled: process.env.PERFORMANCE_INTELLIGENCE_ENGINE_ENABLED !== "false",
    simulationOnly: process.env.PERFORMANCE_INTELLIGENCE_ENGINE_SIMULATION_ONLY === "true",
    engineVersion: PERFORMANCE_INTELLIGENCE_ENGINE_VERSION,
    maxAiDiagnosisCostUsd: Number(
      process.env.PERFORMANCE_INTELLIGENCE_MAX_AI_COST_USD ?? DEFAULT_INTELLIGENCE_BUDGET.maxAiDiagnosisCostUsd,
    ),
    minOpportunityValueUsd: Number(
      process.env.PERFORMANCE_INTELLIGENCE_MIN_OPPORTUNITY_USD ??
        DEFAULT_INTELLIGENCE_BUDGET.minOpportunityValueUsd,
    ),
    enableMissionHandoff: process.env.PERFORMANCE_INTELLIGENCE_MISSION_HANDOFF !== "false",
    executeMissions: process.env.PERFORMANCE_INTELLIGENCE_EXECUTE_MISSIONS === "true",
  };
}

export function assertPerformanceIntelligenceExecutable(
  config: PerformanceIntelligenceEngineConfig,
): void {
  if (!config.enabled) {
    throw new Error("Performance Intelligence Engine is disabled");
  }
}
