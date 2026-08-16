import type { OperatorWorkerNode } from "./types";

/** Primary decision orb + smaller satellites — one prominent orb per real session cluster. */
export function partitionCommandDecisionOrbs(workerNodes: OperatorWorkerNode[]) {
  const commandNodes = workerNodes.filter((n) => n.departmentId === "executive_office");
  return {
    primary: commandNodes[0] ?? null,
    satellites: commandNodes.slice(1),
    totalSessions: commandNodes.length,
  };
}
