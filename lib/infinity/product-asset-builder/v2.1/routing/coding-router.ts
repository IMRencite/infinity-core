import { classifyTask } from "@/lib/infinity/multi-brain";
import type { TaskCharacteristics } from "@/lib/infinity/multi-brain/types";
import { routeTaskV2, selectFallbackProvider } from "../../v2/routing/router-v2";
import { getRegistryV2ModelsForRouting } from "../../v2/routing/registry-v2";

export type CodingRoutingDecision = {
  executionClass: string;
  implementer: { provider: string; modelId: string };
  reviewer: { provider: string; modelId: string } | null;
  architect: { provider: string; modelId: string } | null;
  independenceEnforced: boolean;
  rationale: string[];
  estimatedCostUsd: number;
};

export function routeCodingTask(input: {
  taskType: string;
  complexity: TaskCharacteristics["complexity"];
  economicImportance?: number;
  implementationRisk?: number;
  availableProviders: string[];
  priorFailures?: number;
}): CodingRoutingDecision {
  const characteristics = classifyTask({
    taskType: input.taskType,
    complexity: input.complexity,
    economicImportance: input.economicImportance ?? 0.6,
    implementationRisk: input.implementationRisk ?? 0.5,
    architectureRequired: input.taskType.includes("ARCHITECT") || input.complexity === "high",
    codingRequired: true,
  });

  const routing = routeTaskV2({
    taskType: input.taskType,
    characteristics,
    availableProviders: input.availableProviders,
    priorFailures: input.priorFailures ?? 0,
  });

  const models = getRegistryV2ModelsForRouting(input.availableProviders);
  const pickCoding = (exclude: string[]) => {
    const candidates = models.filter((m) => !exclude.includes(m.provider));
    if (candidates.length === 0) return models[0]!;
    return candidates.reduce((best, cur) =>
      cur.codingCapability > best.codingCapability ? cur : best,
    );
  };
  const pickReview = (exclude: string[]) => {
    const candidates = models.filter((m) => !exclude.includes(m.provider));
    if (candidates.length === 0) return null;
    return candidates.reduce((best, cur) =>
      cur.reviewCapability > best.reviewCapability ? cur : best,
    );
  };

  let implementer = routing.implementer ?? routing.primary;
  let reviewer = routing.reviewer;
  let independenceEnforced = false;

  const needsIndependence =
    routing.independenceRequired ||
    routing.executionClass === "HIGH_VALUE" ||
    routing.executionClass === "CRITICAL" ||
    routing.executionClass === "COMPLEX";

  if (needsIndependence && input.availableProviders.length >= 2) {
    const implModel = pickCoding([]);
    implementer = { provider: implModel.provider, modelId: implModel.model };
    const reviewModel = pickReview([implementer.provider]);
    if (reviewModel) {
      reviewer = { provider: reviewModel.provider, modelId: reviewModel.model };
      independenceEnforced = reviewModel.provider !== implementer.provider;
    }
  }

  return {
    executionClass: routing.executionClass,
    implementer,
    reviewer,
    architect: routing.architect,
    independenceEnforced,
    rationale: [...routing.rationale, independenceEnforced ? "Reviewer provider differs from implementer" : "Single provider mode"],
    estimatedCostUsd: routing.estimatedCostUsd,
  };
}

export function selectCodingFallback(available: string[], failedProvider: string, implementerProvider?: string): string | null {
  const fallback = selectFallbackProvider(available, failedProvider);
  if (fallback && implementerProvider && fallback === implementerProvider && available.length > 2) {
    return selectFallbackProvider(available.filter((p) => p !== implementerProvider), failedProvider);
  }
  return fallback;
}
