import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";

export const HQ_ROOM_PROJECTION_CONTRACT = "HQRoomProjectionContract" as const;
export const HQ_ROOM_EMPTY_STATE_VALIDITY_GATE = "HQRoomEmptyStateValidityGate" as const;
export const HQ_ROOM_PROJECTION_FALLBACK_MASKING_GATE = "HQRoomProjectionFallbackMaskingGate" as const;
export const HQ_GLOBAL_ROOM_SCOPE_INTEGRITY_GATE = "HQGlobalRoomScopeIntegrityGate" as const;
export const GROWTH_STRATEGY_REQUIRED = "GROWTH_STRATEGY_REQUIRED" as const;
export const PROJECTION_ERROR = "PROJECTION_ERROR" as const;

export type HqRoomScope = "GLOBAL" | "GLOBAL_SUMMARY" | "GLOBAL_SUMMARY_PLUS_VENTURE";

export type HqRoomProjectionDefinition = {
  roomId: DepartmentId;
  scope: HqRoomScope;
  canonicalDataSource: string;
  workerSource: string;
  currentWorkSource: string;
  recentOutputSource: string;
  emptyRule: string;
  errorRule: string;
};

export const HQ_ROOM_PROJECTION_CONTRACTS: readonly HqRoomProjectionDefinition[] = [
  {
    roomId: "opportunity_lab",
    scope: "GLOBAL",
    canonicalDataSource: "opportunity_candidates + live ranking",
    workerSource: "buildWorkerNodes:Scanner",
    currentWorkSource: "operator-snapshot.departments.currentTask",
    recentOutputSource: "live Venture Radar artifacts",
    emptyRule: "EMPTY only if canonical opportunities truly do not exist",
    errorRule: "PROJECTION_ERROR when load fails",
  },
  {
    roomId: "operations",
    scope: "GLOBAL",
    canonicalDataSource: "HQCanonicalOperatingProjection",
    workerSource: "projectOperationsRoom.workers",
    currentWorkSource: "projectOperationsRoom.department.currentTask",
    recentOutputSource: "operations room artifacts",
    emptyRule: "EMPTY only if no operating work or ventures exist",
    errorRule: "PROJECTION_ERROR when load fails",
  },
  {
    roomId: "research_department",
    scope: "GLOBAL_SUMMARY",
    canonicalDataSource: "research_runs + recent outputs",
    workerSource: "buildWorkerNodes:Research,Synthesis",
    currentWorkSource: "operator-snapshot.departments.currentTask",
    recentOutputSource: "research artifacts",
    emptyRule: "PRESENT_IDLE may describe activity; content must not hide completed research",
    errorRule: "PROJECTION_ERROR when load fails",
  },
  {
    roomId: "strategy_finance",
    scope: "GLOBAL_SUMMARY_PLUS_VENTURE",
    canonicalDataSource: "VentureEconomicsIntelligenceContract",
    workerSource: "buildWorkerNodes:Economics",
    currentWorkSource: "Profit Lab current economics",
    recentOutputSource: "profit lab artifacts",
    emptyRule: "EMPTY only if no economics records exist",
    errorRule: "PROJECTION_ERROR — CANONICAL_ECONOMICS_UNAVAILABLE",
  },
  {
    roomId: "systems_architect",
    scope: "GLOBAL_SUMMARY_PLUS_VENTURE",
    canonicalDataSource: "venture systems architecture HQ view",
    workerSource: "buildWorkerNodes:Architect",
    currentWorkSource: "systems architect current task",
    recentOutputSource: "systems architect artifacts",
    emptyRule: "EMPTY only if no architecture view or artifacts exist",
    errorRule: "PROJECTION_ERROR when load fails",
  },
  {
    roomId: "company_operations",
    scope: "GLOBAL_SUMMARY_PLUS_VENTURE",
    canonicalDataSource: "company_builder_blueprints + build outputs",
    workerSource: "buildWorkerNodes:Blueprint",
    currentWorkSource: "blueprint current task",
    recentOutputSource: "blueprint artifacts",
    emptyRule: "EMPTY only if no blueprint/build records exist",
    errorRule: "PROJECTION_ERROR when load fails",
  },
  {
    roomId: "growth_department",
    scope: "GLOBAL_SUMMARY_PLUS_VENTURE",
    canonicalDataSource: "organic_growth_runs + venture growth strategy",
    workerSource: "buildWorkerNodes:Planning",
    currentWorkSource: "growth current task",
    recentOutputSource: "growth artifacts",
    emptyRule: "GROWTH_STRATEGY_REQUIRED when architecture exists but strategy has not run",
    errorRule: "PROJECTION_ERROR when load fails",
  },
] as const;

export type NamedRoomProjectionGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export function evaluateHQRoomProjectionContract(): NamedRoomProjectionGate {
  const required: DepartmentId[] = [
    "opportunity_lab",
    "operations",
    "research_department",
    "strategy_finance",
    "systems_architect",
    "company_operations",
    "growth_department",
  ];
  const reasons = required
    .filter((id) => !HQ_ROOM_PROJECTION_CONTRACTS.some((row) => row.roomId === id))
    .map((id) => `UNREGISTERED:${id}`);
  return {
    gate: HQ_ROOM_PROJECTION_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQRoomEmptyStateValidityGate(input: {
  roomId: DepartmentId;
  renderedEmpty: boolean;
  canonicalRecordCount: number;
}): NamedRoomProjectionGate {
  const reasons: string[] = [];
  if (input.renderedEmpty && input.canonicalRecordCount > 0) {
    reasons.push(`${input.roomId}:EMPTY_DESPITE_CANONICAL_RECORDS:${input.canonicalRecordCount}`);
  }
  return {
    gate: HQ_ROOM_EMPTY_STATE_VALIDITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQRoomProjectionFallbackMaskingGate(input: {
  projectionFailed: boolean;
  renderedState: string | null | undefined;
}): NamedRoomProjectionGate {
  const reasons: string[] = [];
  if (input.projectionFailed && (!input.renderedState || input.renderedState === "EMPTY")) {
    reasons.push("PROJECTION_FAILURE_MASKED_AS_EMPTY");
  }
  return {
    gate: HQ_ROOM_PROJECTION_FALLBACK_MASKING_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQGlobalRoomScopeIntegrityGate(input: {
  inspectActive: boolean;
  radarArtifactCount: number;
  opportunityCount: number;
  profitLabRowCount: number;
  economicsRecordCount: number;
  operationsPresent: boolean;
}): NamedRoomProjectionGate {
  const reasons: string[] = [];
  if (input.opportunityCount > 0 && input.radarArtifactCount === 0) {
    reasons.push("VENTURE_RADAR_GLOBAL_SCOPE_ERASED");
  }
  if (input.economicsRecordCount > 0 && input.profitLabRowCount === 0) {
    reasons.push("PROFIT_LAB_GLOBAL_SCOPE_ERASED");
  }
  if (!input.operationsPresent) reasons.push("OPERATIONS_GLOBAL_SCOPE_ERASED");
  if (input.inspectActive && input.opportunityCount > 0 && input.radarArtifactCount === 0) {
    reasons.push("INSPECT_QUERY_ERASED_GLOBAL_ROOMS");
  }
  return {
    gate: HQ_GLOBAL_ROOM_SCOPE_INTEGRITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function roomHasProjectionError(artifacts: HqWorkArtifact[]): boolean {
  return artifacts.some(
    (item) =>
      item.title.includes(PROJECTION_ERROR) ||
      item.state === "FAILED" ||
      (typeof item.metadata.projection_error === "string" && item.metadata.projection_error.length > 0),
  );
}
