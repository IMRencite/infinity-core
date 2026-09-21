import { assignedWorkerRolesForRoom } from "@/lib/infinity/hq-room-workers/assigned-roles";
import { humanizeRole, humanizeTask } from "./humanize";
import { deriveUiStateFromEngineStatus } from "./status-derivation";
import type {
  DepartmentId,
  DepartmentUiState,
  OperatorDepartmentSnapshot,
  OperatorProviderSession,
  OperatorWorkerNode,
} from "./types";
import { OPERATIONS_ROOM_ID, SALES_FLOOR_ROOM_ID } from "./room-naming";

const HQ_WORKER_COLLECT_LIMIT = 12;

function sessionToNode(session: OperatorProviderSession): OperatorWorkerNode {
  const status = deriveUiStateFromEngineStatus(session.status);
  const isActive = status === "RUNNING";
  return {
    nodeId: session.sessionId,
    departmentId: session.departmentId,
    role: session.role,
    displayRole: humanizeRole(session.role),
    status,
    task: session.task,
    displayTask: humanizeTask(session.task),
    provider: session.provider,
    model: session.model,
    isActive,
    isDormant: !isActive,
    motionActive: isActive,
  };
}

function genericNode(
  departmentId: DepartmentId,
  role: string,
  state: DepartmentUiState,
  task: string | null,
  dormant: boolean,
): OperatorWorkerNode {
  const isActive = state === "RUNNING" && !dormant;
  return {
    nodeId: `${departmentId}-${role.toLowerCase().replace(/\s+/g, "-")}-${dormant ? "dormant" : "active"}`,
    departmentId,
    role,
    displayRole: humanizeRole(role),
    status: state,
    task,
    displayTask: humanizeTask(task),
    provider: null,
    model: null,
    isActive,
    isDormant: dormant,
    motionActive: isActive,
  };
}

function roleCovered(covered: Set<string>, role: string): boolean {
  const keys = [role, humanizeRole(role)].map((value) => value.toLowerCase().replace(/[\s_]+/g, ""));
  for (const key of keys) {
    if (covered.has(key)) return true;
  }
  return false;
}

function coverRole(covered: Set<string>, role: string, displayRole: string): void {
  covered.add(role.toLowerCase().replace(/[\s_]+/g, ""));
  covered.add(displayRole.toLowerCase().replace(/[\s_]+/g, ""));
}

function assignedPresenceState(dept: OperatorDepartmentSnapshot, makeActive: boolean): DepartmentUiState {
  if (makeActive) return dept.state === "RUNNING" ? "RUNNING" : dept.state;
  if (dept.state === "BLOCKED") return "BLOCKED";
  if (dept.state === "FAILED" && dept.failureSemantics === "CURRENT_BLOCKING_FAILURE") return "FAILED";
  if (dept.state === "WAITING" || dept.state === "PAUSED") return "WAITING";
  if (dept.state === "RUNNING") return "WAITING";
  if (dept.state === "FAILED" && dept.failureSemantics === "HISTORICAL_FAILURE") return "COMPLETE";
  return dept.state;
}

/**
 * Assigned first-class roles always materialize.
 * Live sessions overlay matching roles. Only canonical execution glows.
 * Operations workers come from projectOperationsRoom.
 */
export function buildWorkerNodes(
  providers: OperatorProviderSession[],
  departments: OperatorDepartmentSnapshot[],
): OperatorWorkerNode[] {
  const nodes: OperatorWorkerNode[] = [];

  for (const dept of departments) {
    if (dept.id === OPERATIONS_ROOM_ID || dept.id === SALES_FLOOR_ROOM_ID) continue;

    const assigned = assignedWorkerRolesForRoom(dept.id);
    const deptProviders = providers.filter((p) => p.departmentId === dept.id);
    const sessionNodes = deptProviders.slice(0, HQ_WORKER_COLLECT_LIMIT).map(sessionToNode);
    nodes.push(...sessionNodes);

    const covered = new Set<string>();
    for (const node of sessionNodes) {
      coverRole(covered, node.role, node.displayRole);
    }

    const blocked =
      dept.state === "BLOCKED"
      || (dept.state === "FAILED" && dept.failureSemantics === "CURRENT_BLOCKING_FAILURE");
    const allowGenericActive =
      dept.isActive
      && dept.detail?.showWorkers !== false
      && sessionNodes.every((node) => !node.isActive);
    const roomExecuting = dept.state === "RUNNING" && dept.isActive && dept.detail?.showWorkers !== false;

    for (const [index, role] of assigned.entries()) {
      if (roleCovered(covered, role)) continue;
      const makeActive = roomExecuting || (allowGenericActive && sessionNodes.length === 0 && index === 0);
      const state = assignedPresenceState(dept, makeActive);
      nodes.push(genericNode(dept.id, role, state, makeActive || blocked ? dept.currentTask : null, !makeActive));
      coverRole(covered, role, humanizeRole(role));
    }
  }

  return nodes;
}

export function workerNodesForDepartment(
  nodes: OperatorWorkerNode[],
  departmentId: DepartmentId,
): OperatorWorkerNode[] {
  return nodes.filter((n) => n.departmentId === departmentId);
}

export { assignedWorkerRolesForRoom };
