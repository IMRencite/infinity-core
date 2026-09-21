import "server-only";

import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { GROWTH_STRATEGY_REQUIRED, PROJECTION_ERROR } from "@/lib/infinity/hq-first-class-room/room-projection";
import { buildGlobalGrowthNexusFloorView } from "@/lib/infinity/growth-engine/hq";
import { fetchCanonicalProductionOperatingState } from "@/lib/infinity/growth-engine/hq-runtime-binding";
import { RUNTIME_UNREACHABLE, type HqProductionOperatingState } from "@/lib/infinity/growth-engine/hq-runtime-projection";
import { loadCanonicalOpportunityUniverse } from "@/lib/infinity/opportunity-universe-hq/load";
import { buildLiveVentureRadarArtifacts } from "@/lib/infinity/opportunity-universe-hq/radar-artifacts";
import { attachProfitLabToDepartment } from "@/lib/infinity/venture-economics/hq";
import type { HqWorkArtifact } from "./artifacts/types";
import type { OperatorDepartmentSnapshot, OperatorVentureSnapshot } from "./types";
import { projectOperationsRoom } from "@/lib/infinity/hq-information-architecture/operations-room";
import { attachCommandActivity } from "@/lib/infinity/mission-activity/attach";
import { OPERATIONS_ROOM_ID } from "./room-naming";

function mergeArtifacts(
  dept: OperatorDepartmentSnapshot,
  extras: HqWorkArtifact[],
  summary?: string,
): OperatorDepartmentSnapshot {
  const existing = dept.workArtifacts ?? [];
  const seen = new Set(existing.map((item) => item.id));
  const added = extras.filter((item) => !seen.has(item.id));
  if (added.length === 0 && !summary) return dept;
  const workArtifacts = [...existing, ...added];
  return {
    ...dept,
    summary: summary ?? dept.summary,
    recordCount: Math.max(dept.recordCount, workArtifacts.length),
    workArtifacts,
    artifacts: workArtifacts.length > 0 ? [] : dept.artifacts,
    state: dept.state === "NOT_STARTED" && workArtifacts.length > 0 ? "COMPLETE" : dept.state,
  };
}

function growthRequiredArtifact(): HqWorkArtifact {
  return {
    id: "growth_strategy_required",
    roomId: "growth_department",
    artifactType: "decision",
    title: GROWTH_STRATEGY_REQUIRED,
    subtitle: "Growth architecture exists. Venture strategy has not run.",
    state: "READY",
    createdAt: null,
    sourceRecordType: "growth_strategy",
    sourceRecordId: "required",
    metadata: { required: true },
  };
}

function growthNexusArtifacts(productionState?: HqProductionOperatingState | typeof RUNTIME_UNREACHABLE | null): HqWorkArtifact[] {
  const floor = buildGlobalGrowthNexusFloorView(productionState);
  return floor.views.map((view) => ({
    id: `growth_nexus_${view.strategy.venture_id}`,
    roomId: "growth_department" as const,
    artifactType: "learning_decision" as const,
    title: view.strategy.current_status,
    subtitle: view.nextLearningObjective,
    state: "READY" as const,
    createdAt: view.strategy.last_updated_at,
    sourceRecordType: "growth_strategy",
    sourceRecordId: view.strategy.venture_id,
    metadata: {
      growth_nexus: true,
      presentation: "HQCircularOutputCard",
      venture_id: view.strategy.venture_id,
      status: view.strategy.current_status,
      daily_target: view.campaign.dailyTarget,
      conversation_target: view.campaign.qualifiedConversations,
      next_tactic: view.nextTactic,
      authorized_to_execute: view.strategy.authorized_to_execute,
    },
  }));
}

function projectionErrorArtifact(roomId: OperatorDepartmentSnapshot["id"], reason: string): HqWorkArtifact {
  return {
    id: `${roomId}_projection_error`,
    roomId,
    artifactType: "decision",
    title: `${PROJECTION_ERROR} — ${reason}`,
    subtitle: "Canonical data could not be projected into this room.",
    state: "FAILED",
    createdAt: null,
    sourceRecordType: "projection_error",
    sourceRecordId: roomId,
    metadata: { projection_error: reason },
  };
}

export async function attachGlobalHqFloorRooms(
  snapshot: OperatorVentureSnapshot,
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<OperatorVentureSnapshot> {
  let radar: HqWorkArtifact[] = [];
  let radarError: string | null = null;
  try {
    const universe = await loadCanonicalOpportunityUniverse(admin, organizationId);
    radar = buildLiveVentureRadarArtifacts({
      organizationId,
      createdAt: universe.liveRanking.currentSnapshot?.timestamp ?? null,
      discoveryState: snapshot.departments.find((dept) => dept.id === "opportunity_lab")?.state ?? "COMPLETE",
      universeCount: universe.counts.total,
      liveTop10: universe.liveRanking.top10,
    });
  } catch (error) {
    radarError = error instanceof Error ? error.message : "OPPORTUNITY_UNIVERSE_LOAD_FAILED";
  }

  const productionRead = await fetchCanonicalProductionOperatingState();
  const productionState = productionRead.ok ? productionRead.state : RUNTIME_UNREACHABLE;

  const departments = snapshot.departments.map((dept) => {
    if (dept.id === "opportunity_lab") {
      if (radarError) return mergeArtifacts(dept, [projectionErrorArtifact(dept.id, radarError)]);
      const summary = radar[0]?.title ?? dept.summary;
      return mergeArtifacts(dept, radar, summary);
    }
    if (dept.id === "strategy_finance") {
      const alreadyProjected = (dept.workArtifacts ?? []).some((item) => item.id.startsWith("profit_lab_"));
      if (alreadyProjected) return dept;
      return attachProfitLabToDepartment(dept, snapshot.venture.ventureAssemblyId);
    }
    if (dept.id === "growth_department") {
      const floor = buildGlobalGrowthNexusFloorView(productionState);
      const extras = floor.views.length > 0 ? growthNexusArtifacts(productionState) : [growthRequiredArtifact()];
      const summary = floor.views[0]?.strategy.current_status ?? GROWTH_STRATEGY_REQUIRED;
      const merged = mergeArtifacts(dept, extras, summary);
      return {
        ...merged,
        detail: {
          ...merged.detail,
          growthNexusView: floor,
        },
      };
    }
    return dept;
  });

  let operationsOverlay: ReturnType<typeof projectOperationsRoom> | null = null;
  try {
    operationsOverlay = projectOperationsRoom(productionState);
  } catch (error) {
    const reason = error instanceof Error ? error.message.split(":")[0] : "OPERATIONS_ROOM_UNAVAILABLE";
    console.error("[hq-dashboard] operations_room_unavailable", { code: reason, route: "/dashboard" });
  }
  const departmentsWithOps = departments.map((dept) => {
    if (dept.id !== OPERATIONS_ROOM_ID) return dept;
    if (!operationsOverlay) {
      return mergeArtifacts(dept, [projectionErrorArtifact(dept.id, "OPERATIONS_ROOM_UNAVAILABLE")], "Operations overlay DEGRADED");
    }
    return {
      ...dept,
      artifacts: operationsOverlay.department.artifacts,
      currentTask: operationsOverlay.department.currentTask,
      detail: {
        ...dept.detail,
        ...operationsOverlay.department.detail,
      },
    };
  });

  return attachCommandActivity({ ...snapshot, departments: departmentsWithOps });
}
