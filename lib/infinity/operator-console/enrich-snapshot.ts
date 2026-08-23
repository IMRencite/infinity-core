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
import { explainSnapshotDepartmentActivity } from "./room-activity";
import { buildSystemsArchitectArtifacts } from "@/lib/infinity/venture-systems-architecture/hq/artifacts";
import {
  bindSystemsArchitectVentureContext,
  evidenceFromPersistedHqRows,
  identityFromPersistedHqRows,
  resolveSystemsArchitectHqView,
  type SystemsArchitectHqView,
} from "@/lib/infinity/venture-systems-architecture/hq/hq-view";
import { architectureIdentityBind, resolveArchitectureEntity } from "./architecture-entity";
import type { OperatorDepartmentSnapshot, OperatorVentureSnapshot } from "./types";

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value) && value[0] && typeof value[0] === "object") {
    return value[0] as Record<string, unknown>;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function resolveSystemsView(snapshot: OperatorVentureSnapshot): SystemsArchitectHqView {
  const existing =
    (snapshot.departments.find((dept) => dept.id === "systems_architect")?.detail.systemsArchitectView as
      | SystemsArchitectHqView
      | undefined) ??
    snapshot.systemsArchitecture ??
    null;
  const entity = resolveArchitectureEntity(snapshot);
  const identity = architectureIdentityBind(entity);
  if (existing) return bindSystemsArchitectVentureContext(existing, identity);
  const finance = snapshot.departments.find((dept) => dept.id === "strategy_finance")?.detail ?? {};
  const company = snapshot.departments.find((dept) => dept.id === "company_operations")?.detail ?? {};
  const plan = entity.kind === "VENTURE" ? firstRecord(finance.plans) ?? firstRecord(finance.monetizationRuns) : null;
  const blueprint = entity.kind === "VENTURE" ? firstRecord(company.blueprints) : null;
  return resolveSystemsArchitectHqView(
    evidenceFromPersistedHqRows({
      ventureId: identity.ventureId,
      ventureType: entity.kind === "VENTURE" ? snapshot.venture.ventureType : null,
      monetizationPlan: plan,
      blueprint,
    }),
    identityFromPersistedHqRows({
      ...identity,
      monetizationPlan: plan,
      blueprint,
    }),
  );
}

export function enrichOperatorSnapshot(snapshot: OperatorVentureSnapshot): OperatorVentureSnapshot {
  const systemsView = resolveSystemsView(snapshot);
  const systemsArtifacts = buildSystemsArchitectArtifacts(systemsView, snapshot.venture.ventureAssemblyId);

  const departments = snapshot.departments.map((dept) => {
    const names = getRoomDisplayNames(dept.id);
    const attached = dept.id === "systems_architect" ? (systemsArtifacts[dept.id] ?? []) : [];
    const workArtifacts = [...(dept.workArtifacts ?? []), ...attached];
    const hasPersistedArtifacts = workArtifacts.length > 0;
    const next: OperatorDepartmentSnapshot = {
      ...dept,
      displayName: names.displayName,
      supportingLabel: names.supportingLabel,
      displayHeadline: humanizeDepartmentHeadline(dept.id, dept.state, dept.failureSemantics),
      displayTask: humanizeTask(dept.currentTask),
      displaySummary: humanizeDepartmentSummary(dept),
      workArtifacts,
      artifacts: hasPersistedArtifacts ? [] : buildRoomArtifacts(dept),
      detail:
        dept.id === "systems_architect"
          ? { ...dept.detail, systemsArchitectView: systemsView }
          : dept.detail,
    };
    return next;
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

  const workerNodes = buildWorkerNodes(providers, departments);
  const departmentsWithActivity = departments.map((dept) => ({
    ...dept,
    activityExplanation: explainSnapshotDepartmentActivity(
      {
        currentActivity,
        closedLoopRoute: snapshot.closedLoopRoute,
        venture: snapshot.venture,
        providers,
      },
      dept,
      workerNodes,
    ),
  }));

  return {
    ...snapshot,
    departments: departmentsWithActivity,
    activityFeed,
    providers,
    currentActivity,
    workerNodes,
    systemsArchitecture: systemsView,
  };
}
