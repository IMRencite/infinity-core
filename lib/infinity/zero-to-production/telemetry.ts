import type { ZeroToProductionRun } from "./types";

export function ztpTelemetry(run: ZeroToProductionRun) {
  return {
    origin: run.origin,
    stage: run.stage,
    status: run.status,
    provider: run.codingProvider,
    qa: run.qaPassed,
    repairs: run.repairAttempts,
    costKnown: run.costKnown,
    estimatedCostUsd: run.estimatedCostUsd,
    actualCostUsd: run.actualCostUsd,
    publiclyLaunched: run.publiclyLaunched,
  };
}
