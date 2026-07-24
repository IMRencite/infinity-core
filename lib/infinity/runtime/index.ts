import { registerWorkerImplementation } from "./worker-registry";
import { discoveryScanWorker } from "./workers/discovery-scan-worker";

let registered = false;

export function registerRuntimeWorkers() {
  if (registered) {
    return;
  }

  registerWorkerImplementation(discoveryScanWorker);
  registered = true;
}

export { executeJob } from "./execute";
export { claimEngineJob } from "./persistence";
export { requestCommandReevaluation } from "./command-handoff";
export type {
  DurableFlowResult,
  JobExecutionResult,
  WorkerDefinition,
  WorkerExecutionResult,
} from "./types";
export {
  calculateBackoffMs,
  calculateNextAttemptAt,
  defaultClassifyFailure,
} from "./retry";
