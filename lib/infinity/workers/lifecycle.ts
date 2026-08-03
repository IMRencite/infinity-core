import type { ReviewStatus } from "./constants";
import { getWorkerCapabilityContract } from "./capability";

export function initialReviewStatusForCapability(capabilityKey: string): ReviewStatus {
  const contract = getWorkerCapabilityContract(capabilityKey);
  if (!contract) {
    return "not_required";
  }
  if (contract.reviewRequirement === "independent_qa") {
    return "not_required";
  }
  if (contract.reviewRequirement === "pending") {
    return "pending";
  }
  return contract.reviewRequirement;
}

export function planStepMayComplete(reviewStatus: ReviewStatus): boolean {
  return reviewStatus === "not_required" || reviewStatus === "passed";
}
