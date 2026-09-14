import { resolveCanonicalMissionCompletions } from "@/lib/infinity/canonical-work/mission-completion";
import { resolveCurrentCanonicalWork } from "@/lib/infinity/canonical-work/resolver";
import { reloadCanonicalWorkIfDiskChanged } from "@/lib/infinity/canonical-work/store";
import { attachCommandActivity } from "@/lib/infinity/mission-activity/attach";
import { projectCommandActivity } from "@/lib/infinity/mission-activity/project";
import { refreshMissionActivityFromDisk } from "@/lib/infinity/mission-activity/store";
import type { CommandActivityView } from "@/lib/infinity/mission-activity/types";
import { startHqCanonicalDiskWatch } from "./hq-canonical-watch";
import { publishHqRuntimeEvent } from "./hq-live-events";
import type { HqFinancialTruthView } from "@/lib/infinity/financial-truth";
import type { OperatorVentureSnapshot } from "./types";
import { codingReadModelFromCapability } from "@/lib/infinity/capability-truth/coding";
import { projectCanonicalCapabilities } from "@/lib/infinity/capability-truth/projection";
import { buildCapabilityReadinessArtifacts, replaceProviderReadinessArtifacts } from "@/lib/infinity/capability-truth/artifacts";
import { projectVentureOperatingScaleHq } from "@/lib/infinity/venture-operating-scale/hq";
import type { CodingHqReadModel } from "@/lib/infinity/coding-agents/hq/read-model";
import type { CanonicalCapabilityProjection } from "@/lib/infinity/capability-truth/types";
import type { VentureOperatingScaleHqProjection } from "@/lib/infinity/venture-operating-scale/types";
import type { HqRoomArtifactMap } from "./artifacts/types";
import { projectCanonicalHQLive } from "@/lib/infinity/hq-live-truth/projection";
import type { CanonicalHQLiveProjection } from "@/lib/infinity/hq-live-truth/types";

export type HqCanonicalLiveState = {
  generatedAt: string;
  canonicalVersion: string;
  lastActivityAt: string | null;
  lastEventType: string | null;
  commandActivity: CommandActivityView;
  financialTruth?: HqFinancialTruthView;
  financialTruthVersion?: string;
  coding?: CodingHqReadModel;
  capabilities?: CanonicalCapabilityProjection;
  ventureOperatingScale?: VentureOperatingScaleHqProjection;
  capabilityArtifacts?: HqRoomArtifactMap;
  canonicalLive?: CanonicalHQLiveProjection;
};

export function hqCanonicalVersionFromActivity(
  activity: CommandActivityView,
  generatedAt: string,
  financialTruthVersion = "",
  capabilityVersion = "",
): string {
  const current = resolveCurrentCanonicalWork(generatedAt);
  const mission = activity.nowInspecting.currentMission ?? activity.latestCompleted?.missionType ?? "";
  return [
    current.canonical_version,
    activity.nowInspecting.currentWorkId ?? current.work_id ?? "",
    activity.nowInspecting.lastActivityAt ?? activity.latestCompleted?.completedAt ?? "",
    String(activity.counts.activeMissions),
    mission.replace(/[^\x20-\x7E]/g, "-"),
    activity.latestVentureWork?.workId ?? activity.latestVentureWork?.work_id ?? "",
    activity.latestVentureWork?.completedAt ?? "",
    activity.latestVentureWorkScope ?? "",
    activity.latestSystemActivity?.workId ?? "",
    activity.latestSystemActivity?.updatedAt ?? "",
    financialTruthVersion,
    capabilityVersion,
    current.status,
  ].join(":");
}

/**
 * Disk-first live execution. Writer processes are not the Next process.
 * Do not require an in-process event listener to exist.
 */
export function loadHqCanonicalLiveState(organizationId: string, selectedVentureId?: string | null): HqCanonicalLiveState {
  startHqCanonicalDiskWatch();
  const diskChanged = reloadCanonicalWorkIfDiskChanged();
  if (diskChanged) {
    publishHqRuntimeEvent({
      type: "HQ_SNAPSHOT_INVALIDATED",
      at: new Date().toISOString(),
      reason: "CANONICAL_DISK_CHANGED",
    });
  }
  refreshMissionActivityFromDisk();
  resolveCanonicalMissionCompletions();
  const commandActivity = projectCommandActivity({
    organizationId,
    selectedVentureId,
    includeSynthetic: false,
  });
  const generatedAt = new Date().toISOString();
  const capabilities = projectCanonicalCapabilities(generatedAt);
  const coding = codingReadModelFromCapability(organizationId);
  return {
    generatedAt,
    canonicalVersion: hqCanonicalVersionFromActivity(
      commandActivity,
      generatedAt,
      "",
      `${coding.providers.find((row) => /cursor/i.test(row.provider))?.status ?? ""}:${capabilities.generated_at}`,
    ),
    lastActivityAt:
      commandActivity.nowInspecting.lastActivityAt ?? commandActivity.latestCompleted?.completedAt ?? null,
    lastEventType:
      commandActivity.systemView.latestEvent ??
      (commandActivity.counts.activeMissions > 0
        ? "MISSION_PROGRESS"
        : commandActivity.latestCompleted
          ? "MISSION_COMPLETED"
          : null),
    commandActivity,
    coding,
    capabilities,
    ventureOperatingScale: projectVentureOperatingScaleHq({
      latestCompletedMission: commandActivity.latestCompleted?.missionType ?? null,
    }),
    capabilityArtifacts: buildCapabilityReadinessArtifacts(capabilities),
    canonicalLive: projectCanonicalHQLive({
      generatedAt,
      selectedVentureId,
    }),
  };
}

export function withFinancialTruthLiveState(
  live: HqCanonicalLiveState,
  financialTruth: HqFinancialTruthView,
): HqCanonicalLiveState {
  return {
    ...live,
    financialTruth,
    financialTruthVersion: financialTruth.version,
    canonicalVersion: hqCanonicalVersionFromActivity(live.commandActivity, live.generatedAt, financialTruth.version),
    canonicalLive: projectCanonicalHQLive({
      generatedAt: live.generatedAt,
      financialTruth,
    }),
  };
}

export function attachHqCanonicalLiveState(
  snapshot: OperatorVentureSnapshot,
  organizationId = snapshot.venture.organizationId,
): OperatorVentureSnapshot {
  const live = loadHqCanonicalLiveState(organizationId, snapshot.venture.ventureAssemblyId);
  return attachCommandActivity(
    {
      ...snapshot,
      generatedAt: live.generatedAt,
      coding: live.coding ?? snapshot.coding,
      capabilities: live.capabilities ?? snapshot.capabilities,
      ventureOperatingScale: live.ventureOperatingScale ?? snapshot.ventureOperatingScale,
      canonicalLive: live.canonicalLive ?? snapshot.canonicalLive,
      roomArtifacts: live.capabilityArtifacts
        ? replaceProviderReadinessArtifacts(snapshot.roomArtifacts, live.capabilityArtifacts)
        : snapshot.roomArtifacts,
    },
    live.commandActivity,
  );
}
