import { createHash } from "crypto";
import { exchangeGmailAccessToken } from "@/lib/infinity/communication-provider/gmail-adapter";
import { resolveGmailInvocationContext, type GmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import type { NamedOutboundLoopGate } from "../closed-loop";
import { EXPECTED_COMMUNICATION_MAILBOX } from "./cutover";

export const MAILBOX_HASH_VERSION = "sha256-lower-trim-16-v1" as const;
export const MAILBOX_NORMALIZATION_VERSION = "trim-lower-v1" as const;
export const REGISTERED_MAILBOX_SCOPE = "communication-registered-mailbox-v5" as const;

export type MailboxMismatchClass =
  | "EXPECTED_CONSTANT_STALE"
  | "EXPECTED_ADDRESS_IS_SEND_AS_ALIAS"
  | "HASH_NORMALIZATION_MISMATCH"
  | "WRONG_PROVIDER_ACCOUNT"
  | "UNRESOLVED";

export type RegisteredMailbox = {
  id: string;
  primary_address_hash: string;
  normalization_version: typeof MAILBOX_NORMALIZATION_VERSION;
  hash_version: typeof MAILBOX_HASH_VERSION;
  provider: "gmail";
  provider_account_id_hash: string;
  known_alias_hashes: string[];
  default_send_as_hash: string | null;
  credential_fingerprint: string | null;
  provider_verified_at: string;
  attestation_status: "PENDING" | "ATTESTED";
  attested_by: string | null;
  attested_at: string | null;
  created_at: string;
  updated_at: string;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function normalizeMailboxAddress(value: string): string {
  const angle = value.match(/<([^>]+)>/);
  const raw = (angle?.[1] ?? value).trim().toLowerCase();
  return raw.replace(/[\u200b\u00a0]/g, "");
}

export function hashMailboxAddress(value: string): string {
  return createHash("sha256").update(normalizeMailboxAddress(value)).digest("hex").slice(0, 16);
}

export function classifyMailboxMismatch(input: {
  profile_hash: string;
  expected_hash: string;
  expected_is_alias: boolean;
  hashes_equal_under_same_algorithm: boolean;
  thread_lives_in_profile_mailbox: boolean;
}): MailboxMismatchClass {
  if (!input.hashes_equal_under_same_algorithm && input.profile_hash === input.expected_hash) return "HASH_NORMALIZATION_MISMATCH";
  if (input.expected_is_alias && input.thread_lives_in_profile_mailbox) return "EXPECTED_ADDRESS_IS_SEND_AS_ALIAS";
  if (input.thread_lives_in_profile_mailbox && input.profile_hash !== input.expected_hash) return "EXPECTED_CONSTANT_STALE";
  if (!input.thread_lives_in_profile_mailbox) return "WRONG_PROVIDER_ACCOUNT";
  return "UNRESOLVED";
}

export function evaluateProductionProviderIdentityGateV5(input: {
  profile_hash: string | null;
  registered: RegisteredMailbox | null;
  credential_fingerprint: string | null;
}): NamedOutboundLoopGate {
  if (!input.profile_hash || !input.registered) {
    return named("ProductionProviderIdentityGate", "FAIL", ["REGISTERED_MAILBOX_ABSENT_OR_PROFILE_ABSENT"]);
  }
  const aliases = new Set([input.registered.primary_address_hash, ...input.registered.known_alias_hashes]);
  const consistent = aliases.has(input.profile_hash)
    && input.registered.attestation_status === "ATTESTED"
    && Boolean(input.credential_fingerprint)
    && input.registered.credential_fingerprint === input.credential_fingerprint;
  return named("ProductionProviderIdentityGate", consistent ? "PASS" : "FAIL", [
    input.registered.attestation_status,
    consistent ? "PROFILE_REGISTERED_CREDENTIAL_CONSISTENT" : "NOT_ATTESTED_OR_INCONSISTENT",
  ]);
}

export async function readGmailSendAsIdentities(input: {
  fetchImpl?: typeof fetch;
  gmailContext?: GmailInvocationContext;
} = {}): Promise<{
  ok: boolean;
  aliases: Array<{ address: string; isDefault: boolean; isPrimary: boolean; verificationStatus: string | null }>;
  reason?: string;
}> {
  const context = input.gmailContext ?? resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON" });
  const token = await exchangeGmailAccessToken(input.fetchImpl ?? fetch, context);
  if (!token.ok) return { ok: false, aliases: [], reason: token.reason };
  const res = await (input.fetchImpl ?? fetch)("https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs", {
    method: "GET",
    headers: { Authorization: `Bearer ${token.token}` },
  });
  const json = (await res.json().catch(() => ({}))) as {
    sendAs?: Array<{ sendAsEmail?: string; isDefault?: boolean; isPrimary?: boolean; verificationStatus?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) return { ok: false, aliases: [], reason: json.error?.message ?? `SEND_AS_FAILED_${res.status}` };
  return {
    ok: true,
    aliases: (json.sendAs ?? []).map((row) => ({
      address: normalizeMailboxAddress(row.sendAsEmail ?? ""),
      isDefault: Boolean(row.isDefault),
      isPrimary: Boolean(row.isPrimary),
      verificationStatus: row.verificationStatus ?? null,
    })).filter((row) => row.address),
  };
}

export function buildPendingRegisteredMailbox(input: {
  now: string;
  primary_address: string;
  alias_addresses: string[];
  default_send_as: string | null;
  credential_fingerprint: string | null;
}): RegisteredMailbox {
  return {
    id: `mbx:gmail:${hashMailboxAddress(input.primary_address)}`,
    primary_address_hash: hashMailboxAddress(input.primary_address),
    normalization_version: MAILBOX_NORMALIZATION_VERSION,
    hash_version: MAILBOX_HASH_VERSION,
    provider: "gmail",
    provider_account_id_hash: hashMailboxAddress(input.primary_address),
    known_alias_hashes: [...new Set(input.alias_addresses.map(hashMailboxAddress))],
    default_send_as_hash: input.default_send_as ? hashMailboxAddress(input.default_send_as) : null,
    credential_fingerprint: input.credential_fingerprint,
    provider_verified_at: input.now,
    attestation_status: "PENDING",
    attested_by: null,
    attested_at: null,
    created_at: input.now,
    updated_at: input.now,
  };
}

export function configuredExpectedMailbox(): string {
  return EXPECTED_COMMUNICATION_MAILBOX;
}
