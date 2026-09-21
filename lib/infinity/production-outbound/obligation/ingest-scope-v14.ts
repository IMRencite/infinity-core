export const INGEST_SCOPE_VERSION = "communication-ingest-scope-v14" as const;

export const TEMPORARY_ELIGIBLE_THREAD_IDS = [
  "1a0af74557b0eb36",
] as const;

export type IngestClass =
  | "ELIGIBLE_THREAD"
  | "APPROVED_LABEL"
  | "KNOWN_PROBE"
  | "AUTOMATED_NOTIFICATION"
  | "OUT_OF_SCOPE";

export type IngestDecision = {
  class: IngestClass;
  autonomously_reply: boolean;
  record: "PROCESS" | "OUT_OF_SCOPE" | "NO_REPLY_POLICY";
  scope_rule: string;
};

export function decideIngestScope(input: {
  thread_id?: string | null;
  label_ids?: string[];
  approved_labels?: string[];
  is_known_probe?: boolean;
  auto_submitted?: string | null;
  precedence?: string | null;
  list_unsubscribe?: string | null;
}): IngestDecision {
  if (input.is_known_probe) {
    return { class: "KNOWN_PROBE", autonomously_reply: true, record: "PROCESS", scope_rule: "KNOWN_PROBE_REGISTRY" };
  }
  if (input.thread_id && TEMPORARY_ELIGIBLE_THREAD_IDS.includes(input.thread_id as (typeof TEMPORARY_ELIGIBLE_THREAD_IDS)[number])) {
    return { class: "ELIGIBLE_THREAD", autonomously_reply: true, record: "PROCESS", scope_rule: "REGISTERED_THREAD_ALLOWLIST" };
  }
  const labels = input.label_ids ?? [];
  const approved = input.approved_labels ?? [];
  if (approved.length && labels.some((label) => approved.includes(label))) {
    return { class: "APPROVED_LABEL", autonomously_reply: true, record: "PROCESS", scope_rule: "APPROVED_DEDICATED_LABEL" };
  }
  const auto = (input.auto_submitted || "").toLowerCase();
  const precedence = (input.precedence || "").toLowerCase();
  if ((auto && auto !== "no") || precedence === "bulk" || precedence === "list" || input.list_unsubscribe) {
    return { class: "AUTOMATED_NOTIFICATION", autonomously_reply: false, record: "NO_REPLY_POLICY", scope_rule: "AUTOMATED_MAIL_METADATA" };
  }
  return { class: "OUT_OF_SCOPE", autonomously_reply: false, record: "OUT_OF_SCOPE", scope_rule: "DEFAULT_DENY_UNTIL_MAILBOX_ATTESTATION" };
}
