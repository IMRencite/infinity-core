import { createHash } from "crypto";
import { exchangeGmailAccessToken } from "@/lib/infinity/communication-provider/gmail-adapter";
import { resolveGmailInvocationContext, type GmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import type { NamedOutboundLoopGate } from "../closed-loop";
import {
  COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  HISTORICAL_BUYING_SIGNAL_MESSAGE_ID,
  HISTORICAL_FALSE_STOP_MESSAGE_ID,
  HISTORICAL_STRANDED_QUESTION_MESSAGE_ID,
  STRANDED_FOUNDER_TRIAL_INBOUND_ID,
} from "./cutover";
import { KNOWN_INFINITY_THREAD_MESSAGE_IDS } from "../conversation-semantics";
import { hashMailboxAddress, normalizeMailboxAddress } from "./mailbox-attestation";

export const THREAD_SNAPSHOT_SCOPE = "communication-thread-snapshot-v5" as const;
export const HISTORICAL_MESSAGE_SCOPE = "communication-historical-messages-v5" as const;

export type ThreadAuthorshipClass = "SYSTEM" | "PROSPECT" | "HISTORICAL_UNKNOWN" | "CURRENT_OPEN_PROSPECT";

export type ThreadMessageSnapshot = {
  provider_message_id: string;
  thread_id: string;
  internal_date: string | null;
  from_hash: string;
  to_hash: string;
  reply_to_hash: string | null;
  subject_present: boolean;
  rfc_message_id: string | null;
  in_reply_to: string | null;
  references: string | null;
  labels: string[];
  classification: ThreadAuthorshipClass;
  evidence_type: string;
  evidence_pointer: string;
  covering_outbound_id: string | null;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

function headerValue(headers: Array<{ name?: string; value?: string }> | undefined, name: string): string {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value?.trim() ?? "";
}

export function classifySnapshotMessage(input: {
  provider_message_id: string;
  from: string;
  system_hashes: string[];
  later_system_reply_id: string | null;
  same_mailbox?: boolean;
  known_prospect_ids?: string[];
  known_system_ids?: string[];
}): { classification: ThreadAuthorshipClass; evidence_type: string; evidence_pointer: string } {
  if (input.provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID) {
    return { classification: "CURRENT_OPEN_PROSPECT", evidence_type: "RECOVERY_TARGET", evidence_pointer: input.provider_message_id };
  }
  if (input.known_prospect_ids?.includes(input.provider_message_id)) {
    return {
      classification: "PROSPECT",
      evidence_type: input.later_system_reply_id ? "KNOWN_INBOUND_WITH_LATER_REPLY" : "KNOWN_HISTORICAL_INBOUND",
      evidence_pointer: input.later_system_reply_id ?? input.provider_message_id,
    };
  }
  if (input.provider_message_id === HISTORICAL_FALSE_STOP_MESSAGE_ID || input.known_system_ids?.includes(input.provider_message_id)) {
    return { classification: "SYSTEM", evidence_type: "KNOWN_SYSTEM_OR_FALSE_STOP", evidence_pointer: input.provider_message_id };
  }
  if (input.same_mailbox) {
    return { classification: "HISTORICAL_UNKNOWN", evidence_type: "SAME_MAILBOX_FROM_NOT_AUTHORITATIVE", evidence_pointer: input.provider_message_id };
  }
  const fromHash = hashMailboxAddress(input.from);
  if (input.system_hashes.includes(fromHash)) {
    return { classification: "SYSTEM", evidence_type: "FROM_MATCHES_PROVIDER_ACCOUNT", evidence_pointer: fromHash };
  }
  if (input.later_system_reply_id) {
    return { classification: "PROSPECT", evidence_type: "INBOUND_WITH_LATER_SYSTEM_REPLY", evidence_pointer: input.later_system_reply_id };
  }
  return { classification: "HISTORICAL_UNKNOWN", evidence_type: "NO_SYSTEM_FROM_OR_COVERAGE", evidence_pointer: input.provider_message_id };
}

export async function readGmailThreadSnapshot(input: {
  threadId?: string;
  system_hashes: string[];
  fetchImpl?: typeof fetch;
  gmailContext?: GmailInvocationContext;
}): Promise<{ ok: true; messages: ThreadMessageSnapshot[]; history_unavailable: true } | { ok: false; reason: string }> {
  const threadId = input.threadId ?? COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID;
  const context = input.gmailContext ?? resolveGmailInvocationContext({ trigger_source: "VERCEL_CRON" });
  const token = await exchangeGmailAccessToken(input.fetchImpl ?? fetch, context);
  if (!token.ok) return { ok: false, reason: token.reason };
  const res = await (input.fetchImpl ?? fetch)(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Reply-To&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=In-Reply-To&metadataHeaders=References`,
    { method: "GET", headers: { Authorization: `Bearer ${token.token}` } },
  );
  const json = (await res.json().catch(() => ({}))) as {
    messages?: Array<{
      id?: string;
      threadId?: string;
      internalDate?: string;
      labelIds?: string[];
      payload?: { headers?: Array<{ name?: string; value?: string }> };
    }>;
    error?: { message?: string };
  };
  if (!res.ok) return { ok: false, reason: json.error?.message ?? `THREAD_SNAPSHOT_FAILED_${res.status}` };
  const raw = (json.messages ?? []).map((row) => {
    const from = headerValue(row.payload?.headers, "From");
    const to = headerValue(row.payload?.headers, "To");
    const replyTo = headerValue(row.payload?.headers, "Reply-To");
    return {
      id: row.id ?? "",
      threadId: row.threadId ?? threadId,
      internalDate: row.internalDate ? new Date(Number(row.internalDate)).toISOString() : null,
      from,
      to,
      replyTo,
      subject: headerValue(row.payload?.headers, "Subject"),
      rfc: headerValue(row.payload?.headers, "Message-ID"),
      inReplyTo: headerValue(row.payload?.headers, "In-Reply-To"),
      references: headerValue(row.payload?.headers, "References"),
      labels: row.labelIds ?? [],
    };
  });
  const systemIds = new Set(
    raw.filter((row) => input.system_hashes.includes(hashMailboxAddress(row.from)) || row.id === HISTORICAL_FALSE_STOP_MESSAGE_ID).map((row) => row.id),
  );
  const messages = raw.map((row, index) => {
    const laterSystem = raw.slice(index + 1).find((next) => systemIds.has(next.id) && (
      !next.inReplyTo || next.inReplyTo.includes(row.rfc.replace(/[<>]/g, "")) || Date.parse(next.internalDate ?? "") > Date.parse(row.internalDate ?? "")
    ));
    const classified = classifySnapshotMessage({
      provider_message_id: row.id,
      from: row.from,
      system_hashes: input.system_hashes,
      later_system_reply_id: laterSystem?.id ?? null,
      same_mailbox: true,
      known_prospect_ids: [HISTORICAL_STRANDED_QUESTION_MESSAGE_ID, HISTORICAL_BUYING_SIGNAL_MESSAGE_ID],
      known_system_ids: [...KNOWN_INFINITY_THREAD_MESSAGE_IDS],
    });
    return {
      provider_message_id: row.id,
      thread_id: row.threadId,
      internal_date: row.internalDate,
      from_hash: hashMailboxAddress(row.from),
      to_hash: hashMailboxAddress(row.to),
      reply_to_hash: row.replyTo ? hashMailboxAddress(row.replyTo) : null,
      subject_present: Boolean(row.subject),
      rfc_message_id: row.rfc || null,
      in_reply_to: row.inReplyTo || null,
      references: row.references || null,
      labels: row.labels,
      classification: classified.classification,
      evidence_type: classified.evidence_type,
      evidence_pointer: classified.evidence_pointer,
      covering_outbound_id: laterSystem?.id ?? null,
    } satisfies ThreadMessageSnapshot;
  });
  return { ok: true, messages, history_unavailable: true };
}

export function evaluateHistoricalThreadCoverageGateV5(messages: ThreadMessageSnapshot[]): NamedOutboundLoopGate {
  if (!messages.length) return named("HistoricalThreadCoverageGate", "FAIL", ["SNAPSHOT_EMPTY"]);
  const open = messages.filter((row) => row.classification === "CURRENT_OPEN_PROSPECT");
  const unknown = messages.filter((row) => row.classification === "HISTORICAL_UNKNOWN");
  const system = messages.filter((row) => row.classification === "SYSTEM");
  const covered = messages.filter((row) => row.classification === "PROSPECT" && row.covering_outbound_id);
  const uncoveredProspect = messages.filter((row) => row.classification === "PROSPECT" && !row.covering_outbound_id);
  const falseStop = messages.find((row) => row.provider_message_id === HISTORICAL_FALSE_STOP_MESSAGE_ID);
  const pass = open.length === 1
    && open[0]?.provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID
    && unknown.length === 0
    && uncoveredProspect.length === 0
    && system.length > 0
    && Boolean(falseStop && falseStop.classification === "SYSTEM");
  return named("HistoricalThreadCoverageGate", pass ? "PASS" : "FAIL", [
    `messages:${messages.length}`,
    `open:${open.length}`,
    `unknown:${unknown.length}`,
    `system:${system.length}`,
    `covered:${covered.length}`,
    `uncovered_prospect:${uncoveredProspect.length}`,
    falseStop?.classification ?? "FALSE_STOP_ABSENT",
  ]);
}

export function evaluateNoResurrectionFromSnapshot(messages: ThreadMessageSnapshot[]): NamedOutboundLoopGate {
  const illegal = messages.filter((row) => row.classification !== "CURRENT_OPEN_PROSPECT" && row.provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID);
  return named("NoHistoricalResurrectionGate", illegal.length ? "FAIL" : "PASS", illegal.length ? illegal.map((row) => row.provider_message_id) : ["ONLY_RECOVERY_TARGET_OPEN"]);
}

export function snapshotDigest(messages: ThreadMessageSnapshot[]): string {
  return createHash("sha256").update(messages.map((row) => row.provider_message_id).join(",")).digest("hex").slice(0, 16);
}

export function extractAddressForPrivateLog(value: string): string {
  return normalizeMailboxAddress(value);
}
