import { formatRange, rangeHasValue } from "../comparable-economics/provenance";
import type { FounderExplainability } from "./types";

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
};

function unknownOrRange(range: { low: number | null; base: number | null; high: number | null } | undefined, prefix = ""): string {
  if (!range || !rangeHasValue(range)) return "UNKNOWN";
  return formatRange(range, prefix);
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
        item.confidence === "NONE" ||
        item.sourceRefs.length === 0 ||
        /without detailed economic/i.test(item.whyComparable);
      return {
        name: item.name,
        role: item.category,
        whyComparable: item.whyComparable,
        strategicConfidence: item.confidenceBand,
        economicConfidence: item.confidence,
        sourceCount: item.sourceRefs.length,
        pricingEvidence: pricingEvidence.join(" | ") || "NONE",
        economicEvidence: economicEvidence.join(" | ") || "NONE",
        noEconomicEvidence: noEconomic,
      };
    }),
    sourceTrace: explain.sourceTrace.slice(0, 16).map((row) => ({
      findingId: row.findingId,
      sourceUrl: row.sourceUrl,
      dimension: row.dimension,
      scoreImpact: row.scoreImpact,
    })),
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
