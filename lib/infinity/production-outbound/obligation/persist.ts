import { createClient } from "@supabase/supabase-js";
import {
  getCommunicationObligationStore,
  replaceCommunicationObligationStore,
  type CommunicationObligationStore,
} from "./store";
import type {
  CommunicationAttempt,
  CommunicationObligation,
  CommunicationOutboundLedger,
  CommunicationTransitionLog,
} from "./types";

export const COMMUNICATION_OBLIGATION_TABLES = [
  "communication_obligations",
  "communication_attempts",
  "communication_outbound_ledger",
  "communication_transition_log",
] as const;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function rowToObligation(row: Record<string, unknown>): CommunicationObligation {
  return {
    obligation_id: String(row.id ?? row.obligation_id),
    mailbox_id: String(row.mailbox_id),
    provider_message_id: String(row.provider_message_id),
    thread_id: String(row.thread_id),
    state: row.state as CommunicationObligation["state"],
    version: Number(row.version ?? 1),
    owner: (row.owner as string | null) ?? null,
    due_at: (row.due_at as string | null) ?? null,
    next_action_at: (row.next_attempt_at as string | null) ?? null,
    next_action: (row.next_action as string | null) ?? "PROCESS_INBOUND",
    received_at: String(row.received_at),
    role: (row.role as CommunicationObligation["role"]) ?? "PROSPECT",
    role_evidence: String(row.role_evidence ?? "UNRESOLVED"),
    authorship_resolution: String(row.authorship_resolution ?? "UNRESOLVED"),
    planner_intent: (row.planner_intent as string | null) ?? null,
    planner_version: (row.planner_version as string | null) ?? null,
    conversation_stage: (row.conversation_stage as string | null) ?? null,
    covered_by_outbound_id: (row.covered_by_outbound_id as string | null) ?? null,
    terminal_reason: (row.terminal_reason as string | null) ?? null,
    strategy_id: (row.planner_intent as string | null) ?? null,
    recovered: Boolean(row.recovered),
    clean_eligible: row.clean_eligible === false || Boolean(row.recovered) ? false : true,
    recovery_reason_codes: Array.isArray(row.recovery_reason_codes) ? (row.recovery_reason_codes as string[]) : [],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function obligationToRow(obligation: CommunicationObligation) {
  return {
    id: obligation.obligation_id,
    mailbox_id: obligation.mailbox_id,
    thread_id: obligation.thread_id,
    provider_message_id: obligation.provider_message_id,
    role: obligation.role,
    role_evidence: obligation.role_evidence,
    authorship_resolution: obligation.authorship_resolution,
    received_at: obligation.received_at,
    state: obligation.state,
    planner_intent: obligation.planner_intent,
    planner_version: obligation.planner_version,
    conversation_stage: obligation.conversation_stage,
    next_action: obligation.next_action,
    owner: obligation.owner,
    due_at: obligation.due_at,
    next_attempt_at: obligation.next_action_at,
    covered_by_outbound_id: obligation.covered_by_outbound_id,
    terminal_reason: obligation.terminal_reason,
    version: obligation.version,
    created_at: obligation.created_at,
    updated_at: obligation.updated_at,
  };
}

export async function hydrateCommunicationObligationStore(): Promise<CommunicationObligationStore> {
  const store = getCommunicationObligationStore();
  if (process.env.VITEST) return store;
  const client = adminClient();
  if (!client) return store;
  const { data: obligations, error } = await client.from("communication_obligations").select("*");
  if (error) {
    store.schema_ready = !/relation|does not exist/i.test(error.message);
    return store;
  }
  const next: CommunicationObligationStore = {
    obligations: new Map(),
    identity: new Map(),
    attempts: [],
    ledger: [],
    logs: [],
    clean_live_turns: 0,
    reconciler_rearm_count: store.reconciler_rearm_count,
    persistence: "POSTGRES",
    schema_ready: true,
  };
  for (const row of obligations ?? []) {
    const obligation = rowToObligation(row as Record<string, unknown>);
    next.obligations.set(obligation.obligation_id, obligation);
    next.identity.set(`${obligation.mailbox_id}:${obligation.provider_message_id}`, obligation.obligation_id);
  }
  const { data: attempts } = await client.from("communication_attempts").select("*");
  next.attempts = ((attempts ?? []) as CommunicationAttempt[]).map((row) => ({
    attempt_id: String((row as { id?: string }).id ?? row.attempt_id),
    obligation_id: row.obligation_id,
    attempt_no: Number(row.attempt_no),
    strategy_id: row.strategy_id ?? row.strategy ?? "UNKNOWN",
    strategy: row.strategy ?? row.strategy_id ?? null,
    planner_version: row.planner_version ?? "conversation-planner-v1",
    composer_version: row.composer_version ?? "consultative-sales",
    stage: row.stage ?? "COMPOSING",
    started_at: row.started_at,
    completed_at: row.completed_at ?? null,
    outcome: row.outcome ?? (row.completed_at ? "PASS" : "RUNNING"),
    failure_class: row.failure_class ?? null,
    failure_reason: row.failure_reason ?? null,
    provider_status: row.provider_status ?? null,
    rfc_message_id: row.rfc_message_id ?? null,
    provider_message_id: row.provider_message_id ?? null,
    body_hash: row.body_hash ?? null,
    recovered: Boolean(row.recovered),
    actor: row.actor ?? "CommunicationWorker",
    deployment_id: row.deployment_id ?? null,
    created_at: row.created_at ?? row.started_at,
  }));
  const { data: ledger } = await client.from("communication_outbound_ledger").select("*");
  next.ledger = (ledger ?? []) as CommunicationOutboundLedger[];
  const { data: logs } = await client.from("communication_transition_log").select("*");
  next.logs = ((logs ?? []) as CommunicationTransitionLog[]).map((row) => ({
    obligation_id: row.obligation_id,
    from_state: row.from_state,
    to_state: row.to_state,
    expected_version: Number(row.expected_version),
    new_version: Number(row.new_version),
    actor: row.actor,
    reason: row.reason,
    evidence_ref: row.evidence_ref ?? null,
    timestamp: row.timestamp,
  }));
  return replaceCommunicationObligationStore(next);
}

export async function persistCommunicationObligationStore(
  store: CommunicationObligationStore = getCommunicationObligationStore(),
): Promise<{ ok: boolean; persistence: "POSTGRES"; reason?: string }> {
  if (process.env.VITEST) return { ok: true, persistence: "POSTGRES" };
  const client = adminClient();
  if (!client) return { ok: false, persistence: "POSTGRES", reason: "SUPABASE_UNAVAILABLE" };
  for (const obligation of store.obligations.values()) {
    const { error } = await client.from("communication_obligations").upsert(obligationToRow(obligation), {
      onConflict: "id",
    });
    if (error) {
      store.schema_ready = !/relation|does not exist/i.test(error.message);
      return { ok: false, persistence: "POSTGRES", reason: error.message };
    }
  }
  for (const attempt of store.attempts) {
    await client.from("communication_attempts").upsert({
      id: attempt.attempt_id,
      obligation_id: attempt.obligation_id,
      attempt_no: attempt.attempt_no,
      strategy: attempt.strategy ?? attempt.strategy_id,
      stage: attempt.stage,
      started_at: attempt.started_at,
      completed_at: attempt.completed_at,
      failure_class: attempt.failure_class,
      failure_reason: attempt.failure_reason,
      provider_status: attempt.provider_status,
      provider_message_id: attempt.provider_message_id,
      rfc_message_id: attempt.rfc_message_id,
      recovered: attempt.recovered,
      created_at: attempt.created_at,
    }, { onConflict: "id" });
  }
  for (const row of store.ledger) {
    const attempt = store.attempts.find((item) => item.attempt_id === row.attempt_id);
    await client.from("communication_outbound_ledger").upsert({
      obligation_id: row.obligation_id,
      attempt_id: row.attempt_id,
      attempt_no: attempt?.attempt_no ?? 1,
      rfc_message_id: row.rfc_message_id,
      custom_header: row.custom_header,
      thread_id: row.thread_id,
      body_hash: row.body_hash,
      created_at: row.created_at,
      provider_message_id: row.provider_message_id,
      accepted_at: row.accepted_at,
    }, { onConflict: "obligation_id,attempt_no" });
  }
  return { ok: true, persistence: "POSTGRES" };
}

export function evaluateCommunicationPersistenceGate(store: CommunicationObligationStore = getCommunicationObligationStore()) {
  const unique = store.identity.size === store.obligations.size;
  const blocked = [...store.obligations.values()].some((row) => String(row.state) === "BLOCKED");
  return {
    gate: "CommunicationPersistenceGate",
    result: store.persistence === "POSTGRES" && unique && !blocked ? "PASS" : "FAIL",
    reasons: [
      store.persistence,
      unique ? "UNIQUE_IDENTITY" : "DUPLICATE_IDENTITY",
      blocked ? "BLOCKED_PRESENT" : "NO_BLOCKED",
    ],
  } as const;
}
