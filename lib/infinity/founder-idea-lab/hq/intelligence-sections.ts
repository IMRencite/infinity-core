import type { InspectorSection } from "@/lib/infinity/operator-console/artifacts/inspector-types";
import { namedInspectorRow } from "@/lib/infinity/operator-console/details/insight-metrics";
import { parseFounderIntelligenceView, type FounderIntelligenceFrontView } from "../explainability/view";

export const FOUNDER_INTELLIGENCE_SECTION_IDS = [
  "executive-summary",
  "why-decision",
  "intelligence-evidence",
  "key-insights",
  "score-breakdown",
  "pricing-recommendation",
  "comparable-businesses",
  "modeled-unit-economics",
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

export function founderIdeaIntelligenceSections(metadata: Meta): InspectorSection[] {
  const view = parseFounderIntelligenceView(metadata.founderIntelligenceJson);
  return view ? fromView(view, metadata) : fromFlatMetadata(metadata);
}
