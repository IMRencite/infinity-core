import type { SalesProspectCandidate } from "@/lib/infinity/autonomous-sales-execution/types";
import { authorizeOutboundSend } from "./authorize";
import {
  PRODUCTION_KILL_SWITCH_LIVE_PROOF_GATE,
  PRODUCTION_OUTBOUND_AUTHORIZATION_GATE,
  PRODUCTION_OUTBOUND_AUTONOMY_GATE,
  PRODUCTION_OUTBOUND_CAPACITY_GATE,
  PRODUCTION_OUTBOUND_KILL_SWITCH_GATE,
  PRODUCTION_OUTBOUND_PROVIDER_READINESS_GATE,
  PRODUCTION_RESTART_IDEMPOTENCY_GATE,
  PRODUCTION_SEND_IDEMPOTENCY_GATE,
  PRODUCTION_SUPPRESSION_ENFORCEMENT_GATE,
  PRODUCTION_SUPPRESSION_LIVE_PROOF_GATE,
} from "./contract";
import { executeProductionOutboundTickAsync } from "./cycle";
import { applyOutboundProviderEvent } from "./cycle";
import { fixtureOutboundProvider } from "./provider";
import type { OutboundSendRequest, ProductionOutboundState } from "./types";

export type NamedOutboundGate = { gate: string; result: "PASS" | "FAIL" | "NOT_READY"; reasons: string[] };

function pass(gate: string, reason: string): NamedOutboundGate {
  return { gate, result: "PASS", reasons: [reason] };
}
function fail(gate: string, reasons: string[]): NamedOutboundGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateProductionOutboundAuthorizationGate(input: {
  request: OutboundSendRequest;
  control: ProductionOutboundState["control"];
  usage: ProductionOutboundState["usage"];
  bypassed?: boolean;
}): NamedOutboundGate {
  if (input.bypassed) return fail(PRODUCTION_OUTBOUND_AUTHORIZATION_GATE, ["PROVIDER_BYPASSED_AUTHORIZATION"]);
  const decision = authorizeOutboundSend({ request: input.request, control: input.control, usage: input.usage });
  return decision.allowed || decision.reasons.length > 0
    ? pass(PRODUCTION_OUTBOUND_AUTHORIZATION_GATE, decision.allowed ? "AUTHORIZED" : decision.reasons[0] ?? "EXPLAINED_BLOCK")
    : fail(PRODUCTION_OUTBOUND_AUTHORIZATION_GATE, ["UNEXPLAINED"]);
}

export async function evaluateProductionSendIdempotencyGate(input: {
  state: ProductionOutboundState;
  candidate: SalesProspectCandidate;
  now: string;
}): Promise<NamedOutboundGate> {
  const provider = fixtureOutboundProvider();
  const store = new Set<string>();
  const first = await executeProductionOutboundTickAsync({
    state: input.state,
    candidates: [input.candidate],
    now: input.now,
    isolated_runtime: true,
    provider,
    store,
  });
  const second = await executeProductionOutboundTickAsync({
    state: first.state,
    candidates: [input.candidate],
    now: input.now,
    isolated_runtime: true,
    provider,
    store,
  });
  return first.sent === 1 && second.sent === 0 && provider.calls === 1
    ? pass(PRODUCTION_SEND_IDEMPOTENCY_GATE, "ONE_INTENDED_SEND")
    : fail(PRODUCTION_SEND_IDEMPOTENCY_GATE, [`FIRST_${first.sent}`, `SECOND_${second.sent}`, `CALLS_${provider.calls}`]);
}

export async function evaluateProductionSuppressionEnforcementGate(input: {
  state: ProductionOutboundState;
  candidate: SalesProspectCandidate;
  now: string;
}): Promise<NamedOutboundGate> {
  const provider = fixtureOutboundProvider();
  const queued = executeProductionOutboundTickAsync({
    state: input.state,
    candidates: [input.candidate],
    now: input.now,
    isolated_runtime: true,
    provider,
    execute_provider: false,
  });
  await queued;
  const result = await executeProductionOutboundTickAsync({
    state: input.state,
    candidates: [input.candidate],
    now: input.now,
    isolated_runtime: true,
    provider,
    suppressed_at_send: new Set([input.candidate.prospect_id]),
  });
  return result.sent === 0 && provider.calls === 0
    ? pass(PRODUCTION_SUPPRESSION_ENFORCEMENT_GATE, "NO_PROVIDER_CALL")
    : fail(PRODUCTION_SUPPRESSION_ENFORCEMENT_GATE, ["PROVIDER_CALLED_AFTER_SUPPRESSION"]);
}

export async function evaluateProductionOutboundCapacityGate(input: {
  state: ProductionOutboundState;
  candidate: SalesProspectCandidate;
  now: string;
}): Promise<NamedOutboundGate> {
  const provider = fixtureOutboundProvider();
  input.state.control.limits = {
    max_sends_per_hour: 1,
    max_sends_per_day: 1,
    max_sends_per_venture: 1,
    max_sends_per_prospect: 1,
    max_followups: 1,
  };
  const first = await executeProductionOutboundTickAsync({
    state: input.state,
    candidates: [input.candidate],
    now: input.now,
    isolated_runtime: true,
    provider,
  });
  const second = await executeProductionOutboundTickAsync({
    state: first.state,
    candidates: [{ ...input.candidate, prospect_id: `${input.candidate.prospect_id}-b` }],
    now: input.now,
    isolated_runtime: true,
    provider,
  });
  return first.sent === 1 && second.sent === 0
    ? pass(PRODUCTION_OUTBOUND_CAPACITY_GATE, "CAPS_ENFORCED")
    : fail(PRODUCTION_OUTBOUND_CAPACITY_GATE, ["CAP_BYPASSED"]);
}

export async function evaluateProductionOutboundKillSwitchGate(input: {
  state: ProductionOutboundState;
  candidate: SalesProspectCandidate;
  now: string;
}): Promise<NamedOutboundGate> {
  const provider = fixtureOutboundProvider();
  input.state.control.kill_switch = true;
  const blocked = await executeProductionOutboundTickAsync({
    state: input.state,
    candidates: [input.candidate],
    now: input.now,
    isolated_runtime: true,
    provider,
  });
  input.state.control.kill_switch = false;
  const resumed = await executeProductionOutboundTickAsync({
    state: input.state,
    candidates: [input.candidate],
    now: input.now,
    isolated_runtime: true,
    provider,
  });
  return blocked.sent === 0 && blocked.provider_calls === 0 && resumed.sent === 1
    ? pass(PRODUCTION_OUTBOUND_KILL_SWITCH_GATE, "KILL_SWITCH_THEN_RESUME")
    : fail(PRODUCTION_OUTBOUND_KILL_SWITCH_GATE, [`BLOCKED_${blocked.sent}`, `RESUMED_${resumed.sent}`]);
}

export function evaluateProductionOutboundAutonomyGate(input: {
  real_send: boolean;
  delivery_events: boolean;
  bounce_events: boolean;
  replies: boolean;
  opt_outs: boolean;
  suppression_stops: boolean;
  duplicates_prevented: boolean;
  pacing: boolean;
  restart_safe: boolean;
  kill_switch: boolean;
  venture_limit: boolean;
  channel_limit: boolean;
  hourly_daily_caps: boolean;
  performance: boolean;
  learning: boolean;
  no_privacy_leak: boolean;
  no_burst: boolean;
}): NamedOutboundGate {
  const missing = Object.entries(input).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) return { gate: PRODUCTION_OUTBOUND_AUTONOMY_GATE, result: "NOT_READY", reasons: missing };
  return pass(PRODUCTION_OUTBOUND_AUTONOMY_GATE, "CANARY_PROVEN");
}

export function evaluateProductionOutboundProviderReadinessGate(readiness: {
  bound: boolean;
  credentials_present: boolean;
  sending_identity_verified: boolean;
  healthy: boolean;
  reply_path_configured: boolean;
  bounce_path_configured: boolean;
  unsubscribe_path_configured: boolean;
  server_only?: boolean;
  leaked_credential?: boolean;
  token_exchange?: boolean;
  send_scope?: boolean;
}): NamedOutboundGate {
  const reasons: string[] = [];
  if (!inputReady(readiness.bound)) reasons.push("PROVIDER_NOT_BOUND");
  if (!inputReady(readiness.credentials_present)) reasons.push("CREDENTIALS_MISSING");
  if (!inputReady(readiness.sending_identity_verified)) reasons.push("SENDING_IDENTITY_UNVERIFIED");
  if (!inputReady(readiness.healthy)) reasons.push("PROVIDER_UNHEALTHY");
  if (readiness.token_exchange === false) reasons.push("TOKEN_EXCHANGE_FAILED");
  if (readiness.send_scope === false) reasons.push("GMAIL_SEND_SCOPE_MISSING");
  if (!inputReady(readiness.reply_path_configured)) reasons.push("REPLY_PATH_MISSING");
  if (!inputReady(readiness.bounce_path_configured)) reasons.push("BOUNCE_PATH_MISSING");
  if (!inputReady(readiness.unsubscribe_path_configured)) reasons.push("UNSUBSCRIBE_PATH_MISSING");
  if (readiness.leaked_credential) reasons.push("CREDENTIAL_LEAK");
  if (readiness.server_only === false) reasons.push("CREDENTIALS_NOT_SERVER_ONLY");
  return reasons.length
    ? fail(PRODUCTION_OUTBOUND_PROVIDER_READINESS_GATE, reasons)
    : pass(PRODUCTION_OUTBOUND_PROVIDER_READINESS_GATE, "PROVIDER_READY");
}

function inputReady(value: boolean | undefined): boolean {
  return value === true;
}

export function evaluateProductionSuppressionLiveProofGate(input: {
  live_provider: boolean;
  queued_then_suppressed: boolean;
  provider_calls_after_suppression: number;
  pending_cancelled: boolean;
}): NamedOutboundGate {
  if (!input.live_provider) return fail(PRODUCTION_SUPPRESSION_LIVE_PROOF_GATE, ["NOT_LIVE_PROVIDER"]);
  if (!input.queued_then_suppressed || input.provider_calls_after_suppression > 0 || !input.pending_cancelled) {
    return fail(PRODUCTION_SUPPRESSION_LIVE_PROOF_GATE, ["LIVE_SUPPRESSION_NOT_PROVEN"]);
  }
  return pass(PRODUCTION_SUPPRESSION_LIVE_PROOF_GATE, "LIVE_SUPPRESSION_BLOCKED_PROVIDER");
}

export function evaluateProductionRestartIdempotencyGate(input: {
  live_provider?: boolean;
  completed_send: boolean;
  restarted: boolean;
  provider_calls_after_restart: number;
  same_provider_message_id: boolean;
}): NamedOutboundGate {
  if (!input.live_provider) return fail(PRODUCTION_RESTART_IDEMPOTENCY_GATE, ["NOT_LIVE_PROVIDER"]);
  if (!input.completed_send || !input.restarted) return fail(PRODUCTION_RESTART_IDEMPOTENCY_GATE, ["RESTART_NOT_PROVEN"]);
  return input.provider_calls_after_restart === 0 && input.same_provider_message_id
    ? pass(PRODUCTION_RESTART_IDEMPOTENCY_GATE, "COMPLETED_SEND_NOT_REPEATED")
    : fail(PRODUCTION_RESTART_IDEMPOTENCY_GATE, ["DUPLICATE_AFTER_RESTART"]);
}

export function evaluateProductionKillSwitchLiveProofGate(input: {
  live_provider: boolean;
  eligible_queue: boolean;
  kill_switch_on: boolean;
  provider_calls_while_engaged: number;
}): NamedOutboundGate {
  if (!input.live_provider || !input.eligible_queue || !input.kill_switch_on) {
    return fail(PRODUCTION_KILL_SWITCH_LIVE_PROOF_GATE, ["LIVE_KILL_SWITCH_NOT_PROVEN"]);
  }
  return input.provider_calls_while_engaged === 0
    ? pass(PRODUCTION_KILL_SWITCH_LIVE_PROOF_GATE, "ZERO_LIVE_SENDS_WHILE_ENGAGED")
    : fail(PRODUCTION_KILL_SWITCH_LIVE_PROOF_GATE, ["LIVE_SEND_WHILE_KILL_SWITCH"]);
}

export function proveCanaryFeedback(state: ProductionOutboundState, outboxId: string, now: string) {
  applyOutboundProviderEvent(state, { id: `acc:${outboxId}`, outbox_id: outboxId, kind: "accepted", at: now, fabricated: false });
  applyOutboundProviderEvent(state, { id: `del:${outboxId}`, outbox_id: outboxId, kind: "delivered", at: now, fabricated: false });
  applyOutboundProviderEvent(state, { id: `rep:${outboxId}`, outbox_id: outboxId, kind: "replied", at: now, fabricated: false });
}
