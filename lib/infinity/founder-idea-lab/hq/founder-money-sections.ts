import type { InspectorSection, InspectorSectionRow } from "@/lib/infinity/operator-console/artifacts/inspector-types";
import { namedInspectorRow } from "@/lib/infinity/operator-console/details/insight-metrics";
import { FOUNDER_TERM_HELP } from "../educated-estimates";
import type { FounderEstimateHeroMetric } from "../educated-estimates/types";
import { buildFounderMoneyView, type FounderMoneyView } from "../explainability/money-view";
import type { FounderIntelligenceFrontView } from "../explainability/view";
import { CONTRIBUTION_PROFIT_HELP } from "../venture-brief/types";
import type { FounderVentureBriefView } from "../venture-brief/types";

export const FOUNDER_MONEY_SECTION_IDS = [
  "money-venture-brief",
  "money-how-it-works",
  "money-customer-economics",
  "money-best-estimate",
  "money-revenue-model",
  "money-customer-worth",
  "money-scenarios",
  "money-pricing",
  "money-comparables",
  "money-risks",
  "money-prove",
  "money-methodology",
  "money-summary",
  "money-actual",
  "money-estimated",
  "money-revenue-per-customer",
  "money-market-unit-economics",
  "money-cac",
  "money-ltv",
  "money-ltv-cac",
  "money-payback",
  "money-streams",
  "money-benchmark-sources",
  "money-known",
  "money-still-need",
  "money-research-next",
] as const;

type Meta = Record<string, string | number | boolean | null>;

function markMoney(section: InspectorSection): InspectorSection {
  return { ...section, presentation: "primary" };
}

function founderMetricRow(
  id: string,
  label: string,
  value: string,
  extra: Partial<InspectorSectionRow> = {},
): InspectorSectionRow {
  return { ...namedInspectorRow(id, label, value), ...extra };
}

function evidenceLabel(confidence: FounderEstimateHeroMetric["confidence"]): string {
  if (confidence === "Strong") return "Strong evidence";
  if (confidence === "Moderate") return "Moderate evidence";
  if (confidence === "Weak") return "Weak evidence";
  return "Weak evidence";
}

function heroRow(metric: FounderEstimateHeroMetric): InspectorSectionRow {
  return founderMetricRow(
    `money-best-${metric.id}`,
    metric.label,
    metric.primary,
    {
      primaryValue: metric.primary,
      help: metric.help,
      actualLabel: "Not measured",
      estimateKind: metric.kind === "actual" ? "actual" : "estimated",
      evidenceLabel: evidenceLabel(metric.confidence),
      detail: metric.why,
      kind: metric.secondary ? "secondary" : "hero",
      value: metric.range === metric.primary ? metric.primary : `${metric.primary} · ${metric.range}`,
    },
  );
}

function ventureBriefSection(brief: FounderVentureBriefView | undefined, model: FounderMoneyView): InspectorSection {
  const metrics = brief?.metrics ?? [];
  return markMoney({
    id: "money-venture-brief",
    title: "Infinity Venture Brief",
    layout: "metric-hero",
    toneGroup: "summary",
    badge: "Estimated",
    lead: brief?.outlook ?? model.summary.economicAttractiveness,
    rows: [
      founderMetricRow("venture-outlook", "Venture outlook", brief?.outlook ?? model.summary.economicAttractiveness, {
        kind: "outlook",
        primaryValue: brief?.outlook ?? model.summary.economicAttractiveness,
      }),
      founderMetricRow("venture-summary", "Summary", brief?.summary ?? model.bestEstimate.conclusion, {
        kind: "conclusion",
        primaryValue: brief?.summary ?? model.bestEstimate.conclusion,
      }),
      ...metrics.map((item) =>
        founderMetricRow(`venture-${item.id}`, item.label, item.primary, {
          primaryValue: item.primary,
          help: item.help,
          actualLabel: "Not measured",
          estimateKind: item.kind === "actual" ? "actual" : item.kind === "modeled" ? "modeled" : "estimated",
          evidenceLabel: evidenceLabel(item.confidence),
          kind: item.id === "contribution" || item.id === "ltv" || item.id === "cac" ? "hero" : "secondary",
          value: item.range === item.primary ? item.primary : `${item.primary} · ${item.range}`,
        }),
      ),
      ...(brief?.advantage.cards ?? []).map((card) =>
        founderMetricRow(`venture-adv-${card.id}`, card.label, card.value, {
          primaryValue: card.value,
          evidenceLabel: card.evidence,
          kind: "secondary",
        }),
      ),
    ],
  });
}

function howMoneyWorksSection(brief: FounderVentureBriefView | undefined): InspectorSection {
  const profit = brief?.profit;
  return markMoney({
    id: "money-how-it-works",
    title: "How the money could work",
    layout: "cards",
    toneGroup: "estimated",
    rows: [
      founderMetricRow("how-pay", "One customer pays", profit?.monthlyRevenue ?? "Not enough evidence yet", {
        primaryValue: profit?.monthlyRevenue ?? "—",
        help: FOUNDER_TERM_HELP.estimated,
        numeric: true,
      }),
      founderMetricRow("how-cost", "Estimated variable cost", profit?.monthlyVariableCost ?? "Not enough evidence yet", {
        primaryValue: profit?.monthlyVariableCost ?? "—",
        help: "Modeled hosting, AI/API, support, payments, and service labor. Missing costs are not treated as zero.",
        numeric: true,
      }),
      founderMetricRow("how-profit", "Estimated contribution profit", profit?.monthlyContributionProfit ?? "Not enough evidence yet", {
        primaryValue: profit?.monthlyContributionProfit ?? "—",
        help: CONTRIBUTION_PROFIT_HELP,
        numeric: true,
      }),
      founderMetricRow("how-life", "Expected lifetime", brief?.metrics.find((item) => item.id === "lifetime")?.primary ?? "Not enough evidence yet", {
        primaryValue: brief?.metrics.find((item) => item.id === "lifetime")?.primary ?? "—",
      }),
      founderMetricRow("how-life-contrib", "Estimated lifetime contribution", profit?.lifetimeContribution ?? "Not enough evidence yet", {
        primaryValue: profit?.lifetimeContribution ?? "—",
        help: CONTRIBUTION_PROFIT_HELP,
        numeric: true,
      }),
      founderMetricRow("how-cac", "Acquisition cost", brief?.metrics.find((item) => item.id === "cac")?.primary ?? "Not enough evidence yet", {
        primaryValue: brief?.metrics.find((item) => item.id === "cac")?.primary ?? "—",
        help: FOUNDER_TERM_HELP.cac,
        numeric: true,
      }),
      founderMetricRow("how-warning", "Watch-out", profit?.warning ?? "No first-year contribution shortfall is modeled."),
    ],
  });
}

function customerEconomicsSection(brief: FounderVentureBriefView | undefined): InspectorSection {
  return markMoney({
    id: "money-customer-economics",
    title: "Customer economics",
    layout: "waterfall",
    toneGroup: "scenario",
    rows: (brief?.profit.waterfall ?? []).map((item) =>
      founderMetricRow(`waterfall-${item.id}`, item.label, item.value, {
        primaryValue: item.value,
        numeric: true,
        kind: "hero",
      }),
    ),
  });
}

function bestEstimateSection(model: FounderMoneyView): InspectorSection {
  const estimate = model.bestEstimate;
  const hero = estimate.hero ?? [];
  const secondary = estimate.secondary ?? [];
  return markMoney({
    id: "money-best-estimate",
    title: "Infinity's Best Estimate",
    layout: "metric-hero",
    toneGroup: "summary",
    badge: "Estimated",
    collapsible: true,
    collapseLabel: "See the breakdown",
    rows: [
      founderMetricRow("money-best-conclusion", "Infinity's take", estimate.conclusion, {
        kind: "conclusion",
        primaryValue: estimate.conclusion,
      }),
      ...hero.map(heroRow),
      ...secondary.map(heroRow),
    ],
  });
}

function methodologySection(model: FounderMoneyView): InspectorSection {
  const estimate = model.bestEstimate;
  return markMoney({
    id: "money-methodology",
    title: "How Infinity estimates these numbers",
    collapsible: true,
    collapseLabel: "How Infinity estimates these numbers",
    rows: [
      founderMetricRow("money-method-actual", "Actual", FOUNDER_TERM_HELP.actual, { help: FOUNDER_TERM_HELP.actual, kind: "methodology" }),
      founderMetricRow("money-method-estimate", "Market estimate", FOUNDER_TERM_HELP.estimated, { help: FOUNDER_TERM_HELP.estimated, kind: "methodology" }),
      founderMetricRow("money-method-scenario", "Scenario estimate", FOUNDER_TERM_HELP.modeled, { help: FOUNDER_TERM_HELP.modeled, kind: "methodology" }),
      founderMetricRow("money-method-founder", "Founder assumption", "A number the founder supplied, labeled as such.", { kind: "methodology" }),
      founderMetricRow("money-method-confidence", "Confidence", FOUNDER_TERM_HELP.confidence, { help: FOUNDER_TERM_HELP.confidence, kind: "methodology" }),
      founderMetricRow("money-method-independence", "Source independence", FOUNDER_TERM_HELP.sourceIndependence, {
        help: FOUNDER_TERM_HELP.sourceIndependence,
        kind: "methodology",
      }),
      founderMetricRow("money-method-note", "Important", estimate.note, { kind: "methodology" }),
      founderMetricRow("money-best-build", "Build implication", "Modeled estimates cannot approve BUILD."),
      ...(estimate.methodology ?? []).map((item, index) => founderMetricRow(`money-method-line-${index}`, "Method", item, { kind: "methodology" })),
    ],
  });
}

function customerWorthSection(model: FounderMoneyView): InspectorSection {
  const estimate = model.bestEstimate;
  const scenarios = estimate.revenueScenarios ?? [];
  const firstYear = estimate.firstYear ?? {
    coreOnly: "Not enough evidence yet",
    corePlusAddOn: "Not enough evidence yet",
    corePlusManaged: "Not enough evidence yet",
    fullService: "Not enough evidence yet",
  };
  return markMoney({
    id: "money-customer-worth",
    title: "What one customer could be worth",
    layout: "cards",
    toneGroup: "estimated",
    rows: [
      founderMetricRow("money-worth-fy-core", "First-year revenue / customer", firstYear.coreOnly, {
        primaryValue: firstYear.coreOnly,
        help: "Setup plus 12 months of core subscription. This is revenue, not lifetime value.",
        estimateKind: "estimated",
        evidenceLabel: "Weak evidence",
        detail: "First-year customer revenue = setup + 12 × monthly core revenue. Not LTV and not profit.",
      }),
      founderMetricRow("money-worth-ltv", "Estimated customer lifetime value", estimate.rows.find((row) => row.metric === "LTV")?.base ?? "Not enough evidence yet", {
        primaryValue: estimate.rows.find((row) => row.metric === "LTV")?.base ?? "—",
        help: FOUNDER_TERM_HELP.ltv,
        estimateKind: "modeled",
        evidenceLabel: estimate.rows.find((row) => row.metric === "LTV")?.confidence === "Insufficient" ? "Weak evidence" : `${estimate.rows.find((row) => row.metric === "LTV")?.confidence ?? "Weak"} evidence`,
        detail: estimate.rows.find((row) => row.metric === "LTV")?.why ?? "Educated estimate — not observed.",
      }),
      ...scenarios.map((item) =>
        founderMetricRow(`money-worth-${item.id.toLowerCase()}`, item.label, item.firstYear, {
          primaryValue: item.firstYear,
          help: item.assumption,
          estimateKind: item.id === "CORE_ONLY" ? "estimated" : "modeled",
          detail: `${item.assumption} Monthly: ${item.monthly}.`,
        }),
      ),
    ],
  });
}

function emptyState(model: FounderMoneyView, brief?: FounderVentureBriefView): InspectorSection[] {
  return [
    ventureBriefSection(brief, model),
    bestEstimateSection(model),
    markMoney({
      id: "money-summary",
      title: "Money Summary",
      toneGroup: "summary",
      emptyMessage: "We do not have enough market evidence yet to estimate the economics of this idea.",
      rows: [
        namedInspectorRow("money-summary-status", "Economic attractiveness", model.summary.economicAttractiveness),
      ],
    }),
    markMoney({
      id: "money-known",
      title: "What we know",
      rows: [],
      bullets: model.known,
    }),
    markMoney({
      id: "money-still-need",
      title: "What we still need",
      rows: [],
      bullets: model.stillNeed,
    }),
    markMoney({
      id: "money-research-next",
      title: "What Infinity should research next",
      rows: [],
      bullets: model.researchNext,
    }),
  ];
}

function comparableRows(model: FounderMoneyView): InspectorSection["rows"] {
  if (!model.comparables.length) {
    return [namedInspectorRow("money-comparables-empty", "Comparables", "No comparable businesses are persisted yet.")];
  }
  return model.comparables.map((item, index) =>
    namedInspectorRow(
      `money-comparable-${index}`,
      item.name,
      item.noEconomicEvidence || item.strategicOnly
        ? `${item.founderRole}. No economic evidence. What it sells: ${item.whatItSells} Why relevant: ${item.whyRelevant} Confidence: ${item.confidence} Source: ${item.source}`
        : `${item.founderRole}. What it sells: ${item.whatItSells} Revenue model: ${item.revenueModel} Known pricing: ${item.knownPricing} Setup: ${item.setupFee} Add-ons: ${item.addOns} CAC: ${item.cacBenchmark} Retention: ${item.retentionBenchmark} Margin: ${item.marginBenchmark} Why relevant: ${item.whyRelevant} Confidence: ${item.confidence} Source: ${item.source}`,
    ),
  );
}

function fullState(model: FounderMoneyView, brief?: FounderVentureBriefView): InspectorSection[] {
  const knownPricing = model.pricing.filter((item) => item.known);
  const pricingRows = knownPricing.length
    ? knownPricing.map((item, index) =>
        namedInspectorRow(
          `money-price-${index}`,
          item.label,
          `${item.price} · Confidence: ${item.confidence} · Evidence: ${item.evidenceBasis}`,
        ),
      )
    : [namedInspectorRow("money-price-empty", "Pricing", "Not enough pricing evidence yet")];
  const scenarioRows = model.scenarios.map((row) =>
    namedInspectorRow(
      `money-scenario-${row.customers}`,
      `${row.customers} customers`,
      `MRR ${row.mrr}; ARR ${row.arr}; setup ${row.setup}; first-year ${row.firstYear}; gross profit ${row.grossProfit}`,
    ),
  );
  const benchmarkRows = model.benchmarks.length
    ? model.benchmarks.map((item, index) =>
        namedInspectorRow(
          `money-bench-${index}`,
          item.metric,
          `${item.range} · ${item.category} · ${item.why} · ${item.source} · ${item.date} · ${item.confidence}`,
        ),
      )
    : [namedInspectorRow("money-bench-empty", "Benchmarks", "No founder-readable benchmark sources are persisted yet.")];

  return [
    ventureBriefSection(brief, model),
    howMoneyWorksSection(brief),
    customerEconomicsSection(brief),
    bestEstimateSection(model),
    markMoney({
      id: "money-revenue-model",
      title: "How this business makes money",
      rows: [
        founderMetricRow("money-rm-recommended", "Recommended model", model.revenueModel.recommendedModel),
        founderMetricRow("money-rm-recurring", "Primary recurring revenue", model.revenueModel.primaryRecurring),
        founderMetricRow("money-rm-setup", "Setup/onboarding", model.revenueModel.setupOnboarding, { help: FOUNDER_TERM_HELP.estimated }),
        founderMetricRow("money-rm-addons", "Add-ons/upsells", model.revenueModel.addOns),
        founderMetricRow("money-rm-managed", "Managed service revenue", model.revenueModel.managedService),
        founderMetricRow("money-rm-transaction", "Transaction/commission revenue", model.revenueModel.transaction),
        founderMetricRow("money-rm-cadence", "Billing cadence", model.revenueModel.billingCadence),
        founderMetricRow("money-rm-why", "Why Infinity recommends this model", model.revenueModel.why),
        founderMetricRow("money-rm-confidence", "Confidence", model.revenueModel.confidence, { help: FOUNDER_TERM_HELP.confidence }),
      ],
    }),
    customerWorthSection(model),
    markMoney({
      id: "money-scenarios",
      title: "What could this look like at scale?",
      badge: "SCENARIO — NOT FORECAST",
      layout: "cards",
      toneGroup: "scenario",
      rows: scenarioRows,
    }),
    markMoney({
      id: "money-pricing",
      title: "Pricing & Packaging",
      rows: [
        namedInspectorRow("money-price-evidence-status", "Pricing evidence status", model.presentation.pricingEvidenceStatus),
        namedInspectorRow("money-price-setup-status", "Setup evidence status", model.presentation.setupEvidenceStatus),
        ...pricingRows,
      ],
    }),
    markMoney({
      id: "money-comparables",
      title: "What similar businesses tell us",
      rows: comparableRows(model).map((row) => ({ ...row, secondary: row.value, numeric: /\$/.test(row.value) })),
    }),
    markMoney({
      id: "money-risks",
      title: "What could break the economics?",
      rows: model.risks.map((item, index) =>
        namedInspectorRow(`money-risk-${index}`, item.impact === "high" ? "High impact" : item.impact === "low" ? "Lower impact" : "Impact", item.text),
      ),
      bullets: model.risks.map((item) => `${item.impact === "high" ? "High" : item.impact === "low" ? "Lower" : "Medium"} impact: ${item.text}`),
    }),
    markMoney({
      id: "money-prove",
      title: "What we need to learn before building",
      rows: [],
      bullets: model.validationTargets,
    }),
    methodologySection(model),
    markMoney({
      id: "money-summary",
      title: "Money Summary",
      toneGroup: "summary",
      rows: [
        namedInspectorRow("money-summary-model", "Recommended model", model.summary.recommendedModel),
        namedInspectorRow("money-summary-confidence", "Revenue-model confidence", model.summary.revenueModelConfidence),
        namedInspectorRow("money-summary-core", "Core platform pricing", model.summary.corePlatformPricing),
        namedInspectorRow("money-summary-self-serve", "Self-serve platforms", model.summary.selfServePlatformPricing ?? "Not known yet"),
        namedInspectorRow("money-summary-managed-vertical", "Comparable managed/vertical platforms", model.summary.managedVerticalPricing ?? "Not known yet"),
        namedInspectorRow("money-summary-cluster", "Infinity's most relevant pricing cluster", model.summary.recommendedPricingCluster ?? "Not known yet"),
        namedInspectorRow("money-summary-core-conf", "Estimated core pricing confidence", model.summary.corePricingConfidence ?? "Not enough data"),
        namedInspectorRow("money-summary-managed", "Managed-service pricing", model.summary.managedServicePricing),
        namedInspectorRow("money-summary-addon", "Add-on/tool pricing", model.summary.addOnToolPricing),
        namedInspectorRow("money-summary-total", "Estimated total monthly customer revenue", model.summary.totalMonthlyCustomerRevenue),
        namedInspectorRow("money-summary-monthly", "Monthly revenue/customer", model.summary.monthlyRevenuePerCustomer),
        namedInspectorRow("money-summary-setup", "Setup/customer", model.summary.setupRevenuePerCustomer),
        namedInspectorRow("money-summary-cac", "CAC", model.summary.cac),
        namedInspectorRow("money-summary-ltv", "LTV", model.summary.ltv),
        namedInspectorRow("money-summary-ltv-cac", "LTV/CAC", model.summary.ltvCac),
        namedInspectorRow("money-summary-margin", "Gross margin", model.summary.grossMargin),
        namedInspectorRow("money-summary-payback", "Payback", model.summary.payback),
        namedInspectorRow("money-summary-status", "Status", model.summary.economicAttractiveness),
      ],
    }),
    markMoney({
      id: "money-actual",
      title: "Actual venture numbers",
      toneGroup: "actual",
      rows: [
        namedInspectorRow("money-actual-revenue", "Revenue", model.actualEconomics.revenue),
        namedInspectorRow("money-actual-cac", "CAC", model.actualEconomics.cac),
        namedInspectorRow("money-actual-ltv", "LTV", model.actualEconomics.ltv),
        namedInspectorRow("money-actual-margin", "Margin", model.actualEconomics.margin),
      ],
    }),
    markMoney({
      id: "money-estimated",
      title: "Market estimates",
      toneGroup: "estimated",
      rows: [
        namedInspectorRow("money-est-pricing", "Pricing", model.modeledEconomics.pricing),
        namedInspectorRow("money-est-cac", "CAC", model.modeledEconomics.cac),
        namedInspectorRow("money-est-ltv", "LTV", model.modeledEconomics.ltv),
        namedInspectorRow("money-est-ltv-cac", "LTV/CAC", model.modeledEconomics.ltvCac),
        namedInspectorRow("money-est-margin", "Margin", model.modeledEconomics.margin),
        namedInspectorRow("money-est-payback", "Payback", model.modeledEconomics.payback),
      ],
    }),
    markMoney({
      id: "money-revenue-per-customer",
      title: "Revenue per customer",
      rows: [
        namedInspectorRow("money-rpc-core", "Core platform pricing", model.revenuePerCustomer.corePlatform),
        namedInspectorRow("money-rpc-managed", "Managed-service pricing", model.revenuePerCustomer.managedService),
        namedInspectorRow("money-rpc-addon", "Add-on/tool pricing", model.revenuePerCustomer.addOnTool),
        namedInspectorRow("money-rpc-total", "Estimated total monthly customer revenue", model.revenuePerCustomer.totalMonthly),
        namedInspectorRow("money-rpc-arpu", "Modeled ARPU range", model.presentation.arpuRange),
        namedInspectorRow("money-rpc-mrr", "Monthly recurring revenue/customer", model.revenuePerCustomer.monthlyRecurring),
        namedInspectorRow("money-rpc-arr", "Annual recurring revenue/customer", model.revenuePerCustomer.annualRecurring),
        namedInspectorRow("money-rpc-fy-recurring", "First-year recurring revenue/customer", model.revenuePerCustomer.firstYearRecurring),
        namedInspectorRow("money-rpc-fy-setup", "First-year setup revenue/customer", model.revenuePerCustomer.firstYearSetup),
        namedInspectorRow("money-rpc-setup-range", "Setup range", model.presentation.setupRange),
        namedInspectorRow("money-rpc-fy-addon", "First-year add-on revenue/customer", model.revenuePerCustomer.firstYearAddOn),
        namedInspectorRow("money-rpc-fy-total", "First-year total revenue/customer", model.revenuePerCustomer.firstYearTotal),
      ],
    }),
    markMoney({
      id: "money-market-unit-economics",
      title: "What the market says about the numbers",
      rows: [
        namedInspectorRow("money-ue-cac", "Estimated CAC", model.unitEconomics.cac),
        namedInspectorRow("money-ue-ltv", "Estimated LTV", model.unitEconomics.ltv),
        namedInspectorRow("money-ue-ratio", "Estimated LTV/CAC", model.unitEconomics.ltvCac),
        namedInspectorRow("money-ue-margin", "Estimated gross margin", model.unitEconomics.grossMargin),
        namedInspectorRow("money-ue-margin-found", "Margin evidence found", model.presentation.marginEvidenceFound),
        namedInspectorRow("money-ue-margin-why", "Why margin was not used", model.presentation.marginWhyNotUsed || "Not applicable"),
        namedInspectorRow("money-ue-contribution", "Estimated contribution margin", model.unitEconomics.contributionMargin),
        namedInspectorRow("money-ue-payback", "Estimated payback", model.unitEconomics.payback),
        namedInspectorRow("money-ue-retention", "Retention/churn estimate", model.unitEconomics.retention),
        namedInspectorRow("money-ue-confidence", "Confidence", model.unitEconomics.confidence),
        namedInspectorRow("money-ue-source-quality", "Source quality", model.presentation.sourceQuality),
        namedInspectorRow("money-ue-evidence-strength", "Evidence strength", model.presentation.evidenceStrength ?? "Weak"),
        namedInspectorRow("money-ue-based-on", "Based on", `${model.presentation.basedOnSourceCount ?? "0"} sources`),
        namedInspectorRow("money-ue-independence", "Source independence", model.presentation.sourceIndependence ?? "Unknown"),
        namedInspectorRow("money-ue-margin-how", "How Infinity estimated margin", model.presentation.marginExplanation ?? "Not known yet"),
        namedInspectorRow("money-ue-note", "Note", model.unitEconomics.note),
      ],
    }),
    markMoney({
      id: "money-cac",
      title: "Customer acquisition cost",
      rows: [
        namedInspectorRow("money-cac-actual", "Actual CAC", model.cacDetail.actual),
        namedInspectorRow("money-cac-estimated", "Estimated CAC", model.presentation.cacEstimate),
        namedInspectorRow("money-cac-base", "Base estimate", model.cacDetail.base),
        namedInspectorRow("money-cac-range", "Range", model.cacDetail.range),
        namedInspectorRow("money-cac-organic", "Organic benchmark", model.cacDetail.organic),
        namedInspectorRow("money-cac-paid", "Paid benchmark", model.cacDetail.paid),
        namedInspectorRow("money-cac-category", "Category / generic benchmark", model.cacDetail.category),
        namedInspectorRow("money-cac-independent", "Independent sources", model.cacDetail.independentSources),
        namedInspectorRow("money-cac-confidence", "Confidence", model.presentation.cacConfidence),
        namedInspectorRow("money-cac-based-on", "Based on", model.cacDetail.basedOn),
        namedInspectorRow("money-cac-method", "Method", model.cacDetail.method),
        namedInspectorRow("money-cac-uncertainty", "Main uncertainty", model.cacDetail.mainUncertainty),
        namedInspectorRow("money-cac-next", "Next validation target", model.cacDetail.nextValidation),
        namedInspectorRow("money-cac-overall-confidence", "Overall economic confidence", model.presentation.overallEconomicConfidence),
        namedInspectorRow("money-cac-retention-evidence", "Retention evidence", model.presentation.retentionEvidence),
      ],
    }),
    markMoney({
      id: "money-ltv",
      title: "Customer value",
      rows: [
        namedInspectorRow("money-ltv-actual", "Actual LTV", model.ltvDetail.actual),
        namedInspectorRow("money-ltv-estimated", "Estimated LTV", model.ltvDetail.estimated),
        namedInspectorRow("money-ltv-base", "Base", model.ltvDetail.base),
        namedInspectorRow("money-ltv-based-on", "Based on", model.ltvDetail.basedOn),
        namedInspectorRow("money-ltv-uncertainty", "Main uncertainty", model.ltvDetail.mainUncertainty),
        namedInspectorRow("money-ltv-blocker", "Why LTV is blocked", model.presentation.ltvBlocker ?? "Not applicable"),
      ],
    }),
    markMoney({
      id: "money-ltv-cac",
      title: "LTV/CAC",
      badge: "MODELED — NOT OBSERVED",
      rows: [
        namedInspectorRow("money-ratio-conservative", "Conservative", model.ltvCacDetail.conservative),
        namedInspectorRow("money-ratio-base", "Base", model.ltvCacDetail.base),
        namedInspectorRow("money-ratio-upside", "Upside", model.ltvCacDetail.upside),
        namedInspectorRow("money-ratio-note", "Explanation", model.ltvCacDetail.explanation),
      ],
    }),
    markMoney({
      id: "money-payback",
      title: "CAC payback period",
      rows: [
        namedInspectorRow("money-payback-conservative", "Conservative", model.paybackDetail.conservative),
        namedInspectorRow("money-payback-base", "Base", model.paybackDetail.base),
        namedInspectorRow("money-payback-upside", "Upside", model.paybackDetail.upside),
        namedInspectorRow("money-payback-note", "Note", model.paybackDetail.note),
      ],
    }),
    markMoney({
      id: "money-streams",
      title: "Revenue streams & upsells",
      rows: [],
      bullets: [
        ...(model.streams.length ? model.streams.map((item) => `Stream: ${item}`) : ["No persisted revenue streams yet."]),
        ...(model.upsells.length ? model.upsells.map((item) => `Upsell: ${item}`) : ["No persisted upsells yet."]),
      ],
    }),
    markMoney({
      id: "money-benchmark-sources",
      title: "Source evidence",
      rows: benchmarkRows,
    }),
  ];
}

export function founderMoneySections(
  view: FounderIntelligenceFrontView | null,
  metadata: Meta,
): InspectorSection[] {
  const model = buildFounderMoneyView(view, metadata);
  return model.empty ? emptyState(model, view?.ventureBrief) : fullState(model, view?.ventureBrief);
}

export function compactIntelligenceMoneySection(
  view: FounderIntelligenceFrontView | null,
  metadata: Meta,
): InspectorSection {
  const model = buildFounderMoneyView(view, metadata);
  return {
    id: "intelligence-money-summary",
    title: "Money",
    presentation: "primary",
    toneGroup: "summary",
    rows: [
      namedInspectorRow("intel-money-status", "Money", model.summary.economicAttractiveness),
      namedInspectorRow(
        "intel-money-cac",
        "CAC",
        model.empty
          ? "Not estimated yet"
          : model.bestEstimate.hero?.find((item) => item.id === "cac")?.primary &&
              model.bestEstimate.hero.find((item) => item.id === "cac")?.primary !== "—"
            ? `Estimated ${model.bestEstimate.hero.find((item) => item.id === "cac")?.primary}`
            : model.modeledEconomics.cac === "Not known yet"
              ? "Not estimated yet"
              : `Estimated ${model.modeledEconomics.cac}`,
      ),
      namedInspectorRow(
        "intel-money-ratio",
        "LTV/CAC",
        model.empty
          ? "Not estimated yet"
          : model.bestEstimate.ltvCac.base !== "Not enough evidence yet"
            ? `Base ${model.bestEstimate.ltvCac.base}`
            : model.ltvCacDetail.base === "Not known yet"
              ? "Not estimated yet"
              : `Base ${model.ltvCacDetail.base}`,
      ),
    ],
  };
}
