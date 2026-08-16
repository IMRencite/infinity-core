import type { RegisteredModel } from "./types";

const BASE_MODELS: RegisteredModel[] = [
  {
    provider: "mock",
    modelId: "mock-economical-v1",
    displayName: "Mock Economical",
    capabilities: {
      reasoning: 0.6,
      coding: 0.65,
      architecture: 0.55,
      researchGrounding: 0.3,
      longContext: 0.5,
      creativeGeneration: 0.5,
      structuredOutput: 0.7,
      reviewCriticism: 0.4,
      debugging: 0.55,
    },
    estimatedInputCostPer1k: 0.001,
    estimatedOutputCostPer1k: 0.002,
    contextLimit: 128_000,
    latencyTier: "fast",
    availability: "available",
    historicalSuccessRate: 0.85,
  },
  {
    provider: "mock",
    modelId: "mock-coding-v1",
    displayName: "Mock Coding Specialist",
    capabilities: {
      reasoning: 0.7,
      coding: 0.92,
      architecture: 0.75,
      researchGrounding: 0.35,
      longContext: 0.6,
      creativeGeneration: 0.45,
      structuredOutput: 0.85,
      reviewCriticism: 0.6,
      debugging: 0.9,
    },
    estimatedInputCostPer1k: 0.003,
    estimatedOutputCostPer1k: 0.006,
    contextLimit: 200_000,
    latencyTier: "standard",
    availability: "available",
    historicalSuccessRate: 0.9,
  },
  {
    provider: "mock",
    modelId: "mock-architect-v1",
    displayName: "Mock Architecture Specialist",
    capabilities: {
      reasoning: 0.9,
      coding: 0.7,
      architecture: 0.95,
      researchGrounding: 0.5,
      longContext: 0.85,
      creativeGeneration: 0.55,
      structuredOutput: 0.88,
      reviewCriticism: 0.75,
      debugging: 0.65,
    },
    estimatedInputCostPer1k: 0.005,
    estimatedOutputCostPer1k: 0.01,
    contextLimit: 256_000,
    latencyTier: "standard",
    availability: "available",
    historicalSuccessRate: 0.88,
  },
  {
    provider: "mock",
    modelId: "mock-critic-v1",
    displayName: "Mock Critic",
    capabilities: {
      reasoning: 0.85,
      coding: 0.6,
      architecture: 0.8,
      researchGrounding: 0.4,
      longContext: 0.7,
      creativeGeneration: 0.3,
      structuredOutput: 0.8,
      reviewCriticism: 0.95,
      debugging: 0.7,
    },
    estimatedInputCostPer1k: 0.004,
    estimatedOutputCostPer1k: 0.008,
    contextLimit: 200_000,
    latencyTier: "standard",
    availability: "available",
    historicalSuccessRate: 0.87,
  },
  {
    provider: "openai",
    modelId: "gpt-4.1-mini",
    displayName: "OpenAI GPT-4.1 Mini",
    capabilities: {
      reasoning: 0.82,
      coding: 0.85,
      architecture: 0.8,
      researchGrounding: 0.35,
      longContext: 0.75,
      creativeGeneration: 0.7,
      structuredOutput: 0.9,
      reviewCriticism: 0.75,
      debugging: 0.82,
    },
    estimatedInputCostPer1k: 0.015,
    estimatedOutputCostPer1k: 0.06,
    contextLimit: 128_000,
    latencyTier: "fast",
    availability: process.env.OPENAI_API_KEY ? "available" : "unavailable",
    historicalSuccessRate: 0.91,
  },
  {
    provider: "gemini",
    modelId: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    capabilities: {
      reasoning: 0.8,
      coding: 0.78,
      architecture: 0.75,
      researchGrounding: 0.92,
      longContext: 0.9,
      creativeGeneration: 0.72,
      structuredOutput: 0.85,
      reviewCriticism: 0.7,
      debugging: 0.75,
    },
    estimatedInputCostPer1k: 0.008,
    estimatedOutputCostPer1k: 0.024,
    contextLimit: 1_000_000,
    latencyTier: "fast",
    availability: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? "available" : "unavailable",
    historicalSuccessRate: 0.89,
  },
  {
    provider: "anthropic",
    modelId: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4",
    capabilities: {
      reasoning: 0.92,
      coding: 0.9,
      architecture: 0.92,
      researchGrounding: 0.55,
      longContext: 0.95,
      creativeGeneration: 0.8,
      structuredOutput: 0.92,
      reviewCriticism: 0.88,
      debugging: 0.88,
    },
    estimatedInputCostPer1k: 0.03,
    estimatedOutputCostPer1k: 0.15,
    contextLimit: 200_000,
    latencyTier: "standard",
    availability: process.env.ANTHROPIC_API_KEY ? "available" : "unavailable",
    historicalSuccessRate: 0.93,
  },
];

let registryCache: RegisteredModel[] | null = null;

export function getModelRegistry(): RegisteredModel[] {
  if (!registryCache) {
    registryCache = BASE_MODELS.map((m) => ({ ...m }));
  }
  return registryCache;
}

export function getAvailableModels(): RegisteredModel[] {
  return getModelRegistry().filter((m) => m.availability === "available");
}

export function findModel(provider: string, modelId: string): RegisteredModel | undefined {
  return getModelRegistry().find((m) => m.provider === provider && m.modelId === modelId);
}

export function scoreModelForTask(
  model: RegisteredModel,
  weights: Partial<Record<keyof RegisteredModel["capabilities"], number>>,
): number {
  let score = 0;
  let weightSum = 0;
  for (const [cap, weight] of Object.entries(weights)) {
    const key = cap as keyof RegisteredModel["capabilities"];
    score += (model.capabilities[key] ?? 0) * (weight ?? 0);
    weightSum += weight ?? 0;
  }
  if (weightSum === 0) return 0;
  const capabilityScore = score / weightSum;
  const costPenalty = (model.estimatedOutputCostPer1k + model.estimatedInputCostPer1k) * 0.01;
  const successBonus = (model.historicalSuccessRate ?? 0.8) * 0.1;
  return capabilityScore + successBonus - costPenalty;
}

export function selectBestModel(
  weights: Partial<Record<keyof RegisteredModel["capabilities"], number>>,
  preferProvider?: string,
): RegisteredModel {
  const available = getAvailableModels();
  const candidates = preferProvider
    ? available.filter((m) => m.provider === preferProvider || m.provider === "mock")
    : available;
  if (candidates.length === 0) {
    return getModelRegistry().find((m) => m.provider === "mock")!;
  }
  return candidates.reduce((best, current) =>
    scoreModelForTask(current, weights) > scoreModelForTask(best, weights) ? current : best,
  );
}

export function resetModelRegistryForTests(): void {
  registryCache = null;
}
