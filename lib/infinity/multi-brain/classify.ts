import type { TaskComplexityLevel } from "./constants";
import type { TaskCharacteristics } from "./types";

export function classifyTask(input: {
  taskType: string;
  complexity?: TaskComplexityLevel | "low" | "medium" | "high";
  economicImportance?: number;
  implementationRisk?: number;
  researchRequired?: boolean;
  codingRequired?: boolean;
  architectureRequired?: boolean;
  expectedTokenCost?: number;
}): TaskCharacteristics {
  const complexity = normalizeComplexity(input.complexity ?? "medium");
  const economicImportance = clamp(input.economicImportance ?? 0.5, 0, 1);
  const implementationRisk = clamp(input.implementationRisk ?? 0.4, 0, 1);
  const researchRequired = input.researchRequired ?? false;
  const codingRequired = input.codingRequired ?? true;
  const architectureRequired = input.architectureRequired ?? false;

  const uncertainty =
    complexity === "critical" ? 0.9 :
    complexity === "high" ? 0.75 :
    complexity === "medium" ? 0.5 : 0.25;

  const reversibility = codingRequired ? 0.7 : 0.85;
  const expectedTokenCost = input.expectedTokenCost ?? estimateTokenCost(complexity, codingRequired);

  return {
    taskType: input.taskType,
    complexity,
    uncertainty,
    economicImportance,
    implementationRisk,
    reversibility,
    researchRequired,
    codingRequired,
    architectureRequired,
    expectedTokenCost,
    expectedExternalCost: 0,
  };
}

function normalizeComplexity(c: TaskComplexityLevel | "low" | "medium" | "high"): TaskComplexityLevel {
  if (c === "low") return "low";
  if (c === "high") return "high";
  if (c === "critical") return "critical";
  return "medium";
}

function estimateTokenCost(complexity: TaskComplexityLevel, codingRequired: boolean): number {
  const base = codingRequired ? 8000 : 4000;
  if (complexity === "critical") return base * 4;
  if (complexity === "high") return base * 2.5;
  if (complexity === "medium") return base * 1.5;
  return base;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function computeTaskValueScore(chars: TaskCharacteristics): number {
  return (
    chars.economicImportance * 0.35 +
    chars.implementationRisk * 0.25 +
    chars.uncertainty * 0.2 +
    (chars.complexity === "critical" ? 0.2 : chars.complexity === "high" ? 0.15 : 0.05)
  );
}
