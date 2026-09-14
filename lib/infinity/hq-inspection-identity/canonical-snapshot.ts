import "server-only";

import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { listDepartmentsInLifecycleOrder } from "@/lib/infinity/operator-console/department-registry";
import { enrichOperatorSnapshot } from "@/lib/infinity/operator-console/enrich-snapshot";
import { sanitizeOperatorSnapshot } from "@/lib/infinity/operator-console/sanitize";
import type {
  DepartmentUiState,
  OperatorDepartmentSnapshot,
  OperatorVentureSnapshot,
} from "@/lib/infinity/operator-console/types";
import { ASKREVIEW_WORKING_NAME } from "@/lib/infinity/second-venture-factory/constants";
import { ensureVentureEconomics } from "@/lib/infinity/venture-economics/persist";
import {
  canonicalVentureDisplayName,
  resolveCanonicalRecordForHqVenture,
} from "@/lib/infinity/venture-operating-scale/hq-venture-registry";
import type { VentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/types";
import {
  isAskReviewIdentity,
  isOccupancynpvIdentity,
  stripCandidatePrefix,
} from "./aliases";
import { projectInspectionLifecycle } from "./resolve";

function emptyDepartment(
  id: OperatorDepartmentSnapshot["id"],
  label: string,
  engines: OperatorDepartmentSnapshot["engines"],
  state: DepartmentUiState,
): OperatorDepartmentSnapshot {
  return {
    id,
    label,
    state,
    engines,
    summary: null,
    currentTask: null,
    provider: null,
    model: null,
    costUsd: null,
    costKnown: false,
    startedAt: null,
    lastActivityAt: null,
    recordCount: 0,
    detail: {},
    isActive: false,
    isNextMissionTarget: false,
  };
}

function departmentStateForCanonical(record: VentureOperationalRecord, roomId: string): DepartmentUiState {
  if (isAskReviewIdentity(record.venture_id)) {
    if (roomId === "research_department" || roomId === "strategy_finance" || roomId === "opportunity_lab") {
      return roomId === "strategy_finance" ? "WAITING" : "COMPLETE";
    }
    if (roomId === "launch_operations" || roomId === "product_lab" || roomId === "growth_department") return "PAUSED";
    return "COMPLETE";
  }
  if (isOccupancynpvIdentity(record.venture_id)) {
    if (roomId === "strategy_finance") return "WAITING";
    if (
      roomId === "research_department" ||
      roomId === "opportunity_lab" ||
      roomId === "quality_control" ||
      roomId === "intelligence_center" ||
      roomId === "launch_operations" ||
      roomId === "product_lab"
    ) {
      return "COMPLETE";
    }
    return "COMPLETE";
  }
  return "NOT_STARTED";
}

export function buildCanonicalOperatorSnapshot(
  organizationId: string,
  ventureId: string,
): OperatorVentureSnapshot | null {
  const record = resolveCanonicalRecordForHqVenture({
    ventureId,
    candidateId: stripCandidatePrefix(ventureId),
  });
  if (!record) return null;
  const lifecycle = projectInspectionLifecycle(record.venture_id) ?? record.venture_status;
  const name = canonicalVentureDisplayName(record);
  const departments = listDepartmentsInLifecycleOrder().map((dept) =>
    emptyDepartment(dept.id, dept.label, dept.engines, departmentStateForCanonical(record, dept.id)),
  );
  const snapshot: OperatorVentureSnapshot = {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: record.venture_id,
      organizationId: organizationId || LIVE_ORG,
      missionId: record.current_missions[0] ?? "canonical",
      opportunityId: record.venture_id.startsWith("candidate:") ? stripCandidatePrefix(record.venture_id) : record.venture_id,
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: isOccupancynpvIdentity(record.venture_id) ? "occupancynpv-public" : null,
      ventureName: name,
      ventureType: isAskReviewIdentity(record.venture_id) ? ASKREVIEW_WORKING_NAME : name,
      assemblyStatus: lifecycle,
      readinessStatus: lifecycle,
      launchStage: lifecycle,
      origin: "canonical_operating_venture",
      correlationIds: [record.venture_id],
    },
    overallStatus: isAskReviewIdentity(record.venture_id) ? "PAUSED" : "COMPLETE",
    currentDepartments: [],
    currentActivity: {
      active: false,
      departmentId: null,
      departmentLabel: null,
      engine: null,
      task: null,
      provider: null,
      model: null,
      status: null,
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    },
    departments,
    pipeline: {
      stagesCompleted: departments.filter((dept) => dept.state === "COMPLETE").length,
      stagesTotal: departments.length,
      stageLabels: departments.map((dept) => dept.label),
    },
    activityFeed: [],
    providers: [],
    costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
    lineage: [],
    closedLoopRoute: {
      active: false,
      fromDepartmentId: null,
      viaDepartmentId: null,
      toDepartmentId: null,
      decisionType: null,
      missionId: null,
      missionStatus: null,
    },
    system: { engineRuns: {}, artifacts: {}, performance: {}, learning: {} },
  };
  ensureVentureEconomics(record.venture_id);
  return enrichOperatorSnapshot(sanitizeOperatorSnapshot(snapshot));
}
