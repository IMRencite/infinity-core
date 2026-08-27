import type { EvidenceDimension } from "../evidence-coverage";
import type { SelectionDecision } from "@/lib/infinity/venture-selection/constants";
import type { ScoreProvenanceRow } from "../score-from-evidence";
import type { ComparableEconomicsModel } from "../comparable-economics/types";
import type { EconomicEvidenceClass } from "../comparable-economics/provenance";

export const FINDING_DISPLAY_KINDS = [
  "SOURCE_BACKED_FINDING",
  "INFINITY_INFERENCE",
  "FOUNDER_HYPOTHESIS",
  "UNKNOWN",
] as const;

export type FindingDisplayKind = (typeof FINDING_DISPLAY_KINDS)[number];

export type EvidenceDimensionSummary = {
  dimension: EvidenceDimension;
  summary: string;
  strength: "adequate" | "partial" | "none";
  polarity: string;
  directCount: number;
  inferenceCount: number;
  sourceCount: number;
  confidence: number | null;
};

export type KeyFindingView = {
  findingId: string;
  claim: string;
  dimension: EvidenceDimension;
  displayKind: FindingDisplayKind;
  grounded: boolean;
  confidence: number | null;
  sourceRefs: string[];
  whyItMatters: string;
};

export type SourceTraceRow = {
  findingId: string;
  sourceUrl: string;
  researchRunId: string | null;
  dimension: EvidenceDimension;
  scoreImpact: string;
};

export type ScoreComponentRow = {
  name: string;
  purpose: string;
  raw: number | null;
  weight: number | null;
  contribution: number | null;
  confidence: number | null;
  missing: boolean;
  evidenceRefs: string[];
};

export type ScoreExplanation = {
  name: string;
  value: number | null;
  purpose: string;
  decisionGrade: boolean;
  classifierMetric: boolean;
  components: ScoreComponentRow[];
  missingInputs: string[];
  note: string;
};

export type DecisionExplanation = {
  decision: SelectionDecision | null;
  status: string;
  classifierMetricField: "portfolioAdjustedScore";
  classifierMetric: number | null;
  validateThreshold: number;
  rejectThreshold: number;
  holdThreshold: number;
  why: string;
  whyNotHigher: string;
  whyNotLower: string;
  whyNotBuild: string;
  thresholdArithmetic: string;
  whatWouldChange: string[];
  nextValidationQuestions: string[];
};

export type EconomicsExplanation = {
  willThisWork: string;
  pricingAnswer: string;
  provenance: EconomicEvidenceClass;
  modeledCac: string;
  modeledLtv: string;
  modeledLtvCac: string;
  health: string;
  majorAssumptions: string[];
};

export type FounderExplainability = {
  executiveSummary: string;
  evidenceSummary: EvidenceDimensionSummary[];
  keyFindings: KeyFindingView[];
  sourceTrace: SourceTraceRow[];
  scores: {
    opportunityQuality: ScoreExplanation;
    selectionScore: ScoreExplanation;
    portfolioAdjustedScore: ScoreExplanation;
    validationScore: ScoreExplanation;
    monetizationScore: ScoreExplanation;
  };
  decision: DecisionExplanation;
  economics: EconomicsExplanation;
  comparables: ComparableEconomicsModel;
  opportunityProvenance: ScoreProvenanceRow[];
};
