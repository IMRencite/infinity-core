import type { Json } from "@/lib/supabase/database.types";
import type {
  InternalArtifactType,
  ReviewStatus,
  SideEffectClass,
  WorkerPermission,
  WorkerResultStatus,
  WorkerType,
} from "./constants";

export type WorkerCapabilityContract = {
  capabilityKey: string;
  version: string;
  name: string;
  description: string;
  workerType: WorkerType;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  permissions: WorkerPermission[];
  requiredContext: string[];
  requiredPolicies: string[];
  maximumRuntimeMs: number;
  maximumAttempts: number;
  maximumEstimatedCost: number;
  concurrencyLimit: number;
  idempotencyStrategy: "input_hash";
  cancellationSupport: boolean;
  retryPolicy: "runtime_default";
  sideEffectClass: SideEffectClass;
  reviewRequirement: ReviewStatus | "independent_qa";
  artifactTypesProduced: InternalArtifactType[];
  status: "active" | "disabled";
};

export type WorkerExecutionContextBound = {
  organizationId: string;
  missionId: string | null;
  runtimeInstanceId: string | null;
  opportunityId: string | null;
  planId: string | null;
  planStepId: string | null;
  engineJobId: string;
  workerRunId: string;
  correlationId: string;
  capabilityKey: string;
  capabilityVersion: string;
  idempotencyKey: string;
  executionKey: string;
  attemptNumber: number;
  approvedInput: Json;
  constraints: Record<string, unknown>;
  grantedPermissions: ReadonlySet<WorkerPermission>;
};

export type WorkerHandlerResult = {
  structuredOutput: Record<string, unknown>;
  artifactType?: InternalArtifactType;
  artifactPayload?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
};

export type PolicyGateOutcome =
  | { allowed: true }
  | { allowed: false; reason: string; classification: string };

export type PersistedWorkerResultRef = {
  id: string;
  status: WorkerResultStatus;
  reviewStatus: ReviewStatus;
  structuredOutput: Json;
  executionKey: string;
  completedAt: string | null;
};

export type WorkerCapabilityDiagnosticsRow = {
  capabilityKey: string;
  capabilityVersion: string;
  workerType: string;
  engineJobId: string | null;
  engineJobStatus: string | null;
  workerRunId: string | null;
  workerRunStatus: string | null;
  workerResultId: string | null;
  resultStatus: string | null;
  attemptNumber: number | null;
  durationMs: number | null;
  reviewStatus: string | null;
  artifactType: string | null;
  blockingReason: string | null;
  errorClassification: string | null;
};
