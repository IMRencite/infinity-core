import { COMMERCIAL_PRODUCTION_READINESS_GATE, type CommercialProductionReadinessRecord } from "./types";

export function evaluateCommercialProductionReadinessGate(input: {
  offer: "PASS" | "FAIL";
  backend: "PASS" | "FAIL";
  security: "PASS" | "FAIL";
  paymentPath: "PASS" | "FAIL";
  webhook: "PASS" | "FAIL";
  fulfillment: "PASS" | "FAIL";
  customerFailureUx: "PASS" | "FAIL";
  legalCommercialTruth: "PASS" | "FAIL";
  improvementIntake?: "PASS" | "FAIL";
}): CommercialProductionReadinessRecord {
  const reasons = (Object.entries(input) as Array<[keyof typeof input, "PASS" | "FAIL"]>)
    .filter(([, value]) => value !== "PASS")
    .map(([key]) => key.toUpperCase());
  return {
    gate: COMMERCIAL_PRODUCTION_READINESS_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    ...input,
  };
}

export function commercialOperatingPrecedence(input: {
  paymentPath: "PASS" | "FAIL";
  observations: number;
}): "REPAIR" | "WAITING_FOR_EVIDENCE" | "NO_ACTION_REQUIRED" {
  if (input.paymentPath !== "PASS") return "REPAIR";
  if (input.observations === 0) return "WAITING_FOR_EVIDENCE";
  return "NO_ACTION_REQUIRED";
}
