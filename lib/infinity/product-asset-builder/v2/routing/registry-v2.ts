import { isLiveProviderAvailable } from "@/lib/infinity/multi-brain/coding/live-coding-client";

export type ModelV2Entry = {
  provider: string;
  model: string;
  displayName: string;
  availability: "available" | "unavailable" | "degraded";
  enabled: boolean;
  contextWindow: number;
  structuredOutput: boolean;
  toolUse: boolean;
  codingCapability: number;
  reasoningCapability: number;
  architectureCapability: number;
  debuggingCapability: number;
  reviewCapability: number;
  researchCapability: number;
  groundedSearchCapability: number;
  multimodalCapability: number;
  latencyClass: "fast" | "standard" | "slow";
  inputCost: number;
  outputCost: number;
  historicalTaskSuccess: number;
  historicalValidationSuccess: number;
  averageRepairRate: number;
  averageLatency: number;
};

const BASE: Omit<ModelV2Entry, "availability" | "enabled">[] = [
  {
    provider: "openai",
    model: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    contextWindow: 128_000,
    structuredOutput: true,
    toolUse: true,
    codingCapability: 0.88,
    reasoningCapability: 0.85,
    architectureCapability: 0.82,
    debuggingCapability: 0.86,
    reviewCapability: 0.8,
    researchCapability: 0.4,
    groundedSearchCapability: 0,
    multimodalCapability: 0.5,
    latencyClass: "fast",
    inputCost: 0.002,
    outputCost: 0.008,
    historicalTaskSuccess: 0.9,
    historicalValidationSuccess: 0.88,
    averageRepairRate: 0.12,
    averageLatency: 1200,
  },
  {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4",
    contextWindow: 200_000,
    structuredOutput: true,
    toolUse: true,
    codingCapability: 0.92,
    reasoningCapability: 0.93,
    architectureCapability: 0.94,
    debuggingCapability: 0.9,
    reviewCapability: 0.92,
    researchCapability: 0.55,
    groundedSearchCapability: 0,
    multimodalCapability: 0.6,
    latencyClass: "standard",
    inputCost: 0.003,
    outputCost: 0.015,
    historicalTaskSuccess: 0.92,
    historicalValidationSuccess: 0.9,
    averageRepairRate: 0.1,
    averageLatency: 1800,
  },
  {
    provider: "gemini",
    model: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    contextWindow: 1_000_000,
    structuredOutput: true,
    toolUse: true,
    codingCapability: 0.84,
    reasoningCapability: 0.82,
    architectureCapability: 0.8,
    debuggingCapability: 0.82,
    reviewCapability: 0.78,
    researchCapability: 0.7,
    groundedSearchCapability: 0.85,
    multimodalCapability: 0.75,
    latencyClass: "fast",
    inputCost: 0.001,
    outputCost: 0.004,
    historicalTaskSuccess: 0.87,
    historicalValidationSuccess: 0.85,
    averageRepairRate: 0.14,
    averageLatency: 900,
  },
  {
    provider: "xai",
    model: "grok-3-mini",
    displayName: "Grok 3 Mini",
    contextWindow: 128_000,
    structuredOutput: true,
    toolUse: false,
    codingCapability: 0.8,
    reasoningCapability: 0.82,
    architectureCapability: 0.78,
    debuggingCapability: 0.79,
    reviewCapability: 0.81,
    researchCapability: 0.45,
    groundedSearchCapability: 0,
    multimodalCapability: 0.4,
    latencyClass: "fast",
    inputCost: 0.002,
    outputCost: 0.006,
    historicalTaskSuccess: 0.84,
    historicalValidationSuccess: 0.82,
    averageRepairRate: 0.15,
    averageLatency: 1100,
  },
  {
    provider: "mock",
    model: "mock-coding-v1",
    displayName: "Mock Coding",
    contextWindow: 128_000,
    structuredOutput: true,
    toolUse: false,
    codingCapability: 0.7,
    reasoningCapability: 0.65,
    architectureCapability: 0.6,
    debuggingCapability: 0.65,
    reviewCapability: 0.6,
    researchCapability: 0.2,
    groundedSearchCapability: 0,
    multimodalCapability: 0,
    latencyClass: "fast",
    inputCost: 0.001,
    outputCost: 0.002,
    historicalTaskSuccess: 0.95,
    historicalValidationSuccess: 0.95,
    averageRepairRate: 0.05,
    averageLatency: 50,
  },
];

export function getRegistryV2Models(liveMode?: boolean): ModelV2Entry[] {
  return BASE.map((m) => ({
    ...m,
    enabled:
      m.provider === "mock"
        ? !liveMode
        : isLiveProviderAvailable(m.provider),
    availability: (
      m.provider === "mock"
        ? liveMode
          ? "unavailable"
          : "available"
        : isLiveProviderAvailable(m.provider)
          ? "available"
          : "unavailable"
    ) as ModelV2Entry["availability"],
  })).filter((m) => m.enabled && m.availability === "available");
}

/** Models filtered to requested providers; always allows mock when listed. */
export function getRegistryV2ModelsForProviders(providers: string[], liveMode?: boolean): ModelV2Entry[] {
  const all = getRegistryV2Models(liveMode);
  const requested = new Set(providers);
  if (requested.has("mock") && !all.some((m) => m.provider === "mock")) {
    const mock = BASE.find((m) => m.provider === "mock")!;
    return [...all, { ...mock, enabled: true, availability: "available" as const }].filter((m) => requested.has(m.provider));
  }
  return all.filter((m) => requested.has(m.provider));
}

/** Routing-only lookup: returns capability metadata for named providers without live-availability filtering. */
export function getRegistryV2ModelsForRouting(providers: string[]): ModelV2Entry[] {
  const requested = new Set(providers);
  return BASE.filter((m) => requested.has(m.provider)).map((m) => ({
    ...m,
    enabled: true,
    availability: "available" as const,
  }));
}

export function scoreModelV2(model: ModelV2Entry, weights: Partial<Record<keyof ModelV2Entry, number>>): number {
  let score = 0;
  let wSum = 0;
  const map: Record<string, keyof ModelV2Entry> = {
    codingCapability: "codingCapability",
    reviewCapability: "reviewCapability",
    architectureCapability: "architectureCapability",
    reasoningCapability: "reasoningCapability",
    structuredOutput: "structuredOutput",
    debuggingCapability: "debuggingCapability",
  };
  for (const [k, w] of Object.entries(weights)) {
    const key = map[k] ?? (k as keyof ModelV2Entry);
    const val = model[key];
    if (typeof val === "number" && typeof w === "number") {
      score += val * w;
      wSum += w;
    }
  }
  if (wSum === 0) return 0;
  return score / wSum + model.historicalTaskSuccess * 0.05 - (model.inputCost + model.outputCost) * 0.01;
}
