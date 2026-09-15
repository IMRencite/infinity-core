import type { SalesPipelineStage } from "./contract";

const REQUIRED_EVIDENCE: Partial<Record<SalesPipelineStage, string[]>> = {
  CONTACTED: ["successful_outbound_execution"],
  ENGAGED: ["actual_interaction"],
  MEETING_SCHEDULED: ["confirmed_scheduling"],
  WON: ["commercial_conversion"],
  UNSUBSCRIBED: ["unsubscribe_or_suppression"],
};

export function requiredEvidenceForStage(stage: SalesPipelineStage): string[] {
  return REQUIRED_EVIDENCE[stage] ?? [];
}

export function canTransitionPipelineStage(input: {
  from: SalesPipelineStage;
  to: SalesPipelineStage;
  evidence: string[];
  positive_reply?: boolean;
  provider_failure?: boolean;
}): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.to === "WON" && input.positive_reply && !input.evidence.includes("commercial_conversion")) {
    reasons.push("WON_NOT_INFERRED_FROM_REPLY");
  }
  if (input.provider_failure && (input.to === "LOST" || input.to === "DISQUALIFIED")) {
    reasons.push("PROVIDER_FAILURE_IS_NOT_BUYER_REJECTION");
  }
  const required = requiredEvidenceForStage(input.to);
  for (const need of required) {
    if (!input.evidence.includes(need)) reasons.push(`MISSING_EVIDENCE:${need}`);
  }
  return { allowed: reasons.length === 0, reasons };
}

export function isDuplicateOpportunity(existing: Array<{ account_id: string; commercial_event: string }>, next: {
  account_id: string;
  commercial_event: string;
}): boolean {
  return existing.some((row) => row.account_id === next.account_id && row.commercial_event === next.commercial_event);
}
