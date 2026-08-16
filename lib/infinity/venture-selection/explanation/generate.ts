import type { PRODUCT_TYPE_HINTS } from "../constants";
import type { CandidateEvaluationDraft, SelectionExplanation, VentureSelectionHandoff } from "../types";

export function generateSelectionExplanation(input: {
  evaluation: CandidateEvaluationDraft;
  rank: number;
  totalCandidates: number;
  higherRankedTitles: string[];
}): SelectionExplanation {
  const candidate = input.evaluation.candidate;
  const monetization = candidate.monetization;

  return {
    whyThisOpportunity: candidate.summary,
    whyNow: "Evidence and monetization analysis indicate current market timing is actionable enough to evaluate against alternatives.",
    whyInfinityCanBuildIt: input.evaluation.buildability.assessmentNotes.join(" "),
    whyCustomersWillPay: monetization?.recommendation.expectedRevenueMechanism ?? "Customer pain and existing spend patterns suggest willingness to pay.",
    whyThisModel: monetization?.recommendation.recommendedPricingStrategy ?? monetization?.recommendation.recommendedPrimaryModel ?? "Primary monetization model selected from grounded analysis.",
    whyItRanksAboveAlternatives:
      input.rank === 1
        ? "Highest portfolio-adjusted selection score after diversification penalties."
        : `Ranked #${input.rank} of ${input.totalCandidates}. Higher-ranked alternatives: ${input.higherRankedTitles.join(", ") || "none"}.`,
    largestRisks: monetization?.recommendation.largestEconomicRisks ?? [],
    fatalAssumptions: input.evaluation.blockingAssumptions,
    validationNeeded: input.evaluation.experimentPriorities.slice(0, 3).map((item) => item.title),
    expectedEconomics: {
      expected12MonthProfit: input.evaluation.expectedValueDerived.expected12MonthProfit,
      expectedRoi: input.evaluation.expectedValueDerived.expectedRoi,
      startupCapital: input.evaluation.expectedValueInputs.startupCapital,
      timeToFirstRevenueDays: input.evaluation.speedToValue.estimatedTimeToFirstRevenueDays,
    },
    resourceRequirements: {
      estimatedCapitalRequired:
        candidate.monetization?.primaryPlan?.estimatedCapitalRequired ?? null,
      buildabilityScore: input.evaluation.buildability.buildabilityScore,
      automationScore: input.evaluation.buildability.automationScore,
    },
    confidence: input.evaluation.confidence,
  };
}

function inferProductType(candidate: CandidateEvaluationDraft["candidate"]): (typeof PRODUCT_TYPE_HINTS)[number] {
  const haystack = [
    candidate.title,
    ...candidate.businessModelCandidates,
    candidate.monetization?.recommendation.recommendedPrimaryModel ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (/saas|software|api|workflow/.test(haystack)) return "saas";
  if (/marketplace|two-sided|platform/.test(haystack)) return "marketplace";
  if (/ecommerce|store|shop|inventory/.test(haystack)) return "ecommerce";
  if (/content|blog|seo|geo|directory/.test(haystack)) return "content_site";
  if (/lead gen|lead generation/.test(haystack)) return "lead_generation";
  if (/newsletter/.test(haystack)) return "newsletter";
  if (/community|creator/.test(haystack)) return "community";
  if (/digital product|template|course/.test(haystack)) return "digital_product";
  return "hybrid";
}

export function buildVentureSelectionHandoff(
  evaluation: CandidateEvaluationDraft,
): VentureSelectionHandoff {
  const candidate = evaluation.candidate;
  const monetization = candidate.monetization;

  return {
    businessConcept: candidate.title,
    targetCustomer: candidate.targetCustomer ?? monetization?.recommendation.recommendedCustomer ?? "",
    problem: candidate.problem ?? candidate.summary,
    solution: monetization?.primaryPlan?.modelName ?? candidate.title,
    primaryMonetizationModel: monetization?.recommendation.recommendedPrimaryModel ?? "other",
    secondaryRevenueStreams:
      monetization?.recommendation.recommendedSecondaryModels ??
      monetization?.primaryPlan?.revenueStreams
        .filter((stream) => stream.streamRole !== "primary")
        .map((stream) => stream.modelType) ??
      [],
    pricingStrategy: monetization?.recommendation.recommendedPricingStrategy ?? "",
    distributionStrategy: monetization?.recommendation.recommendedAcquisitionStrategy ?? "",
    recommendedProductType: inferProductType(candidate),
    requiredCapabilities: [
      evaluation.buildability.canBuildSoftware ? "software_development" : "specialized_operations",
      evaluation.buildability.canAutomateAcquisition ? "automated_acquisition" : "manual_acquisition",
      evaluation.buildability.canDeliverDigitally ? "digital_delivery" : "physical_fulfillment",
    ],
    mvpRequirements: [
      "Validate core value proposition with minimum feature set",
      "Implement primary monetization mechanism",
      "Enable basic analytics and feedback capture",
    ],
    futureFeatures: monetization?.primaryPlan?.revenueStreams
      .filter((stream) => stream.streamRole === "future")
      .map((stream) => stream.streamName) ?? [],
    economicTargets: {
      expected12MonthProfit: evaluation.expectedValueDerived.expected12MonthProfit,
      expectedRoi: evaluation.expectedValueDerived.expectedRoi,
      estimatedCapitalRequired: monetization?.primaryPlan?.estimatedCapitalRequired ?? null,
    },
    budgetEnvelope: {
      startupCapital: evaluation.expectedValueInputs.startupCapital,
      monthlyOperatingBudget: Math.round((monetization?.primaryPlan?.estimatedFixedCosts ?? 40000) / 12),
    },
    riskConstraints: {
      fatalAssumptionRiskScore: evaluation.fatalAssumptionRiskScore,
      blockingAssumptions: evaluation.blockingAssumptions,
      largestRisks: monetization?.recommendation.largestEconomicRisks ?? [],
    },
    validationState: evaluation.decision === "BUILD" ? "ready_for_build" : "validation_required",
    sourceEvidenceRefs: monetization?.primaryPlan?.sourceUrls ?? [],
  };
}
