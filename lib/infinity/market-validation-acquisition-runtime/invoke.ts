import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { runMarketValidationAcquisitionRuntime } from "./run";
import { scheduledEvaluationInterface, shouldRunScheduledEvaluation } from "./schedule";
import type { AcquisitionRuntimeInput, AcquisitionRuntimeResult } from "./types";

/**
 * Canonical invocation boundary for future AUTONOMOUS_COMMAND_RUNTIME_V1.
 * Does not grant decision authority. Does not require Cursor to be open.
 */
export async function invokeMarketValidationAcquisitionRuntime(
  input: AcquisitionRuntimeInput = { organizationId: LIVE_ORG },
): Promise<AcquisitionRuntimeResult> {
  return runMarketValidationAcquisitionRuntime(input);
}

export function acquisitionRuntimeScheduleHost() {
  return scheduledEvaluationInterface();
}

export function acquisitionRuntimeDue(input: { now: Date; lastEvaluatedAt: string | null }): boolean {
  return shouldRunScheduledEvaluation(input);
}
