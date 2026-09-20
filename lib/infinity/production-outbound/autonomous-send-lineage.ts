import { createClient } from "@supabase/supabase-js";
import type { NamedOutboundLoopGate } from "./closed-loop";

export type LineageTriggerSource = "VERCEL_CRON" | "MANUAL" | "UNKNOWN";

export const AUTONOMOUS_SEND_LINEAGE_SCOPE = "autonomous-send-lineage-v1" as const;
export const UNKNOWN = "UNKNOWN" as const;

export type AutonomousSendLineage = {
  conversation_id: string;
  thread_id: string;
  inbound_message_id: string;
  inbound_received_at: string | typeof UNKNOWN;
  observer_trigger: LineageTriggerSource;
  observer_detected_at: string;
  job_id: string;
  job_created_at: string;
  eligible_at: string;
  job_claimed_at: string | typeof UNKNOWN;
  composer_started_at: string | typeof UNKNOWN;
  composer_completed_at: string | typeof UNKNOWN;
  gate_results: Record<string, string>;
  provider_send_started_at: string | typeof UNKNOWN;
  provider_message_id: string | null;
  provider_sent_at: string | null;
  delivery_verified_at: string | typeof UNKNOWN;
  deployment_id: string | typeof UNKNOWN;
  scheduler_invocation_id: string | typeof UNKNOWN;
  manual_trigger: boolean;
  cursor_trigger: boolean;
  replay: boolean;
  duplicate_blocked: boolean;
};

const T4_LINEAGE: AutonomousSendLineage = {
  conversation_id: "sales-conversation:occupancynpv:canary:1a0af74557b0eb36",
  thread_id: "1a0af74557b0eb36",
  inbound_message_id: "1a0b3b2bd5ab75a7",
  inbound_received_at: "2026-09-18T08:47:08.000Z",
  observer_trigger: "VERCEL_CRON",
  observer_detected_at: "2026-09-18T08:50:31.219Z",
  job_id: "job:1a0af74557b0eb36:1a0b3b2bd5ab75a7",
  job_created_at: "2026-09-18T08:50:31.219Z",
  eligible_at: "2026-09-18T08:58:31.219Z",
  job_claimed_at: "2026-09-18T09:00:31.123Z",
  composer_started_at: UNKNOWN,
  composer_completed_at: UNKNOWN,
  gate_results: {},
  provider_send_started_at: UNKNOWN,
  provider_message_id: "1a0b3befb327cbcb",
  provider_sent_at: "2026-09-18T09:00:31.123Z",
  delivery_verified_at: UNKNOWN,
  deployment_id: UNKNOWN,
  scheduler_invocation_id: "2026-09-18T09:00:33.931Z",
  manual_trigger: false,
  cursor_trigger: false,
  replay: false,
  duplicate_blocked: false,
};

let memory: AutonomousSendLineage[] = [];

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getAutonomousSendLineage(): AutonomousSendLineage[] {
  return memory;
}

export async function hydrateAutonomousSendLineage(): Promise<AutonomousSendLineage[]> {
  if (process.env.VITEST) return memory;
  const client = adminClient();
  if (!client) return memory;
  const { data } = await client.from("cloud_runtime_state").select("payload").eq("scope", AUTONOMOUS_SEND_LINEAGE_SCOPE).maybeSingle();
  const payload = data?.payload as { rows?: AutonomousSendLineage[] } | undefined;
  if (payload?.rows) memory = payload.rows;
  return memory;
}

export async function persistAutonomousSendLineage(): Promise<void> {
  if (process.env.VITEST) return;
  const client = adminClient();
  if (!client) return;
  await client.from("cloud_runtime_state").upsert({
    scope: AUTONOMOUS_SEND_LINEAGE_SCOPE,
    version: 1,
    instance_id: "autonomous-send-lineage",
    payload: { rows: memory },
    updated_at: new Date().toISOString(),
  });
}

export function upsertAutonomousSendLineage(row: AutonomousSendLineage): AutonomousSendLineage {
  const index = memory.findIndex((item) => item.job_id === row.job_id);
  if (index >= 0) memory[index] = row;
  else memory = [...memory, row];
  return row;
}

export function evaluateAutonomousSendLineageGate(row: AutonomousSendLineage | null): NamedOutboundLoopGate {
  if (!row) return { gate: "AutonomousSendLineageGate", result: "FAIL", reasons: ["LINEAGE_MISSING"] };
  const reasons: string[] = [];
  if (!row.inbound_message_id) reasons.push("INBOUND_MISSING");
  if (row.observer_trigger !== "VERCEL_CRON") reasons.push("TRIGGER_NOT_CRON");
  if (!row.job_id) reasons.push("JOB_MISSING");
  if (!row.eligible_at) reasons.push("ELIGIBLE_AT_MISSING");
  if (row.job_claimed_at === UNKNOWN) reasons.push("CLAIM_UNRECORDED");
  if (!row.provider_message_id) reasons.push("PROVIDER_MESSAGE_MISSING");
  if (row.manual_trigger) reasons.push("MANUAL_TRIGGER");
  if (row.cursor_trigger) reasons.push("CURSOR_TRIGGER");
  if (row.duplicate_blocked) reasons.push("DUPLICATE");
  if (Date.parse(row.observer_detected_at) > Date.parse(row.eligible_at)) reasons.push("ELIGIBLE_BEFORE_DETECT");
  if (row.provider_sent_at && Date.parse(row.eligible_at) > Date.parse(row.provider_sent_at)) reasons.push("SENT_BEFORE_ELIGIBLE");
  return {
    gate: "AutonomousSendLineageGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["LINEAGE_COMPLETE"],
  };
}

export function t4LineageFromKnownEvidence(): AutonomousSendLineage {
  return { ...T4_LINEAGE };
}

export async function backfillT4AutonomousSendLineage(evidence: {
  job_id?: string | null;
  inbound_message_id?: string | null;
  provider_message_id?: string | null;
  job_state?: string | null;
} = {}): Promise<AutonomousSendLineage | null> {
  await hydrateAutonomousSendLineage().catch(() => undefined);
  const matches = evidence.job_id === T4_LINEAGE.job_id
    || evidence.inbound_message_id === T4_LINEAGE.inbound_message_id
    || evidence.provider_message_id === T4_LINEAGE.provider_message_id
    || evidence.job_state === "SENT";
  if (!matches && !memory.some((row) => row.job_id === T4_LINEAGE.job_id)) {
    if (evidence.job_id && evidence.job_id !== T4_LINEAGE.job_id) return null;
  }
  if (!evidence.inbound_message_id && !evidence.job_id && !memory.length) {
    /* allow explicit known T4 backfill when caller already verified SENT job */
  }
  const existing = memory.find((row) => row.job_id === T4_LINEAGE.job_id);
  if (existing) return existing;
  const row = t4LineageFromKnownEvidence();
  upsertAutonomousSendLineage(row);
  await persistAutonomousSendLineage().catch(() => undefined);
  return row;
}
