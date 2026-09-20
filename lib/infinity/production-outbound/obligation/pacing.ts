import type { NamedOutboundLoopGate } from "../closed-loop";
import { planResponseDelay } from "@/lib/infinity/growth-engine/communication";
import { COMMUNICATION_OBLIGATION_AGE_SLO_MS } from "./cutover";

export const COMMUNICATION_SCHEDULER_CADENCE_MS = 5 * 60 * 1000;
export const COMMUNICATION_STALE_HEARTBEAT_MS = 11 * 60 * 1000;
export const COMMUNICATION_DISCOVERY_TARGET_MS = 7 * 60 * 1000;
export const COMMUNICATION_DISCOVERY_ALERT_MS = 11 * 60 * 1000;
export const COMMUNICATION_PACING_ANCHOR = "PROVIDER_RECEIVED" as const;
export const COMMUNICATION_STALE_HEARTBEAT_RATIONALE =
  "Cadence is Vercel Cron */5 on /api/runtime/communication-tick. Two missed ticks plus one minute slack is 11 minutes. Discovery target is 7 minutes; alert is 11 minutes.";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function desiredNaturalPacingMs(input: { urgent?: boolean; complexity?: "LOW" | "MEDIUM" | "HIGH" } = {}): number {
  return planResponseDelay({
    urgent: Boolean(input.urgent),
    afterHoursRecipientLocal: false,
    complexity: input.complexity ?? "LOW",
  }).delayMinutes * 60_000;
}

export function remainingPacingFromProvider(input: {
  provider_received_at: string;
  now: string;
  desired_ms?: number;
  slo_breached?: boolean;
}): { remaining_ms: number; elapsed_ms: number; anchored_to: typeof COMMUNICATION_PACING_ANCHOR; eligible_at: string } {
  const desired = input.desired_ms ?? desiredNaturalPacingMs();
  const elapsed = Date.parse(input.now) - Date.parse(input.provider_received_at);
  const remaining = input.slo_breached ? 0 : Math.max(0, desired - elapsed);
  return {
    remaining_ms: remaining,
    elapsed_ms: elapsed,
    anchored_to: COMMUNICATION_PACING_ANCHOR,
    eligible_at: new Date(Date.parse(input.now) + remaining).toISOString(),
  };
}

export function evaluateCommunicationPacingAnchorGate(input: {
  anchored_to: string;
  provider_received_at: string;
  discovered_at: string;
  eligible_at: string;
}): NamedOutboundLoopGate {
  const fromProvider = Date.parse(input.eligible_at) - Date.parse(input.provider_received_at);
  const fromDiscovery = Date.parse(input.eligible_at) - Date.parse(input.discovered_at);
  const pass = input.anchored_to === COMMUNICATION_PACING_ANCHOR && fromProvider <= desiredNaturalPacingMs() + 1_000 && fromDiscovery <= fromProvider;
  return named("CommunicationPacingAnchorGate", pass ? "PASS" : "FAIL", [input.anchored_to, `${fromProvider}ms`]);
}

export function evaluateSloMargin(input: {
  discovery_ms: number;
  pacing_ms: number;
  claim_ms: number;
  retry_ms: number;
  send_ms: number;
}): { total_ms: number; margin_ms: number; fits: boolean } {
  const total = input.discovery_ms + input.pacing_ms + input.claim_ms + input.retry_ms + input.send_ms;
  return { total_ms: total, margin_ms: COMMUNICATION_OBLIGATION_AGE_SLO_MS - total, fits: total <= COMMUNICATION_OBLIGATION_AGE_SLO_MS };
}
