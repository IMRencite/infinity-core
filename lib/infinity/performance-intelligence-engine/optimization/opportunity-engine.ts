import { randomUUID } from "node:crypto";
import type { EconomicPriorityDecision, OptimizationActionType } from "../constants";
import type { OptimizationOpportunity, PerformanceDiagnosis } from "../types";

const CATEGORY_ACTIONS: Partial<Record<PerformanceDiagnosis["category"], OptimizationActionType>> = {
  CREATIVE_PERFORMANCE: "CHANGE_CREATIVE",
  LANDING_PAGE_CONVERSION: "IMPROVE_CONVERSION",
  ACQUISITION_COST: "CHANGE_ACQUISITION_MIX",
  ACQUISITION_VOLUME: "EXPAND",
  EXECUTION_RELIABILITY: "REPAIR",
  TECHNICAL_FAILURE: "FIX_TECHNICAL_ISSUE",
  CONTENT_PERFORMANCE: "REFRESH",
  DATA_QUALITY: "REQUEST_MORE_EVIDENCE",
  PRODUCT_QUALITY: "FIX_TECHNICAL_ISSUE",
};

export function buildOptimizationOpportunities(input: {
  diagnoses: PerformanceDiagnosis[];
  minOpportunityValueUsd: number;
}): OptimizationOpportunity[] {
  const opportunities: OptimizationOpportunity[] = [];

  for (const diagnosis of input.diagnoses) {
    if (!diagnosis.sufficientEvidence && diagnosis.category === "DATA_QUALITY") {
      opportunities.push(buildOpportunity({
        diagnosis,
        actionType: "REQUEST_MORE_EVIDENCE",
        expectedUpside: 0,
        estimatedCost: 5,
        risk: "LOW",
        target: diagnosis.ventureId,
      }));
      continue;
    }
    if (!diagnosis.sufficientEvidence) continue;

    const actionType = CATEGORY_ACTIONS[diagnosis.category] ?? "REFRESH";
    const upside = estimateUpside(diagnosis);
    const cost = estimateCost(actionType);

    opportunities.push(
      buildOpportunity({
        diagnosis,
        actionType,
        expectedUpside: upside,
        estimatedCost: cost,
        risk: diagnosis.severity === "CRITICAL" ? "HIGH" : diagnosis.severity === "HIGH" ? "MEDIUM" : "LOW",
        target: diagnosis.ventureId,
      }),
    );
  }

  return opportunities.filter((o) => o.expectedUpsideUsd >= 0 || o.actionType === "REQUEST_MORE_EVIDENCE");
}

function buildOpportunity(input: {
  diagnosis: PerformanceDiagnosis;
  actionType: OptimizationActionType;
  expectedUpside: number;
  estimatedCost: number;
  risk: OptimizationOpportunity["risk"];
  target: string;
}): OptimizationOpportunity {
  const economicDecision = prioritizeEconomically({
    expectedUpsideUsd: input.expectedUpside,
    estimatedCostUsd: input.estimatedCost,
    confidence: input.diagnosis.confidence,
    risk: input.risk,
    minOpportunityValueUsd: 10,
  });

  return {
    opportunityId: randomUUID(),
    diagnosisId: input.diagnosis.diagnosisId,
    ventureId: input.diagnosis.ventureId,
    target: input.target,
    actionType: input.actionType,
    expectedUpsideUsd: input.expectedUpside,
    estimatedCostUsd: input.estimatedCost,
    confidence: input.diagnosis.confidence,
    risk: input.risk,
    reversibility: input.actionType === "PAUSE" || input.actionType === "SHUTDOWN" ? "LOW" : "HIGH",
    urgency: input.diagnosis.severity === "CRITICAL" ? 10 : input.diagnosis.severity === "HIGH" ? 7 : 4,
    requiredCapabilities: mapCapabilities(input.actionType),
    supportingEvidence: [input.diagnosis.observation, ...input.diagnosis.hypotheses.map((h) => h.statement)],
    economicDecision,
    upsideClassification: input.expectedUpside > 0 ? "ESTIMATED" : "UNKNOWN",
    costClassification: "ESTIMATED",
  };
}

export function prioritizeEconomically(input: {
  expectedUpsideUsd: number;
  estimatedCostUsd: number;
  confidence: number;
  risk: OptimizationOpportunity["risk"];
  minOpportunityValueUsd: number;
  intelligenceCostUsd?: number;
}): EconomicPriorityDecision {
  const net = input.expectedUpsideUsd - input.estimatedCostUsd - (input.intelligenceCostUsd ?? 0);

  if (input.expectedUpsideUsd > 0 && input.expectedUpsideUsd < input.minOpportunityValueUsd) {
    return "REJECT";
  }
  if (net < 0 && input.expectedUpsideUsd > 0) return "DEFER";
  if (input.risk === "HIGH" && input.confidence < 0.7) return "TEST_FIRST";
  if (input.confidence < 0.4) return "COLLECT_MORE_DATA";
  if (net > 100 && input.confidence >= 0.6) return "EXECUTE_NOW";
  if (net > 0) return "QUEUE";
  if (input.expectedUpsideUsd <= 0) return "REJECT";
  return "DEFER";
}

function estimateUpside(diagnosis: PerformanceDiagnosis): number {
  switch (diagnosis.severity) {
    case "CRITICAL":
      return 5000;
    case "HIGH":
      return 2000;
    case "MEDIUM":
      return 500;
    case "LOW":
      return 100;
    default:
      return 0;
  }
}

function estimateCost(actionType: OptimizationActionType): number {
  const costs: Partial<Record<OptimizationActionType, number>> = {
    CHANGE_CREATIVE: 50,
    IMPROVE_CONVERSION: 80,
    CHANGE_ACQUISITION_MIX: 200,
    EXPAND: 150,
    REPAIR: 30,
    REFRESH: 40,
    REQUEST_MORE_EVIDENCE: 5,
    FIX_TECHNICAL_ISSUE: 100,
    PAUSE: 0,
    SHUTDOWN: 0,
    PIVOT: 500,
  };
  return costs[actionType] ?? 50;
}

function mapCapabilities(actionType: OptimizationActionType): string[] {
  const map: Partial<Record<OptimizationActionType, string[]>> = {
    CHANGE_CREATIVE: ["creative_media"],
    REFRESH: ["organic_growth"],
    REPAIR: ["product_asset_builder", "organic_growth"],
    FIX_TECHNICAL_ISSUE: ["product_asset_builder"],
    PAUSE: ["external_action"],
    SHUTDOWN: ["external_action"],
  };
  return map[actionType] ?? [];
}

export function filterByEconomicPriority(
  opportunities: OptimizationOpportunity[],
  decision: EconomicPriorityDecision,
): OptimizationOpportunity[] {
  return opportunities.filter((o) => o.economicDecision === decision);
}
