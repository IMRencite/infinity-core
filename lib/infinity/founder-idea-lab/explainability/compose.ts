import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
  DEFAULT_SELECTION_WEIGHTS,
  DEFAULT_VALIDATION_WEIGHTS,
} from "@/lib/infinity/venture-selection/constants";
import { UNKNOWN_UNIT_ECONOMICS_REASON } from "@/lib/infinity/venture-selection/decisions/classify";
import { EVIDENCE_DIMENSIONS, type EvidenceCoverage, type EvidenceDimension } from "../evidence-coverage";
import type { MonetizationEvidenceLayers } from "../monetization-levels";
import type { FounderResearchPacket } from "../research-packet";
import type { ScoreProvenanceRow } from "../score-from-evidence";
import type { FounderIdeaGrade, FounderIdeaSubmission } from "../types";
import { formatRange, type EconomicEvidenceClass } from "../comparable-economics/provenance";
import { modelComparableEconomics } from "../comparable-economics/from-evidence";
import type { ComparableEconomicsModel } from "../comparable-economics/types";
import type {
  DecisionExplanation,
  EvidenceDimensionSummary,
  FindingDisplayKind,
  FounderExplainability,
  KeyFindingView,
  ScoreComponentRow,
  ScoreExplanation,
  SourceTraceRow,
} from "./types";

const DIMENSION_MATTERS: Record<EvidenceDimension, string> = {
  demand: "Supports whether customers already search for or buy this job-to-be-done.",
  market: "Supports whether the category is commercially active.",
  competition: "Supports whether incumbents leave a gap versus proving a crowded commodity.",
  pricing: "Supports observable comparable prices; missing price is UNKNOWN, not free.",
  monetization: "Supports whether the category charges money at all.",
  distribution: "Supports how customers could be reached.",
  buildability: "Supports whether a digital product can be delivered.",
  capital_efficiency: "Supports CAC/capital intensity; unknown is not cheap.",
  speed_to_revenue: "Supports time-to-first-revenue; unknown is not fast.",
};

function displayKind(input: { grounded: boolean; founderHypothesis: boolean; unknown: boolean }): FindingDisplayKind {
  if (input.founderHypothesis) return "FOUNDER_HYPOTHESIS";
  if (input.unknown) return "UNKNOWN";
  if (input.grounded) return "SOURCE_BACKED_FINDING";
  return "INFINITY_INFERENCE";
}

function evidenceSummary(packet: FounderResearchPacket | null, coverage: EvidenceCoverage | null): EvidenceDimensionSummary[] {
  return EVIDENCE_DIMENSIONS.map((dimension) => {
    const dim = coverage?.dimensions[dimension];
    const findings = packet?.findings.filter((item) => item.dimension === dimension) ?? [];
    const sources = new Set(findings.flatMap((item) => item.sourceUrls));
    return {
      dimension,
      summary: findings[0]?.claim ?? (dim?.coverage === "none" ? "No evidence in this dimension." : "Coverage recorded without a finding claim."),
      strength: dim?.coverage ?? "none",
      polarity: dim?.polarity ?? "unknown",
      directCount: findings.filter((item) => item.grounded).length,
      inferenceCount: findings.filter((item) => !item.grounded).length,
      sourceCount: sources.size,
      confidence: dim?.confidence ?? null,
    };
  });
}

function keyFindings(packet: FounderResearchPacket | null, submission: FounderIdeaSubmission): KeyFindingView[] {
  const hypothesis: KeyFindingView[] = [];
  if (submission.pricingHypothesis?.trim()) {
    hypothesis.push({
      findingId: "founder-pricing-hypothesis",
      claim: submission.pricingHypothesis.trim(),
      dimension: "pricing",
      displayKind: "FOUNDER_HYPOTHESIS",
      grounded: false,
      confidence: null,
      sourceRefs: [],
      whyItMatters: "Founder-provided assumption used as a search seed, not as validated evidence.",
    });
  }
  const fromPacket = (packet?.findings ?? []).map((finding) => ({
    findingId: finding.findingId,
    claim: finding.claim,
    dimension: finding.dimension,
    displayKind: displayKind({
      grounded: finding.grounded,
      founderHypothesis: false,
      unknown: finding.polarity === "unknown" && !finding.grounded,
    }),
    grounded: finding.grounded,
    confidence: finding.confidence,
    sourceRefs: finding.sourceUrls,
    whyItMatters: DIMENSION_MATTERS[finding.dimension],
  }));
  return [...hypothesis, ...fromPacket];
}

function sourceTrace(packet: FounderResearchPacket | null, provenance: ScoreProvenanceRow[]): SourceTraceRow[] {
  const rows: SourceTraceRow[] = [];
  for (const finding of packet?.findings ?? []) {
    const impact = provenance.find((row) => row.evidenceRefs.includes(finding.findingId));
    for (const url of finding.sourceUrls) {
      rows.push({
        findingId: finding.findingId,
        sourceUrl: url,
        researchRunId: packet?.researchRunId ?? null,
        dimension: finding.dimension,
        scoreImpact: impact
          ? `${impact.dimension} contribution ${impact.weightedContribution ?? "UNKNOWN"}`
          : "Not a scored opportunity-quality component",
      });
    }
  }
  return rows;
}

function opportunityExplanation(grade: FounderIdeaGrade): ScoreExplanation {
  const components: ScoreComponentRow[] = grade.provenance.map((row) => ({
    name: row.dimension,
    purpose: "Opportunity quality component from evidence polarity and renormalized scanner weights.",
    raw: row.rawInput,
    weight: row.weight,
    contribution: row.weightedContribution,
    confidence: row.confidence,
    missing: row.rawInput == null,
    evidenceRefs: row.evidenceRefs,
  }));
  const missing = components.filter((item) => item.missing).map((item) => item.name);
  return {
    name: "opportunityQuality",
    value: grade.opportunityQuality,
    purpose: "Diagnostic quality of the idea from grounded evidence. Not the VALIDATE classifier metric.",
    decisionGrade: grade.readyForDecision && grade.scoreIntegrity !== "INCOMPLETE",
    classifierMetric: false,
    components,
    missingInputs: missing,
    note:
      grade.opportunityQuality == null
        ? "Opportunity quality is UNKNOWN."
        : `${grade.opportunityQuality} is opportunity quality. VALIDATE uses portfolioAdjustedScore, not this number.`,
  };
}

function weightedRows(
  inputs: Record<string, number> | null | undefined,
  weights: Record<string, number>,
  purpose: string,
): ScoreComponentRow[] {
  return Object.entries(weights).map(([name, weight]) => {
    const raw = inputs?.[name] ?? null;
    return {
      name,
      purpose,
      raw,
      weight,
      contribution: raw == null ? null : Math.round(raw * weight * 10000) / 100,
      confidence: null,
      missing: raw == null,
      evidenceRefs: [],
    };
  });
}

function selectionExplanation(grade: FounderIdeaGrade): ScoreExplanation {
  const inputs = grade.evaluation?.selectionScoreInputs ?? null;
  const components = weightedRows(inputs, DEFAULT_SELECTION_WEIGHTS, "Selection score weighted input.");
  return {
    name: "selectionScore",
    value: grade.selectionScore,
    purpose: "Canonical selection attractiveness used (via portfolioAdjustedScore on this path) for idea classification.",
    decisionGrade: grade.readyForDecision,
    classifierMetric: false,
    components,
    missingInputs: components.filter((item) => item.missing).map((item) => item.name),
    note: "Deterministic weighted sum of normalized selection inputs × DEFAULT_SELECTION_WEIGHTS.",
  };
}

function portfolioExplanation(grade: FounderIdeaGrade): ScoreExplanation {
  const selection = grade.selectionScore;
  const portfolio = grade.evaluation?.portfolioAdjustedScore ?? selection;
  const equal = selection != null && portfolio != null && selection === portfolio;
  return {
    name: "portfolioAdjustedScore",
    value: portfolio ?? null,
    purpose: "Classifier metric compared to VALIDATE/REJECT thresholds.",
    decisionGrade: grade.readyForDecision,
    classifierMetric: true,
    components: [
      {
        name: "base_selectionScore",
        purpose: "Unadjusted selection score.",
        raw: selection,
        weight: 1,
        contribution: selection,
        confidence: null,
        missing: selection == null,
        evidenceRefs: [],
      },
      {
        name: "portfolio_adjustment",
        purpose: equal ? "No portfolio correlation penalty on the Founder single-candidate path." : "Portfolio correlation penalty.",
        raw: equal || selection == null || portfolio == null ? 0 : portfolio - selection,
        weight: 1,
        contribution: equal || selection == null || portfolio == null ? 0 : portfolio - selection,
        confidence: null,
        missing: false,
        evidenceRefs: [],
      },
    ],
    missingInputs: selection == null ? ["selectionScore"] : [],
    note: equal
      ? "portfolioAdjustedScore = selectionScore. Founder grading does not apply a portfolio penalty."
      : `portfolioAdjustedScore ${portfolio} = selectionScore ${selection} plus adjustments.`,
  };
}

function validationExplanation(grade: FounderIdeaGrade): ScoreExplanation {
  const dims = grade.evaluation?.validationDimensions as unknown as Record<string, number> | undefined;
  const components = weightedRows(dims, DEFAULT_VALIDATION_WEIGHTS, "Validation dimension × DEFAULT_VALIDATION_WEIGHTS.");
  return {
    name: "validationScore",
    value: grade.validationScore,
    purpose: "How complete/credible the current evidence is for further validation, not the VALIDATE decision threshold.",
    decisionGrade: grade.readyForDecision,
    classifierMetric: false,
    components,
    missingInputs: components.filter((item) => item.missing).map((item) => item.name),
    note: `Compared against BUILD minValidationScore ${DEFAULT_BUILD_GATE_THRESHOLDS.minValidationScore}, not against VALIDATE ${DEFAULT_DECISION_THRESHOLDS.validateSelectionScore}.`,
  };
}

function monetizationExplanation(grade: FounderIdeaGrade): ScoreExplanation {
  const layers = grade.monetizationLayers;
  const value = grade.monetizationScore;
  const components: ScoreComponentRow[] = [
    {
      name: "category",
      purpose: "Category-level monetization evidence.",
      raw: layers?.category === "SUPPORTED" ? 1 : layers?.category === "UNSUPPORTED" ? 0 : null,
      weight: null,
      contribution: null,
      confidence: null,
      missing: !layers || layers.category === "UNKNOWN",
      evidenceRefs: [],
    },
    {
      name: "ideaSpecific",
      purpose: "Idea-specific monetization evidence.",
      raw: layers?.ideaSpecific === "SUPPORTED" ? 1 : layers?.ideaSpecific === "UNPROVEN" || layers?.ideaSpecific === "UNKNOWN" ? null : 0,
      weight: null,
      contribution: null,
      confidence: null,
      missing: !layers || layers.ideaSpecific === "UNKNOWN" || layers.ideaSpecific === "UNPROVEN",
      evidenceRefs: [],
    },
    {
      name: "unitEconomics",
      purpose: "Numeric CAC/LTV. UNKNOWN is not zero.",
      raw: layers?.unitEconomics === "SUPPORTED" ? 1 : null,
      weight: null,
      contribution: null,
      confidence: null,
      missing: !layers || layers.unitEconomics === "UNKNOWN",
      evidenceRefs: [],
    },
  ];
  return {
    name: "monetizationScore",
    value,
    purpose: "Heuristic from qualitative monetization layers. Does not invent CAC/LTV.",
    decisionGrade: grade.readyForDecision,
    classifierMetric: false,
    components,
    missingInputs: components.filter((item) => item.missing).map((item) => item.name),
    note:
      value == null
        ? "Monetization score UNKNOWN."
        : `Score ${value} maps category=${layers?.category ?? "UNKNOWN"}, idea=${layers?.ideaSpecific ?? "UNKNOWN"}, unit=${layers?.unitEconomics ?? "UNKNOWN"}. BUILD still requires known numeric economics.`,
  };
}

function decisionExplanation(input: {
  grade: FounderIdeaGrade;
  coverage: EvidenceCoverage | null;
  economics: ComparableEconomicsModel;
}): DecisionExplanation {
  const metric = input.grade.evaluation?.portfolioAdjustedScore ?? input.grade.selectionScore;
  const validate = DEFAULT_DECISION_THRESHOLDS.validateSelectionScore;
  const reject = DEFAULT_DECISION_THRESHOLDS.rejectSelectionScore;
  const hold = DEFAULT_DECISION_THRESHOLDS.holdSelectionScore;
  const decision = input.grade.evaluation?.decision ?? null;
  const unknownEcon = (input.grade.evaluation?.queueReason ?? "").includes("unknown") ||
    (input.grade.evaluation?.queueReason ?? "").includes(UNKNOWN_UNIT_ECONOMICS_REASON) ||
    input.grade.monetizationLayers?.unitEconomics === "UNKNOWN";
  const gapToValidate = metric == null ? null : Math.round((validate - metric) * 100) / 100;
  const why =
    decision == null
      ? "No Infinity decision because decision-quality evidence is insufficient."
      : metric == null
        ? `${decision} without a persisted classifier metric.`
        : decision === "HOLD"
          ? `Classifier metric ${metric} is below VALIDATE ${validate} and at/above REJECT ${reject}, so HOLD.`
          : decision === "VALIDATE"
            ? `Classifier metric ${metric} meets VALIDATE ${validate} while BUILD economics/gates failed.`
            : decision === "REJECT"
              ? `Classifier metric ${metric} is below REJECT ${reject}.`
              : `BUILD requires passing the canonical build gate, including known non-placeholder unit economics.`;
  const whyNotHigher =
    decision === "HOLD" && metric != null
      ? `VALIDATE requires portfolioAdjustedScore >= ${validate}. Current metric ${metric} is short by ${gapToValidate}.`
      : decision === "VALIDATE"
        ? "BUILD is a separate economics/build gate, not a higher score label."
        : decision === "REJECT"
          ? `HOLD would require metric >= ${reject}.`
          : "Not applicable.";
  const whyNotLower =
    decision === "HOLD" && metric != null
      ? `REJECT requires portfolioAdjustedScore < ${reject}. Current metric ${metric} is at/above that floor.`
      : decision === "VALIDATE"
        ? `Metric meets VALIDATE ${validate}.`
        : "Not applicable.";
  const whyNotBuild = unknownEcon
    ? "BUILD blocked because unit economics are UNKNOWN (CAC, LTV, LTV/CAC). Unknown is not zero. Comparable modeled economics cannot grant BUILD."
    : input.grade.buildReady
      ? "Build gate passed in-memory; founder BUILD still requires existing approval/Treasury routing."
      : `BUILD blocked: ${input.grade.evaluation?.queueReason || "canonical build gate failed"}.`;
  const weakest = (input.grade.provenance ?? [])
    .filter((row) => row.rawInput == null || (row.weightedContribution != null && row.weightedContribution < 8))
    .map((row) => row.dimension);
  const unknownDims = EVIDENCE_DIMENSIONS.filter((dimension) => input.coverage?.dimensions[dimension]?.coverage === "none");
  const whatWouldChange = [
    gapToValidate != null && gapToValidate > 0
      ? `To reach VALIDATE, portfolioAdjustedScore needs +${gapToValidate} (to ${validate}). No evidence is guaranteed to produce that increase.`
      : null,
    weakest.length ? `Low or missing opportunity components: ${weakest.slice(0, 6).join(", ")}.` : null,
    unknownDims.length ? `Uncovered research dimensions: ${unknownDims.join(", ")}.` : null,
    "Measured CAC/LTV would change BUILD readiness, not automatically this HOLD/VALIDATE label.",
  ].filter((item): item is string => Boolean(item));
  const nextValidationQuestions = [
    input.economics.pricing.recommendation ? "Will the target customer pay the modeled monthly range?" : "What comparable public prices apply to this delivery model?",
    "What acquisition channel produces an acceptable CAC?",
    unknownDims.includes("distribution") ? "Which distribution channel actually reaches the customer?" : null,
    input.economics.ltv.monthlyChurn.base == null ? "What retention/churn should be assumed, measured rather than copied?" : null,
    "Does the idea-specific offer convert, or only the generic CMS category?",
  ].filter((item): item is string => Boolean(item));

  return {
    decision,
    status: decision === "HOLD" ? "HELD" : decision === "VALIDATE" ? "VALIDATING" : decision === "REJECT" ? "REJECTED" : "UNKNOWN",
    classifierMetricField: "portfolioAdjustedScore",
    classifierMetric: metric ?? null,
    validateThreshold: validate,
    rejectThreshold: reject,
    holdThreshold: hold,
    why,
    whyNotHigher,
    whyNotLower,
    whyNotBuild,
    thresholdArithmetic:
      metric == null
        ? "Classifier metric UNKNOWN."
        : `${metric} vs VALIDATE ${validate} and REJECT ${reject}.`,
    whatWouldChange,
    nextValidationQuestions,
  };
}

function executiveSummary(input: {
  submission: FounderIdeaSubmission;
  grade: FounderIdeaGrade;
  decision: DecisionExplanation;
  economics: ComparableEconomicsModel;
}): string {
  const decision = input.grade.evaluation?.decision ?? "NONE";
  const evidence = input.grade.readyForDecision ? "decision-grade" : "not decision-grade";
  const blocker = input.grade.buildReady ? "none" : input.decision.whyNotBuild;
  return [
    `Idea: ${input.submission.title}.`,
    `Infinity conclusion: ${decision}.`,
    `Evidence: ${evidence} (${input.grade.scoreIntegrity}).`,
    `Build-ready: ${input.grade.buildReady ? "YES" : "NO"}.`,
    `Major blocker: ${blocker}`,
    `Modeled economics provenance: ${input.economics.pricing.provenance}. Health: ${input.economics.health}.`,
  ].join(" ");
}

export function composeFounderExplainability(input: {
  submission: FounderIdeaSubmission;
  grade: FounderIdeaGrade;
  packet: FounderResearchPacket | null;
  layers: MonetizationEvidenceLayers | null;
}): FounderExplainability {
  const economics = modelComparableEconomics({
    packet: input.packet ?? {
      researchRunId: input.submission.researchRunId ?? "none",
      candidateId: input.submission.opportunityCandidateId ?? "none",
      submissionId: input.submission.id,
      grounded: false,
      failed: true,
      failureCode: "RESEARCH_FAILED",
      summary: "",
      findings: [],
      sources: [],
      competitorLeads: [],
      verifiedCompetitors: [],
      monetizationLayers: input.layers ?? { category: "UNKNOWN", ideaSpecific: "UNKNOWN", unitEconomics: "UNKNOWN" },
      requiresMoreResearch: true,
    },
    context: {
      title: input.submission.title,
      description: input.submission.description,
      targetCustomer: input.submission.targetCustomer,
      problem: input.submission.problem,
      proposedSolution: input.submission.proposedSolution,
      businessModelHypothesis: input.submission.businessModelHypothesis,
      pricingHypothesis: input.submission.pricingHypothesis,
    },
    layers: input.layers ?? input.grade.monetizationLayers ?? { category: "UNKNOWN", ideaSpecific: "UNKNOWN", unitEconomics: "UNKNOWN" },
    founderPricingHypothesis: input.submission.pricingHypothesis,
  });
  const decision = decisionExplanation({ grade: input.grade, coverage: input.grade.coverage, economics });
  const provenanceClass: EconomicEvidenceClass = economics.pricing.provenance;
  return {
    executiveSummary: executiveSummary({ submission: input.submission, grade: input.grade, decision, economics }),
    evidenceSummary: evidenceSummary(input.packet, input.grade.coverage),
    keyFindings: keyFindings(input.packet, input.submission),
    sourceTrace: sourceTrace(input.packet, input.grade.provenance),
    scores: {
      opportunityQuality: opportunityExplanation(input.grade),
      selectionScore: selectionExplanation(input.grade),
      portfolioAdjustedScore: portfolioExplanation(input.grade),
      validationScore: validationExplanation(input.grade),
      monetizationScore: monetizationExplanation(input.grade),
    },
    decision,
    economics: {
      willThisWork:
        economics.health === "INSUFFICIENT_DATA"
          ? "Acquisition and/or unit economics remain too uncertain to claim the business will work."
          : economics.health === "PROMISING_BUT_UNVALIDATED"
            ? `Modeled economics look ${economics.health.toLowerCase()} but depend on unvalidated assumptions (${economics.healthWhy})`
            : economics.healthWhy,
      pricingAnswer: economics.pricing.recommendation
        ? `Recommended modeled monthly ${formatRange(economics.pricing.recommendation.monthly, "$")}; setup ${formatRange(economics.pricing.recommendation.setup, "$")}. Confidence ${economics.pricing.confidence}. Class ${provenanceClass}.`
        : "No modeled pricing recommendation; comparable monthly price is UNKNOWN.",
      provenance: provenanceClass,
      modeledCac: formatRange(economics.outputs.cac, "$"),
      modeledLtv: formatRange(economics.outputs.ltv, "$"),
      modeledLtvCac: formatRange(economics.outputs.ltvCac),
      health: economics.health,
      majorAssumptions: economics.assumptions.map((item) => `${item.name}: ${item.assumption}`),
    },
    comparables: economics,
    opportunityProvenance: input.grade.provenance,
  };
}

export function flattenExplainabilityForHq(explain: FounderExplainability): Record<string, string | number | boolean | null> {
  return {
    executiveSummary: explain.executiveSummary,
    whyDecision: explain.decision.why,
    whyNotValidate: explain.decision.whyNotHigher,
    whyNotReject: explain.decision.whyNotLower,
    whyNotBuild: explain.decision.whyNotBuild,
    thresholdArithmetic: explain.decision.thresholdArithmetic,
    classifierMetricField: explain.decision.classifierMetricField,
    classifierMetric: explain.decision.classifierMetric,
    validateThreshold: explain.decision.validateThreshold,
    rejectThreshold: explain.decision.rejectThreshold,
    whatWouldChange: explain.decision.whatWouldChange.join(" | "),
    nextValidation: explain.decision.nextValidationQuestions.join(" | "),
    pricingRecommendation: explain.economics.pricingAnswer,
    modeledCac: explain.economics.modeledCac,
    modeledLtv: explain.economics.modeledLtv,
    modeledLtvCac: explain.economics.modeledLtvCac,
    economicHealth: explain.economics.health,
    economicProvenance: explain.economics.provenance,
    willThisWork: explain.economics.willThisWork,
    evidenceOverview: explain.evidenceSummary.map((item) => `${item.dimension}:${item.strength}/${item.polarity}`).join("; "),
    comparableNames: explain.comparables.comparables.map((item) => item.name).join(", ") || "NONE",
    scoreOpportunityNote: explain.scores.opportunityQuality.note,
    scoreSelectionNote: explain.scores.selectionScore.note,
    scorePortfolioNote: explain.scores.portfolioAdjustedScore.note,
    scoreValidationNote: explain.scores.validationScore.note,
    scoreMonetizationNote: explain.scores.monetizationScore.note,
    keyInsights: explain.keyFindings
      .slice(0, 8)
      .map((item) => `${item.displayKind}: ${item.claim}`)
      .join(" | "),
    risksUncertainties: [
      ...explain.comparables.sensitivity.map((item) => `${item.name} (${item.direction}): ${item.why}`),
      ...explain.comparables.assumptions.map((item) => item.uncertainty),
    ].join(" | "),
    sourceTrace: explain.sourceTrace
      .slice(0, 16)
      .map((row) => `${row.findingId} → ${row.sourceUrl} → ${row.dimension} → ${row.scoreImpact}`)
      .join(" | "),
    comparableTable: explain.comparables.comparables
      .map(
        (item) =>
          `${item.name} | ${item.confidenceBand} | ${item.whyComparable} | sources:${item.sourceRefs.join(",") || "UNKNOWN"}`,
      )
      .join(" || ") || "NONE",
    marketCompetition: explain.evidenceSummary
      .filter((item) => item.dimension === "market" || item.dimension === "competition" || item.dimension === "demand")
      .map((item) => `${item.dimension}: ${item.summary}`)
      .join(" | "),
    economicAssumptions: explain.economics.majorAssumptions.join(" | "),
  };
}
