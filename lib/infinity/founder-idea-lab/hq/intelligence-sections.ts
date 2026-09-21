import type { InspectorSection } from "@/lib/infinity/operator-console/artifacts/inspector-types";
import { namedInspectorRow } from "@/lib/infinity/operator-console/details/insight-metrics";
import { parseFounderIntelligenceView, type FounderIntelligenceFrontView } from "../explainability/view";
import { FOUNDER_FRIENDLY_PRIMARY_SECTION_IDS, founderFriendlyPrimarySections } from "./founder-intelligence-primary";
import { FOUNDER_MONEY_SECTION_IDS, founderMoneySections } from "./founder-money-sections";

export { FOUNDER_MONEY_SECTION_IDS };

export const FOUNDER_INTELLIGENCE_SECTION_IDS = [
  ...FOUNDER_FRIENDLY_PRIMARY_SECTION_IDS,
  "executive-summary",
  "why-decision",
  "intelligence-evidence",
  "key-insights",
  "score-breakdown",
  "how-this-makes-money",
  "recommended-revenue-model",
  "revenue-streams",
  "pricing-architecture",
  "comparable-revenue-models",
  "revenue-per-customer",
  "mrr-arr-scenarios",
  "upsell-opportunities",
  "revenue-quality",
  "money-research-gaps",
  "pricing-recommendation",
  "comparable-businesses",
  "modeled-unit-economics",
  "benchmark-economics-system",
  "educated-estimates-system",
  "product-advantage-system",
  "build-plan-system",
  "risks-uncertainties",
  "what-would-change",
  "next-validation",
  "source-trace",
] as const;

type Meta = Record<string, string | number | boolean | null>;

function splitJoined(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim() || value === "UNKNOWN" || value === "NONE") return [];
  return value
    .split(/\s*\|\|\s*|\s*\|\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function decisionTitle(decision: unknown): string {
  const value = typeof decision === "string" && decision.trim() ? decision.trim() : "this decision";
  return `Why Infinity Chose ${value}`;
}

function fromView(view: FounderIntelligenceFrontView, metadata: Meta): InspectorSection[] {
  const evidenceBullets = view.evidenceSummary.map(
    (item) =>
      `${item.dimension}: ${item.summary} (${item.strength}; direct ${item.directCount}; inferences ${item.inferenceCount}; sources ${item.sourceCount})`,
  );
  const comparableBullets = view.comparables.map((item) => {
    const evidenceMark = item.noEconomicEvidence
      ? "NO ECONOMIC EVIDENCE — not economically validated"
      : `pricing: ${item.pricingEvidence}; economic: ${item.economicEvidence}`;
    return `${item.name} · ${item.role} · why: ${item.whyComparable} · strategic ${item.strategicConfidence} · economic confidence ${item.economicConfidence} · sources ${item.sourceCount} · ${evidenceMark}`;
  });
  return [
    {
      id: "executive-summary",
      title: "Executive Summary",
      rows: [
        namedInspectorRow("executive-summary-text", "Summary", view.executiveSummary),
        namedInspectorRow("will-this-work", "Will this work", metadata.willThisWork != null ? String(metadata.willThisWork) : view.pricing.status),
      ],
    },
    {
      id: "why-decision",
      title: decisionTitle(view.decision ?? metadata.infinityDecision),
      rows: [
        namedInspectorRow("decision-why", "Why HOLD / current decision", view.why),
        namedInspectorRow("threshold-arithmetic", "Threshold arithmetic", String(metadata.thresholdArithmetic ?? "UNKNOWN")),
        namedInspectorRow("classifier-metric-field", "Classifier metric", "portfolio-adjusted score — not opportunity quality"),
        namedInspectorRow("why-not-validate", "Why not VALIDATE", view.whyNotValidate),
        namedInspectorRow("why-not-reject", "Why not REJECT", view.whyNotReject),
        namedInspectorRow("why-not-build", "Why not BUILD", view.whyNotBuild),
      ],
    },
    {
      id: "intelligence-evidence",
      title: "Evidence",
      rows: [
        namedInspectorRow("decision-evidence", "Decision evidence", String(metadata.scoreIntegrity ?? "UNKNOWN") === "EVIDENCE_GROUNDED" ? "SUFFICIENT" : String(metadata.scoreIntegrity ?? "UNKNOWN")),
        namedInspectorRow("economic-evidence", "Economic evidence", view.economics.unknown ? "INSUFFICIENT" : "MODELED"),
        namedInspectorRow("evidence-overview", "Overview", String(metadata.evidenceOverview ?? "UNKNOWN")),
      ],
      bullets: evidenceBullets,
    },
    {
      id: "key-insights",
      title: "Key Insights",
      rows: [],
      bullets: view.keyFindings.map((item) => `${item.displayKind} · ${item.dimension}: ${item.claim} (sources ${item.sourceCount})`),
    },
    {
      id: "score-breakdown",
      title: "Score Breakdown",
      rows: [
        namedInspectorRow(
          "opportunity-quality-explanation",
          "Opportunity quality (diagnostic, not the VALIDATE classifier)",
          view.scoreNotes.opportunityQuality,
        ),
        namedInspectorRow(
          "classifier-metric-explanation",
          "Classifier metric (portfolio-adjusted score vs VALIDATE/REJECT)",
          view.scoreNotes.portfolioAdjustedScore,
        ),
        namedInspectorRow("selection-arithmetic", "Selection arithmetic", view.scoreNotes.selectionScore),
        namedInspectorRow("validation-arithmetic", "Validation arithmetic", view.scoreNotes.validationScore),
        namedInspectorRow("monetization-arithmetic", "Monetization arithmetic", view.scoreNotes.monetizationScore),
      ],
      collapsible: true,
      collapseLabel: "See exact score calculation",
    },
    {
      id: "how-this-makes-money",
      title: "How This Business Makes Money",
      rows: [
        namedInspectorRow("money-recommended-model", "Recommended revenue model", view.howShouldThisMakeMoney?.recommendedModel ?? "UNKNOWN"),
        namedInspectorRow("money-core-revenue", "Primary recurring revenue", view.howShouldThisMakeMoney?.coreRevenue ?? "UNKNOWN"),
        namedInspectorRow("money-setup", "Setup/onboarding", view.howShouldThisMakeMoney?.setupOnboarding ?? "UNKNOWN"),
        namedInspectorRow("money-upsells", "Upsells", view.howShouldThisMakeMoney?.upsells ?? "UNKNOWN"),
        namedInspectorRow("money-billing", "Billing structure", view.howShouldThisMakeMoney?.billingStructure ?? "UNKNOWN"),
        namedInspectorRow("money-recurring-mix", "Expected recurring mix", view.howShouldThisMakeMoney?.expectedRecurringMix ?? "UNKNOWN"),
        namedInspectorRow("money-why", "Why this model fits", view.howShouldThisMakeMoney?.why ?? "UNKNOWN"),
        namedInspectorRow("money-confidence", "Confidence", view.howShouldThisMakeMoney?.confidence ?? "NONE"),
        namedInspectorRow("money-platforms", "What current platforms do", view.howShouldThisMakeMoney?.whatCurrentPlatformsDo ?? "UNKNOWN"),
        namedInspectorRow("money-patterns", "Patterns found", (view.howShouldThisMakeMoney?.patternsFound ?? ["UNKNOWN"]).join("; ")),
        namedInspectorRow("money-follows", "Why recommended follows those patterns", view.howShouldThisMakeMoney?.whyRecommendedFollowsPatterns ?? "UNKNOWN"),
        namedInspectorRow("money-different", "What this venture does differently", view.howShouldThisMakeMoney?.whatVentureDoesDifferently ?? "UNKNOWN"),
      ],
      bullets: view.howShouldThisMakeMoney?.remainingUnknowns?.length
        ? view.howShouldThisMakeMoney.remainingUnknowns.map((item) => `Remaining unknown: ${item}`)
        : ["Remaining unknown: UNKNOWN"],
    },
    {
      id: "recommended-revenue-model",
      title: "Recommended Revenue Model",
      rows: [
        namedInspectorRow("rev-coverage", "Revenue-model coverage", view.revenueModel?.coverage ?? "REVENUE_MODEL_INSUFFICIENT"),
        namedInspectorRow("rev-recommended", "Recommended model", view.revenueModel?.recommended ?? "UNKNOWN"),
        namedInspectorRow("rev-alternatives", "Alternatives", view.revenueModel?.alternatives ?? "NONE"),
        namedInspectorRow("rev-attractiveness", "Will this make money?", view.revenueModel?.attractiveness ?? "INSUFFICIENT_REVENUE_EVIDENCE"),
      ],
    },
    {
      id: "revenue-streams",
      title: "Revenue Streams",
      rows: [],
      bullets: view.revenueModel?.streams?.length ? view.revenueModel.streams : ["UNKNOWN"],
    },
    {
      id: "pricing-architecture",
      title: "Pricing & Packaging",
      rows: [
        namedInspectorRow("arch-entry", "Entry tier", view.revenueModel?.entry ?? "UNKNOWN"),
        namedInspectorRow("arch-base", "Base tier", view.revenueModel?.base ?? "UNKNOWN"),
        namedInspectorRow("arch-premium", "Premium tier", view.revenueModel?.premium ?? "UNKNOWN"),
        namedInspectorRow("arch-setup", "Setup", view.revenueModel?.setup ?? "UNKNOWN"),
      ],
    },
    {
      id: "comparable-revenue-models",
      title: "Comparable Revenue Models",
      rows: (view.revenueModel?.comparableRows ?? []).map((row, index) =>
        namedInspectorRow(
          `rev-comp-${index}`,
          row.name,
          `${row.targetCustomer} · ${row.revenueModel} · monthly ${row.monthly} · annual ${row.annual ?? "UNKNOWN"} · setup ${row.setup} · recurring ${row.recurring} · add-ons ${row.addOns} · contract ${row.contract} · ${row.why} · ${row.confidence}`,
        ),
      ),
      bullets: (view.revenueModel?.comparableRows ?? []).length
        ? (view.revenueModel?.comparableRows ?? []).map(
            (row) =>
              `${row.name} | ${row.targetCustomer} | ${row.revenueModel} | ${row.monthly} | ${row.annual ?? "UNKNOWN"} | ${row.setup} | ${row.recurring} | ${row.addOns} | ${row.contract} | ${row.why} | ${row.confidence}`,
          )
        : ["UNKNOWN"],
    },
    {
      id: "revenue-per-customer",
      title: "Revenue per Customer",
      rows: [
        namedInspectorRow("rpc-mrr", "MRR / customer", view.revenueModel?.mrrPerCustomer ?? "UNKNOWN"),
        namedInspectorRow("rpc-arr", "ARR / customer", view.revenueModel?.arrPerCustomer ?? "UNKNOWN"),
        namedInspectorRow("rpc-first-year-recurring", "First-year recurring / customer", view.revenueModel?.firstYearRecurring ?? "UNKNOWN"),
        namedInspectorRow("rpc-first-year-setup", "First-year setup / customer", view.revenueModel?.firstYearSetup ?? "UNKNOWN"),
        namedInspectorRow("rpc-first-year-addon", "First-year add-on / customer", view.revenueModel?.firstYearAddOn ?? "UNKNOWN"),
        namedInspectorRow("rpc-first-year", "First-year total / customer", view.revenueModel?.firstYearPerCustomer ?? "UNKNOWN"),
      ],
    },
    {
      id: "mrr-arr-scenarios",
      title: "MRR / ARR Scenarios",
      rows: (view.revenueModel?.scenarios ?? []).length
        ? (view.revenueModel?.scenarios ?? []).map((row) =>
            namedInspectorRow(
              `scenario-${row.customers}`,
              `${row.customers} customers (SCENARIO_MODEL, not a forecast)`,
              `MRR ${row.mrr}; ARR ${row.arr}; setup ${row.setup}; first-year ${row.total}`,
            ),
          )
        : [namedInspectorRow("scenario-unknown", "Scenarios", "UNKNOWN")],
      bullets: ["Customer counts are scenario planning inputs, not acquisition forecasts."],
    },
    {
      id: "upsell-opportunities",
      title: "Upsell Opportunities",
      rows: [],
      bullets: view.revenueModel?.upsells?.length ? view.revenueModel.upsells : ["UNKNOWN"],
    },
    {
      id: "revenue-quality",
      title: "Revenue Quality",
      rows: [
        namedInspectorRow("rev-quality", "Quality", view.revenueModel?.quality ?? "INSUFFICIENT_DATA"),
        namedInspectorRow("rev-quality-reason", "Reason", view.revenueModel?.qualityReason ?? "UNKNOWN"),
      ],
    },
    {
      id: "money-research-gaps",
      title: "Money Research Still Needed",
      rows: [
        namedInspectorRow("rev-research-status", "Revenue model research", view.revenueModel?.coverage ?? "REVENUE_MODEL_INSUFFICIENT"),
        namedInspectorRow("rev-missing", "Missing", (view.revenueModel?.missingMoneyEvidence ?? ["UNKNOWN"]).join("; ") || "UNKNOWN"),
      ],
      bullets: view.revenueModel?.moneyGaps?.length ? view.revenueModel.moneyGaps : ["UNKNOWN"],
    },
    {
      id: "pricing-recommendation",
      title: "Pricing Recommendation",
      rows: [
        namedInspectorRow("pricing-status", "Status", view.pricing.status),
        namedInspectorRow("pricing-recommendation-text", "Recommended modeled pricing", view.pricing.recommendation || "UNKNOWN"),
        namedInspectorRow("pricing-monthly", "Monthly", view.pricing.monthly),
        namedInspectorRow("pricing-setup", "Setup fee", view.pricing.setup),
        namedInspectorRow("pricing-provenance", "Provenance", view.pricing.provenance),
        namedInspectorRow("pricing-confidence", "Confidence", view.pricing.confidence),
        namedInspectorRow("pricing-missing", "Missing", view.missingEconomicEvidence.join("; ") || "NONE"),
      ],
      bullets: view.pricing.unknown ? view.nextValidation.slice(0, 4) : undefined,
    },
    {
      id: "comparable-businesses",
      title: "Comparable Businesses",
      rows: view.comparables.map((item, index) =>
        namedInspectorRow(
          `comparable-${index}`,
          item.name,
          item.noEconomicEvidence
            ? `Strategic ${item.strategicConfidence}; economic confidence ${item.economicConfidence}; sources ${item.sourceCount}. NO ECONOMIC EVIDENCE — not economically validated.`
            : `Strategic ${item.strategicConfidence}; economic confidence ${item.economicConfidence}; sources ${item.sourceCount}.`,
        ),
      ),
      bullets: comparableBullets.length ? comparableBullets : ["NONE"],
    },
    {
      id: "modeled-unit-economics",
      title: "Modeled Unit Economics",
      rows: [
        namedInspectorRow("modeled-pricing", "Pricing", view.pricing.monthly),
        namedInspectorRow("modeled-setup", "Setup fee", view.pricing.setup),
        namedInspectorRow("modeled-cac", "CAC", view.economics.cac),
        namedInspectorRow("modeled-ltv", "LTV", view.economics.ltv),
        namedInspectorRow("modeled-ltv-cac", "LTV/CAC", view.economics.ltvCac),
        namedInspectorRow("modeled-arpu", "ARPU", view.economics.arpu),
        namedInspectorRow("modeled-margin", "Gross margin", view.economics.grossMargin),
        namedInspectorRow("modeled-payback", "Payback", view.economics.payback),
        namedInspectorRow("modeled-break-even", "Break-even", view.economics.breakEven),
        namedInspectorRow("modeled-health", "Economic attractiveness", view.economics.attractiveness),
        namedInspectorRow("modeled-provenance", "Provenance", view.economics.provenance),
        namedInspectorRow("modeled-confidence", "Confidence", view.economics.confidence),
        namedInspectorRow("modeled-missing", "Missing evidence", view.missingEconomicEvidence.join("; ") || "NONE"),
      ],
    },
    {
      id: "benchmark-economics-system",
      title: "Benchmark Economics (System)",
      rows: [
        namedInspectorRow("bench-coverage-cac", "CAC coverage", view.benchmarkEconomics?.coverageCac ?? "BENCHMARK_INSUFFICIENT"),
        namedInspectorRow("bench-coverage-retention", "Retention coverage", view.benchmarkEconomics?.coverageRetention ?? "BENCHMARK_INSUFFICIENT"),
        namedInspectorRow("bench-coverage-margin", "Margin coverage", view.benchmarkEconomics?.coverageMargin ?? "BENCHMARK_INSUFFICIENT"),
        namedInspectorRow("bench-coverage-conversion", "Conversion coverage", view.benchmarkEconomics?.coverageConversion ?? "BENCHMARK_INSUFFICIENT"),
        namedInspectorRow("bench-coverage-sales-cycle", "Sales-cycle coverage", view.benchmarkEconomics?.coverageSalesCycle ?? "BENCHMARK_INSUFFICIENT"),
        namedInspectorRow("bench-cac", "Modeled CAC", view.benchmarkEconomics?.cac ?? "UNKNOWN"),
        namedInspectorRow("bench-ltv", "Modeled LTV", view.benchmarkEconomics?.ltv ?? "UNKNOWN"),
        namedInspectorRow("bench-ratio", "Modeled LTV/CAC", view.benchmarkEconomics?.ltvCac ?? "UNKNOWN"),
        namedInspectorRow("bench-ratio-conservative", "Conservative LTV/CAC", view.benchmarkEconomics?.ltvCacConservative ?? "UNKNOWN"),
        namedInspectorRow("bench-ratio-base", "Base LTV/CAC", view.benchmarkEconomics?.ltvCacBase ?? "UNKNOWN"),
        namedInspectorRow("bench-ratio-upside", "Upside LTV/CAC", view.benchmarkEconomics?.ltvCacUpside ?? "UNKNOWN"),
        namedInspectorRow("bench-margin", "Modeled gross margin", view.benchmarkEconomics?.margin ?? "UNKNOWN"),
        namedInspectorRow("bench-payback", "Modeled payback", view.benchmarkEconomics?.payback ?? "UNKNOWN"),
        namedInspectorRow("bench-confidence", "Technical confidence", view.benchmarkEconomics?.confidence ?? "NONE"),
        namedInspectorRow("bench-provenance", "Modeled provenance", view.benchmarkEconomics?.provenance ?? "UNKNOWN"),
        namedInspectorRow("bench-attractiveness", "Attractiveness", view.benchmarkEconomics?.attractiveness ?? "INSUFFICIENT_DATA"),
        namedInspectorRow("bench-observed-cac", "Observed CAC", view.benchmarkEconomics?.actualCac ?? "UNKNOWN"),
        namedInspectorRow("bench-observed-ltv", "Observed LTV", view.benchmarkEconomics?.actualLtv ?? "UNKNOWN"),
        namedInspectorRow("bench-accepted", "Accepted benchmarks", String(view.benchmarkEconomics?.sampleAccepted ?? 0)),
      ],
      bullets: (view.benchmarkEconomics?.sources ?? []).map(
        (item) => `${item.label} | ${item.value} | ${item.relevance} | ${item.why} | ${item.source}`,
      ),
    },
    {
      id: "educated-estimates-system",
      title: "Educated Estimates (System)",
      rows: [
        namedInspectorRow("est-observed-cac", "Observed CAC", view.educatedEstimatesSystem?.observedCac ?? "UNKNOWN"),
        namedInspectorRow("est-observed-ltv", "Observed LTV", view.educatedEstimatesSystem?.observedLtv ?? "UNKNOWN"),
        namedInspectorRow("est-observed-margin", "Observed margin", view.educatedEstimatesSystem?.observedMargin ?? "UNKNOWN"),
        namedInspectorRow("est-cac-provenance", "CAC provenance", view.educatedEstimatesSystem?.cacProvenance ?? "UNKNOWN"),
        namedInspectorRow("est-margin-provenance", "Margin provenance", view.educatedEstimatesSystem?.marginProvenance ?? "UNKNOWN"),
        namedInspectorRow("est-ltv-provenance", "LTV provenance", view.educatedEstimatesSystem?.ltvProvenance ?? "UNKNOWN"),
        namedInspectorRow("est-grants-build", "grantsBuild", String(view.educatedEstimatesSystem?.grantsBuild ?? false)),
      ],
    },
    {
      id: "product-advantage-system",
      title: "Product Advantage (System)",
      rows: [
        namedInspectorRow(
          "adv-authority-roadmap",
          "canPrioritizeCanonicalRoadmap",
          String(view.productAdvantage?.authority.canPrioritizeCanonicalRoadmap ?? false),
        ),
        namedInspectorRow("adv-authority-assign", "canAssignWork", String(view.productAdvantage?.authority.canAssignWork ?? false)),
        namedInspectorRow("adv-authority-build", "canApproveBuild", String(view.productAdvantage?.authority.canApproveBuild ?? false)),
      ],
      bullets: (view.productAdvantage?.painClusters ?? []).map(
        (cluster) =>
          `${cluster.id} | ${cluster.category} | ${cluster.confidence} | ${cluster.sourceQuality} | evidenceCount:${cluster.evidenceCount}`,
      ),
    },
    {
      id: "build-plan-system",
      title: "Build Plan (System)",
      rows: [
        namedInspectorRow("bp-position", "currentPosition", view.buildPlan?.currentPosition ?? "UNKNOWN"),
        namedInspectorRow("bp-effort", "effort", view.buildPlan?.effort ?? "UNKNOWN"),
        namedInspectorRow("bp-grants-build", "grantsBuild", String(view.buildPlan?.grantsBuild ?? false)),
        namedInspectorRow("bp-missions", "canCreateMissions", String(view.buildPlan?.authority.canCreateMissions ?? false)),
        namedInspectorRow("bp-roadmap", "canMutateRoadmap", String(view.buildPlan?.authority.canMutateRoadmap ?? false)),
        namedInspectorRow("bp-approve", "canApproveBuild", String(view.buildPlan?.authority.canApproveBuild ?? false)),
        namedInspectorRow("bp-ready", "systemsReady", String(view.buildPlan?.systemsReady ?? 0)),
        namedInspectorRow("bp-partial", "systemsPartial", String(view.buildPlan?.systemsPartial ?? 0)),
        namedInspectorRow("bp-missing", "systemsMissing", String(view.buildPlan?.systemsMissing ?? 0)),
        namedInspectorRow("bp-blocked", "systemsBlocked", String(view.buildPlan?.systemsBlocked ?? 0)),
        namedInspectorRow("bp-coverage", "coverageSummary", view.buildPlan?.coverageSummary ?? "UNKNOWN"),
      ],
      bullets: (view.buildPlan?.phases ?? []).map((phase) => `${phase.order} | ${phase.name} | ${phase.readiness} | ${phase.systems.join(",")}`),
    },
    {
      id: "risks-uncertainties",
      title: "Risks + Uncertainties",
      rows: [],
      bullets: splitJoined(metadata.risksUncertainties).length ? splitJoined(metadata.risksUncertainties) : ["UNKNOWN"],
    },
    {
      id: "what-would-change",
      title: "What Would Change the Decision",
      rows: [],
      bullets: view.whatWouldChange.length ? view.whatWouldChange : ["UNKNOWN"],
    },
    {
      id: "next-validation",
      title: "Next Validation Steps",
      rows: [],
      bullets: view.nextValidation.length ? view.nextValidation : ["UNKNOWN"],
    },
    {
      id: "source-trace",
      title: "Source Trace",
      rows: [],
      bullets: view.sourceTrace.map(
        (row) => `${row.findingId} → ${row.sourceUrl} → ${row.dimension} → ${row.scoreImpact}`,
      ),
    },
  ];
}

function fromFlatMetadata(metadata: Meta): InspectorSection[] {
  const missing = [
    String(metadata.pricingRecommendation ?? "").match(/UNKNOWN|No modeled/i) ? "public numeric pricing" : null,
    String(metadata.modeledCac ?? "UNKNOWN") === "UNKNOWN" ? "CAC benchmark" : null,
    "retention/churn",
    "gross margin",
  ].filter((item): item is string => Boolean(item));
  const pricingUnknown = !metadata.pricingRecommendation || /UNKNOWN|No modeled/i.test(String(metadata.pricingRecommendation));
  return [
    {
      id: "executive-summary",
      title: "Executive Summary",
      rows: [
        namedInspectorRow("executive-summary-text", "Summary", String(metadata.executiveSummary ?? "UNKNOWN")),
        namedInspectorRow("will-this-work", "Will this work", String(metadata.willThisWork ?? "UNKNOWN")),
      ],
    },
    {
      id: "why-decision",
      title: decisionTitle(metadata.infinityDecision),
      rows: [
        namedInspectorRow("decision-why", "Why HOLD / current decision", String(metadata.whyDecision ?? "UNKNOWN")),
        namedInspectorRow("threshold-arithmetic", "Threshold arithmetic", String(metadata.thresholdArithmetic ?? "UNKNOWN")),
        namedInspectorRow("classifier-metric-field", "Classifier metric", "portfolio-adjusted score — not opportunity quality"),
        namedInspectorRow("why-not-validate", "Why not VALIDATE", String(metadata.whyNotValidate ?? "UNKNOWN")),
        namedInspectorRow("why-not-reject", "Why not REJECT", String(metadata.whyNotReject ?? "UNKNOWN")),
        namedInspectorRow("why-not-build", "Why not BUILD", String(metadata.whyNotBuild ?? "UNKNOWN")),
      ],
    },
    {
      id: "intelligence-evidence",
      title: "Evidence",
      rows: [
        namedInspectorRow("evidence-overview", "Overview", String(metadata.evidenceOverview ?? "UNKNOWN")),
      ],
    },
    {
      id: "key-insights",
      title: "Key Insights",
      rows: [],
      bullets: splitJoined(metadata.keyInsights).length ? splitJoined(metadata.keyInsights) : ["UNKNOWN"],
    },
    {
      id: "score-breakdown",
      title: "Score Breakdown",
      rows: [
        namedInspectorRow("opportunity-quality-explanation", "Opportunity quality (diagnostic, not the VALIDATE classifier)", String(metadata.scoreOpportunityNote ?? "UNKNOWN")),
        namedInspectorRow("classifier-metric-explanation", "Classifier metric (portfolio-adjusted score vs VALIDATE/REJECT)", String(metadata.scorePortfolioNote ?? "UNKNOWN")),
        namedInspectorRow("selection-arithmetic", "Selection arithmetic", String(metadata.scoreSelectionNote ?? "UNKNOWN")),
        namedInspectorRow("validation-arithmetic", "Validation arithmetic", String(metadata.scoreValidationNote ?? "UNKNOWN")),
        namedInspectorRow("monetization-arithmetic", "Monetization arithmetic", String(metadata.scoreMonetizationNote ?? "UNKNOWN")),
      ],
      collapsible: true,
      collapseLabel: "See exact score calculation",
    },
    {
      id: "how-this-makes-money",
      title: "How This Business Makes Money",
      rows: [
        namedInspectorRow("money-recommended-model", "Recommended revenue model", "UNKNOWN"),
        namedInspectorRow("money-core-revenue", "Primary recurring revenue", "UNKNOWN"),
        namedInspectorRow("money-setup", "Setup/onboarding", "UNKNOWN"),
        namedInspectorRow("money-upsells", "Upsells", "UNKNOWN"),
        namedInspectorRow("money-billing", "Billing structure", "UNKNOWN"),
        namedInspectorRow("money-recurring-mix", "Expected recurring mix", "UNKNOWN"),
        namedInspectorRow("money-why", "Why this model fits", "Revenue-model fields were not persisted on this artifact."),
        namedInspectorRow("money-confidence", "Confidence", "NONE"),
      ],
      bullets: ["Remaining unknown: UNKNOWN"],
    },
    {
      id: "recommended-revenue-model",
      title: "Recommended Revenue Model",
      rows: [
        namedInspectorRow("rev-coverage", "Revenue-model coverage", "REVENUE_MODEL_INSUFFICIENT"),
        namedInspectorRow("rev-recommended", "Recommended model", "UNKNOWN"),
      ],
    },
    {
      id: "revenue-streams",
      title: "Revenue Streams",
      rows: [],
      bullets: ["UNKNOWN"],
    },
    {
      id: "pricing-architecture",
      title: "Pricing & Packaging",
      rows: [
        namedInspectorRow("arch-entry", "Entry tier", "UNKNOWN"),
        namedInspectorRow("arch-base", "Base tier", "UNKNOWN"),
        namedInspectorRow("arch-premium", "Premium tier", "UNKNOWN"),
        namedInspectorRow("arch-setup", "Setup", "UNKNOWN"),
      ],
    },
    {
      id: "comparable-revenue-models",
      title: "Comparable Revenue Models",
      rows: [],
      bullets: ["UNKNOWN"],
    },
    {
      id: "revenue-per-customer",
      title: "Revenue per Customer",
      rows: [
        namedInspectorRow("rpc-mrr", "MRR / customer", "UNKNOWN"),
        namedInspectorRow("rpc-arr", "ARR / customer", "UNKNOWN"),
        namedInspectorRow("rpc-first-year-recurring", "First-year recurring / customer", "UNKNOWN"),
        namedInspectorRow("rpc-first-year-setup", "First-year setup / customer", "UNKNOWN"),
        namedInspectorRow("rpc-first-year-addon", "First-year add-on / customer", "UNKNOWN"),
        namedInspectorRow("rpc-first-year", "First-year total / customer", "UNKNOWN"),
      ],
    },
    {
      id: "mrr-arr-scenarios",
      title: "MRR / ARR Scenarios",
      rows: [namedInspectorRow("scenario-unknown", "Scenarios", "UNKNOWN")],
      bullets: ["Customer counts are scenario planning inputs, not acquisition forecasts."],
    },
    {
      id: "upsell-opportunities",
      title: "Upsell Opportunities",
      rows: [],
      bullets: ["UNKNOWN"],
    },
    {
      id: "revenue-quality",
      title: "Revenue Quality",
      rows: [
        namedInspectorRow("rev-quality", "Quality", "INSUFFICIENT_DATA"),
      ],
    },
    {
      id: "money-research-gaps",
      title: "Money Research Still Needed",
      rows: [
        namedInspectorRow("rev-research-status", "Revenue model research", "REVENUE_MODEL_INSUFFICIENT"),
        namedInspectorRow("rev-missing", "Missing", "public pricing; setup fees; packaging; upsells; contract terms"),
      ],
      bullets: ["Find comparable public monthly pricing"],
    },
    {
      id: "pricing-recommendation",
      title: "Pricing Recommendation",
      rows: [
        namedInspectorRow("pricing-status", "Status", pricingUnknown ? "Insufficient economic evidence" : "Comparable modeled recommendation"),
        namedInspectorRow("pricing-recommendation-text", "Recommended modeled pricing", String(metadata.pricingRecommendation ?? "UNKNOWN")),
        namedInspectorRow("pricing-monthly", "Monthly", "UNKNOWN"),
        namedInspectorRow("pricing-setup", "Setup fee", "UNKNOWN"),
        namedInspectorRow("pricing-provenance", "Provenance", String(metadata.economicProvenance ?? "UNKNOWN")),
        namedInspectorRow("pricing-missing", "Missing", missing.join("; ")),
      ],
    },
    {
      id: "comparable-businesses",
      title: "Comparable Businesses",
      rows: [
        namedInspectorRow("comparable-names", "Names", String(metadata.comparableNames ?? "NONE")),
      ],
      bullets: splitJoined(metadata.comparableTable).length ? splitJoined(metadata.comparableTable) : undefined,
    },
    {
      id: "modeled-unit-economics",
      title: "Modeled Unit Economics",
      rows: [
        namedInspectorRow("modeled-cac", "CAC", String(metadata.modeledCac ?? "UNKNOWN")),
        namedInspectorRow("modeled-ltv", "LTV", String(metadata.modeledLtv ?? "UNKNOWN")),
        namedInspectorRow("modeled-ltv-cac", "LTV/CAC", String(metadata.modeledLtvCac ?? "UNKNOWN")),
        namedInspectorRow("modeled-health", "Economic attractiveness", String(metadata.economicHealth ?? "UNKNOWN")),
        namedInspectorRow("modeled-provenance", "Provenance", String(metadata.economicProvenance ?? "UNKNOWN")),
        namedInspectorRow("modeled-missing", "Missing evidence", missing.join("; ")),
      ],
    },
    {
      id: "risks-uncertainties",
      title: "Risks + Uncertainties",
      rows: [],
      bullets: splitJoined(metadata.risksUncertainties).length ? splitJoined(metadata.risksUncertainties) : ["UNKNOWN"],
    },
    {
      id: "what-would-change",
      title: "What Would Change the Decision",
      rows: [],
      bullets: splitJoined(metadata.whatWouldChange).length ? splitJoined(metadata.whatWouldChange) : ["UNKNOWN"],
    },
    {
      id: "next-validation",
      title: "Next Validation Steps",
      rows: [],
      bullets: splitJoined(metadata.nextValidation).length ? splitJoined(metadata.nextValidation) : ["UNKNOWN"],
    },
    {
      id: "source-trace",
      title: "Source Trace",
      rows: [],
      bullets: splitJoined(metadata.sourceTrace).length ? splitJoined(metadata.sourceTrace) : ["UNKNOWN"],
    },
  ];
}

function markAdvanced(sections: InspectorSection[]): InspectorSection[] {
  return sections.map((section) => ({ ...section, presentation: section.presentation ?? "advanced" }));
}

export function founderIdeaIntelligenceSections(metadata: Meta): InspectorSection[] {
  const view = parseFounderIntelligenceView(metadata.founderIntelligenceJson);
  const primary = founderFriendlyPrimarySections(view, metadata);
  const money = founderMoneySections(view, metadata);
  const advanced = markAdvanced(view ? fromView(view, metadata) : fromFlatMetadata(metadata));
  return [...primary, ...money, ...advanced];
}
