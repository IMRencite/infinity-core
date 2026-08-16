import type { AssumptionRecord, LoadedCandidateBundle } from "../types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function buildAssumptionRegister(candidate: LoadedCandidateBundle): AssumptionRecord[] {
  const assumptions: AssumptionRecord[] = [];
  const monetization = candidate.monetization;
  const plan = monetization?.primaryPlan;

  if (plan?.estimatedPriceBase != null) {
    assumptions.push({
      assumption: `Customers will pay approximately $${plan.estimatedPriceBase} per billing period.`,
      category: "pricing",
      assumptionType: plan.sourceUrls.length > 0 ? "derived" : "estimated",
      value: String(plan.estimatedPriceBase),
      confidence: plan.sourceUrls.length > 0 ? 0.65 : 0.45,
      evidence: plan.keyAssumptions,
      sourceUrls: plan.sourceUrls,
      impactIfWrong: "Revenue projections collapse if pricing is rejected by market.",
      validationMethod: "pricing_test",
      validationCostEstimate: 200,
      validationTimeEstimate: 14,
      impactScore: 0.85,
      uncertaintyScore: plan.sourceUrls.length > 0 ? 0.35 : 0.55,
      fatalRiskContribution: 0,
    });
  }

  if (plan?.estimatedCAC != null) {
    assumptions.push({
      assumption: `Customer acquisition cost can be kept near $${plan.estimatedCAC}.`,
      category: "acquisition",
      assumptionType: "estimated",
      value: String(plan.estimatedCAC),
      confidence: 0.5,
      evidence: [],
      sourceUrls: plan.sourceUrls,
      impactIfWrong: "Unit economics become negative if CAC is materially higher.",
      validationMethod: "outbound_response_test",
      validationCostEstimate: 500,
      validationTimeEstimate: 21,
      impactScore: 0.9,
      uncertaintyScore: 0.6,
      fatalRiskContribution: 0,
    });
  }

  if (plan?.estimatedCustomersYear1 != null) {
    assumptions.push({
      assumption: `Can acquire ~${plan.estimatedCustomersYear1} paying customers in year one.`,
      category: "demand",
      assumptionType: "estimated",
      value: String(plan.estimatedCustomersYear1),
      confidence: 0.45,
      evidence: [],
      sourceUrls: [],
      impactIfWrong: "Revenue targets miss and break-even delays significantly.",
      validationMethod: "landing_page_demand_test",
      validationCostEstimate: 150,
      validationTimeEstimate: 14,
      impactScore: 0.8,
      uncertaintyScore: 0.65,
      fatalRiskContribution: 0,
    });
  }

  for (const item of monetization?.recommendation.keyEconomicAssumptions ?? []) {
    assumptions.push({
      assumption: item,
      category: "economic",
      assumptionType: "estimated",
      value: null,
      confidence: monetization?.recommendation.confidence ?? 0.5,
      evidence: [],
      sourceUrls: plan?.sourceUrls ?? [],
      impactIfWrong: "Core business case may fail if this assumption is wrong.",
      validationMethod: "customer_interview",
      validationCostEstimate: 300,
      validationTimeEstimate: 14,
      impactScore: 0.7,
      uncertaintyScore: 0.5,
      fatalRiskContribution: 0,
    });
  }

  for (const item of candidate.demandEvidence.slice(0, 3)) {
    const record = item as Record<string, unknown>;
    assumptions.push({
      assumption: String(record.claim ?? record.summary ?? "Demand signal observed"),
      category: "demand",
      assumptionType: Array.isArray(record.sourceUrls) && record.sourceUrls.length > 0 ? "fact" : "derived",
      value: String(record.observedSignal ?? ""),
      confidence: record.grounded ? 0.75 : 0.55,
      evidence: [String(record.claim ?? "")],
      sourceUrls: Array.isArray(record.sourceUrls)
        ? record.sourceUrls.filter((u): u is string => typeof u === "string")
        : [],
      impactIfWrong: "Demand may be weaker than scanner evidence suggests.",
      validationMethod: "seo_demand_validation",
      validationCostEstimate: 100,
      validationTimeEstimate: 7,
      impactScore: 0.65,
      uncertaintyScore: record.grounded ? 0.25 : 0.45,
      fatalRiskContribution: 0,
    });
  }

  return assumptions.map((assumption) => ({
    ...assumption,
    fatalRiskContribution: clamp01(assumption.impactScore * assumption.uncertaintyScore),
  }));
}

export function analyzeFatalAssumptions(assumptions: AssumptionRecord[]): {
  fatalAssumptionRiskScore: number;
  assumptionUncertaintyScore: number;
  blockingAssumptions: string[];
  highestImpact: AssumptionRecord[];
  lowestConfidence: AssumptionRecord[];
  criticalAssumptions: AssumptionRecord[];
} {
  const sortedByFatal = [...assumptions].sort(
    (a, b) => b.fatalRiskContribution - a.fatalRiskContribution,
  );
  const fatalAssumptionRiskScore =
    assumptions.length === 0
      ? 0.5
      : Math.round(
          (sortedByFatal.slice(0, 3).reduce((sum, item) => sum + item.fatalRiskContribution, 0) /
            Math.min(3, assumptions.length)) *
            100,
        ) / 100;

  const assumptionUncertaintyScore =
    assumptions.length === 0
      ? 0.5
      : Math.round(
          (assumptions.reduce((sum, item) => sum + item.uncertaintyScore, 0) / assumptions.length) *
            100,
        ) / 100;

  const criticalAssumptions = assumptions.filter(
    (item) => item.impactScore >= 0.7 && item.uncertaintyScore >= 0.5,
  );

  const blockingAssumptions = criticalAssumptions
    .slice(0, 5)
    .map((item) => item.assumption);

  return {
    fatalAssumptionRiskScore,
    assumptionUncertaintyScore,
    blockingAssumptions,
    highestImpact: [...assumptions].sort((a, b) => b.impactScore - a.impactScore).slice(0, 3),
    lowestConfidence: [...assumptions].sort((a, b) => a.confidence - b.confidence).slice(0, 3),
    criticalAssumptions,
  };
}

export function prioritizeValidationExperiments(input: {
  candidate: LoadedCandidateBundle;
  assumptions: AssumptionRecord[];
}): import("../types").ValidationExperimentPriority[] {
  const experiments = input.candidate.monetization?.validationExperiments ?? [];
  const avgImpact =
    input.assumptions.reduce((sum, item) => sum + item.impactScore, 0) /
      Math.max(1, input.assumptions.length) || 0.5;
  const avgUncertainty =
    input.assumptions.reduce((sum, item) => sum + item.uncertaintyScore, 0) /
      Math.max(1, input.assumptions.length) || 0.5;

  const prioritized = experiments.map((experiment) => {
    const cost = Math.max(experiment.estimatedCostUsd ?? 250, 50);
    const timeDays = 14;
    const informationGainScore = 0.7;
    const assumptionImpactScore = avgImpact;
    const uncertaintyScore = avgUncertainty;
    const priorityScore =
      Math.round(
        ((informationGainScore * assumptionImpactScore * uncertaintyScore) / (cost / 1000 + timeDays / 30)) *
          10000,
      ) / 10000;

    return {
      experimentType: experiment.experimentType,
      title: experiment.title,
      description: experiment.description ?? "",
      priorityRank: experiment.priority,
      priorityScore,
      informationGainScore,
      assumptionImpactScore,
      uncertaintyScore,
      estimatedCostUsd: experiment.estimatedCostUsd,
      estimatedTimeDays: timeDays,
      monetizationExperimentId: experiment.id,
    };
  });

  return prioritized.sort((a, b) => b.priorityScore - a.priorityScore).map((item, index) => ({
    ...item,
    priorityRank: index + 1,
  }));
}
