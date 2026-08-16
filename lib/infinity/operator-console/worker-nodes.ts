import { humanizeRole, humanizeTask } from "./humanize";
import { deriveUiStateFromEngineStatus } from "./status-derivation";
import type {
  DepartmentId,
  DepartmentUiState,
  OperatorDepartmentSnapshot,
  OperatorProviderSession,
  OperatorWorkerNode,
} from "./types";

const DEPARTMENT_DEFAULT_ROLES: Partial<Record<DepartmentId, string[]>> = {
  opportunity_lab: ["Scanner"],
  research_department: ["Research", "Synthesis"],
  strategy_finance: ["Economics"],
  company_operations: ["Blueprint"],
  growth_department: ["Planning"],
  creative_studio: ["Generator", "Quality"],
  product_lab: ["Implementer", "Reviewer"],
  quality_control: ["Inspection"],
  launch_operations: ["Dispatch"],
  intelligence_center: ["Analysis"],
  executive_office: ["Decision"],
};

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
    isDormant: false,
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
    nodeId: `${departmentId}-${role.toLowerCase()}-${dormant ? "dormant" : "active"}`,
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

export function buildWorkerNodes(
  providers: OperatorProviderSession[],
  departments: OperatorDepartmentSnapshot[],
): OperatorWorkerNode[] {
  const nodes: OperatorWorkerNode[] = [];

  for (const dept of departments) {
    const deptProviders = providers.filter((p) => p.departmentId === dept.id);
    const runningSessions = deptProviders
      .filter((p) => deriveUiStateFromEngineStatus(p.status) === "RUNNING")
      .slice(0, 3);

    if (runningSessions.length > 0) {
      nodes.push(...runningSessions.map(sessionToNode));
      continue;
    }

    if (dept.isActive) {
      const roles = DEPARTMENT_DEFAULT_ROLES[dept.id] ?? ["WORK"];
      nodes.push(genericNode(dept.id, roles[0]!, dept.state, dept.currentTask, false));
      continue;
    }

    if (dept.state === "BLOCKED" || (dept.state === "FAILED" && dept.failureSemantics === "CURRENT_BLOCKING_FAILURE")) {
      const roles = DEPARTMENT_DEFAULT_ROLES[dept.id] ?? ["WORK"];
      nodes.push(genericNode(dept.id, roles[0]!, dept.state, dept.currentTask, true));
      continue;
    }

    if (dept.recordCount > 0 && dept.state === "COMPLETE") {
      continue;
    }

    if (dept.recordCount > 0 && !dept.isActive && dept.state !== "NOT_STARTED") {
      const roles = DEPARTMENT_DEFAULT_ROLES[dept.id] ?? ["WORK"];
      nodes.push(genericNode(dept.id, roles[0]!, dept.state, null, true));
    }
  }

  return nodes;
}

export function workerNodesForDepartment(
  nodes: OperatorWorkerNode[],
  departmentId: DepartmentId,
): OperatorWorkerNode[] {
  return nodes.filter((n) => n.departmentId === departmentId).slice(0, 3);
}
