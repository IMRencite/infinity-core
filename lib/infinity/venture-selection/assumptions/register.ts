import type {
  AdversarialFinding,
  AssumptionRecord,
  LoadedCandidateBundle,
} from "../types";
import {
  adversarialBoostForCategory,
  countEvidenceForCategory,
  deriveRemainingUncertainty,
} from "./uncertainty";

export type ValidationEvidenceItem = {
  assumptionCategory: string;
  assumptionId?: string;
  claim: string;
  sourceUrls: string[];
  newSourceUrls?: string[];
  grounded: boolean;
  confidenceImpact: number;
  assumptionImpact: number;
  uncertaintyReduction: number;
  experimentType: string;
  newEvidenceFound?: boolean;
  newSourceCount?: number;
  reusedSourceCount?: number;
};

export type BuildAssumptionRegisterOptions = {
  adversarialRiskInputs?: Record<string, number>;
  adversarialFindings?: AdversarialFinding[];
  validationEvidence?: ValidationEvidenceItem[];
};

export const FATAL_ASSUMPTION_AGGREGATION_FORMULA =
  "0.55 * max(severe assumption contribution) + 0.45 * avg(top 3 contributions)";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function applyValidationEvidenceBoost(
  category: string,
  assumptionText: string,
  validationEvidence: ValidationEvidenceItem[] | undefined,
): { confidenceBoost: number; uncertaintyReduction: number; sources: string[] } {
  if (!validationEvidence?.length) {
    return { confidenceBoost: 0, uncertaintyReduction: 0, sources: [] };
  }

  const relevant = validationEvidence.filter(
    (item) =>
      item.assumptionCategory === category &&
      (item.assumptionId == null || item.assumptionId === assumptionText) &&
      (item.uncertaintyReduction ?? item.assumptionImpact) > 0 &&
      item.newEvidenceFound !== false,
  );
  if (relevant.length === 0) {
    return { confidenceBoost: 0, uncertaintyReduction: 0, sources: [] };
  }

  const confidenceBoost = Math.min(
    0.35,
    relevant.reduce((sum, item) => sum + Math.max(0, item.confidenceImpact), 0),
  );
  const uncertaintyReduction = Math.min(
    0.4,
    relevant.reduce((sum, item) => sum + (item.uncertaintyReduction ?? item.assumptionImpact), 0),
  );
  const sources = relevant.flatMap((item) => item.newSourceUrls ?? item.sourceUrls);

  return { confidenceBoost, uncertaintyReduction, sources };
}

export function buildAssumptionRegister(
  candidate: LoadedCandidateBundle,
  options: BuildAssumptionRegisterOptions = {},
): AssumptionRecord[] {
  const assumptions: AssumptionRecord[] = [];
  const monetization = candidate.monetization;
  const plan = monetization?.primaryPlan;
  const monetizationConfidence = monetization?.recommendation.confidence ?? 0.5;

  const buildRecord = (input: {
    assumption: string;
    category: string;
    assumptionType: AssumptionRecord["assumptionType"];
    value: string | null;
    confidence: number;
    evidence: string[];
    sourceUrls: string[];
    impactIfWrong: string;
    validationMethod: string | null;
    validationCostEstimate: number | null;
    validationTimeEstimate: number | null;
    impactScore: number;
    categoryForEvidence: string;
    hasExplicitEstimate: boolean;
  }): AssumptionRecord => {
    const categoryEvidence = countEvidenceForCategory(candidate, input.categoryForEvidence);
    const validationBoost = applyValidationEvidenceBoost(
      input.categoryForEvidence,
      input.assumption,
      options.validationEvidence,
    );
    const adversarialBoost = adversarialBoostForCategory(
      input.categoryForEvidence,
      options.adversarialRiskInputs,
      options.adversarialFindings,
    );
    const derived = deriveRemainingUncertainty({
      category: input.categoryForEvidence,
      confidence: clamp01(input.confidence + validationBoost.confidenceBoost),
      sourceUrlCount:
        categoryEvidence.sourceUrlCount +
        input.sourceUrls.length +
        validationBoost.sources.length,
      groundedEvidenceCount:
        categoryEvidence.groundedCount + (validationBoost.sources.length > 0 ? 1 : 0),
      monetizationConfidence,
      adversarialBoost,
      hasExplicitEstimate: input.hasExplicitEstimate,
    });

    const uncertaintyScore = clamp01(
      derived.remainingUncertainty - validationBoost.uncertaintyReduction,
    );
    const evidenceSources = [
      ...derived.evidenceSources,
      ...validationBoost.sources.map((url) => `validation:${url}`),
    ];

    return {
      assumption: input.assumption,
      category: input.category,
      assumptionType: input.assumptionType,
      value: input.value,
      confidence: clamp01(input.confidence + validationBoost.confidenceBoost),
      evidence: [...input.evidence, ...validationBoost.sources.map((url) => `Validated via ${url}`)],
      sourceUrls: [...input.sourceUrls, ...validationBoost.sources],
      impactIfWrong: input.impactIfWrong,
      validationMethod: input.validationMethod,
      validationCostEstimate: input.validationCostEstimate,
      validationTimeEstimate: input.validationTimeEstimate,
      impactScore: input.impactScore,
      uncertaintyScore,
      fatalRiskContribution: clamp01(input.impactScore * uncertaintyScore),
      fallbackUsed: derived.fallbackUsed,
      fallbackReason: derived.fallbackReason,
      evidenceSources,
    };
  };

  if (plan?.estimatedPriceBase != null) {
    assumptions.push(
      buildRecord({
        assumption: `Customers will pay approximately $${plan.estimatedPriceBase} per billing period.`,
        category: "pricing",
        assumptionType: plan.sourceUrls.length > 0 ? "derived" : "estimated",
        value: String(plan.estimatedPriceBase),
        confidence: plan.sourceUrls.length > 0 ? 0.68 : 0.48,
        evidence: plan.keyAssumptions,
        sourceUrls: plan.sourceUrls,
        impactIfWrong: "Revenue projections collapse if pricing is rejected by market.",
        validationMethod: "pricing_test",
        validationCostEstimate: 200,
        validationTimeEstimate: 14,
        impactScore: 0.85,
        categoryForEvidence: "pricing",
        hasExplicitEstimate: true,
      }),
    );
  }

  if (plan?.estimatedCAC != null) {
    assumptions.push(
      buildRecord({
        assumption: `Customer acquisition cost can be kept near $${plan.estimatedCAC}.`,
        category: "acquisition",
        assumptionType: "estimated",
        value: String(plan.estimatedCAC),
        confidence: plan.sourceUrls.length > 0 ? 0.58 : 0.48,
        evidence: [],
        sourceUrls: plan.sourceUrls,
        impactIfWrong: "Unit economics become negative if CAC is materially higher.",
        validationMethod: "outbound_response_test",
        validationCostEstimate: 500,
        validationTimeEstimate: 21,
        impactScore: 0.9,
        categoryForEvidence: "acquisition",
        hasExplicitEstimate: true,
      }),
    );
  }

  if (plan?.estimatedCustomersYear1 != null) {
    assumptions.push(
      buildRecord({
        assumption: `Can acquire ~${plan.estimatedCustomersYear1} paying customers in year one.`,
        category: "demand",
        assumptionType: "estimated",
        value: String(plan.estimatedCustomersYear1),
        confidence: candidate.demandEvidence.some((item) => (item as { grounded?: boolean }).grounded)
          ? 0.62
          : 0.46,
        evidence: [],
        sourceUrls: [],
        impactIfWrong: "Revenue targets miss and break-even delays significantly.",
        validationMethod: "landing_page_demand_test",
        validationCostEstimate: 150,
        validationTimeEstimate: 14,
        impactScore: 0.8,
        categoryForEvidence: "demand",
        hasExplicitEstimate: true,
      }),
    );
  }

  for (const item of monetization?.recommendation.keyEconomicAssumptions ?? []) {
    assumptions.push(
      buildRecord({
        assumption: item,
        category: "economic",
        assumptionType: "estimated",
        value: null,
        confidence: monetizationConfidence,
        evidence: [],
        sourceUrls: plan?.sourceUrls ?? [],
        impactIfWrong: "Core business case may fail if this assumption is wrong.",
        validationMethod: "customer_interview",
        validationCostEstimate: 300,
        validationTimeEstimate: 14,
        impactScore: 0.7,
        categoryForEvidence: "economic",
        hasExplicitEstimate: false,
      }),
    );
  }

  for (const item of candidate.demandEvidence.slice(0, 3)) {
    const record = item as Record<string, unknown>;
    const grounded = record.grounded === true;
    assumptions.push(
      buildRecord({
        assumption: String(record.claim ?? record.summary ?? "Demand signal observed"),
        category: "demand",
        assumptionType:
          Array.isArray(record.sourceUrls) && record.sourceUrls.length > 0 ? "fact" : "derived",
        value: String(record.observedSignal ?? ""),
        confidence: grounded ? 0.78 : 0.58,
        evidence: [String(record.claim ?? "")],
        sourceUrls: Array.isArray(record.sourceUrls)
          ? record.sourceUrls.filter((url): url is string => typeof url === "string")
          : [],
        impactIfWrong: "Demand may be weaker than scanner evidence suggests.",
        validationMethod: "seo_demand_validation",
        validationCostEstimate: 100,
        validationTimeEstimate: 7,
        impactScore: 0.65,
        categoryForEvidence: "demand",
        hasExplicitEstimate: false,
      }),
    );
  }

  return assumptions;
}

export function analyzeFatalAssumptions(assumptions: AssumptionRecord[]): {
  fatalAssumptionRiskScore: number;
  assumptionUncertaintyScore: number;
  blockingAssumptions: string[];
  highestImpact: AssumptionRecord[];
  lowestConfidence: AssumptionRecord[];
  criticalAssumptions: AssumptionRecord[];
  fallbackRate: number;
  aggregationFormula: string;
} {
  const sortedByFatal = [...assumptions].sort(
    (a, b) => b.fatalRiskContribution - a.fatalRiskContribution,
  );

  let fatalAssumptionRiskScore = 0.5;
  if (assumptions.length === 1) {
    fatalAssumptionRiskScore = sortedByFatal[0]!.fatalRiskContribution;
  } else if (assumptions.length === 2) {
    const maxContribution = sortedByFatal[0]!.fatalRiskContribution;
    const avgTop = (sortedByFatal[0]!.fatalRiskContribution + sortedByFatal[1]!.fatalRiskContribution) / 2;
    fatalAssumptionRiskScore = 0.65 * maxContribution + 0.35 * avgTop;
  } else if (assumptions.length > 2) {
    const maxContribution = sortedByFatal[0]!.fatalRiskContribution;
    const avgTop3 =
      sortedByFatal.slice(0, 3).reduce((sum, item) => sum + item.fatalRiskContribution, 0) / 3;
    fatalAssumptionRiskScore = 0.55 * maxContribution + 0.45 * avgTop3;
  }

  fatalAssumptionRiskScore = round2(fatalAssumptionRiskScore);

  const assumptionUncertaintyScore =
    assumptions.length === 0
      ? 0.5
      : round2(
          assumptions.reduce((sum, item) => sum + item.uncertaintyScore, 0) / assumptions.length,
        );

  const criticalAssumptions = assumptions.filter(
    (item) => item.impactScore >= 0.7 && item.uncertaintyScore >= 0.5,
  );

  const blockingAssumptions = criticalAssumptions
    .slice(0, 5)
    .map((item) => item.assumption);

  const fallbackRate =
    assumptions.length === 0
      ? 1
      : round2(assumptions.filter((item) => item.fallbackUsed).length / assumptions.length);

  return {
    fatalAssumptionRiskScore,
    assumptionUncertaintyScore,
    blockingAssumptions,
    highestImpact: [...assumptions].sort((a, b) => b.impactScore - a.impactScore).slice(0, 3),
    lowestConfidence: [...assumptions].sort((a, b) => a.confidence - b.confidence).slice(0, 3),
    criticalAssumptions,
    fallbackRate,
    aggregationFormula: FATAL_ASSUMPTION_AGGREGATION_FORMULA,
  };
}

export function prioritizeValidationExperiments(input: {
  candidate: LoadedCandidateBundle;
  assumptions: AssumptionRecord[];
}): import("../types").ValidationExperimentPriority[] {
  const experiments = input.candidate.monetization?.validationExperiments ?? [];
  const assumptionByCategory = new Map<string, AssumptionRecord>();
  for (const assumption of input.assumptions) {
    const existing = assumptionByCategory.get(assumption.category);
    if (!existing || assumption.fatalRiskContribution > existing.fatalRiskContribution) {
      assumptionByCategory.set(assumption.category, assumption);
    }
  }

  const prioritized = experiments.map((experiment) => {
    const linkedAssumption =
      [...assumptionByCategory.values()].find((item) =>
        item.validationMethod === experiment.experimentType ||
        item.category.includes(experiment.experimentType.split("_")[0] ?? ""),
      ) ?? [...assumptionByCategory.values()].sort((a, b) => b.fatalRiskContribution - a.fatalRiskContribution)[0];

    const assumptionImpactScore = linkedAssumption?.impactScore ?? 0.5;
    const uncertaintyScore = linkedAssumption?.uncertaintyScore ?? 0.5;
    const cost = Math.max(experiment.estimatedCostUsd ?? 250, 50);
    const timeDays = linkedAssumption?.validationTimeEstimate ?? 14;
    const informationGainScore = linkedAssumption?.fallbackUsed ? 0.85 : 0.65;
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
