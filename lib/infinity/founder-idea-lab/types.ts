import type { CanonicalVentureAssemblyIdentity } from "@/lib/infinity/venture-assembly/identity";
import type { SelectionDecision } from "@/lib/infinity/venture-selection/constants";
import type { NormalizedCandidateScores } from "@/lib/infinity/opportunity-scanner/types";
import type { CandidateEvaluationDraft } from "@/lib/infinity/venture-selection/types";
import type { EvidenceCoverage } from "./evidence-coverage";
import type { MonetizationEvidenceLayers } from "./monetization-levels";
import type { ScoreProvenanceRow } from "./score-from-evidence";
import type { ComparableEconomicsModel } from "./comparable-economics/types";
import type { FounderExplainability } from "./explainability/types";
import type {
  ClaimSource,
  FounderAction,
  FounderFailureCode,
  FounderIdeaDesiredMode,
  FounderIdeaStatus,
  VentureOrigin,
} from "./constants";

export type ProvenancedField = {
  value: string | null;
  source: ClaimSource;
};

export type FounderIdeaSubmissionInput = {
  organizationId: string;
  submittedByUserId: string;
  title: string;
  description: string;
  targetCustomer?: string | null;
  problem?: string | null;
  proposedSolution?: string | null;
  businessModelHypothesis?: string | null;
  pricingHypothesis?: string | null;
  competitors?: string | null;
  notes?: string | null;
  desiredMode?: FounderIdeaDesiredMode;
  idempotencyKey: string;
};

export type FounderIdeaSubmission = {
  id: string;
  organizationId: string;
  submittedByUserId: string;
  title: string;
  description: string;
  targetCustomer: string | null;
  problem: string | null;
  proposedSolution: string | null;
  businessModelHypothesis: string | null;
  pricingHypothesis: string | null;
  competitors: string | null;
  notes: string | null;
  desiredMode: FounderIdeaDesiredMode;
  status: FounderIdeaStatus;
  opportunityCandidateId: string | null;
  infinityDecision: SelectionDecision | null;
  founderDecision: SelectionDecision | FounderAction | null;
  origin: VentureOrigin;
  failureCode: FounderFailureCode | null;
  needsReanalysis: boolean;
  researchRunId: string | null;
  analyzedByUserId: string | null;
  approvedByUserId: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
};

export type NormalizedFounderThesis = {
  businessThesis: ProvenancedField;
  problem: ProvenancedField;
  targetCustomer: ProvenancedField;
  solution: ProvenancedField;
  market: ProvenancedField;
  businessModelCandidates: { values: string[]; source: ClaimSource };
  distributionHypotheses: { values: string[]; source: ClaimSource };
  risks: { values: string[]; source: ClaimSource };
  unknowns: { values: string[]; source: ClaimSource };
};

export type FounderScoreIntegrity = "EVIDENCE_GROUNDED" | "INCOMPLETE" | "FALLBACK_HISTORICAL" | "TEST_FIXTURE";

export type CandidateRepairState = "hydrated" | "dangling" | "repaired" | "created" | "reconciled";

export type HistoricalGradeSnapshot = {
  archivedAt: string;
  evaluationVersion: string;
  opportunityScore: number | null;
  selectionScore: number | null;
  validationScore: number | null;
  monetizationScore: number | null;
  decision: SelectionDecision | null;
  status: FounderIdeaStatus;
  scoreIntegrity: FounderScoreIntegrity | null;
  provenance: ScoreProvenanceRow[];
  candidateId: string | null;
  researchRunId: string | null;
  reason: "REANALYSIS";
};

export type FounderIdeaGrade = {
  opportunityScores: NormalizedCandidateScores | null;
  selectionScore: number | null;
  validationScore: number | null;
  monetizationScore: number | null;
  fatalAssumptionRisk: number | null;
  expectedRoi: number | null;
  estimatedCapitalRequired: number | null;
  buildReadiness: SelectionDecision | null;
  opportunityQuality: number | null;
  evaluation: CandidateEvaluationDraft | null;
  scoreIntegrity: FounderScoreIntegrity;
  /**
   * Enough research evidence to emit an idea classification (VALIDATE / HOLD / REJECT,
   * or BUILD if economics also pass). Does not mean ready to build, spend, or launch.
   */
  readyForDecision: boolean;
  /** Canonical build gate plus known non-placeholder unit economics. */
  buildReady: boolean;
  researchRunId: string | null;
  monetizationRunId: string | null;
  provenance: ScoreProvenanceRow[];
  coverage: EvidenceCoverage | null;
  monetizationLayers: MonetizationEvidenceLayers | null;
  explainability?: FounderExplainability | null;
  comparableEconomics?: ComparableEconomicsModel | null;
};

export type FounderDecisionOverride = {
  id: string;
  organizationId: string;
  founderIdeaSubmissionId: string;
  candidateId: string;
  infinityDecision: SelectionDecision;
  founderDecision: SelectionDecision;
  founderAction: FounderAction;
  reason: string | null;
  riskAcknowledged: boolean;
  createdBy: string;
  createdAt: string;
};

export type FounderBuildRouteResult = {
  companyBuilderInvoked: boolean;
  blueprintCreated: boolean;
  buildPackageCreated: boolean;
  buildMissionCreated: boolean;
  codingRouterCompatible: boolean;
  pabReused: boolean;
  ventureOrigin: VentureOrigin;
  treasuryBypassed: false;
  publiclyDeployed: false;
  blueprintId: string | null;
  buildPackageId: string | null;
  missionId: string | null;
  canonicalVentureIdentity: CanonicalVentureAssemblyIdentity;
};

export type FounderValidationPlan = {
  blockingAssumptions: string[];
  plannedValidation: string[];
  expectedCostUsd: number | null;
  expectedInformationGain: string[];
  treasuryRequired: true;
};
