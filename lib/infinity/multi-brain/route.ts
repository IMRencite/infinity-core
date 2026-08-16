import type { ExecutionStrategy } from "./constants";
import { computeTaskValueScore, classifyTask } from "./classify";
import { selectBestModel } from "./registry";
import type { RoutingDecision, TaskCharacteristics } from "./types";

export function routeTask(input: Parameters<typeof classifyTask>[0]): RoutingDecision {
  const characteristics = classifyTask(input);
  return routeFromCharacteristics(characteristics);
}

export function routeFromCharacteristics(characteristics: TaskCharacteristics): RoutingDecision {
  const valueScore = computeTaskValueScore(characteristics);
  const strategy = selectStrategy(characteristics, valueScore);
  const rationale: string[] = [];

  const codingWeights = {
    coding: characteristics.codingRequired ? 1 : 0.3,
    architecture: characteristics.architectureRequired ? 0.9 : 0.4,
    reasoning: 0.6,
    structuredOutput: 0.7,
    debugging: characteristics.codingRequired ? 0.5 : 0.2,
  };

  const researchWeights = {
    researchGrounding: 1,
    reasoning: 0.7,
    structuredOutput: 0.6,
  };

  const criticWeights = {
    reviewCriticism: 1,
    reasoning: 0.7,
    architecture: 0.5,
  };

  const primaryModel = selectBestModel(codingWeights);
  rationale.push(`Primary selected: ${primaryModel.provider}/${primaryModel.modelId}`);

  let specialistModels = [] as ReturnType<typeof selectBestModel>[];
  let criticModel: ReturnType<typeof selectBestModel> | null = null;
  let reviewerModel: ReturnType<typeof selectBestModel> | null = null;
  let synthesizerModel: ReturnType<typeof selectBestModel> | null = null;
  const roles: RoutingDecision["roles"] = ["primary"];

  if (strategy === "SIMPLE") {
    rationale.push("SIMPLE: single economical capable model");
  } else if (strategy === "STANDARD") {
    roles.push("reviewer");
    reviewerModel = selectBestModel({ reviewCriticism: 0.8, structuredOutput: 0.7 });
    rationale.push("STANDARD: primary + deterministic verification reviewer");
  } else if (strategy === "COMPLEX") {
    roles.push("specialist", "critic", "synthesizer");
    specialistModels = [
      selectBestModel(characteristics.architectureRequired ? { architecture: 1, coding: 0.7 } : codingWeights),
    ];
    criticModel = selectBestModel(criticWeights);
    synthesizerModel = selectBestModel({ reasoning: 0.9, structuredOutput: 0.85 });
    rationale.push("COMPLEX: primary + specialist + critic + synthesizer");
  } else if (strategy === "HIGH_VALUE") {
    roles.push("specialist", "critic", "reviewer", "synthesizer");
    specialistModels = [
      selectBestModel({ architecture: 0.9, coding: 0.7 }),
      characteristics.researchRequired
        ? selectBestModel(researchWeights)
        : selectBestModel({ coding: 0.85, debugging: 0.7 }),
    ];
    criticModel = selectBestModel(criticWeights);
    reviewerModel = selectBestModel({ reviewCriticism: 0.75, structuredOutput: 0.8 });
    synthesizerModel = selectBestModel({ reasoning: 0.95, structuredOutput: 0.9 });
    rationale.push("HIGH_VALUE: multiple specialists + critic + reviewer + synthesizer");
  } else {
    roles.push("specialist", "critic", "reviewer", "synthesizer");
    specialistModels = [
      selectBestModel({ architecture: 1, reasoning: 0.8 }),
      selectBestModel(codingWeights),
      characteristics.researchRequired ? selectBestModel(researchWeights) : selectBestModel(criticWeights),
    ];
    criticModel = selectBestModel(criticWeights);
    reviewerModel = selectBestModel({ reviewCriticism: 0.85, debugging: 0.7 });
    synthesizerModel = selectBestModel({ reasoning: 1, structuredOutput: 0.95 });
    rationale.push("CRITICAL: multi-model analysis + adversarial review + synthesis");
  }

  const estimatedCostUsd = estimateRoutingCost(strategy, primaryModel, specialistModels.length);

  return {
    strategy,
    roles,
    primaryModel,
    specialistModels,
    criticModel,
    reviewerModel,
    synthesizerModel,
    rationale,
    estimatedCostUsd,
  };
}

function selectStrategy(chars: TaskCharacteristics, valueScore: number): ExecutionStrategy {
  if (chars.complexity === "low" && valueScore < 0.35 && !chars.architectureRequired) {
    return "SIMPLE";
  }
  if (chars.complexity === "critical" || (valueScore >= 0.75 && chars.implementationRisk >= 0.7)) {
    return "CRITICAL";
  }
  if (valueScore >= 0.6 || chars.complexity === "high") {
    if (chars.economicImportance >= 0.7) return "HIGH_VALUE";
    return "COMPLEX";
  }
  if (chars.complexity === "medium" || valueScore >= 0.4) {
    return "STANDARD";
  }
  return "SIMPLE";
}

function estimateRoutingCost(
  strategy: ExecutionStrategy,
  primary: { estimatedInputCostPer1k: number; estimatedOutputCostPer1k: number },
  specialistCount: number,
): number {
  const base = (primary.estimatedInputCostPer1k + primary.estimatedOutputCostPer1k) * 4;
  const multipliers: Record<ExecutionStrategy, number> = {
    SIMPLE: 1,
    STANDARD: 1.4,
    COMPLEX: 2.5,
    HIGH_VALUE: 3.5,
    CRITICAL: 5,
  };
  return base * multipliers[strategy] * (1 + specialistCount * 0.3);
}
