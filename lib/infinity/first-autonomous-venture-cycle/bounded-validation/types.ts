import type {

  EvidenceRelevanceClass,

  ValidationEvidentiaryResult,

} from "./evidence-relevance";



export type ValidationExperimentRecord = {

  candidateId: string;

  blockingAssumptionId: string;

  experimentType: string;

  requestedExperimentType?: string;

  question: string;

  expectedEvidence: string;

  actualEvidence: string;

  sourceUrls: string[];

  newSourceUrls: string[];

  reusedSourceUrls: string[];

  newSourceCount: number;

  reusedSourceCount: number;

  relevanceClass: EvidenceRelevanceClass;

  costUsd: number;

  executionStatus: "COMPLETED" | "FAILED" | "SKIPPED";

  validationResult: ValidationEvidentiaryResult;

  newEvidenceFound: boolean;

  uncertaintyReduction: number;

  confidenceImpact: number;

  assumptionImpact: number;

  providerCalls: number;

  synthesisOnly: boolean;
  provider?: string;
  model?: string;
  researchRunId?: string;
  tokenUsage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  costKnown?: boolean;
  validationStep?: "synthesis" | "acquisition";
};

export type BoundedValidationLineage = {
  cycleKey: string;

  discoveryRunId: string | null;

  monetizationRunId: string | null;

  ventureSelectionRunId: string | null;

  selectedValidationCandidateId: string | null;

  validationRunId: string | null;

  postValidationEvaluationId: string | null;

  finalDecision: "BUILD" | "VALIDATE" | "REJECT" | "TECHNICAL_FAILURE";

  selectionReason: string | null;

  validationRound: number;

  synthesisStepCount: number;

  acquisitionStepCount: number;

  acquisitionDecision: "RUN" | "SKIP" | null;

  acquisitionReason: string | null;

  experiments: ValidationExperimentRecord[];
};



export type BoundedValidationOutcome =

  | "BUILD"

  | "VALIDATE"

  | "REJECT"

  | "TECHNICAL_FAILURE";



export type BoundedValidationResult = {

  ok: boolean;

  outcome: BoundedValidationOutcome;

  promotedToBuild: boolean;

  technicalFailure: boolean;

  terminalMessage: string;

  validationRunId: string;

  postValidationEvaluationId: string;

  selectedCandidate: {

    candidateId: string;

    title: string;

    selectionReason: string;

  } | null;

  preValidationFatalRisk: number | null;

  postValidationFatalRisk: number | null;

  preValidationDecision: string | null;

  postValidationDecision: string | null;

  experiments: ValidationExperimentRecord[];

  rejectedExperimentTypes: string[];

  synthesisStepCount: number;

  acquisitionStepCount: number;

  acquisitionDecision: "RUN" | "SKIP" | null;

  acquisitionReason: string | null;

  lineage: BoundedValidationLineage;

  costUsd: number | null;

  costKnown: boolean;

  providerCalls: number;

  postValidationEvaluation: import("@/lib/infinity/venture-selection/types").CandidateEvaluationDraft | null;

};


