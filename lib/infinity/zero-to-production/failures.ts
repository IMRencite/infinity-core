import type { ZeroToProductionRun } from "./types";

export function classifyZtpFailure(run: ZeroToProductionRun): "TECHNICAL" | "BUSINESS" {
  if (run.businessOutcome === "BUSINESS_REJECTED" || run.businessOutcome === "VALIDATION_REQUIRED") return "BUSINESS";
  return "TECHNICAL";
}
