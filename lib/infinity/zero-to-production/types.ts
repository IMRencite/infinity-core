import type { CanonicalVentureAssemblyIdentity } from "@/lib/infinity/venture-assembly/identity";
import type { SelectionDecision } from "@/lib/infinity/venture-selection/constants";
import type { VentureBlueprintDraft, BuildPackageDraft, BuildGraph } from "@/lib/infinity/company-builder/types";
import type { CodingAgentRun } from "@/lib/infinity/coding-agents/types";
import type { CodingSimulation } from "@/lib/infinity/coding-agents/types";
import type { CommercializationPlan } from "@/lib/infinity/commercialization/types";
import type {
  ProductReadinessFlag,
  ZtpBusinessDecision,
  ZtpFailureCode,
  ZtpOrigin,
  ZtpReadiness,
  ZtpStage,
  ZtpStatus,
} from "./constants";

export type ZtpCost = {
  value: number | null;
  actuality: "ACTUAL" | "ESTIMATE" | "UNKNOWN";
  currency: "USD";
};

export type ZeroToProductionRun = {
  id: string;
  organizationId: string;
  origin: ZtpOrigin;
  sourceEntityType: "founder_idea_submission" | "opportunity_candidate";
  sourceEntityId: string;
  founderIdeaSubmissionId: string | null;
  opportunityCandidateId: string;
  ventureId: string | null;
  canonicalVentureIdentity: CanonicalVentureAssemblyIdentity;
  ventureBlueprintId: string | null;
  missionId: string | null;
  buildPackageId: string | null;
  buildGraphId: string | null;
  commercializationPlanId: string | null;
  codingAgentRunIds: string[];
  productionArtifactId: string | null;
  financialActionRequestIds: string[];
  infinityDecision: SelectionDecision | null;
  founderDecision: SelectionDecision | null;
  businessDecision: ZtpBusinessDecision | null;
  businessOutcome: "NONE" | "BUSINESS_REJECTED" | "VALIDATION_REQUIRED" | "BUILD_AUTHORIZED";
  stage: ZtpStage;
  status: ZtpStatus;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
  costKnown: boolean;
  failureCode: ZtpFailureCode | null;
  failureReason: string | null;
  idempotencyKey: string;
  publiclyLaunched: false;
  readiness: ZtpReadiness | null;
  productReadiness: Record<ProductReadinessFlag, boolean>;
  codingProvider: string | null;
  codingRouterOutcome: string | null;
  qaPassed: boolean | null;
  repairAttempts: number;
  repairStrategy: string | null;
  progress: number;
  currentBlocker: string | null;
  performanceHooksDeclared: string[];
  actualPerformanceObserved: false;
  stale: boolean;
};

export type ZeroToProductionStageRun = {
  id: string;
  ztpRunId: string;
  organizationId: string;
  stage: ZtpStage;
  status: ZtpStatus;
  canonicalEntityType: string | null;
  canonicalEntityId: string | null;
  startedAt: string;
  completedAt: string | null;
  cost: ZtpCost;
  failureCode: ZtpFailureCode | null;
  failureReason: string | null;
};

export type ZeroToProductionEvent = {
  id: string;
  ztpRunId: string;
  organizationId: string;
  type: string;
  at: string;
  payload: Record<string, string | number | boolean | null>;
};

export type LaunchReadinessReport = {
  businessDecisionValid: boolean;
  ventureBlueprintReady: boolean;
  buildPackageReady: boolean;
  buildGraphComplete: boolean;
  qaPassed: boolean;
  productionArtifactReady: boolean;
  commercializationPlanReady: boolean;
  treasuryReady: boolean;
  domainRequirementReady: boolean;
  hostingRequirementReady: boolean;
  paymentRequirementReady: boolean;
  fulfillmentReady: boolean;
  telemetryReady: boolean;
  noUnresolvedHighCritical: boolean;
  result: ZtpReadiness;
  publiclyLaunched: false;
  label: "READY_FOR_CONTROLLED_LAUNCH" | "DEGRADED" | "BLOCKED";
};

export type ZtpRunInput = {
  organizationId: string;
  idempotencyKey: string;
  founderIdeaSubmissionId?: string | null;
  opportunityCandidateId?: string | null;
  actorUserId?: string;
  codingSimulation?: CodingSimulation;
  preferMockCursor?: boolean;
  haltAfterQaFailure?: boolean;
  exhaustRepair?: boolean;
  stopAfter?: ZtpStage;
  plannedCommercialCostUsd?: number;
  unknownCommercialCost?: boolean;
};

export type ZtpRunResult = {
  run: ZeroToProductionRun;
  stages: ZeroToProductionStageRun[];
  blueprint: VentureBlueprintDraft | null;
  buildPackage: BuildPackageDraft | null;
  buildGraph: BuildGraph | null;
  codingRuns: CodingAgentRun[];
  commercializationPlan: CommercializationPlan | null;
  launchReadiness: LaunchReadinessReport | null;
  duplicate: boolean;
};

export type GraphValidation = {
  valid: boolean;
  cycles: string[];
  uniqueTaskIds: boolean;
  dependenciesResolvable: boolean;
  featureContractsRepresented: boolean;
  commercialRequirementsRepresented: boolean;
  reasons: string[];
};
