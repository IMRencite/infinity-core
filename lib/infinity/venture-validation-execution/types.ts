import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { CanonicalCandidateInput } from "@/lib/infinity/venture-intelligence/types";
import type { ExecutableVenturePlan, VentureBuildPackage } from "@/lib/infinity/venture-build-orchestration/types";
import type {
  LIVE_QUERY_BUDGET,
  SOURCE_INDEPENDENCE,
  SOURCE_QUALITY,
  VALIDATION_DIMENSIONS,
  VALIDATION_MODES,
  VALIDATION_OUTCOMES,
  VALIDATION_PHASES,
} from "./constants";

export type ValidationDimension = (typeof VALIDATION_DIMENSIONS)[number];
export type ValidationPhase = (typeof VALIDATION_PHASES)[number];
export type ValidationMode = (typeof VALIDATION_MODES)[number];
export type ValidationOutcome = (typeof VALIDATION_OUTCOMES)[number];
export type SourceQuality = (typeof SOURCE_QUALITY)[number];
export type SourceIndependence = (typeof SOURCE_INDEPENDENCE)[number];

export type ValidationBlocker = {
  order: number;
  dimension: ValidationDimension;
  currentEvidence: string;
  requiredEvidence: string;
  gap: string;
  validationAction: string;
  successCriterion: string;
  mode: ValidationMode;
};

export type ValidationTask = {
  taskId: string;
  phase: ValidationPhase;
  dimension: ValidationDimension;
  question: string;
  evidenceNeeded: string;
  requiredCapability: string;
  capabilityRoute: {
    capability: string;
    requiredCapabilityKey: string;
    roomId: DepartmentId;
    providerNeutral: true;
  };
  dependencies: string[];
  budget: {
    maxQueries: number;
    estimatedCostUsd: number | null;
    costKnown: boolean;
    unknownCostTreatedAsZero: false;
  };
  stopCondition: string;
  expectedResult: string;
  externalActionRequired: boolean;
  mode: ValidationMode;
  status: "PENDING" | "READY" | "RUNNING" | "COMPLETED" | "BLOCKED" | "SKIPPED";
  traceability: {
    planId: string;
    candidateId: string;
  };
};

export type QueryBudget = {
  maxProviderPhases: typeof LIVE_QUERY_BUDGET.maxProviderPhases;
  maxQueriesPerPhase: typeof LIVE_QUERY_BUDGET.maxQueriesPerPhase;
  hardQueryCap: typeof LIVE_QUERY_BUDGET.hardQueryCap;
};

export type ExecutableValidationPlan = {
  schemaVersion: "executable_validation_plan_v1";
  planId: string;
  planVersion: number;
  candidateId: string;
  ventureId: string;
  organizationId: string;
  decision: string;
  buildReady: boolean;
  blockingDimensions: ValidationDimension[];
  validationObjectives: string[];
  blockers: ValidationBlocker[];
  phases: Array<{ phase: ValidationPhase; purpose: string; taskIds: string[] }>;
  tasks: ValidationTask[];
  dependencies: Array<{ from: string; to: string }>;
  capabilityRoutes: ValidationTask["capabilityRoute"][];
  queryBudget: QueryBudget;
  economicBudget: {
    researchOnly: true;
    adSpend: 0;
    domainSpend: 0;
    externalPurchase: 0;
  };
  successCriteria: string[];
  stopConditions: string[];
  evidenceRequirements: string[];
  traceability: {
    candidateId: string;
    selectionId: string | null;
    researchIds: string[];
    monetizationPlanId: string | null;
    validationRunId: string | null;
  };
  status: "PLANNED" | "READY" | "EXECUTING" | "COMPLETED" | "SKIPPED" | "BLOCKED";
};

export type PreRunCandidateState = {
  candidateId: string;
  name: string;
  decision: string;
  buildReady: boolean;
  selectionScore: number | null;
  opportunityScore: number | null;
  validationState: string;
  researchState: string;
  model: string;
  pricing: string;
  cac: string;
  ltv: string;
  ltvCac: string;
  payback: string;
  margin: string;
  openGaps: string[];
  counterfactual: string | null;
  candidate: CanonicalCandidateInput | null;
};

export type EconomicSnapshot = {
  model: string;
  pricing: string;
  priceBase: number | null;
  cac: number | null;
  cacDisplay: string;
  actualCac: "UNKNOWN";
  ltv: number | null;
  ltvDisplay: string;
  ltvCac: number | null;
  ltvCacDisplay: string;
  paybackMonths: number | null;
  paybackDisplay: string;
  marginPercent: number | null;
  marginDisplay: string;
  retention: string;
  lifetime: string;
  confidence: string;
  provenance: string;
};

export type BusinessModelChallenge = {
  monthlySubscriptionSupported: "YES" | "NO" | "PARTIAL";
  perDealModel: string;
  teamLicense: string;
  oneTimeModel: string;
  recommendedModel: string;
  reason: string;
};

export type ValidationEvidenceRevision = {
  customer: string;
  problem: string;
  painEvidence: string[];
  painConfidence: string;
  competitors: string[];
  competitorWeaknesses: string[];
  competitionConfidence: string;
  customerProblems: string[];
  productResponses: string[];
  differentiators: string[];
  advantageStrength: string;
};

export type ValidationExecutionResult = {
  validationRunId: string;
  plan: ExecutableValidationPlan;
  outcome: ValidationOutcome;
  decision: string;
  buildReady: boolean;
  changedFromPreRun: boolean;
  preRun: PreRunCandidateState;
  economicsBefore: EconomicSnapshot;
  economicsAfter: EconomicSnapshot;
  monetizationChanged: boolean;
  recommendedPricing: string;
  setupFee: string | null;
  otherRevenueStreams: string[];
  businessModelChallenge: BusinessModelChallenge;
  evidence: ValidationEvidenceRevision;
  buildability: {
    mvp: string[];
    technicalComplexity: string;
    risks: string[];
  };
  legal: {
    risks: string[];
    specialistReviewNeeded: boolean;
  };
  readyForBuildHandoff: boolean;
  executableBuildPlan: ExecutableVenturePlan | null;
  buildPackage: VentureBuildPackage | null;
  realBuildExecuted: false;
  live: {
    ran: boolean;
    provider: string | null;
    model: string | null;
    providerCalls: number;
    queries: number;
    sources: number;
    costUsd: number | null;
    costKnown: boolean;
    researchRunIds: string[];
  };
  persistence: {
    persisted: boolean;
    researchRunIds: string[];
    selectionRunId: string | null;
    monetizationPlanId: string | null;
  };
  rooms: Array<{ roomId: DepartmentId; state: string; drivenByTaskId: string }>;
  currentPosition: string;
  nextMove: string;
  writeBoundary: typeof import("./constants").WRITE_BOUNDARY;
};
