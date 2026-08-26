import type { SelectionDecision } from "@/lib/infinity/venture-selection/constants";
import type { FounderIdeaStatus } from "./constants";

/**
 * Status written when Infinity emits an idea classification.
 * BUILD stays READY_FOR_DECISION until the existing founder action / routeFounderBuild flow.
 */
export function statusFromInfinityDecision(decision: SelectionDecision): FounderIdeaStatus {
  switch (decision) {
    case "VALIDATE":
      return "VALIDATING";
    case "HOLD":
      return "HELD";
    case "REJECT":
      return "REJECTED";
    case "BUILD":
      return "READY_FOR_DECISION";
  }
}
