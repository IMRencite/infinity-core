import { isSuppressed, recordSuppression } from "@/lib/infinity/communication-provider";
import { LOCKED_ORG } from "./constants";
import { buildId, inspectInboundRuntimeState, mutateInboundRuntimeState } from "./persist";
import type { CommunicationSuppressionRecord, SuppressionReason, SuppressionScope } from "./types";

export function persistSuppression(input: {
  identity: string;
  channel?: string;
  reason: SuppressionReason;
  scope: SuppressionScope;
  organizationId?: string;
  sourceMessageId?: string | null;
  sourceAttemptId?: string | null;
  sourceConversationId?: string | null;
  now?: Date;
}): CommunicationSuppressionRecord {
  const record: CommunicationSuppressionRecord = {
    id: buildId("sup", [input.identity, input.reason, input.scope].join("|")),
    organizationId: input.organizationId ?? LOCKED_ORG,
    identity: input.identity.trim().toLowerCase(),
    channel: input.channel ?? "bounded_professional_outreach",
    reason: input.reason,
    scope: input.scope,
    sourceMessageId: input.sourceMessageId ?? null,
    sourceAttemptId: input.sourceAttemptId ?? null,
    sourceConversationId: input.sourceConversationId ?? null,
    createdAt: (input.now ?? new Date()).toISOString(),
    status: "ACTIVE",
  };
  mutateInboundRuntimeState((state) => {
    const existing = state.suppressions.find((row) => row.id === record.id);
    if (existing) Object.assign(existing, record);
    else state.suppressions.push(record);
  });
  const mappedScope =
    record.scope === "CONTACT_GLOBAL"
      ? "global"
      : record.scope === "VENTURE"
        ? "venture"
        : record.scope === "EXPERIMENT"
          ? "experiment"
          : "prospect";
  recordSuppression({
    scope: mappedScope,
    key: record.identity,
    reason: record.reason === "OPT_OUT" ? "opt_out" : record.reason === "HARD_BOUNCE" ? "bounce" : record.reason === "COMPLAINT" ? "complaint" : "manual",
    createdAt: record.createdAt,
  });
  if (record.scope === "CONTACT_GLOBAL") {
    recordSuppression({
      scope: "global",
      key: record.identity,
      reason: record.reason === "OPT_OUT" ? "opt_out" : "manual",
      createdAt: record.createdAt,
    });
  }
  return record;
}

export function listSuppressions(): CommunicationSuppressionRecord[] {
  return inspectInboundRuntimeState().suppressions.filter((row) => row.status === "ACTIVE");
}

export function futureSendSuppressed(input: {
  email?: string | null;
  prospectId?: string | null;
  experimentId?: string | null;
  ventureId?: string | null;
}): boolean {
  if (
    isSuppressed({
      email: input.email,
      prospectId: input.prospectId,
      experimentId: input.experimentId,
      ventureId: input.ventureId,
    })
  ) {
    return true;
  }
  const identity = input.email?.trim().toLowerCase();
  if (!identity) return false;
  return listSuppressions().some((row) => row.identity === identity && row.status === "ACTIVE");
}

export function interpretDoNotEmailAgain(): SuppressionScope {
  return "CONTACT_GLOBAL";
}
