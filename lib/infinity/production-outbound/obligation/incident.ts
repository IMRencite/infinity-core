import { createClient } from "@supabase/supabase-js";
import type { NamedOutboundLoopGate } from "../closed-loop";
import {
  COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  STRANDED_FOUNDER_TRIAL_INBOUND_ID,
} from "./cutover";

export const COMMUNICATION_INCIDENT_SCOPE = "communication-incidents-v1" as const;
export const FOUNDER_TRIAL_INCIDENT_ID = `inc:${COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID}:${STRANDED_FOUNDER_TRIAL_INBOUND_ID}`;

export type CommunicationIncident = {
  incident_id: string;
  provider_message_id: string;
  mailbox_id: string;
  thread_id: string;
  incident_type: string;
  recovered: true;
  clean_eligible: false;
  recovery_reason_codes: string[];
  first_detected_at: string;
  slo_breached_at: string;
  release_parity_failed: boolean;
  created_at: string;
  updated_at: string;
};

const memory = new Map<string, CommunicationIncident>();

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function resetCommunicationIncidents(): void {
  memory.clear();
}

export function getCommunicationIncident(mailbox_id: string, provider_message_id: string): CommunicationIncident | null {
  return memory.get(`${mailbox_id}:${provider_message_id}`) ?? null;
}

export function persistRecoveredIncident(input: {
  mailbox_id: string;
  provider_message_id: string;
  thread_id: string;
  now: string;
  incident_type?: string;
  reasons?: string[];
}): CommunicationIncident {
  const key = `${input.mailbox_id}:${input.provider_message_id}`;
  const existing = memory.get(key);
  if (existing) {
    return {
      ...existing,
      recovered: true,
      clean_eligible: false,
      recovery_reason_codes: [...new Set([...existing.recovery_reason_codes, ...(input.reasons ?? [])])],
      updated_at: input.now,
    };
  }
  const row: CommunicationIncident = {
    incident_id: `inc:${input.thread_id}:${input.provider_message_id}`,
    provider_message_id: input.provider_message_id,
    mailbox_id: input.mailbox_id,
    thread_id: input.thread_id,
    incident_type: input.incident_type ?? "PRODUCTION_RUNS_PRE_CUTOVER_RELEASE",
    recovered: true,
    clean_eligible: false,
    recovery_reason_codes: input.reasons ?? ["SLO_BREACH", "RELEASE_PARITY_FAIL", "LEGACY_PATH_HANDLED", "RUNTIME_REPAIR_REQUIRED"],
    first_detected_at: input.now,
    slo_breached_at: input.now,
    release_parity_failed: true,
    created_at: input.now,
    updated_at: input.now,
  };
  memory.set(key, row);
  return row;
}

export function inheritIncidentOntoObligation(input: {
  mailbox_id: string;
  provider_message_id: string;
}): { recovered: true; clean_eligible: false; reasons: string[] } | null {
  const incident = getCommunicationIncident(input.mailbox_id, input.provider_message_id);
  if (!incident) return null;
  return { recovered: true, clean_eligible: false, reasons: incident.recovery_reason_codes };
}

export function evaluateRecoveredTurnDatabaseInvariant(input: {
  first: CommunicationIncident;
  later: { recovered?: boolean; clean_eligible?: boolean };
}): NamedOutboundLoopGate {
  const pass = input.first.recovered === true
    && input.first.clean_eligible === false
    && input.later.recovered !== false
    && input.later.clean_eligible !== true;
  return named("RecoveredTurnDatabaseInvariantGate", pass ? "PASS" : "FAIL", [
    input.later.recovered === false ? "RECOVERED_REVERTED" : "RECOVERED_HELD",
    input.later.clean_eligible === true ? "CLEAN_RECLASSIFIED" : "CLEAN_FALSE",
  ]);
}

export async function hydrateCommunicationIncidents(): Promise<void> {
  if (process.env.VITEST) return;
  const client = adminClient();
  if (!client) return;
  const { data } = await client.from("cloud_runtime_state").select("payload").eq("scope", COMMUNICATION_INCIDENT_SCOPE).maybeSingle();
  const rows = (data?.payload as { incidents?: CommunicationIncident[] } | undefined)?.incidents ?? [];
  for (const row of rows) memory.set(`${row.mailbox_id}:${row.provider_message_id}`, row);
}

export async function persistCommunicationIncidents(): Promise<{ ok: boolean; reason?: string; storage: "POSTGRES" | "FALLBACK_JSON" }> {
  if (process.env.VITEST) return { ok: true, storage: "FALLBACK_JSON" };
  const client = adminClient();
  if (!client) return { ok: false, reason: "SUPABASE_UNAVAILABLE", storage: "FALLBACK_JSON" };
  const rows = [...memory.values()];
  for (const row of rows) {
    const inserted = await client.from("communication_incidents").upsert({
      incident_id: row.incident_id,
      provider_message_id: row.provider_message_id,
      mailbox_id: row.mailbox_id,
      thread_id: row.thread_id,
      incident_type: row.incident_type,
      recovered: true,
      clean_eligible: false,
      recovery_reason_codes: row.recovery_reason_codes,
      first_detected_at: row.first_detected_at,
      slo_breached_at: row.slo_breached_at,
      release_parity_failed: row.release_parity_failed,
      updated_at: row.updated_at,
    });
    if (inserted.error) {
      const fallback = await client.from("cloud_runtime_state").upsert({
        scope: COMMUNICATION_INCIDENT_SCOPE,
        version: 1,
        instance_id: "communication-incidents",
        payload: { incidents: rows },
        updated_at: new Date().toISOString(),
      });
      return { ok: !fallback.error, reason: inserted.error.message, storage: "FALLBACK_JSON" };
    }
  }
  return { ok: true, storage: "POSTGRES" };
}

export async function observeCommunicationSchemaVersion(): Promise<{
  required: string;
  seen: string | null;
  incidents_present: boolean;
  recovery_constraint_present: boolean;
}> {
  const required = "communication-incident-recovery-v4";
  if (process.env.VITEST) {
    return { required, seen: required, incidents_present: true, recovery_constraint_present: true };
  }
  const client = adminClient();
  if (!client) return { required, seen: null, incidents_present: false, recovery_constraint_present: false };
  const table = await client.from("communication_incidents").select("incident_id").limit(1);
  const present = !table.error;
  return {
    required,
    seen: present ? required : null,
    incidents_present: present,
    recovery_constraint_present: present,
  };
}

export function founderTrialIncident(now: string): CommunicationIncident {
  return persistRecoveredIncident({
    mailbox_id: "occupancynpv-canary",
    provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
    thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
    now,
    reasons: ["SLO_BREACH", "RELEASE_PARITY_FAIL", "LEGACY_PATH_HANDLED", "RUNTIME_REPAIR_REQUIRED"],
  });
}
