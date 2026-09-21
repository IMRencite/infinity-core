import { PUBLIC_SALES_LEARNING_ACTIVITY } from "./contract";
import type { SalesLearningTickResult } from "./types";

export function projectPublicSalesLearning(tick: SalesLearningTickResult) {
  return {
    department: "GROWTH" as const,
    status: tick.activity,
    activity: tick.generic_activity,
    trainingVisible: tick.training_active,
  };
}

export function publicSalesLearningCopy(status: "IDLE" | "MONITORING" | "ACTIVE"): string {
  if (status === "ACTIVE") return PUBLIC_SALES_LEARNING_ACTIVITY[0];
  if (status === "MONITORING") return PUBLIC_SALES_LEARNING_ACTIVITY[1];
  return PUBLIC_SALES_LEARNING_ACTIVITY[4];
}

export function salesLearningPublicForbiddenPatterns() {
  return [
    /coaching assignment/i,
    /skill score/i,
    /DEVELOPING/,
    /transcript/i,
    /@/,
    /555-/,
    /prospect_id/i,
    /objection history/i,
    /fit_score/i,
  ];
}
