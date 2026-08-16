import type { ExecutionClass } from "../constants";
import type { TaskCharacteristics } from "@/lib/infinity/multi-brain/types";
import { getRegistryV2Models, getRegistryV2ModelsForProviders, getRegistryV2ModelsForRouting, scoreModelV2 } from "./registry-v2";

export type V2RoutingDecision = {
  executionClass: ExecutionClass;
  primary: { provider: string; modelId: string };
  implementer: { provider: string; modelId: string } | null;
  reviewer: { provider: string; modelId: string } | null;
  architect: { provider: string; modelId: string } | null;
  synthesizer: { provider: string; modelId: string } | null;
  independenceRequired: boolean;
  rationale: string[];
  estimatedCostUsd: number;
};

export function routeTaskV2(input: {
  taskType: string;
  characteristics: TaskCharacteristics;
  availableProviders: string[];
  priorFailures?: number;
  codeSurface?: "small" | "medium" | "large";
}): V2RoutingDecision {
  let models = getRegistryV2ModelsForProviders(input.availableProviders);
  if (models.length === 0) models = getRegistryV2ModelsForRouting(input.availableProviders);
  const rationale: string[] = [];
  if (models.length === 0) throw new Error("No available models for routing");

  const value =
    input.characteristics.economicImportance * 0.3 +
    input.characteristics.implementationRisk * 0.25 +
    input.characteristics.uncertainty * 0.2 +
    (input.priorFailures ?? 0) * 0.1;

  let executionClass: ExecutionClass = "FAST";
  if (input.characteristics.complexity === "critical" || value >= 0.75) executionClass = "CRITICAL";
  else if (value >= 0.55 || input.characteristics.complexity === "high") executionClass = input.characteristics.economicImportance >= 0.7 ? "HIGH_VALUE" : "COMPLEX";
  else if (value >= 0.35 || input.characteristics.complexity === "medium") executionClass = "STANDARD";

  const pick = (weights: Record<string, number>, exclude?: string) => {
    const candidates = models.filter((m) => m.provider !== exclude);
    if (candidates.length === 0) return models[0]!;
    return candidates.reduce((best, cur) => (scoreModelV2(cur, weights) > scoreModelV2(best, weights) ? cur : best));
  };

  const codingW = { codingCapability: 1, structuredOutput: 0.6, debuggingCapability: 0.4 };
  const reviewW = { reviewCapability: 1, reasoningCapability: 0.5 };
  const archW = { architectureCapability: 1, reasoningCapability: 0.7 };

  const primary = pick(codingW);
  rationale.push(`Primary: ${primary.provider}/${primary.model} (${executionClass})`);

  let implementer: V2RoutingDecision["implementer"] = null;
  let reviewer: V2RoutingDecision["reviewer"] = null;
  let architect: V2RoutingDecision["architect"] = null;
  let synthesizer: V2RoutingDecision["synthesizer"] = null;
  const independenceRequired = executionClass === "HIGH_VALUE" || executionClass === "CRITICAL" || input.characteristics.implementationRisk >= 0.6;

  if (executionClass === "FAST") {
    /* primary only */
  } else if (executionClass === "STANDARD") {
    reviewer = { provider: pick(reviewW, primary.provider).provider, modelId: pick(reviewW, primary.provider).model };
  } else if (executionClass === "COMPLEX") {
    implementer = { provider: pick(codingW, primary.provider).provider, modelId: pick(codingW, primary.provider).model };
    reviewer = { provider: pick(reviewW, primary.provider).provider, modelId: pick(reviewW, primary.provider).model };
  } else if (executionClass === "HIGH_VALUE") {
    architect = { provider: pick(archW).provider, modelId: pick(archW).model };
    implementer = { provider: pick(codingW, architect.provider).provider, modelId: pick(codingW, architect.provider).model };
    reviewer = { provider: pick(reviewW, implementer.provider).provider, modelId: pick(reviewW, implementer.provider).model };
    synthesizer = { provider: pick({ reasoningCapability: 1 }).provider, modelId: pick({ reasoningCapability: 1 }).model };
    rationale.push("Independence: architect/implementer/reviewer differ where possible");
  } else {
    architect = { provider: pick(archW).provider, modelId: pick(archW).model };
    implementer = { provider: pick(codingW, architect.provider).provider, modelId: pick(codingW, architect.provider).model };
    reviewer = { provider: pick(reviewW, implementer.provider).provider, modelId: pick(reviewW, implementer.provider).model };
    synthesizer = { provider: pick({ reasoningCapability: 1 }, reviewer.provider).provider, modelId: pick({ reasoningCapability: 1 }, reviewer.provider).model };
    rationale.push("CRITICAL: multi-provider adversarial review");
  }

  const multiplier = { FAST: 1, STANDARD: 1.4, COMPLEX: 2.2, HIGH_VALUE: 3.5, CRITICAL: 5 }[executionClass];
  const estimatedCostUsd = ((primary.inputCost + primary.outputCost) * 4) * multiplier;

  return {
    executionClass,
    primary: { provider: primary.provider, modelId: primary.model },
    implementer: implementer ? { provider: implementer.provider, modelId: implementer.modelId } : null,
    reviewer,
    architect,
    synthesizer,
    independenceRequired,
    rationale,
    estimatedCostUsd,
  };
}

export function selectFallbackProvider(available: string[], failedProvider: string): string | null {
  const order = ["openai", "anthropic", "gemini", "xai"];
  return order.find((p) => available.includes(p) && p !== failedProvider) ?? available.find((p) => p !== failedProvider) ?? null;
}
