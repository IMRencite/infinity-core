import type { DepartmentUiState, OperatorWorkerNode } from "@/lib/infinity/operator-console/types";

function worker(input: {
  nodeId: string;
  departmentId: OperatorWorkerNode["departmentId"];
  role: string;
  status: DepartmentUiState;
  task: string;
  executing: boolean;
}): OperatorWorkerNode {
  return {
    nodeId: input.nodeId,
    departmentId: input.departmentId,
    role: input.role,
    displayRole: input.role,
    status: input.status,
    task: input.task,
    displayTask: input.task,
    provider: null,
    model: null,
    isActive: input.executing,
    isDormant: !input.executing,
    motionActive: input.executing,
  };
}

export const HQ_ACTIVE_WORKER_FIXTURE: OperatorWorkerNode[] = [
  worker({
    nodeId: "ops-venture-active",
    departmentId: "operations",
    role: "Venture Operator",
    status: "RUNNING",
    task: "DailyVentureOperatingCycle executing",
    executing: true,
  }),
];

export const HQ_WAITING_WORKER_FIXTURE: OperatorWorkerNode[] = [
  worker({
    nodeId: "ops-wait-1",
    departmentId: "operations",
    role: "Performance Observer",
    status: "WAITING",
    task: "Observe until next operating cycle",
    executing: false,
  }),
  worker({
    nodeId: "ops-wait-2",
    departmentId: "operations",
    role: "Venture Operator",
    status: "WAITING",
    task: "PUBLICLY_LAUNCHED · 0 real observations",
    executing: false,
  }),
  worker({
    nodeId: "ops-wait-3",
    departmentId: "operations",
    role: "Portfolio Operator",
    status: "WAITING",
    task: "Next portfolio cycle scheduled",
    executing: false,
  }),
];

export const HQ_BLOCKED_WORKER_FIXTURE: OperatorWorkerNode[] = [
  worker({
    nodeId: "ops-blocked-1",
    departmentId: "operations",
    role: "Fulfillment Monitor",
    status: "BLOCKED",
    task: "Fulfillment health blocked",
    executing: false,
  }),
];

export const HQ_AUTHORIZATION_WORKER_FIXTURE: OperatorWorkerNode[] = [
  worker({
    nodeId: "ops-auth-1",
    departmentId: "operations",
    role: "Recovery Operator",
    status: "BLOCKED",
    task: "FOUNDER_APPROVAL_REQUIRED",
    executing: false,
  }),
];

export const HQ_MULTI_ROOM_WORKER_FIXTURE: OperatorWorkerNode[] = [
  worker({
    nodeId: "ops-active",
    departmentId: "operations",
    role: "Venture Operator",
    status: "RUNNING",
    task: "DailyVentureOperatingCycle executing",
    executing: true,
  }),
  worker({
    nodeId: "research-active",
    departmentId: "research_department",
    role: "Research",
    status: "RUNNING",
    task: "Grounded research executing",
    executing: true,
  }),
  worker({
    nodeId: "launch-waiting",
    departmentId: "launch_operations",
    role: "Dispatch",
    status: "WAITING",
    task: "Awaiting approved external action",
    executing: false,
  }),
];

export const HQ_LAST_WORKER_COMPLETES_BEFORE: OperatorWorkerNode[] = HQ_ACTIVE_WORKER_FIXTURE;

export const HQ_LAST_WORKER_COMPLETES_AFTER: OperatorWorkerNode[] = [
  worker({
    nodeId: "ops-venture-active",
    departmentId: "operations",
    role: "Venture Operator",
    status: "WAITING",
    task: "INSUFFICIENT_POST_LAUNCH_EVIDENCE",
    executing: false,
  }),
];
