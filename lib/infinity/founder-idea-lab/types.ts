import type { CanonicalVentureAssemblyIdentity } from "@/lib/infinity/venture-assembly/identity";
import type { SelectionDecision } from "@/lib/infinity/venture-selection/constants";
import type { NormalizedCandidateScores } from "@/lib/infinity/opportunity-scanner/types";
import type { CandidateEvaluationDraft } from "@/lib/infinity/venture-selection/types";
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

export type FounderIdeaGrade = {
  opportunityScores: NormalizedCandidateScores;
  selectionScore: number;
  validationScore: number;
  monetizationScore: number;
  fatalAssumptionRisk: number;
  expectedRoi: number | null;
  estimatedCapitalRequired: number | null;
  buildReadiness: SelectionDecision;
  opportunityQuality: number;
  evaluation: CandidateEvaluationDraft;
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
