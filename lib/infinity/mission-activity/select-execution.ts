import type { CanonicalActivityStatus } from "./constants";
import type { MissionActivityEvent } from "./types";

export type ExecutionMissionRank = "ACTIVE" | "WAITING" | "BLOCKED" | "TERMINAL";

export type RankedExecutionMission = {
  missionId: string;
  missionType: string;
  status: CanonicalActivityStatus;
  rank: ExecutionMissionRank;
  events: MissionActivityEvent[];
  lastActivityAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

function lastActivityAt(events: MissionActivityEvent[]): string {
  return events[events.length - 1]?.observedAt ?? "";
}

export function rankExecutionMission(
  status: CanonicalActivityStatus,
): ExecutionMissionRank | null {
  if (status === "ACTIVE_WORK") return "ACTIVE";
  if (status === "WAITING_EXTERNAL" || status === "WAITING_INTERNAL") return "WAITING";
  if (status === "READY_BLOCKED") return "BLOCKED";
  if (status === "PRESENT_IDLE" || status === "COMPLETED" || status === "FAILED") return "TERMINAL";
  return null;
}

export function consumedDeploymentAuthorizations(ranked: RankedExecutionMission[]): Set<string> {
  const consumed = new Set<string>();
  for (const mission of ranked) {
    if (
      mission.missionType === "GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_V1" &&
      mission.events.some((event) => event.eventType === "MISSION_COMPLETED")
    ) {
      consumed.add("GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED");
    }
    const wrote = mission.events.some(
      (event) => event.stepType === "CREATE_DEPLOYMENT" && event.eventType === "STEP_COMPLETED",
    );
    if (!wrote) continue;
    const governed = mission.missionType.match(/^(GOVERNED_.+)_V\d+$/);
    if (governed) consumed.add(`${governed[1]}_REQUIRED`);
    if (mission.missionType === "GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_V1") {
      consumed.add("GOVERNED_CRE_HUB_LAYOUT_REPAIR_DEPLOYMENT_REQUIRED");
    }
    if (mission.missionType === "GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_V1") {
      consumed.add("GOVERNED_CRE_SITE_CHROME_LINK_CONTRAST_DEPLOYMENT_REQUIRED");
    }
    if (mission.missionType === "GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_V1") {
      consumed.add("GOVERNED_CRE_HOMEPAGE_LINK_CONTRAST_DEPLOYMENT_REQUIRED");
    }
    if (mission.missionType === "GOVERNED_CRE_SEMANTIC_NAV_WIDTH_MUTED_TEXT_DEPLOYMENT_V1") {
      consumed.add("GOVERNED_CRE_SEMANTIC_NAV_WIDTH_REPAIR_DEPLOYMENT_REQUIRED");
    }
  }
  return consumed;
}

export function deriveTerminalOutcome(mission: RankedExecutionMission): string | null {
  const completed = new Set(
    mission.events.filter((event) => event.eventType === "STEP_COMPLETED").map((event) => event.stepType),
  );
  if (completed.has("CREATE_DEPLOYMENT") && !completed.has("ACTIVATE_PUBLIC_ARTIFACT")) {
    return "DEPLOYED_NOT_ACTIVATED";
  }
  if (mission.status === "FAILED") return "FAILED";
  if (mission.rank === "TERMINAL") return "COMPLETED";
  return null;
}

export function supersedeConsumedAuthorizationBlockers(
  ranked: RankedExecutionMission[],
): RankedExecutionMission[] {
  const consumed = consumedDeploymentAuthorizations(ranked);
  return ranked.map((mission) => {
    const required = mission.events.map((event) => event.authorizationRequired).find(Boolean);
    if (mission.rank === "BLOCKED" && required && consumed.has(required)) {
      return { ...mission, rank: "TERMINAL" as const, status: "PRESENT_IDLE" as const };
    }
    return mission;
  });
}

export function selectCurrentExecutionMission(
  ranked: RankedExecutionMission[],
): RankedExecutionMission | null {
  return (
    ranked.find((item) => item.rank === "ACTIVE") ??
    ranked.find((item) => item.rank === "WAITING") ??
    ranked.find((item) => item.rank === "BLOCKED") ??
    null
  );
}

export function selectLatestTerminalMission(
  ranked: RankedExecutionMission[],
): RankedExecutionMission | null {
  const terminals = ranked
    .filter((item) => item.rank === "TERMINAL")
    .slice()
    .sort((a, b) => (b.completedAt ?? b.lastActivityAt).localeCompare(a.completedAt ?? a.lastActivityAt));
  return terminals[0] ?? null;
}

export function rankMissionsFromGroups(
  byMission: Map<string, MissionActivityEvent[]>,
  missionOpenStatus: (events: MissionActivityEvent[]) => CanonicalActivityStatus,
): RankedExecutionMission[] {
  const ranked: RankedExecutionMission[] = [];
  for (const [missionId, events] of byMission) {
    if (!events.length) continue;
    const status = missionOpenStatus(events);
    const rank = rankExecutionMission(status);
    if (!rank) continue;
    const started = events.find((event) => event.eventType === "MISSION_STARTED");
    const terminal = [...events]
      .reverse()
      .find((event) => event.eventType === "MISSION_COMPLETED" || event.eventType === "MISSION_FAILED");
    ranked.push({
      missionId,
      missionType: events[events.length - 1]?.missionType ?? missionId,
      status,
      rank,
      events,
      lastActivityAt: lastActivityAt(events),
      startedAt: started?.startedAt ?? started?.observedAt ?? events[0]?.observedAt ?? null,
      completedAt: terminal?.completedAt ?? terminal?.observedAt ?? null,
    });
  }
  ranked.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  return supersedeConsumedAuthorizationBlockers(ranked);
}
