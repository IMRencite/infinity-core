import type { FounderResearchPacket } from "../research-packet";
import type { VentureContext } from "../comparable-economics/qualify";
import { mergeRanges, unknownRange } from "../comparable-economics/provenance";
import { composePricingArchitecture } from "./architecture";
import { assessRevenueModelCoverage } from "./coverage";
import {
  extractMoneyObservations,
  monthlyRangeFromObservations,
  setupRangeFromObservations,
  taggedMoneyObservationsFromFindings,
  aggregateModeledArpu,
} from "./extract";
import { founderPricingCluesCopy } from "./founder-copy";
import { classifyPriceRole, observationIsCoreMonthly } from "./price-role";
import type { DirectMoneyAnswer, ExtractedMoneyObservation, RevenueModelResearch } from "./types";
import { assessRevenueAttractiveness, assessRevenueQuality } from "./quality";
import { qualifyRevenueModelComparables } from "./qualify";
import { recommendRevenueModel } from "./recommend";
import { composeBandScenarios, composeBreakEven, composeCustomerCountScenarios, composeRevenueMix, composeRevenuePerCustomer } from "./scenarios";
import { composeRevenueStreams } from "./streams";

import { formatApproximateUsd, formatUsdRange } from "../money-presentation";

function economicObservations(packet: FounderResearchPacket, context: import("../comparable-economics/qualify").VentureContext): ExtractedMoneyObservation[] {
  const tagged: ExtractedMoneyObservation[] = [];
  for (const finding of packet.findings) {
    const role = classifyPriceRole(finding.claim, context);
    for (const observation of extractMoneyObservations(finding.claim)) {
      if (observation.vagueLanguage || observation.kind === "QUALITATIVE_ONLY") continue;
      if (observation.kind === "SETUP_FEE" || observationIsCoreMonthly(observation, role)) {
        tagged.push(observation);
      }
    }
  }
  return tagged;
}

function pricingClues(packet: FounderResearchPacket, context: import("../comparable-economics/qualify").VentureContext): string[] {
  const clues: string[] = [];
  for (const finding of packet.findings) {
    const observations = extractMoneyObservations(finding.claim).filter(
      (item) => item.unit === "USD" && (item.amount != null || item.amountLow != null || item.amountHigh != null),
    );
    if (!observations.length) continue;
    clues.push(finding.claim);
  }
  return clues.slice(0, 8);
}

export function researchRevenueModel(input: {
  packet: FounderResearchPacket;
  context: VentureContext;
  monthlyFixedCost?: number | null;
}): RevenueModelResearch {
  const comparables = qualifyRevenueModelComparables(input);
  const coverage = assessRevenueModelCoverage({ packet: input.packet, comparables, context: input.context });
  const observations = economicObservations(input.packet, input.context);
  const clues = pricingClues(input.packet, input.context);
  const tagged = taggedMoneyObservationsFromFindings(
    input.packet.findings.map((item) => item.claim),
    input.context,
  );
  const arpuModel = aggregateModeledArpu(tagged, input.context, input.packet.sources);
  if (coverage.pricingEvidenceStatus !== "SUFFICIENT" && arpuModel.confidence === "MEDIUM") {
    arpuModel.confidence = "LOW";
  }
  const monthly = arpuModel.core.low != null || arpuModel.core.base != null || arpuModel.core.high != null
    ? arpuModel.core
    : monthlyRangeFromObservations(observations.filter((item) => item.kind !== "SETUP_FEE"));
  const setup = setupRangeFromObservations(observations);
  const streams = composeRevenueStreams({
    packet: input.packet,
    context: input.context,
    comparables,
    observations,
  });
  const packetText = input.packet.findings.map((item) => item.claim).join(" ");
  const recommended = recommendRevenueModel({
    context: input.context,
    packetText,
    comparables,
    streams,
    coverageStatus: coverage.status,
  });
  const tierEvidence = /\b(tier|package|plan|starter|professional|premium)\b/i.test(packetText);
  const architecture = composePricingArchitecture({
    monthly,
    setup,
    tierEvidence,
    provenance: monthly.base != null || monthly.low != null ? "COMPARABLE_MODELED" : "UNKNOWN",
    includedScope: ["website/platform access"],
    confidence: arpuModel.confidence,
  });
  const upsellMonthly = arpuModel.addOn;
  const marginMatch =
    /starting near|projected/i.test(packetText) && /gross margin/i.test(packetText)
      ? null
      : packetText.match(/(\d+(?:\.\d+)?)\s*%\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)\s*%/);
  const grossMargin = marginMatch
    ? mergeRanges([
        { low: Number(marginMatch[1]) / 100, base: (Number(marginMatch[1]) + Number(marginMatch[2])) / 200, high: Number(marginMatch[2]) / 100 },
      ])
    : unknownRange();
  const rpc = composeRevenuePerCustomer({
    monthly,
    setup,
    upsellMonthly,
    grossMargin,
    provenance: monthly.base != null || setup.base != null ? "COMPARABLE_MODELED" : "UNKNOWN",
    arpuModel,
  });
  const monthlyBase = monthly.base ?? monthly.low;
  const setupBase = setup.base ?? setup.low;
  const customerCountScenarios = composeCustomerCountScenarios({
    monthly: monthlyBase,
    setup: setupBase,
    addOnMonthly: null,
  });
  const bandScenarios = composeBandScenarios({ monthly, setup, addOnMonthly: null });
  const mix = composeRevenueMix({
    monthly: monthlyBase,
    setup: setupBase,
    addOnMonthly: arpuModel.addOn.base ?? arpuModel.addOn.low,
    serviceMonthly: arpuModel.managedService.base ?? arpuModel.managedService.low,
    transactional: streams.some((item) => item.type === "COMMISSION" || item.type === "TRANSACTION_FEE"),
  });
  const breakEven = composeBreakEven({
    monthlyFixedCost: input.monthlyFixedCost ?? null,
    monthlyContribution: monthlyBase,
  });
  const quality = assessRevenueQuality({
    coverageStatus: coverage.status,
    streams,
    annualContracts: /\bannual\b/i.test(packetText),
    serviceHeavy: /\b(managed|seo|content|done-for-you|setup)\b/i.test(packetText),
    transactional: streams.some((item) => item.type === "COMMISSION"),
  });
  const attractiveness = assessRevenueAttractiveness({
    coverageStatus: coverage.status,
    quality: quality.assessment,
    numericComparables: comparables.filter((row) => row.numericPricingContribution).length,
  });
  const categoryBenchmarks = input.packet.findings
    .filter((finding) => /category|benchmark|website-as-a-service|managed website retainer|vertical saas/i.test(finding.claim))
    .map((finding) => finding.claim);

  const directAnswer: DirectMoneyAnswer = {
    question: "How should this make money?",
    recommendedModel: recommended.recommendedModel,
    coreRevenue:
      coverage.evidence.monthlyPricingEvidence === "SUFFICIENT" && monthlyBase != null
        ? `Recurring core platform around ${formatUsdRange(monthly.low, monthly.high)} / month (${formatApproximateUsd(monthly.base ?? monthly.low)} base, COMPARABLE_MODELED).`
        : clues.length
          ? founderPricingCluesCopy(clues)
          : "UNKNOWN — no grounded public monthly price.",
    setupOnboarding: setupBase != null ? `${formatUsdRange(setup.low, setup.high)} one-time (not MRR).` : "UNKNOWN",
    upsells: streams.find((item) => item.type === "FREEMIUM_UPSELL")?.description ?? "UNKNOWN",
    billingStructure:
      [/\bmonthly\b/i.test(packetText) ? "monthly" : null, /\bannual\b/i.test(packetText) ? "annual" : null]
        .filter(Boolean)
        .join(" + ") || "UNKNOWN",
    expectedRecurringMix: mix.percentRecurring != null ? `${mix.percentRecurring}% recurring in a first-year scenario mix` : "UNKNOWN",
    why: recommended.rationale,
    confidence: recommended.confidence,
    remainingUnknowns: recommended.majorUnknowns.length ? recommended.majorUnknowns : coverage.nextMoneyResearchTargets,
    pricingClues: clues,
    pricingEvidence: coverage.evidence.monthlyPricingEvidence,
    structureEvidence: coverage.evidence.businessModelStructure,
  };
  const namedWithMoney = comparables.filter((row) => row.numericPricingContribution && (row.monthlyPrice.base != null || row.monthlyPrice.low != null)).map((row) => row.name);
  const explainability = {
    whatCurrentPlatformsDo: namedWithMoney.length
      ? `Current comparable platforms (${namedWithMoney.join(", ")}) publish recurring packages, often with setup/onboarding and add-on services.`
      : comparables.some((row) => row.strategicComparable)
        ? "Named strategic platforms exist, but public monetization evidence is still missing."
        : "UNKNOWN — no current-platform money evidence.",
    patternsFound: [
      monthlyBase != null ? "Public recurring monthly pricing" : null,
      setupBase != null ? "Setup/onboarding fees separate from MRR" : null,
      /\b(tier|package|plan)\b/i.test(packetText) ? "Tiered packaging" : null,
      streams.some((item) => item.type === "FREEMIUM_UPSELL") ? "Add-on / upsell streams" : null,
      /\bannual\b/i.test(packetText) ? "Annual contracts" : null,
    ].filter((item): item is string => Boolean(item)),
    whyRecommendedFollowsPatterns:
      recommended.recommendedModel === "UNKNOWN"
        ? "No recommended model until grounded monetization patterns exist."
        : `Recommended ${recommended.recommendedModel} because comparable monetization is recurring software plus service intensity, not a one-time project fee.`,
    whatVentureDoesDifferently:
      "This venture is not assumed to match any named competitor's exact package; modeled prices remain COMPARABLE_MODELED, not observed for this product.",
    modeledAssumptions: recommended.keyAssumptions,
    sourceBackedFacts: [
      ...clues.slice(0, 5),
      ...input.packet.findings
        .filter((finding) => finding.grounded && (finding.dimension === "pricing" || finding.dimension === "monetization"))
        .map((finding) => finding.claim),
    ].filter((item, index, all) => all.indexOf(item) === index)
      .slice(0, 8),
  };

  return {
    coverage,
    recommended,
    streams,
    architecture,
    revenuePerCustomer: rpc,
    mix,
    customerCountScenarios,
    bandScenarios,
    breakEven,
    contract: {
      monthly: /\bmonthly\b/i.test(packetText),
      annual: /\bannual\b/i.test(packetText),
      minimumTerm: packetText.match(/\b(\d+[- ]month)\b/i)?.[1] ?? null,
      contractLength: null,
      discount: packetText.match(/\b(\d+%\s+annual discount)\b/i)?.[1] ?? null,
      trial: packetText.match(/\b(\d+[- ]day trial)\b/i)?.[1] ?? null,
      setupFee: setupBase != null,
      cancellation: null,
      renewal: /\brenew/i.test(packetText) ? "renewal mentioned" : null,
      implementationPeriod: packetText.match(/\b(\d+[- ](?:day|week|month) implementation)\b/i)?.[1] ?? null,
    },
    quality,
    attractiveness,
    comparables,
    upsells: [...new Set(comparables.flatMap((row) => row.addOns))],
    categoryBenchmarks,
    pricingClusters: {
      recommended: arpuModel.recommendedPricingCluster ?? "WEBSITE_AS_A_SERVICE",
      selected: arpuModel.selectedPricingCluster ?? "WEBSITE_AS_A_SERVICE",
      reason: arpuModel.clusterReason,
      confidence: arpuModel.clusterConfidence,
      selfServe: arpuModel.selfServe,
      managedVertical: arpuModel.managedVertical,
      core: arpuModel.core,
    },
    directAnswer,
    explainability,
    costTelemetry: {
      queriesPlanned: null,
      queriesExecuted: null,
      providerCalls: null,
      estimatedCostUsd: null,
      costUnknown: true,
      stopReason: coverage.stopReason ?? (coverage.status === "REVENUE_MODEL_SUFFICIENT" ? "REVENUE_MODEL_SUFFICIENT" : null),
    },
    buildImplication: {
      revenueModelResearchGrantsBuild: false,
      reason: "COMPARABLE_MODELED / CATEGORY_BENCHMARK / SCENARIO_MODEL / FOUNDER_HYPOTHESIS cannot grant BUILD. Observed CAC/LTV gate is unchanged.",
    },
  };
}
