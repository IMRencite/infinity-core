import { formatRange, rangeHasValue } from "../comparable-economics/provenance";
import { formatApproximateUsd, presentUsdMetric } from "../money-presentation";
import type { FounderExplainability } from "./types";
import { activateEducatedEstimates, presentEducatedEstimates } from "../educated-estimates";
import type { FounderEconomicEstimateView } from "../educated-estimates/types";
import { activateProductAdvantage } from "../product-advantage";
import type { FounderProductAdvantageView } from "../product-advantage/types";
import { presentVentureBrief } from "../venture-brief";
import type { FounderVentureBriefView } from "../venture-brief/types";
import { buildFounderVentureBuildPlan } from "../build-plan";
import type { FounderVentureBuildPlan } from "../build-plan/types";
import { presentVentureCommandDeck } from "../command-deck";
import type { FounderVentureCommandDeck } from "../command-deck/types";

export type FounderComparableFrontRow = {
  name: string;
  role: string;
  whyComparable: string;
  strategicConfidence: string;
  economicConfidence: string;
  sourceCount: number;
  pricingEvidence: string;
  economicEvidence: string;
  noEconomicEvidence: boolean;
};

export type FounderIntelligenceFrontView = {
  decision: string | null;
  executiveSummary: string;
  why: string;
  whyNotValidate: string;
  whyNotReject: string;
  whyNotBuild: string;
  whatWouldChange: string[];
  nextValidation: string[];
  evidenceSummary: Array<{
    dimension: string;
    summary: string;
    strength: string;
    directCount: number;
    inferenceCount: number;
    sourceCount: number;
  }>;
  keyFindings: Array<{
    displayKind: string;
    dimension: string;
    claim: string;
    sourceCount: number;
  }>;
  scoreNotes: {
    opportunityQuality: string;
    selectionScore: string;
    portfolioAdjustedScore: string;
    validationScore: string;
    monetizationScore: string;
  };
  pricing: {
    status: string;
    recommendation: string;
    monthly: string;
    setup: string;
    provenance: string;
    confidence: string;
    unknown: boolean;
  };
  economics: {
    cac: string;
    ltv: string;
    ltvCac: string;
    arpu: string;
    grossMargin: string;
    payback: string;
    breakEven: string;
    attractiveness: string;
    provenance: string;
    confidence: string;
    unknown: boolean;
  };
  missingEconomicEvidence: string[];
  comparables: FounderComparableFrontRow[];
  sourceTrace: Array<{
    findingId: string;
    sourceUrl: string;
    dimension: string;
    scoreImpact: string;
  }>;
  howShouldThisMakeMoney?: {
    recommendedModel: string;
    coreRevenue: string;
    setupOnboarding: string;
    upsells: string;
    billingStructure: string;
    expectedRecurringMix: string;
    why: string;
    confidence: string;
    remainingUnknowns: string[];
    pricingClues?: string[];
    pricingEvidence?: string;
    pricingEvidenceStatus?: string;
    structureEvidence?: string;
    setupEvidenceStatus?: string;
    revenuePerCustomerStatus?: string;
    whatCurrentPlatformsDo: string;
    patternsFound: string[];
    whyRecommendedFollowsPatterns: string;
    whatVentureDoesDifferently: string;
    modeledAssumptions: string[];
    sourceBackedFacts: string[];
  };
  revenueModel?: {
    coverage: string;
    recommended: string;
    alternatives: string;
    quality: string;
    qualityReason: string;
    attractiveness: string;
    mrrPerCustomer: string;
    arrPerCustomer: string;
    firstYearRecurring: string;
    firstYearSetup: string;
    firstYearAddOn: string;
    firstYearPerCustomer: string;
    entry: string;
    base: string;
    premium: string;
    setup: string;
    streams: string[];
    upsells: string[];
    entryConfidence?: string;
    baseConfidence?: string;
    premiumConfidence?: string;
    setupConfidence?: string;
    entryBasis?: string;
    baseBasis?: string;
    premiumBasis?: string;
    annualOption?: string;
    perSeatFees?: string;
    firstYearGrossProfit?: string;
    scenarios: Array<{ customers: number; mrr: string; arr: string; setup: string; total: string }>;
    comparableRows: Array<{
      name: string;
      targetCustomer: string;
      revenueModel: string;
      monthly: string;
      annual: string;
      setup: string;
      recurring: string;
      addOns: string;
      contract: string;
      why: string;
      confidence: string;
      founderComparableRole?: string;
      numericPricingContribution?: boolean;
      priceRole?: string;
    }>;
    moneyGaps: string[];
    missingMoneyEvidence: string[];
    pricingEvidenceStatus?: string;
    arpuRange?: string;
    setupRange?: string;
    coreArpuRange?: string;
    managedArpuRange?: string;
    addOnArpuRange?: string;
    totalMonthlyRevenue?: string;
    setupEvidenceStatus?: string;
    recommendedPricingCluster?: string;
    selectedPricingCluster?: string;
    clusterReason?: string;
    selfServeArpuRange?: string;
    managedVerticalArpuRange?: string;
  };
  benchmarkEconomics?: {
    cac: string;
    ltv: string;
    ltvCac: string;
    ltvCacConservative: string;
    ltvCacBase: string;
    ltvCacUpside: string;
    margin: string;
    contributionMargin?: string;
    payback: string;
    paybackConservative?: string;
    paybackBase?: string;
    paybackUpside?: string;
    retention?: string;
    churn?: string;
    cacMethod?: string;
    cacBase?: string;
    attractivenessWhy?: string;
    risks?: string[];
    validationTargets?: string[];
    confidence: string;
    attractiveness: string;
    provenance: string;
    cacExplanation: string;
    ltvExplanation: string;
    marginExplanation: string;
    actualCac: string;
    actualLtv: string;
    sampleAccepted: number;
    mainUncertainty: string;
    nextToProve: string;
    sources: Array<{
      label: string;
      value: string;
      why: string;
      source: string;
      relevance: string;
      metric?: string;
      category?: string;
      date?: string;
    }>;
    coverageCac: string;
    coverageRetention: string;
    coverageMargin: string;
    coverageConversion: string;
    coverageSalesCycle: string;
        coverageOverall?: string;
        sourceQuality?: string;
        overallEconomicConfidence?: string;
        retentionEvidence?: string;
        unusedMarginEvidence?: Array<{ claim: string; values: string; why: string }>;
        cacPresentation?: {
          displayRange: string;
          displayBase: string;
          displayConfidence: string;
          displayQualifier: string;
          organic: string | null;
          paid: string | null;
          category: string | null;
        };
        cacOrganic?: string;
        cacPaid?: string;
        cacCategory?: string;
        cacIndependentSources?: number;
        sourceIndependence?: string;
        unknown: boolean;
      };
  educatedEstimates?: FounderEconomicEstimateView;
  educatedEstimatesSystem?: {
    observedCac: "UNKNOWN";
    observedLtv: "UNKNOWN";
    observedMargin: "UNKNOWN";
    cacProvenance: string;
    marginProvenance: string;
    ltvProvenance: string;
    grantsBuild: false;
  };
  productAdvantage?: FounderProductAdvantageView | null;
  ventureBrief?: FounderVentureBriefView;
  buildPlan?: FounderVentureBuildPlan;
  commandDeck?: FounderVentureCommandDeck;
};

function unknownOrRange(range: { low: number | null; base: number | null; high: number | null } | undefined, prefix = ""): string {
  if (!range || !rangeHasValue(range)) return "UNKNOWN";
  return formatRange(range, prefix);
}

function founderMoneyRange(
  range: { low: number | null; base: number | null; high: number | null } | undefined,
  confidence?: string,
): string {
  if (!range || !rangeHasValue(range)) return "UNKNOWN";
  const presented = presentUsdMetric({ range, confidence });
  if (range.low != null && range.high != null && range.low !== range.high) {
    return `${presented.displayRange}${range.base != null ? `; base ${presented.displayBase}` : ""}`;
  }
  return presented.displayBase;
}

function cacFrontDisplay(bench: FounderExplainability["benchmarkEconomics"]): string {
  const presentation = bench?.cacPresentation;
  if (presentation && presentation.displayBase !== "Not known yet") {
    return `${presentation.displayQualifier}: About ${presentation.displayBase.replace(/^~/, "")}`;
  }
  return founderUsdDisplay(bench?.modeled.cac.range, bench?.modeled.cac.confidence, bench?.coverage.cac);
}

function founderUsdDisplay(
  range: { low: number | null; base: number | null; high: number | null } | undefined,
  confidence: string | undefined,
  coverage: string | undefined,
): string {
  if (!range || !rangeHasValue(range)) return "UNKNOWN";
  const presented = presentUsdMetric({ range, confidence });
  const single =
    (range.low ?? range.base ?? range.high) != null && (range.low ?? range.base) === (range.high ?? range.base);
  if ((confidence === "LOW" || coverage === "BENCHMARK_PARTIAL") && single) {
    return `Preliminary estimate: ${presented.displayBase}`;
  }
  if (range.low != null && range.high != null && range.low !== range.high) {
    const base = range.base != null ? `; Base: ${presented.displayBase}` : "";
    return `Estimated range: ${presented.displayRange}${base}`;
  }
  return presented.displayBase;
}

export function buildFounderIntelligenceView(explain: FounderExplainability): FounderIntelligenceFrontView {
  const econ = explain.comparables;
  const pricingUnknown = !rangeHasValue(econ.pricing.recommendation?.monthly ?? econ.pricing.scenarios.find((row) => row.id === "BASE")?.monthly);
  const cacUnknown = !rangeHasValue(econ.outputs.cac);
  const ltvUnknown = !rangeHasValue(econ.outputs.ltv);
  const marginUnknown = !rangeHasValue(econ.outputs.grossMarginPercent);
  const missing: string[] = [];
  if (pricingUnknown) missing.push("public numeric pricing");
  if (cacUnknown) missing.push("CAC benchmark");
  if (!rangeHasValue(econ.ltv.monthlyChurn)) missing.push("retention/churn");
  if (marginUnknown) missing.push("gross margin");
  const rm = explain.revenueModel;
  const moneyGaps = rm?.coverage.nextMoneyResearchTargets?.length ? rm.coverage.nextMoneyResearchTargets : missing;
  const educated = activateEducatedEstimates(explain);
  const productAdvantage = activateProductAdvantage(explain);
  const ventureBrief = presentVentureBrief({
    educated,
    advantage: productAdvantage,
    attractiveness: (() => {
      const raw = String(explain.economics.health ?? "").toUpperCase();
      if (raw === "PROMISING_BUT_UNVALIDATED") return "Promising but unvalidated";
      if (raw === "ATTRACTIVE") return "Attractive";
      if (raw === "MARGINAL") return "Marginal";
      if (raw === "UNATTRACTIVE") return "Unattractive";
      return "Not enough data";
    })(),
    biggestRisk: productAdvantage?.summary.biggestEconomicUncertainty ?? explain.economics.willThisWork,
  });
  const buildPlan = buildFounderVentureBuildPlan({
    advantage: productAdvantage,
    educated,
    buildReady: false,
    recommendedModel: rm?.recommended?.recommendedModel ?? null,
  });
  const commandDeck = presentVentureCommandDeck({
    name: "This venture",
    concept: explain.executiveSummary,
    customer: buildPlan.mvp.idealCustomer,
    problem: productAdvantage?.summary.biggestPains[0] ?? buildPlan.mvp.coreProblem,
    solution: productAdvantage?.summary.strongestDifferentiator ?? buildPlan.mvp.corePromise,
    brief: ventureBrief,
    plan: buildPlan,
    scenarios: (rm?.customerCountScenarios ?? []).map((row) => ({
      customers: row.customers,
      mrr: row.mrr == null ? "Not known yet" : `$${Math.round(row.mrr)}`,
      arr: row.arr == null ? "Not known yet" : `$${Math.round(row.arr)}`,
    })),
  });

  return {
    decision: explain.decision.decision,
    executiveSummary: explain.executiveSummary,
    why: explain.decision.why,
    whyNotValidate: explain.decision.whyNotHigher,
    whyNotReject: explain.decision.whyNotLower,
    whyNotBuild: explain.decision.whyNotBuild,
    whatWouldChange: explain.decision.whatWouldChange,
    nextValidation: explain.decision.nextValidationQuestions,
    evidenceSummary: explain.evidenceSummary.map((item) => ({
      dimension: item.dimension,
      summary: item.summary,
      strength: item.strength,
      directCount: item.directCount,
      inferenceCount: item.inferenceCount,
      sourceCount: item.sourceCount,
    })),
    keyFindings: explain.keyFindings.map((item) => ({
      displayKind: item.displayKind,
      dimension: item.dimension,
      claim: item.claim,
      sourceCount: item.sourceRefs.length,
    })),
    scoreNotes: {
      opportunityQuality: explain.scores.opportunityQuality.note,
      selectionScore: explain.scores.selectionScore.note,
      portfolioAdjustedScore: explain.scores.portfolioAdjustedScore.note,
      validationScore: explain.scores.validationScore.note,
      monetizationScore: explain.scores.monetizationScore.note,
    },
    pricing: {
      status: pricingUnknown ? "Insufficient economic evidence" : "Comparable modeled recommendation",
      recommendation: explain.economics.pricingAnswer,
      monthly: unknownOrRange(econ.pricing.recommendation?.monthly ?? econ.pricing.scenarios.find((row) => row.id === "BASE")?.monthly, "$"),
      setup: unknownOrRange(econ.pricing.recommendation?.setup ?? econ.pricing.scenarios.find((row) => row.id === "BASE")?.setup, "$"),
      provenance: econ.pricing.provenance,
      confidence: econ.pricing.confidence,
      unknown: pricingUnknown,
    },
    economics: {
      cac: unknownOrRange(econ.outputs.cac, "$"),
      ltv: unknownOrRange(econ.outputs.ltv, "$"),
      ltvCac: unknownOrRange(econ.outputs.ltvCac),
      arpu: unknownOrRange(econ.outputs.arpu, "$"),
      grossMargin: unknownOrRange(econ.outputs.grossMarginPercent),
      payback: unknownOrRange(econ.outputs.paybackMonths),
      breakEven: unknownOrRange(econ.outputs.breakEvenCustomers),
      attractiveness: econ.health,
      provenance: explain.economics.provenance,
      confidence: econ.pricing.confidence,
      unknown: cacUnknown || ltvUnknown,
    },
    missingEconomicEvidence: missing,
    comparables: econ.comparables.map((item) => {
      const pricingEvidence = item.pricingEvidence.filter(Boolean);
      const economicEvidence = [...item.economicBenchmarkEvidence, ...item.businessModelEvidence].filter(Boolean);
      const noEconomic =
        item.economicComparable === false ||
        item.numericPricingContribution === false && item.economicComparable !== true ||
        item.confidence === "NONE" ||
        item.sourceRefs.length === 0 ||
        /without detailed economic/i.test(item.whyComparable);
      return {
        name: item.name,
        role: item.revenueModelRole
          ? `strategic:${item.strategicComparable ? "YES" : "NO"}; revenue-model:${item.revenueModelRole}; economic:${item.economicComparable ? "YES" : "NO"}`
          : item.category,
        whyComparable: item.whyComparable,
        strategicConfidence: item.confidenceBand,
        economicConfidence: item.confidence,
        sourceCount: item.sourceRefs.length,
        pricingEvidence: pricingEvidence.join(" | ") || "NONE",
        economicEvidence: economicEvidence.join(" | ") || "NONE",
        noEconomicEvidence: Boolean(noEconomic && item.numericPricingContribution !== true),
      };
    }),
    sourceTrace: explain.sourceTrace.slice(0, 16).map((row) => ({
      findingId: row.findingId,
      sourceUrl: row.sourceUrl,
      dimension: row.dimension,
      scoreImpact: row.scoreImpact,
    })),
    howShouldThisMakeMoney: {
      recommendedModel: rm?.directAnswer.recommendedModel ?? "UNKNOWN",
      coreRevenue: rm?.directAnswer.coreRevenue ?? "UNKNOWN",
      setupOnboarding: rm?.directAnswer.setupOnboarding ?? "UNKNOWN",
      upsells: rm?.directAnswer.upsells ?? "UNKNOWN",
      billingStructure: rm?.directAnswer.billingStructure ?? "UNKNOWN",
      expectedRecurringMix: rm?.directAnswer.expectedRecurringMix ?? "UNKNOWN",
      why: rm?.directAnswer.why ?? "Revenue-model research has not produced a grounded money model.",
      confidence: rm?.directAnswer.confidence ?? "NONE",
      remainingUnknowns: rm?.directAnswer.remainingUnknowns?.length ? rm.directAnswer.remainingUnknowns : ["UNKNOWN"],
      pricingClues: rm?.directAnswer.pricingClues ?? [],
      pricingEvidence: rm?.directAnswer.pricingEvidence ?? "INSUFFICIENT",
      pricingEvidenceStatus: rm?.coverage.pricingEvidenceStatus ?? rm?.directAnswer.pricingEvidence ?? "INSUFFICIENT",
      structureEvidence: rm?.directAnswer.structureEvidence ?? "INSUFFICIENT",
      setupEvidenceStatus: rm?.coverage.setupEvidenceStatus ?? "INSUFFICIENT",
      revenuePerCustomerStatus: rm?.coverage.revenuePerCustomerStatus ?? "INSUFFICIENT",
      whatCurrentPlatformsDo: rm?.explainability.whatCurrentPlatformsDo ?? "UNKNOWN",
      patternsFound: rm?.explainability.patternsFound?.length ? rm.explainability.patternsFound : ["UNKNOWN"],
      whyRecommendedFollowsPatterns: rm?.explainability.whyRecommendedFollowsPatterns ?? "UNKNOWN",
      whatVentureDoesDifferently: rm?.explainability.whatVentureDoesDifferently ?? "UNKNOWN",
      modeledAssumptions: rm?.explainability.modeledAssumptions?.length ? rm.explainability.modeledAssumptions : ["UNKNOWN"],
      sourceBackedFacts: rm?.explainability.sourceBackedFacts?.length ? rm.explainability.sourceBackedFacts : ["UNKNOWN"],
    },
    revenueModel: {
      coverage: rm?.coverage.status ?? "REVENUE_MODEL_INSUFFICIENT",
      recommended: rm?.recommended.recommendedModel ?? "UNKNOWN",
      alternatives: (rm?.recommended.alternativeModels ?? []).join(", ") || "NONE",
      quality: rm?.quality.assessment ?? "INSUFFICIENT_DATA",
      qualityReason: rm?.quality.reason ?? "UNKNOWN",
      attractiveness: rm?.attractiveness.assessment ?? "INSUFFICIENT_REVENUE_EVIDENCE",
      mrrPerCustomer: unknownOrRange(rm?.revenuePerCustomer.monthlyRecurring, "$"),
      arrPerCustomer: unknownOrRange(rm?.revenuePerCustomer.annualRecurring, "$"),
      firstYearRecurring: unknownOrRange(rm?.revenuePerCustomer.firstYearRecurring, "$"),
      firstYearSetup: unknownOrRange(rm?.revenuePerCustomer.firstYearSetup, "$"),
      firstYearAddOn: unknownOrRange(rm?.revenuePerCustomer.firstYearAddOn, "$"),
      firstYearPerCustomer: unknownOrRange(rm?.revenuePerCustomer.firstYearRevenue, "$"),
      entry: unknownOrRange(rm?.architecture.entry?.monthly, "$"),
      base: unknownOrRange(rm?.architecture.base?.monthly, "$"),
      premium: unknownOrRange(rm?.architecture.premium?.monthly, "$"),
      setup: unknownOrRange(rm?.architecture.setup, "$"),
      streams: (rm?.streams ?? []).map((item) => `${item.name} (${item.type}): ${item.description}`),
      upsells: rm?.upsells?.length ? rm.upsells : ["UNKNOWN"],
      entryConfidence: rm?.architecture.entry?.confidence ?? "NONE",
      baseConfidence: rm?.architecture.base?.confidence ?? "NONE",
      premiumConfidence: rm?.architecture.premium?.confidence ?? "NONE",
      setupConfidence: rm?.architecture.entry?.confidence ?? rm?.architecture.base?.confidence ?? "NONE",
      entryBasis: rm?.architecture.entry?.sourceBasis ?? "UNKNOWN",
      baseBasis: rm?.architecture.base?.sourceBasis ?? "UNKNOWN",
      premiumBasis: rm?.architecture.premium?.sourceBasis ?? "UNKNOWN",
      annualOption: unknownOrRange(rm?.architecture.base?.annual ?? rm?.architecture.entry?.annual ?? rm?.architecture.premium?.annual, "$"),
      perSeatFees:
        (rm?.streams ?? [])
          .filter((item) => item.type === "PER_SEAT" || item.type === "PER_USER" || item.type === "PER_LOCATION" || item.type === "USAGE_BASED")
          .map((item) => `${item.name}: ${item.description}`)
          .join("; ") || "UNKNOWN",
      firstYearGrossProfit: unknownOrRange(rm?.revenuePerCustomer.firstYearGrossProfit, "$"),
      scenarios: (rm?.customerCountScenarios ?? []).map((row) => ({
        customers: row.customers,
        mrr: row.mrr == null ? "UNKNOWN" : `$${Math.round(row.mrr)}`,
        arr: row.arr == null ? "UNKNOWN" : `$${Math.round(row.arr)}`,
        setup: row.setupRevenue == null ? "UNKNOWN" : `$${Math.round(row.setupRevenue)}`,
        total: row.totalFirstYearRevenue == null ? "UNKNOWN" : `$${Math.round(row.totalFirstYearRevenue)}`,
      })),
      comparableRows: (rm?.comparables ?? []).map((row) => ({
        name: row.name,
        targetCustomer: row.targetCustomer ?? "UNKNOWN",
        revenueModel: row.revenueModelType,
        monthly: founderMoneyRange(row.monthlyPrice, row.sourceConfidence),
        annual: founderMoneyRange(row.annualPrice, row.sourceConfidence),
        setup: founderMoneyRange(row.setupFee, row.sourceConfidence),
        recurring: row.recurring == null ? "UNKNOWN" : row.recurring ? "YES" : "NO",
        addOns: row.addOns.join(", ") || "UNKNOWN",
        contract: row.contractModel ?? "UNKNOWN",
        why: row.whyRelevant,
        confidence: row.sourceConfidence,
        founderComparableRole: row.founderComparableRole,
        numericPricingContribution: row.numericPricingContribution,
        priceRole: row.priceRole,
      })),
      moneyGaps: moneyGaps.length ? moneyGaps : ["UNKNOWN"],
      missingMoneyEvidence: rm?.coverage.researchableGaps?.length ? rm.coverage.researchableGaps : ["UNKNOWN"],
      pricingEvidenceStatus: rm?.coverage.pricingEvidenceStatus ?? "INSUFFICIENT",
      arpuRange: founderMoneyRange(
        rm?.revenuePerCustomer.arpuModel?.core ?? rm?.revenuePerCustomer.arpuModel?.range ?? rm?.revenuePerCustomer.monthlyRecurring,
        rm?.revenuePerCustomer.arpuModel?.confidence,
      ),
      setupRange: founderMoneyRange(rm?.revenuePerCustomer.firstYearSetup ?? rm?.architecture.setup),
      coreArpuRange: founderMoneyRange(rm?.revenuePerCustomer.coreRecurringARPU ?? rm?.revenuePerCustomer.arpuModel?.core, rm?.revenuePerCustomer.arpuModel?.confidence),
      managedArpuRange: founderMoneyRange(rm?.revenuePerCustomer.managedServiceARPU ?? rm?.revenuePerCustomer.arpuModel?.managedService),
      addOnArpuRange: founderMoneyRange(rm?.revenuePerCustomer.addOnARPU ?? rm?.revenuePerCustomer.arpuModel?.addOn),
      totalMonthlyRevenue: founderMoneyRange(
        rm?.revenuePerCustomer.totalModeledMonthlyRevenuePerCustomer ?? rm?.revenuePerCustomer.arpuModel?.total,
      ),
      setupEvidenceStatus: rm?.coverage.setupEvidenceStatus ?? "INSUFFICIENT",
      recommendedPricingCluster: rm?.pricingClusters?.recommended,
      selectedPricingCluster: rm?.pricingClusters?.selected,
      clusterReason: rm?.pricingClusters?.reason,
      selfServeArpuRange: founderMoneyRange(rm?.pricingClusters?.selfServe),
      managedVerticalArpuRange: founderMoneyRange(rm?.pricingClusters?.managedVertical),
    },
    benchmarkEconomics: (() => {
      const bench = explain.benchmarkEconomics;
      const percent = (range: { low: number | null; base: number | null; high: number | null } | undefined) => {
        if (!range || !rangeHasValue(range)) return "Not known yet";
        const fmt = (value: number | null) => (value == null ? null : `${Math.round(value * 100)}%`);
        if (range.low != null && range.high != null && range.low !== range.high) {
          return `${fmt(range.low)}–${fmt(range.high)}${range.base != null ? ` (base ${fmt(range.base)})` : ""}`;
        }
        return fmt(range.base ?? range.low ?? range.high) ?? "Not known yet";
      };
      const ratio = (value: number | null | undefined) => (value == null ? "Not known yet" : `${value}x`);
      const unknown = !bench || !rangeHasValue(bench.modeled.cac.range);
      return {
        cac: cacFrontDisplay(bench),
        ltv: unknownOrRange(bench?.modeled.ltv.range, "$"),
        ltvCac: unknownOrRange(bench?.modeled.ltvCac.range),
        ltvCacConservative: ratio(bench?.ltvCacScenarios.conservative),
        ltvCacBase: ratio(bench?.ltvCacScenarios.base),
        ltvCacUpside: ratio(bench?.ltvCacScenarios.upside),
        margin:
          !rangeHasValue(bench?.modeled.grossMargin.range) && (bench?.unusedMarginEvidence?.length ?? 0) > 0
            ? "Not enough reliable evidence yet"
            : percent(bench?.modeled.grossMargin.range),
        contributionMargin: percent(bench?.modeled.contributionMargin.range),
        payback: unknownOrRange(bench?.modeled.payback.range),
        paybackConservative: bench?.paybackScenarios.conservative == null ? "Not known yet" : `${Math.round(bench.paybackScenarios.conservative)} months`,
        paybackBase: bench?.paybackScenarios.base == null ? "Not known yet" : `${Math.round(bench.paybackScenarios.base)} months`,
        paybackUpside: bench?.paybackScenarios.upside == null ? "Not known yet" : `${Math.round(bench.paybackScenarios.upside)} months`,
        retention: rangeHasValue(bench?.modeled.lifetimeMonths.range)
          ? `${unknownOrRange(bench?.modeled.lifetimeMonths.range)} months lifetime`
          : percent(bench?.aggregations.monthly_churn?.acceptedRange) === "Not known yet"
            ? "Not known yet"
            : `${percent(bench?.aggregations.monthly_churn?.acceptedRange)} monthly churn`,
        churn: percent(bench?.aggregations.monthly_churn?.acceptedRange),
        cacMethod: bench?.componentCac.used
          ? (bench.sampleQuality.benchmarksAccepted ?? 0) > 0
            ? "mixed"
            : "channel model"
          : (bench?.sampleQuality.benchmarksAccepted ?? 0) > 0
            ? "direct benchmark"
            : "UNKNOWN",
        cacBase: bench?.cacPresentation?.displayBase ?? (bench?.modeled.cac.range.base != null ? formatApproximateUsd(bench.modeled.cac.range.base) : "UNKNOWN"),
        attractivenessWhy: bench?.attractivenessWhy ?? "UNKNOWN",
        risks: (bench?.sensitivity ?? []).map((item) => `${item.direction}: ${item.why}`),
        validationTargets: bench?.validationTargets ?? [],
        confidence: bench?.modeled.cac.confidence ?? "NONE",
        attractiveness: bench?.attractiveness ?? "INSUFFICIENT_DATA",
        provenance: bench?.modeled.cac.provenance ?? "UNKNOWN",
        cacExplanation:
          bench?.modeled.cac.calculation && !unknown
            ? "Infinity estimated CAC using paid-acquisition and category/comparable benchmarks. The actual cost is still unknown until this venture acquires real customers."
            : "We do not have enough trustworthy CAC benchmarks yet.",
        ltvExplanation:
          rangeHasValue(bench?.modeled.ltv.range)
            ? "Infinity estimated customer lifetime value using modeled monthly revenue, gross margin, and retention benchmarks."
            : !rangeHasValue(bench?.modeled.grossMargin.range)
              ? "LTV is blocked: usable gross-margin evidence is missing (no HIGH relevant benchmark, fewer than two independent MEDIUM benchmarks, and component costs are incomplete)."
              : !rangeHasValue(bench?.modeled.lifetimeMonths.range)
                ? "LTV is blocked: usable lifetime/retention evidence is missing."
                : !rangeHasValue(bench?.modeled.arpu.range)
                  ? "LTV is blocked: usable core monthly revenue is missing."
                  : "Customer lifetime value cannot be estimated until margin and retention evidence exist.",
        marginExplanation: rangeHasValue(bench?.modeled.grossMargin.range)
          ? "Gross margin is estimated from category/comparable evidence, not a generic SaaS default."
          : (bench?.unusedMarginEvidence?.length ?? 0) > 0
            ? bench!.unusedMarginEvidence!.map((item) => item.why).join("; ")
            : "Gross margin is not known yet; a generic 80% SaaS margin is not assumed.",
        actualCac: "UNKNOWN",
        actualLtv: "UNKNOWN",
        sampleAccepted: bench?.sampleQuality.benchmarksAccepted ?? 0,
        mainUncertainty: bench?.mainUncertainty ?? "Customer acquisition cost is still unknown.",
        nextToProve: bench?.nextToProve ?? "Measure real CAC on a bounded acquisition test.",
        sources: (bench?.qualified ?? [])
          .filter((item) => item.relevance === "HIGH_RELEVANCE" || item.relevance === "MEDIUM_RELEVANCE")
          .filter((item) => {
            const outliers = new Set(
              Object.values(bench?.aggregations ?? {}).flatMap((row) => row?.rejectedOutliers.map((obs) => obs.observationId) ?? []),
            );
            return !outliers.has(item.observationId);
          })
          .slice(0, 8)
          .map((item) => ({
            label: item.companyName || item.categoryLabel || item.dimension.replace(/_/g, " "),
            value: unknownOrRange(item.range, item.unit === "usd" ? "$" : item.unit === "percent" ? "" : ""),
            why: item.whyRelevant,
            source: item.sourceUrl,
            relevance: item.relevance,
            metric: item.dimension,
            category: item.categoryLabel || item.companyName || item.dimension.replace(/_/g, " "),
            date: item.publishedAt || item.retrievedAt || "Date not recorded",
          })),
        coverageCac: bench?.coverage.cac ?? "BENCHMARK_INSUFFICIENT",
        coverageRetention: bench?.coverage.retention ?? "BENCHMARK_INSUFFICIENT",
        coverageMargin: bench?.coverage.grossMargin ?? "BENCHMARK_INSUFFICIENT",
        coverageConversion: bench?.coverage.conversion ?? "BENCHMARK_INSUFFICIENT",
        coverageSalesCycle: bench?.coverage.salesCycle ?? "BENCHMARK_INSUFFICIENT",
        coverageOverall: bench?.coverage.overall ?? "BENCHMARK_INSUFFICIENT",
        sourceQuality: bench?.qualified[0]?.sourceClass ?? "UNKNOWN",
        overallEconomicConfidence: bench?.overallEconomicConfidence ?? bench?.modeled.cac.confidence ?? "NONE",
        retentionEvidence: rangeHasValue(bench?.modeled.lifetimeMonths.range)
          ? `${unknownOrRange(bench?.modeled.lifetimeMonths.range)} months lifetime`
          : "Not lifetime-compatible from current churn evidence",
        unusedMarginEvidence: bench?.unusedMarginEvidence ?? [],
        cacPresentation: bench?.cacPresentation,
        cacOrganic: bench?.cacPresentation?.organic ?? (bench?.channelCac.organic != null ? formatApproximateUsd(bench.channelCac.organic) : undefined),
        cacPaid: bench?.cacPresentation?.paid ?? (bench?.channelCac.paid != null ? formatApproximateUsd(bench.channelCac.paid) : undefined),
        cacCategory: bench?.cacPresentation?.category ?? (bench?.channelCac.category != null ? formatApproximateUsd(bench.channelCac.category) : undefined),
        cacIndependentSources: bench?.channelCac.independentSourceCount,
        sourceIndependence: bench?.sampleQuality.independenceState ?? "INDEPENDENCE_UNKNOWN",
        unknown,
      };
    })(),
    educatedEstimates: presentEducatedEstimates(educated),
    educatedEstimatesSystem: {
      observedCac: "UNKNOWN",
      observedLtv: "UNKNOWN",
      observedMargin: "UNKNOWN",
      cacProvenance: educated.cac.selected?.provenance ?? "UNKNOWN",
      marginProvenance: educated.margin.selected?.provenance ?? "UNKNOWN",
      ltvProvenance: educated.ltv?.provenance ?? "UNKNOWN",
      grantsBuild: false,
    },
    productAdvantage,
    ventureBrief,
    buildPlan,
    commandDeck,
  };
}

export function parseFounderIntelligenceView(raw: unknown): FounderIntelligenceFrontView | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as FounderIntelligenceFrontView;
    if (!parsed || typeof parsed !== "object" || !parsed.executiveSummary) return null;
    return parsed;
  } catch {
    return null;
  }
}
