import type { WorkerPermission } from "./constants";
import type { WorkerExecutionContextBound } from "./types";

export class WorkerPermissionError extends Error {
  constructor(permission: WorkerPermission) {
    super(`Worker permission denied: ${permission}`);
    this.name = "WorkerPermissionError";
  }
}

export function assertWorkerPermission(
  context: WorkerExecutionContextBound,
  permission: WorkerPermission,
): void {
  if (!context.grantedPermissions.has(permission)) {
    throw new WorkerPermissionError(permission);
  }
}

export function createPermissionEnforcer(context: WorkerExecutionContextBound) {
  return {
    require(permission: WorkerPermission) {
      assertWorkerPermission(context, permission);
    },
  };
}
