import { salesOutreachBlocked, duplicateSalesActionBlocked } from "@/lib/infinity/venture-sales-floor/compliance";
import { OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID } from "./contract";
import {
  evaluateOutboundMessageQuality,
  evaluateRecipientLocalWindow,
  evaluateSalesOutboundRateLimit,
  qualifyProspect,
  resolveSalesContact,
} from "./engines";
import type { SalesProspectCandidate } from "./types";

const sentKeys = new Set<string>();

export function salesIdempotencyKey(input: { prospect_id: string; campaign_id: string; touch: number }): string {
  return `sales:${input.campaign_id}:${input.prospect_id}:touch:${input.touch}`;
}

export function rememberSalesIdempotency(key: string, store = sentKeys): boolean {
  if (store.has(key)) return false;
  store.add(key);
  return true;
}

export function salesTouchAlreadySent(key: string, store = sentKeys): boolean {
  return store.has(key);
}

export function technicalFailureIsNotRejection(failure: "PROVIDER" | "DNS" | "TIMEOUT" | "NONE"): "TECHNICAL_FAILURE" | "NONE" {
  return failure === "NONE" ? "NONE" : "TECHNICAL_FAILURE";
}

export function classifyProviderOutcome(input: {
  provider_failure?: boolean;
  hard_bounce?: boolean;
  soft_bounce?: boolean;
}): "NOT_INTERESTED" | "LOST" | "DISQUALIFIED" | "MARKET_REJECTION" | "TECHNICAL_FAILURE" | "HARD_BOUNCE" | "SOFT_FAILURE" | "NONE" {
  if (input.hard_bounce) return "HARD_BOUNCE";
  if (input.soft_bounce || input.provider_failure) return input.provider_failure ? "TECHNICAL_FAILURE" : "SOFT_FAILURE";
  return "NONE";
}

export function evaluateAutonomousOutboundExecutionPolicy(input: {
  candidate: SalesProspectCandidate;
  message: string;
  now: string;
  daily_sent: number;
  domain_sent: number;
  recipient_sent: number;
  provider_healthy: boolean;
  touch?: number;
  store?: Set<string>;
}): { authorized: boolean; reasons: string[]; founder_approval_required: false; financial_authority: false } {
  const reasons: string[] = [];
  if (input.candidate.campaign_id !== OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID) reasons.push("CAMPAIGN_NOT_REUSED");
  const qualification = qualifyProspect(input.candidate);
  if (!qualification.qualified) reasons.push(...qualification.reasons);
  const contact = resolveSalesContact(input.candidate);
  if (contact.address === "UNKNOWN") reasons.push("CONTACT_UNKNOWN");
  if (salesOutreachBlocked({
    email: input.candidate.published_email ?? undefined,
    unsubscribed: input.candidate.unsubscribed,
    bounced: input.candidate.suppressed,
    campaignId: input.candidate.campaign_id,
    prospectId: input.candidate.prospect_id,
  })) reasons.push("SUPPRESSED");
  const quality = evaluateOutboundMessageQuality({
    message: input.message,
    venture: "OccupancyNPV",
    recipient_context: input.candidate.public_context,
  });
  if (!quality.pass) reasons.push(...quality.reasons);
  const window = evaluateRecipientLocalWindow({
    now: input.now,
    timezone: input.candidate.timezone,
    timezone_basis: input.candidate.timezone_basis,
  });
  if (!window.eligible) reasons.push(...window.reasons);
  const rate = evaluateSalesOutboundRateLimit({
    daily_sent: input.daily_sent,
    domain_sent: input.domain_sent,
    recipient_sent: input.recipient_sent,
  });
  if (!rate.allowed) reasons.push(...rate.reasons);
  if (!input.provider_healthy) reasons.push("PROVIDER_UNHEALTHY");
  const key = salesIdempotencyKey({
    prospect_id: input.candidate.prospect_id,
    campaign_id: input.candidate.campaign_id,
    touch: input.touch ?? (input.candidate.prior_touches ?? 0) + 1,
  });
  if (salesTouchAlreadySent(key, input.store) || duplicateSalesActionBlocked({
    same_target: true,
    same_kind: true,
    already_executed: Boolean(input.candidate.last_idempotency_key === key),
  })) reasons.push("DUPLICATE_TOUCH");
  return {
    authorized: reasons.length === 0,
    reasons,
    founder_approval_required: false,
    financial_authority: false,
  };
}
