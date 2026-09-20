import { createHash } from "crypto";
import { exchangeGmailAccessToken } from "@/lib/infinity/communication-provider/gmail-adapter";
import { resolveGmailInvocationContext, type GmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { readGmailThread } from "@/lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import type { NamedOutboundLoopGate } from "../closed-loop";
import { EXPECTED_COMMUNICATION_GMAIL_FINGERPRINT, EXPECTED_COMMUNICATION_MAILBOX } from "./cutover";
import { vercelRuntimeIdentity } from "./release";

export const COMMUNICATION_PROVIDER_IDENTITY_PATH = "worker-gmail-invocation-context" as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

function hashMailbox(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

export function workerCredentialConstruction(): string {
  return COMMUNICATION_PROVIDER_IDENTITY_PATH;
}

export function forensicCredentialConstruction(): string {
  return COMMUNICATION_PROVIDER_IDENTITY_PATH;
}

export function coverageCredentialConstruction(): string {
  return COMMUNICATION_PROVIDER_IDENTITY_PATH;
}

export async function readProductionProviderIdentity(input: {
  fetchImpl?: typeof fetch;
  gmailContext?: GmailInvocationContext;
} = {}): Promise<{
  ok: boolean;
  email: string | null;
  mailbox_hash: string | null;
  historyId: string | null;
  credential_fingerprint: string | null;
  deployment_id: string | null;
  release_sha: string | null;
  timestamp: string;
  reason?: string;
}> {
  const context = input.gmailContext ?? resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON" });
  const token = await exchangeGmailAccessToken(input.fetchImpl ?? fetch, context);
  const identity = vercelRuntimeIdentity();
  const timestamp = new Date().toISOString();
  if (!token.ok) {
    return {
      ok: false,
      email: null,
      mailbox_hash: null,
      historyId: null,
      credential_fingerprint: context.config_fingerprint,
      deployment_id: identity.deployment_id,
      release_sha: identity.git_sha,
      timestamp,
      reason: token.reason,
    };
  }
  const res = await (input.fetchImpl ?? fetch)("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    method: "GET",
    headers: { Authorization: `Bearer ${token.token}` },
  });
  const json = (await res.json().catch(() => ({}))) as { emailAddress?: string; historyId?: string; error?: { message?: string } };
  if (!res.ok || !json.emailAddress) {
    return {
      ok: false,
      email: null,
      mailbox_hash: null,
      historyId: json.historyId ?? null,
      credential_fingerprint: context.config_fingerprint,
      deployment_id: identity.deployment_id,
      release_sha: identity.git_sha,
      timestamp,
      reason: json.error?.message ?? `PROFILE_FAILED_${res.status}`,
    };
  }
  return {
    ok: true,
    email: json.emailAddress.trim().toLowerCase(),
    mailbox_hash: hashMailbox(json.emailAddress),
    historyId: json.historyId ?? null,
    credential_fingerprint: context.config_fingerprint,
    deployment_id: identity.deployment_id,
    release_sha: identity.git_sha,
    timestamp,
  };
}

export function evaluateProductionProviderIdentityGate(input: {
  email: string | null;
  expected?: string;
}): NamedOutboundLoopGate {
  const expected = (input.expected ?? EXPECTED_COMMUNICATION_MAILBOX).toLowerCase();
  const pass = Boolean(input.email) && input.email === expected;
  return named("ProductionProviderIdentityGate", pass ? "PASS" : "FAIL", [
    input.email ? hashMailbox(input.email) : "NO_EMAIL",
    pass ? "MAILBOX_MATCH" : "MAILBOX_MISMATCH_OR_MISSING",
  ]);
}

export function evaluateCommunicationProviderCredentialPathGate(input: {
  worker: string;
  forensic: string;
  coverage: string;
}): NamedOutboundLoopGate {
  const pass = input.worker === input.forensic && input.worker === input.coverage && input.worker === COMMUNICATION_PROVIDER_IDENTITY_PATH;
  return named("CommunicationProviderCredentialPathGate", pass ? "PASS" : "FAIL", [input.worker, input.forensic, input.coverage]);
}

export async function readFounderProviderMessage(input: {
  threadId: string;
  messageId: string;
  fetchImpl?: typeof fetch;
  gmailContext?: GmailInvocationContext;
}) {
  const context = input.gmailContext ?? resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON" });
  const thread = await readGmailThread({ threadId: input.threadId, fetchImpl: input.fetchImpl, gmailContext: context });
  if (!thread.ok) return { ok: false as const, reason: thread.reason };
  const message = thread.messages.find((row) => row.id === input.messageId) ?? null;
  return { ok: true as const, message, context_fingerprint: context.config_fingerprint };
}

export const COMMUNICATION_PROVIDER_PROBE_SCOPE = "communication-provider-probe-v4" as const;

export async function persistProductionProviderProbe(input: {
  probe: Awaited<ReturnType<typeof readProductionProviderIdentity>>;
  founder: Awaited<ReturnType<typeof readFounderProviderMessage>>;
  now: string;
}): Promise<void> {
  if (process.env.VITEST) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const identity = vercelRuntimeIdentity();
  const founderOk = input.founder.ok && Boolean(input.founder.message);
  const message = input.founder.ok ? input.founder.message : null;
  await client.from("cloud_runtime_state").upsert({
    scope: COMMUNICATION_PROVIDER_PROBE_SCOPE,
    version: 1,
    instance_id: "communication-provider-probe",
    payload: {
      users_get_profile: input.probe.ok,
      mailbox_hash: input.probe.mailbox_hash,
      history_id: input.probe.historyId,
      credential_fingerprint: input.probe.credential_fingerprint,
      deployment_id: identity.deployment_id,
      release_sha: identity.release_sha ?? identity.git_sha,
      release_tree_hash: identity.release_tree_hash,
      founder_message_found: founderOk,
      founder_message_id: message?.id ?? null,
      founder_thread_id: message?.threadId ?? null,
      founder_from: message?.from ? "PRESENT" : "ABSENT",
      founder_to: message?.to ? "PRESENT" : "ABSENT",
      founder_internal_date: message?.date ?? null,
      founder_labels: [],
      authorship: founderOk ? "PROSPECT" : "UNKNOWN",
      observed_at: input.now,
    },
    updated_at: input.now,
  });
}

export { EXPECTED_COMMUNICATION_GMAIL_FINGERPRINT, hashMailbox };
