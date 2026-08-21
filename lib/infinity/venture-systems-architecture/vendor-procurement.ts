import type { ProcurementStatus, ProviderCategory, SystemCapability } from "./constants";
import { dedicatedRequiredForTenancy, selectTenancyStrategy } from "./provider-tenancy";
import { cheapestAdequateQuote, mergeQuotes } from "./provider-capabilities";
import type {
  ArchitectureCost,
  ProviderCandidateQuote,
  VendorProcurementRequirement,
  VentureProviderRequirement,
  VentureSystemsEvidence,
} from "./types";

export function unknownCost(): ArchitectureCost {
  return { value: null, actuality: "UNKNOWN", currency: "USD" };
}

export function estimatedCost(value: number): ArchitectureCost {
  return { value, actuality: "ESTIMATE", currency: "USD" };
}

export function costFromQuote(quote: ProviderCandidateQuote | null): ArchitectureCost {
  if (!quote || quote.costActuality === "UNKNOWN" || quote.estimatedMonthlyCostUsd == null) {
    return unknownCost();
  }
  return { value: quote.estimatedMonthlyCostUsd, actuality: quote.costActuality, currency: "USD" };
}

function budgetCost(evidence: VentureSystemsEvidence): ArchitectureCost {
  const budget = evidence.treasuryBudget;
  if (!budget || budget.actuality === "UNKNOWN" || budget.monthlySoftwareBudgetUsd == null) {
    return unknownCost();
  }
  return { value: budget.monthlySoftwareBudgetUsd, actuality: budget.actuality, currency: "USD" };
}

function fitsBudget(cost: ArchitectureCost, budget: ArchitectureCost): boolean | null {
  if (cost.actuality === "UNKNOWN" || cost.value == null) return null;
  if (budget.actuality === "UNKNOWN" || budget.value == null) return null;
  return cost.value <= budget.value;
}

export function procurementStatusFor(input: {
  required: boolean;
  quote: ProviderCandidateQuote | null;
  budget: ArchitectureCost;
  stageAwareShared: boolean;
}): ProcurementStatus {
  if (!input.required) return "NOT_REQUIRED";
  if (!input.quote) return "DEFERRED";
  if (input.quote.freeTierAdequate && (input.quote.estimatedMonthlyCostUsd === 0 || input.stageAwareShared)) {
    return "FREE_TIER";
  }
  const cost = costFromQuote(input.quote);
  if (cost.actuality === "UNKNOWN" || cost.value == null) return "BUDGET_REVIEW_REQUIRED";
  if (input.stageAwareShared && input.quote.freeTierAdequate) return "FREE_TIER";
  const fit = fitsBudget(cost, input.budget);
  if (fit === null) return "BUDGET_REVIEW_REQUIRED";
  if (!fit) return "BUDGET_REVIEW_REQUIRED";
  return "TREASURY_ELIGIBLE";
}

export function buildVendorProcurement(input: {
  evidence: VentureSystemsEvidence;
  category: ProviderCategory;
  required: boolean;
  requiredCapabilities: SystemCapability[];
  expectedValue: string;
}): VendorProcurementRequirement {
  const quotes = mergeQuotes(input.category, input.evidence.providerQuotes);
  const cheapest = cheapestAdequateQuote(quotes);
  const paid = quotes.find((item) => item.estimatedMonthlyCostUsd != null && item.estimatedMonthlyCostUsd > 0);
  const stage = input.evidence.ventureStage ?? "EXPERIMENTAL";
  const preRevenue = stage === "EXPERIMENTAL" || stage === "PRE_REVENUE";
  const freeExists = quotes.some((item) => item.freeTierAdequate);
  const expensivePaid = paid?.estimatedMonthlyCostUsd != null && paid.estimatedMonthlyCostUsd >= 100;
  const preferFree = preRevenue && freeExists && expensivePaid;
  const selected = preferFree ? cheapest : quotes.find((item) => item.preferred) ?? cheapest;
  const budget = budgetCost(input.evidence);
  const monthly = costFromQuote(preferFree ? cheapest : selected);
  const status = procurementStatusFor({
    required: input.required,
    quote: preferFree ? cheapest : selected,
    budget,
    stageAwareShared: preferFree,
  });
  const gated: VendorProcurementRequirement["procurementStatus"] =
    status === "TREASURY_ELIGIBLE" ? "LIVE_PURCHASE_GATED" : status === "LIVE_ACTIVE" ? "LIVE_PURCHASE_GATED" : status;

  return {
    providerId: selected?.providerId ?? null,
    providerName: selected?.providerName ?? null,
    providerCategory: input.category,
    plan: preferFree ? "free_or_internal" : null,
    monthlyCost: monthly,
    annualCost: monthly.actuality === "UNKNOWN" || monthly.value == null ? unknownCost() : estimatedCost(monthly.value * 12),
    setupFee: unknownCost(),
    trialAvailable: selected?.freeTierAdequate ?? null,
    trialEnd: null,
    renewalInterval: "MONTHLY",
    autoRenewAllowed: false,
    ventureBudget: budget,
    budgetOwner: "UNASSIGNED",
    spendCeiling: budget,
    cancellationPolicyKnown: false,
    requiredCapabilities: input.requiredCapabilities,
    alternatives: quotes.map((item) => item.providerName),
    expectedValue: input.expectedValue,
    procurementStatus: input.required ? gated : "NOT_REQUIRED",
    livePurchaseAuthority: false,
  };
}

export function buildProviderRequirement(input: {
  evidence: VentureSystemsEvidence;
  category: ProviderCategory;
  requiredCapabilities: SystemCapability[];
  quote: ProviderCandidateQuote | null;
  reason: string;
}): VentureProviderRequirement {
  const tenancy = selectTenancyStrategy({
    stage: input.evidence.ventureStage ?? "EXPERIMENTAL",
    sensitivity: input.evidence.regulatedIndustry ? "REGULATED" : (input.evidence.dataSensitivity ?? "STANDARD"),
    spinoutLikelihood: input.evidence.spinoutLikelihood,
    dedicatedIsolationValuable: input.evidence.dedicatedIsolationValuable,
    paidMonthlyCostUsd: input.quote?.estimatedMonthlyCostUsd ?? null,
    freeAlternativeExists: Boolean(input.evidence.providerQuotes?.some((item) => item.freeTierAdequate) || input.quote?.freeTierAdequate),
    expectedScale: input.evidence.expectedScale,
  });
  return {
    ventureId: input.evidence.ventureId ?? null,
    providerCategory: input.category,
    requiredCapabilities: input.requiredCapabilities,
    tenancyStrategy: tenancy,
    dedicatedRequired: dedicatedRequiredForTenancy(tenancy),
    reason: input.reason,
    estimatedMonthlyCost: costFromQuote(input.quote),
    billingOwner: "UNASSIGNED",
    liveProvisioningAuthorityRequired: false,
  };
}

export function sumKnownRecurringCost(items: ArchitectureCost[]): ArchitectureCost {
  if (items.some((item) => item.actuality === "UNKNOWN" || item.value == null)) {
    return unknownCost();
  }
  return estimatedCost(items.reduce((sum, item) => sum + (item.value ?? 0), 0));
}
