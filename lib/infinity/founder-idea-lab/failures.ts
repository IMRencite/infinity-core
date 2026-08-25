import type { FounderFailureCode } from "./constants";

export function classifyFounderFailure(code: FounderFailureCode): {
  technical: boolean;
  businessRejected: boolean;
} {
  if (code === "BUSINESS_REJECTED") return { technical: false, businessRejected: true };
  return { technical: true, businessRejected: false };
}

export function technicalFailureIsNotBusinessRejection(code: FounderFailureCode): boolean {
  return code !== "BUSINESS_REJECTED";
}
