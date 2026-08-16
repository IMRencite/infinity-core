import { randomUUID } from "node:crypto";
import { applyDerivedEconomicsToPlan } from "../economics/calculate";
import { generateRevenueScenarios } from "../economics/scenarios";
import { calculateDeterministicMonetizationScores } from "../scoring/calculate";
import type {
  LoadedOpportunityCandidate,
  MonetizationPlan,
  ProviderMonetizationExtractionOutput,
} from "../types";

export function mapExtractionToMonetizationPlans(input: {
  extraction: ProviderMonetizationExtractionOutput;
  candidate: LoadedOpportunityCandidate;
  monetizationRunId: string;
  organizationId: string;
  researchRunIds: string[];
}): MonetizationPlan[] {
  return input.extraction.plans.map((planDraft) => {
    const withEconomics = applyDerivedEconomicsToPlan({
      ...planDraft,
      estimatedCustomersYear1: planDraft.estimatedCustomersYear1 ?? 0,
      estimatedRevenuePerCustomer: planDraft.estimatedRevenuePerCustomer ?? 0,
      estimatedVariableCosts: planDraft.estimatedVariableCosts ?? 0,
      estimatedFixedCosts: planDraft.estimatedFixedCosts ?? 0,
      estimatedCAC: planDraft.estimatedCAC ?? 0,
      estimatedLTV: planDraft.estimatedLTV,
    });

    const scores = calculateDeterministicMonetizationScores(planDraft.scoringAssessment);
    const scenarios = generateRevenueScenarios({
      estimatedCustomersYear1: planDraft.estimatedCustomersYear1 ?? 0,
      estimatedRevenuePerCustomer: planDraft.estimatedRevenuePerCustomer ?? 0,
      estimatedVariableCosts: planDraft.estimatedVariableCosts ?? 0,
      estimatedFixedCosts: planDraft.estimatedFixedCosts ?? 0,
      assumptions: planDraft.keyAssumptions,
    });

    return {
      ...planDraft,
      id: randomUUID(),
      organizationId: input.organizationId,
      monetizationRunId: input.monetizationRunId,
      opportunityCandidateId: input.candidate.id,
      discoveryRunId: input.candidate.discoveryRunId,
      researchRunIds: input.researchRunIds,
      estimatedGrossRevenueYear1: withEconomics.estimatedGrossRevenueYear1,
      estimatedGrossMarginPercent: withEconomics.estimatedGrossMarginPercent,
      estimatedLTV: withEconomics.estimatedLTV,
      ltvCacRatio: withEconomics.ltvCacRatio,
      contributionMarginPerCustomer: withEconomics.contributionMarginPerCustomer,
      breakEvenCustomers: withEconomics.breakEvenCustomers,
      economicsDerived: {
        estimatedGrossRevenueYear1: withEconomics.estimatedGrossRevenueYear1,
        estimatedGrossMarginPercent: withEconomics.estimatedGrossMarginPercent,
        estimatedGrossProfitYear1: withEconomics.estimatedGrossProfitYear1,
        contributionMarginPerCustomer: withEconomics.contributionMarginPerCustomer,
        breakEvenCustomers: withEconomics.breakEvenCustomers,
        ltvCacRatio: withEconomics.ltvCacRatio,
        estimatedLTV: withEconomics.estimatedLTV,
      },
      monetizationScore: scores.monetizationScore,
      scores,
      scenarios,
    };
  });
}
