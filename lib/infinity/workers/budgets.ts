import type { WorkerCapabilityContract } from "./types";

export function assertEstimatedCostWithinPolicy(
  contract: WorkerCapabilityContract,
  estimatedCost: number,
): void {
  if (estimatedCost > contract.maximumEstimatedCost) {
    throw new Error("Estimated worker cost exceeds policy maximum");
  }
}
