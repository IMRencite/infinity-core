import {
  buildRoomArtifacts,
  humanizeCurrentActivityNarration,
  humanizeDepartmentHeadline,
  humanizeDepartmentSummary,
  humanizeEventStatus,
  humanizeEventSummary,
  humanizeProviderSession,
  humanizeTask,
} from "./humanize";
import { buildWorkerNodes } from "./worker-nodes";
import { getRoomDisplayNames } from "./room-naming";
import type { OperatorVentureSnapshot } from "./types";

export function enrichOperatorSnapshot(snapshot: OperatorVentureSnapshot): OperatorVentureSnapshot {
  const workerNodes = buildWorkerNodes(snapshot.providers, snapshot.departments);

  const departments = snapshot.departments.map((dept) => {
    const names = getRoomDisplayNames(dept.id);
    const hasPersistedArtifacts = (dept.workArtifacts?.length ?? 0) > 0;
    return {
      ...dept,
      displayName: names.displayName,
      supportingLabel: names.supportingLabel,
      displayHeadline: humanizeDepartmentHeadline(dept.id, dept.state, dept.failureSemantics),
      displayTask: humanizeTask(dept.currentTask),
      displaySummary: humanizeDepartmentSummary(dept),
      artifacts: hasPersistedArtifacts ? [] : buildRoomArtifacts(dept),
    };
  });

  const activityFeed = snapshot.activityFeed.map((event) => ({
    ...event,
    displaySummary: humanizeEventSummary(event),
    displayStatus: humanizeEventStatus(event.status),
  }));

  const providers = snapshot.providers.map((session) => {
    const display = humanizeProviderSession(session);
    return {
      ...session,
      displayRole: display.displayRole,
      displayTask: display.displayTask,
      displayStatus: display.displayStatus,
    };
  });

  const currentActivityBase = snapshot.currentActivity;
  const departmentDisplayName = currentActivityBase.departmentId
    ? getRoomDisplayNames(currentActivityBase.departmentId).displayName
    : null;

  const currentActivity = {
    ...currentActivityBase,
    departmentDisplayName,
    displayNarration: humanizeCurrentActivityNarration({
      ...currentActivityBase,
      departmentDisplayName,
    }),
    displayTask: humanizeTask(currentActivityBase.task),
  };

  return {
    ...snapshot,
    departments,
    activityFeed,
    providers,
    currentActivity,
    workerNodes,
  };
}
