/**
 * Founder-facing Money presentation model.
 * Maps persisted intelligence only — no financial math, research, or writes.
 */
import { buildFounderFriendlyBrief } from "./founder-brief";
import {
  confidenceDisplay,
  founderFacingCopy,
  founderKnownOr,
  isUnknownToken,
  revenueModelSentence,
  translateStatus,
} from "./founder-language";
import type { FounderIntelligenceFrontView } from "./view";
import { evidenceStrengthLabel, independenceDisplay, type IndependenceState } from "../revenue-model-research/source-independence";
import { emptyEducatedEconomicsModel, presentEducatedEstimates } from "../educated-estimates";
import type { FounderEconomicEstimateView } from "../educated-estimates/types";

type Meta = Record<string, string | number | boolean | null>;

export type FounderMoneyComparable = {
  name: string;
  category: string;
  whatItSells: string;
  revenueModel: string;
  knownPricing: string;
  setupFee: string;
  addOns: string;
  cacBenchmark: string;
  retentionBenchmark: string;
  marginBenchmark: string;
  whyRelevant: string;
  confidence: string;
  source: string;
  strategicOnly: boolean;
  noEconomicEvidence: boolean;
  founderRole: string;
};

export type FounderMoneyBenchmark = {
  metric: string;
  benchmark: string;
  range: string;
  category: string;
  why: string;
  source: string;
  date: string;
  confidence: string;
};

export type FounderMoneyScenario = {
  customers: number;
  mrr: string;
  arr: string;
  setup: string;
  firstYear: string;
  grossProfit: string;
  notForecast: true;
};

export type FounderMoneyRisk = {
  text: string;
  impact: "high" | "medium" | "low" | "unknown";
};

export type FounderMoneyPricingField = {
  label: string;
  price: string;
  confidence: string;
  evidenceBasis: string;
  known: boolean;
};

export type FounderMoneyView = {
  empty: boolean;
  summary: {
    recommendedModel: string;
    revenueModelConfidence: string;
    monthlyRevenuePerCustomer: string;
    corePlatformPricing: string;
    managedServicePricing: string;
    addOnToolPricing: string;
    totalMonthlyCustomerRevenue: string;
    setupRevenuePerCustomer: string;
    cac: string;
    ltv: string;
    ltvCac: string;
    grossMargin: string;
    payback: string;
    economicAttractiveness: string;
    selfServePlatformPricing?: string;
    managedVerticalPricing?: string;
    recommendedPricingCluster?: string;
    corePricingConfidence?: string;
  };
  actualEconomics: {
    revenue: string;
    cac: string;
    ltv: string;
    margin: string;
  };
  modeledEconomics: {
    pricing: string;
    cac: string;
    ltv: string;
    ltvCac: string;
    margin: string;
    payback: string;
  };
  revenueModel: {
    recommendedModel: string;
    primaryRecurring: string;
    setupOnboarding: string;
    addOns: string;
    managedService: string;
    transaction: string;
    billingCadence: string;
    why: string;
    confidence: string;
  };
  pricing: FounderMoneyPricingField[];
  revenuePerCustomer: {
    monthlyRecurring: string;
    corePlatform: string;
    managedService: string;
    addOnTool: string;
    totalMonthly: string;
    annualRecurring: string;
    firstYearRecurring: string;
    firstYearSetup: string;
    firstYearAddOn: string;
    firstYearTotal: string;
  };
  unitEconomics: {
    cac: string;
    ltv: string;
    ltvCac: string;
    grossMargin: string;
    contributionMargin: string;
    payback: string;
    retention: string;
    confidence: string;
    note: string;
  };
  cacDetail: {
    actual: string;
    estimated: string;
    base: string;
    range: string;
    organic: string;
    paid: string;
    category: string;
    independentSources: string;
    confidence: string;
    basedOn: string;
    method: string;
    mainUncertainty: string;
    nextValidation: string;
  };
  ltvDetail: {
    actual: string;
    estimated: string;
    base: string;
    basedOn: string;
    mainUncertainty: string;
  };
  ltvCacDetail: {
    conservative: string;
    base: string;
    upside: string;
    modeledNotObserved: true;
    explanation: string;
  };
  paybackDetail: {
    conservative: string;
    base: string;
    upside: string;
    note: string;
  };
  scenarios: FounderMoneyScenario[];
  comparables: FounderMoneyComparable[];
  streams: string[];
  upsells: string[];
  risks: FounderMoneyRisk[];
  validationTargets: string[];
  benchmarks: FounderMoneyBenchmark[];
  known: string[];
  stillNeed: string[];
  researchNext: string[];
  presentation: {
    pricingClues: string[];
    pricingEvidenceStatus: string;
    pricingConfidence: string;
    arpuRange: string;
    coreArpuRange: string;
    managedArpuRange: string;
    addOnArpuRange: string;
    totalMonthlyRevenue: string;
    setupRange: string;
    setupEvidenceStatus: string;
    cacEstimate: string;
    cacConfidence: string;
    retentionEvidence: string;
    ltv: string;
    ltvCac: string;
    margin: string;
    marginEvidenceFound: string;
    marginWhyNotUsed: string;
    payback: string;
    overallEconomicConfidence: string;
    sourceQuality: string;
    remainingGaps: string[];
    evidenceStrength?: string;
    sourceIndependence?: string;
    marginExplanation?: string;
    ltvBlocker?: string;
    selfServePlatforms?: string;
    managedVerticalPlatforms?: string;
    recommendedCluster?: string;
    basedOnSourceCount?: string;
  };
  bestEstimate: FounderEconomicEstimateView;
};

const ACTUAL_NOT_MEASURED = "Not measured yet";
const NOT_ENOUGH_PRICING = "Not enough pricing evidence yet";
const NOT_ENOUGH_MARGIN = "Not enough reliable evidence yet";
const NOT_KNOWN = "Not known yet";
const MARKET_NOTE =
  "These are estimates based on comparable businesses and market benchmarks. They are not actual results from this venture.";
const LTV_CAC_NOTE =
  "Base LTV/CAC compares the modeled base customer value with the modeled base acquisition cost.";
const PAYBACK_NOTE = "Payback uses modeled monthly contribution margin, not revenue alone.";

const METRIC_LABEL: Record<string, string> = {
  customer_acquisition_cost: "CAC",
  cost_per_click: "Cost per click",
  cost_per_lead: "Cost per lead",
  lead_to_customer_conversion: "Lead-to-customer conversion",
  trial_to_paid_conversion: "Trial-to-paid conversion",
  demo_to_close_conversion: "Demo-to-close conversion",
  sales_close_rate: "Close rate",
  sales_cycle_days: "Sales cycle",
  monthly_churn: "Churn",
  annual_churn: "Annual churn",
  retention_rate: "Retention",
  customer_lifetime: "Customer lifetime",
  gross_margin: "Gross margin",
  contribution_margin: "Contribution margin",
  ARPU: "ARPU",
  ACV: "ACV",
  expansion_revenue: "Expansion revenue",
  net_revenue_retention: "Net revenue retention",
};

export function moneyAttractivenessLabel(value: unknown): string {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "PROMISING_BUT_UNVALIDATED") return "Promising but unvalidated";
  if (raw === "ATTRACTIVE") return "Attractive";
  if (raw === "MARGINAL") return "Marginal";
  if (raw === "UNATTRACTIVE") return "Unattractive";
  if (!raw || raw === "UNKNOWN" || raw === "NONE" || raw === "INSUFFICIENT_DATA" || raw === "INSUFFICIENT_REVENUE_EVIDENCE") {
    return "Not enough data";
  }
  return translateStatus(value);
}

function display(value: unknown, fallback = NOT_KNOWN): string {
  if (isUnknownToken(value)) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;
  if (raw === raw.toUpperCase() && raw.includes("_")) return translateStatus(raw);
  return founderFacingCopy(raw);
}

function estimatedLabel(value: unknown): string {
  const shown = display(value);
  if (shown === NOT_KNOWN || shown === NOT_ENOUGH_PRICING || shown === NOT_ENOUGH_MARGIN) return shown;
  if (/estimated|preliminary|about |not enough/i.test(shown)) return shown;
  return `${shown} estimated`;
}

function withMonths(value: unknown): string {
  const shown = display(value);
  if (shown === NOT_KNOWN) return shown;
  if (/month/i.test(shown)) return shown;
  return `${shown} months`;
}

function moneyKnown(value: unknown): boolean {
  if (isUnknownToken(value)) return false;
  const raw = String(value).trim();
  return Boolean(raw) && raw !== NOT_KNOWN && raw !== NOT_ENOUGH_PRICING && raw !== NOT_ENOUGH_MARGIN && raw !== "Not enough data" && raw !== "Not enough evidence";
}

function metricLabel(dimension: string): string {
  return METRIC_LABEL[dimension] ?? dimension.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function cacMethodFromView(view: FounderIntelligenceFrontView | null): string {
  const method = view?.benchmarkEconomics?.cacMethod;
  if (method && !isUnknownToken(method)) return method;
  const calc = view?.benchmarkEconomics?.cacExplanation ?? "";
  if (/channel/i.test(calc) && /benchmark/i.test(calc)) return "mixed";
  if (/channel|paid-acquisition|paid acquisition/i.test(calc)) return "channel model";
  if (/direct/i.test(calc)) return "direct benchmark";
  if (moneyKnown(view?.benchmarkEconomics?.cac)) return "direct benchmark";
  return NOT_KNOWN;
}

function pricingField(label: string, price: unknown, confidence: unknown, basis: unknown): FounderMoneyPricingField {
  const known = moneyKnown(price);
  return {
    label,
    price: known ? display(price) : NOT_ENOUGH_PRICING,
    confidence: known ? confidenceDisplay(confidence) : "Not enough data",
    evidenceBasis: known ? display(basis, "Comparable public pricing") : "Not enough pricing evidence yet",
    known,
  };
}

function mergeComparables(view: FounderIntelligenceFrontView | null): FounderMoneyComparable[] {
  const byName = new Map<string, FounderMoneyComparable>();
  for (const item of view?.comparables ?? []) {
    const key = item.name.trim().toLowerCase();
    if (!key) continue;
    const strategicOnly = item.noEconomicEvidence;
    byName.set(key, {
      name: item.name,
      category: display(item.role, "Comparable business"),
      whatItSells: display(item.whyComparable, "Not known yet from public evidence"),
      revenueModel: "Not known yet",
      knownPricing: strategicOnly ? "No economic evidence" : display(item.pricingEvidence, "No economic evidence"),
      setupFee: NOT_KNOWN,
      addOns: NOT_KNOWN,
      cacBenchmark: NOT_KNOWN,
      retentionBenchmark: NOT_KNOWN,
      marginBenchmark: NOT_KNOWN,
      whyRelevant: display(item.whyComparable),
      confidence: display(item.economicConfidence === "NONE" ? item.strategicConfidence : item.economicConfidence),
      source: item.sourceCount > 0 ? `${item.sourceCount} persisted sources` : "No source URL recorded",
      strategicOnly,
      noEconomicEvidence: strategicOnly,
      founderRole: display(item.role, "Named in research — not used for pricing"),
    });
  }
  for (const row of view?.revenueModel?.comparableRows ?? []) {
    const key = row.name.trim().toLowerCase();
    if (!key) continue;
    const existing = byName.get(key);
    const founderRole = display(row.founderComparableRole, existing?.founderRole ?? existing?.category ?? "Comparable business");
    const noMoney =
      existing?.noEconomicEvidence === true &&
      isUnknownToken(row.monthly) &&
      isUnknownToken(row.setup) &&
      row.numericPricingContribution !== true;
    const merged: FounderMoneyComparable = {
      name: existing?.name ?? row.name,
      category: founderRole,
      whatItSells: display(row.why, existing?.whatItSells ?? "Not known yet from public evidence"),
      revenueModel: display(row.revenueModel, existing?.revenueModel ?? "Not known yet"),
      knownPricing: noMoney
        ? "No economic evidence"
        : moneyKnown(row.monthly)
          ? display(row.monthly)
          : existing?.knownPricing && existing.knownPricing !== "No economic evidence"
            ? existing.knownPricing
            : "No economic evidence",
      setupFee: moneyKnown(row.setup) ? display(row.setup) : existing?.setupFee ?? NOT_KNOWN,
      addOns: moneyKnown(row.addOns) ? display(row.addOns) : existing?.addOns ?? NOT_KNOWN,
      cacBenchmark: existing?.cacBenchmark ?? NOT_KNOWN,
      retentionBenchmark: existing?.retentionBenchmark ?? NOT_KNOWN,
      marginBenchmark: existing?.marginBenchmark ?? NOT_KNOWN,
      whyRelevant: display(row.why, existing?.whyRelevant ?? "Named as a comparable"),
      confidence: confidenceDisplay(row.confidence),
      source: existing?.source ?? "Persisted comparable research",
      strategicOnly: noMoney && /strategic competitor/i.test(founderRole),
      noEconomicEvidence: noMoney || (!moneyKnown(row.monthly) && !moneyKnown(row.setup) && (existing?.noEconomicEvidence ?? true)),
      founderRole,
    };
    byName.set(key, merged);
  }
  return [...byName.values()];
}

function scenarioCards(view: FounderIntelligenceFrontView | null): FounderMoneyScenario[] {
  const rows = view?.revenueModel?.scenarios ?? [];
  const wanted = [10, 25, 50, 100];
  return wanted.map((customers) => {
    const row = rows.find((item) => item.customers === customers);
    return {
      customers,
      mrr: display(row?.mrr),
      arr: display(row?.arr),
      setup: display(row?.setup),
      firstYear: display(row?.total),
      grossProfit: "Not available",
      notForecast: true,
    };
  });
}

function riskRank(text: string, direction: string): FounderMoneyRisk["impact"] {
  if (/downside|higher|lower|compress|resist|not scale/i.test(`${direction} ${text}`)) return "high";
  if (/upside/i.test(direction)) return "low";
  return "medium";
}

function defaultRisks(view: FounderIntelligenceFrontView | null): FounderMoneyRisk[] {
  const fromView = (view?.benchmarkEconomics?.risks ?? []).map((item) => {
    const [direction, ...rest] = item.split(":");
    const text = rest.join(":").trim() || item;
    return { text: display(text), impact: riskRank(text, direction ?? "") };
  });
  if (fromView.length) {
    return fromView.sort((a, b) => {
      const order = { high: 0, medium: 1, unknown: 2, low: 3 };
      return order[a.impact] - order[b.impact];
    });
  }
  const generated: FounderMoneyRisk[] = [
    { text: "CAC could be higher than benchmark", impact: "high" },
    { text: "Retention could be lower than the modeled lifetime", impact: "high" },
  ];
  generated.push({ text: "Service labor could compress margins", impact: "medium" });
  generated.push({ text: "Customers may resist proposed pricing", impact: "medium" });
  generated.push({ text: "Paid acquisition may not scale", impact: "medium" });
  return generated;
}

export function buildFounderMoneyView(
  view: FounderIntelligenceFrontView | null,
  metadata: Meta = {},
): FounderMoneyView {
  const brief = buildFounderFriendlyBrief(view, metadata);
  const rm = view?.revenueModel;
  const how = view?.howShouldThisMakeMoney;
  const bench = view?.benchmarkEconomics;
  const empty = brief.money.unknown && !brief.market.hasEstimates && !moneyKnown(view?.pricing.monthly);
  const attractiveness = moneyAttractivenessLabel(bench?.attractiveness ?? rm?.attractiveness ?? view?.economics.attractiveness);
  const streams = (rm?.streams ?? []).filter((item) => !isUnknownToken(item));
  const managed = streams.find((item) => /managed|service|retainer/i.test(item)) ?? NOT_KNOWN;
  const transaction = streams.find((item) => /transaction|commission|take-rate|marketplace/i.test(item)) ?? "Not relevant";
  const perSeat = streams.find((item) => /PER_SEAT|PER_USER|PER_LOCATION|per-seat|per-location|usage/i.test(item));
  const pricing: FounderMoneyPricingField[] = [
    pricingField("Entry tier", rm?.entry, rm?.entryConfidence ?? how?.confidence, rm?.entryBasis ?? view?.pricing.provenance),
    pricingField("Base tier", rm?.base ?? view?.pricing.monthly, rm?.baseConfidence ?? view?.pricing.confidence, rm?.baseBasis ?? view?.pricing.provenance),
    pricingField("Premium tier", rm?.premium, rm?.premiumConfidence ?? how?.confidence, rm?.premiumBasis ?? view?.pricing.provenance),
    pricingField("Setup / onboarding", rm?.setup ?? view?.pricing.setup, rm?.setupConfidence ?? view?.pricing.confidence, view?.pricing.provenance),
    pricingField("Annual option", rm?.annualOption, how?.confidence, view?.pricing.provenance),
    pricingField("Per-seat / per-location / usage", perSeat ?? rm?.perSeatFees, how?.confidence, "Revenue-stream evidence"),
  ];
  const addOnKnown = (rm?.upsells ?? []).filter((item) => !isUnknownToken(item));
  if (addOnKnown.length) {
    pricing.push({
      label: "Add-ons",
      price: addOnKnown.slice(0, 4).join("; "),
      confidence: confidenceDisplay(how?.confidence ?? rm?.quality),
      evidenceBasis: "Comparable add-on evidence",
      known: true,
    });
  } else {
    pricing.push({
      label: "Add-ons",
      price: NOT_ENOUGH_PRICING,
      confidence: "Not enough data",
      evidenceBasis: "Not enough pricing evidence yet",
      known: false,
    });
  }
  const stillNeed = [
    ...(!moneyKnown(rm?.base) && !moneyKnown(view?.pricing.monthly) ? ["Validate proposed pricing"] : []),
    ...(!moneyKnown(bench?.cac) ? ["Acquire customers below modeled CAC ceiling"] : ["Acquire customers below modeled CAC ceiling"]),
    ...(!moneyKnown(bench?.ltv) ? ["Measure real close rate"] : []),
    "Measure early churn",
    "Measure service delivery cost",
    ...(!moneyKnown(bench?.margin) ? ["Confirm gross margin"] : ["Confirm gross margin"]),
    "Confirm upsell demand",
    ...(brief.market.validationTargets ?? []),
    ...(bench?.validationTargets ?? []),
  ]
    .filter((item, index, all) => item && all.indexOf(item) === index)
    .slice(0, 8);
  const known: string[] = [];
  if (!brief.money.unknown) known.push(`Recommended model: ${brief.money.recommended}`);
  if (moneyKnown(how?.whatCurrentPlatformsDo)) known.push(display(how?.whatCurrentPlatformsDo));
  if (moneyKnown(rm?.qualityReason)) known.push(display(rm?.qualityReason));
  if (!known.length && brief.money.explanation) known.push(brief.money.explanation);
  const researchNext = brief.nextResearch.length
    ? brief.nextResearch
    : ["Find real pricing from comparable platforms.", "Find CAC benchmarks for this customer/channel.", "Find churn/retention benchmarks."];
  const comparables = mergeComparables(view);
  const benchmarks: FounderMoneyBenchmark[] = (bench?.sources ?? []).map((item) => ({
    metric: metricLabel(item.metric ?? item.label),
    benchmark: display(item.label),
    range: display(item.value),
    category: display(item.category ?? item.label),
    why: display(item.why),
    source: display(item.source, "Source URL not recorded"),
    date: display(item.date, "Date not recorded"),
    confidence: display(item.relevance ? translateStatus(item.relevance) : confidenceDisplay(bench?.confidence)),
  }));
  const cacPresentation = bench?.cacPresentation;
  const cacBase = cacPresentation?.displayBase ?? display(bench?.cacBase ?? bench?.cac);
  const cacRange = cacPresentation?.displayRange ?? display(bench?.cac);
  const cacLine =
    cacPresentation && cacPresentation.displayBase !== "Not known yet"
      ? `About ${cacPresentation.displayBase.replace(/^~/, "")}`
      : display(bench?.cac);
  const cacConfidence = cacPresentation?.displayConfidence ?? confidenceDisplay(bench?.confidence);
  const unusedMargin = bench?.unusedMarginEvidence ?? [];
  const marginKnown = moneyKnown(bench?.margin) && !/^0\s*%/.test(String(bench?.margin ?? "").trim());
  const marginDisplay = !marginKnown && unusedMargin.length ? NOT_ENOUGH_MARGIN : display(bench?.margin);
  const marginEvidenceFound = unusedMargin.length
    ? unusedMargin.map((item) => `${item.values} — ${item.claim}`).join("; ")
    : NOT_KNOWN;
  const marginWhyNotUsed = unusedMargin.length ? unusedMargin.map((item) => item.why).join("; ") : "";
  const corePricing = display(rm?.coreArpuRange ?? rm?.arpuRange ?? rm?.mrrPerCustomer);
  const managedPricing = display(rm?.managedArpuRange);
  const addOnPricing = display(rm?.addOnArpuRange);
  const totalMonthly = display(rm?.totalMonthlyRevenue);

  return {
    empty,
    summary: {
      recommendedModel: empty ? "Not enough evidence yet" : brief.money.recommended,
      revenueModelConfidence: empty ? "Not enough data" : brief.money.confidence,
      monthlyRevenuePerCustomer: empty ? NOT_KNOWN : estimatedLabel(corePricing),
      corePlatformPricing: empty ? NOT_KNOWN : display(corePricing),
      managedServicePricing: empty ? NOT_KNOWN : display(managedPricing),
      addOnToolPricing: empty ? NOT_KNOWN : display(addOnPricing),
      totalMonthlyCustomerRevenue: empty ? NOT_KNOWN : display(totalMonthly),
      setupRevenuePerCustomer: empty ? NOT_KNOWN : estimatedLabel(rm?.setup ?? brief.money.setup),
      cac: empty ? NOT_KNOWN : estimatedLabel(cacLine),
      ltv: empty ? NOT_KNOWN : estimatedLabel(bench?.ltv),
      ltvCac: empty ? NOT_KNOWN : estimatedLabel(bench?.ltvCacBase ?? bench?.ltvCac),
      grossMargin: empty ? NOT_KNOWN : estimatedLabel(marginDisplay),
      payback: empty ? NOT_KNOWN : estimatedLabel(withMonths(bench?.payback)),
      economicAttractiveness: attractiveness,
      selfServePlatformPricing: empty ? NOT_KNOWN : display(rm?.selfServeArpuRange),
      managedVerticalPricing: empty ? NOT_KNOWN : display(rm?.managedVerticalArpuRange),
      recommendedPricingCluster: empty ? NOT_KNOWN : display(rm?.recommendedPricingCluster ?? rm?.selectedPricingCluster),
      corePricingConfidence: empty ? "Not enough data" : confidenceDisplay(rm?.baseConfidence ?? how?.confidence),
    },
    actualEconomics: {
      revenue: ACTUAL_NOT_MEASURED,
      cac: ACTUAL_NOT_MEASURED,
      ltv: ACTUAL_NOT_MEASURED,
      margin: ACTUAL_NOT_MEASURED,
    },
    modeledEconomics: {
      pricing: display(view?.pricing.monthly ?? rm?.base, NOT_ENOUGH_PRICING),
      cac: cacLine,
      ltv: display(bench?.ltv),
      ltvCac: display(bench?.ltvCacBase ?? bench?.ltvCac),
      margin: marginDisplay,
      payback: withMonths(bench?.payback),
    },
    revenueModel: {
      recommendedModel: empty ? "Not enough evidence yet" : brief.money.recommended,
      primaryRecurring: display(how?.coreRevenue, brief.money.unknown ? NOT_KNOWN : brief.money.monthly),
      setupOnboarding: display(how?.setupOnboarding ?? rm?.setup, brief.money.setup),
      addOns: display(how?.upsells ?? addOnKnown.join("; ")),
      managedService: display(managed, "Not relevant"),
      transaction: display(transaction, "Not relevant"),
      billingCadence: display(how?.billingStructure ?? how?.expectedRecurringMix, brief.money.howOften),
      why: display(how?.why, brief.money.explanation),
      confidence: confidenceDisplay(how?.confidence ?? rm?.quality),
    },
    pricing,
    revenuePerCustomer: {
      monthlyRecurring: display(corePricing),
      corePlatform: display(corePricing),
      managedService: display(managedPricing),
      addOnTool: display(addOnPricing),
      totalMonthly: display(totalMonthly),
      annualRecurring: display(rm?.arrPerCustomer),
      firstYearRecurring: display(rm?.firstYearRecurring),
      firstYearSetup: display(rm?.setupRange ?? rm?.firstYearSetup),
      firstYearAddOn: display(rm?.firstYearAddOn),
      firstYearTotal: display(rm?.firstYearPerCustomer),
    },
    unitEconomics: {
      cac: cacLine,
      ltv: display(bench?.ltv),
      ltvCac: display(bench?.ltvCac),
      grossMargin: marginDisplay,
      contributionMargin: display(bench?.contributionMargin),
      payback: withMonths(bench?.payback),
      retention: display(bench?.retention ?? bench?.churn),
      confidence: confidenceDisplay(bench?.overallEconomicConfidence ?? bench?.confidence),
      note: MARKET_NOTE,
    },
    cacDetail: {
      actual: ACTUAL_NOT_MEASURED,
      estimated: cacLine,
      base: cacBase,
      range: cacRange,
      organic: display(bench?.cacOrganic ?? cacPresentation?.organic),
      paid: display(bench?.cacPaid ?? cacPresentation?.paid),
      category: display(bench?.cacCategory ?? cacPresentation?.category),
      independentSources: bench?.cacIndependentSources != null ? String(bench.cacIndependentSources) : NOT_KNOWN,
      confidence: cacConfidence,
      basedOn: `${bench?.sampleAccepted ?? 0} accepted benchmarks`,
      method: cacMethodFromView(view),
      mainUncertainty: display(bench?.mainUncertainty, "Customer acquisition cost is still unproven."),
      nextValidation: display(bench?.nextToProve, "Measure real CAC on a bounded acquisition test."),
    },
    ltvDetail: {
      actual: ACTUAL_NOT_MEASURED,
      estimated: display(bench?.ltv),
      base: display(bench?.ltv),
      basedOn: "core monthly revenue, margin, and lifetime",
      mainUncertainty: moneyKnown(bench?.ltv)
        ? display(bench?.mainUncertainty, "Retention and margin are still unproven.")
        : display(
            bench?.ltvExplanation,
            "LTV is blocked until usable margin exists. Setup is not required.",
          ),
    },
    ltvCacDetail: {
      conservative: display(bench?.ltvCacConservative),
      base: display(bench?.ltvCacBase ?? bench?.ltvCac),
      upside: display(bench?.ltvCacUpside),
      modeledNotObserved: true,
      explanation: LTV_CAC_NOTE,
    },
    paybackDetail: {
      conservative: withMonths(bench?.paybackConservative),
      base: withMonths(bench?.paybackBase ?? bench?.payback),
      upside: withMonths(bench?.paybackUpside),
      note: PAYBACK_NOTE,
    },
    scenarios: scenarioCards(view),
    comparables,
    streams: streams.length ? streams.map((item) => display(item)) : [],
    upsells: addOnKnown.map((item) => display(item)),
    risks: empty ? [] : defaultRisks(view),
    validationTargets: stillNeed,
    benchmarks,
    known: known.length ? known : ["Category and competitor names exist, but money evidence is still thin."],
    stillNeed: empty
      ? ["pricing", "CAC", "retention", "margin"]
      : stillNeed,
    researchNext,
    presentation: {
      pricingClues: how?.pricingClues ?? [],
      pricingEvidenceStatus: display(how?.pricingEvidenceStatus ?? how?.pricingEvidence ?? rm?.coverage, "INSUFFICIENT"),
      pricingConfidence: display(how?.pricingEvidence ?? rm?.coverage, "Not enough data"),
      arpuRange: display(corePricing),
      coreArpuRange: display(corePricing),
      managedArpuRange: display(managedPricing),
      addOnArpuRange: display(addOnPricing),
      totalMonthlyRevenue: display(totalMonthly),
      setupRange: display(rm?.setupRange ?? rm?.setup),
      setupEvidenceStatus: display(how?.setupEvidenceStatus ?? rm?.setupEvidenceStatus, "INSUFFICIENT"),
      cacEstimate: cacLine,
      cacConfidence,
      retentionEvidence: display(bench?.retentionEvidence ?? bench?.retention ?? bench?.churn),
      ltv: display(bench?.ltv),
      ltvCac: display(bench?.ltvCacBase ?? bench?.ltvCac),
      margin: marginDisplay,
      marginEvidenceFound,
      marginWhyNotUsed,
      payback: withMonths(bench?.payback),
      overallEconomicConfidence: display(bench?.overallEconomicConfidence ?? bench?.confidence, "Not enough data"),
      sourceQuality: display(bench?.sourceQuality, "Not recorded"),
      remainingGaps: [
        ...(how?.pricingEvidence && how.pricingEvidence !== "SUFFICIENT" ? ["pricing evidence"] : []),
        ...(how?.setupEvidenceStatus && how.setupEvidenceStatus !== "SUFFICIENT" ? ["setup/onboarding"] : []),
        ...(bench?.coverageCac && bench.coverageCac !== "BENCHMARK_SUFFICIENT" ? ["CAC quality"] : []),
        ...(bench?.coverageRetention && bench.coverageRetention !== "BENCHMARK_SUFFICIENT" ? ["retention"] : []),
        ...(bench?.coverageMargin && bench.coverageMargin !== "BENCHMARK_SUFFICIENT" ? ["margin"] : []),
        ...(bench?.coverageOverall && bench.coverageOverall !== "BENCHMARK_SUFFICIENT" ? ["unit economics closure"] : []),
      ],
      evidenceStrength: evidenceStrengthLabel({
        coverage: how?.pricingEvidence ?? bench?.coverageOverall ?? "INSUFFICIENT",
        highCount: 0,
        mediumCount: how?.pricingEvidence === "SUFFICIENT" ? 2 : 0,
        lowCount: how?.pricingEvidence === "PARTIAL" || how?.pricingEvidence === "INSUFFICIENT" ? 1 : 0,
      }),
      sourceIndependence: independenceDisplay(
        (bench?.sourceIndependence as IndependenceState | undefined) ??
          (/vertexaisearch/i.test(JSON.stringify(bench?.sources ?? [])) ? "INDEPENDENCE_UNKNOWN" : "PARTIALLY_KNOWN"),
      ),
      marginExplanation: marginKnown
        ? "Gross/contribution margin is estimated from category or component-cost evidence."
        : unusedMargin.length
          ? unusedMargin.map((item) => item.why).join("; ")
          : "Missing: a relevant gross-margin benchmark or enough grounded cost inputs (hosting, AI/API, support, content, service labor, payment processing).",
      ltvBlocker: moneyKnown(bench?.ltv)
        ? "Not applicable"
        : display(
            bench?.ltvExplanation,
            "LTV is blocked: usable gross-margin evidence is missing (no HIGH relevant benchmark, fewer than two independent MEDIUM benchmarks, and component costs are incomplete).",
          ),
      selfServePlatforms: display(rm?.selfServeArpuRange),
      managedVerticalPlatforms: display(rm?.managedVerticalArpuRange),
      recommendedCluster: display(rm?.selectedPricingCluster ?? rm?.recommendedPricingCluster),
      basedOnSourceCount: String(bench?.sampleAccepted ?? 0),
    },
    bestEstimate: view?.educatedEstimates ?? presentEducatedEstimates(emptyEducatedEconomicsModel()),
  };
}

export function moneyViewHasNumericEstimates(model: FounderMoneyView): boolean {
  return (
    moneyKnown(model.modeledEconomics.cac) ||
    moneyKnown(model.modeledEconomics.ltv) ||
    moneyKnown(model.modeledEconomics.ltvCac) ||
    moneyKnown(model.modeledEconomics.margin)
  );
}
