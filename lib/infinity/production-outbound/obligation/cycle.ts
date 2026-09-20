import { hydrateCommunicationObligationStore, persistCommunicationObligationStore } from "./persist";
import {
  COMMUNICATION_OBLIGATION_AGE_SLO_MS,
  COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  STRANDED_FOUNDER_TRIAL_INBOUND_ID,
  isCommunicationObligationCutoverThread,
} from "./cutover";
import { evaluateCommunicationWatchdog } from "./watchdog";
import { findCommunicationObligationByIdentity, listCommunicationObligations } from "./store";
import { ingestProviderMessage, executeCommunicationObligationWorker, type ObligationProvider } from "./worker";
import { reconcileCutoverThreadAntiEntropy } from "./reconciler";
import { projectCommunicationObligationHq } from "./hq";
import { coverMissingProspectObligations, evaluateProviderInboundCoverage } from "./coverage";
import { recordCommunicationHeartbeat } from "./heartbeat";
import { hydrateCommunicationReleaseState, persistCommunicationReleaseState } from "./release";
import { markRecoveredTurn, shouldMarkRecovered } from "./recovered";
import { remainingPacingFromProvider } from "./pacing";
import { executeNoSendCanary, evaluateShadowCompose } from "./canary";

export type CutoverThreadMessage = {
  provider_message_id: string;
  visible_body: string;
  received_at: string;
  role: "PROSPECT" | "SYSTEM" | "INFINITY" | "UNKNOWN";
  later_reply: boolean;
  rfc_message_id?: string | null;
  from_self?: boolean;
};

export async function executeTestThreadCutoverTick(input: {
  now?: string;
  execute_jobs?: boolean;
  thread_id: string;
  inbound?: {
    provider_message_id: string;
    visible_body: string;
    received_at: string;
    rfc_message_id?: string | null;
    from_self?: boolean;
  } | null;
  messages?: CutoverThreadMessage[];
  provider?: ObligationProvider;
  mailbox_id?: string;
  prior_infinity_outbound_count?: number;
  previous_intent?: string | null;
  previous_outbound?: string | null;
  stage?: string | null;
  deployment?: string | null;
  recovered_ids?: string[];
  invoked_by?: "cron" | "manual" | "recovery" | "synthetic_canary";
  run_no_send_canary?: boolean;
}) {
  const now = input.now ?? new Date().toISOString();
  const mailbox = input.mailbox_id ?? "occupancynpv-canary";
  const invoked = input.invoked_by ?? "cron";
  await hydrateCommunicationObligationStore().catch(() => undefined);
  await hydrateCommunicationReleaseState().catch(() => undefined);
  recordCommunicationHeartbeat({
    runtime: "scheduler",
    now,
    deployment: input.deployment,
    instance: "executeTestThreadCutoverTick",
    success: true,
    invoked_by: invoked,
  });
  if (!isCommunicationObligationCutoverThread(input.thread_id)) {
    let noSend = null as Awaited<ReturnType<typeof executeNoSendCanary>> | null;
    if (input.run_no_send_canary || invoked === "cron") {
      noSend = await executeNoSendCanary({
        now,
        mailbox_id: mailbox,
        invoked_by: invoked === "cron" ? "cron" : "synthetic_canary",
      });
    }
    return { skipped: true as const, hq: projectCommunicationObligationHq({ now }), recovered: false, coverage: null, no_send_canary: noSend };
  }
  const messages: CutoverThreadMessage[] = input.messages?.length
    ? input.messages
    : input.inbound
      ? [{
        provider_message_id: input.inbound.provider_message_id,
        visible_body: input.inbound.visible_body,
        received_at: input.inbound.received_at,
        role: "PROSPECT",
        later_reply: false,
        rfc_message_id: input.inbound.rfc_message_id,
        from_self: input.inbound.from_self,
      }]
      : [];
  recordCommunicationHeartbeat({
    runtime: "discovery",
    now,
    deployment: input.deployment,
    success: true,
    work_seen: messages.filter((row) => row.role === "PROSPECT").length,
  });
  coverMissingProspectObligations({
    mailbox_id: mailbox,
    thread_id: input.thread_id,
    now,
    messages: messages.map((row) => ({
      id: row.provider_message_id,
      visible: row.visible_body,
      received_at: row.received_at,
      role: row.role,
    })),
  });
  const coverage = evaluateProviderInboundCoverage({
    mailbox_id: mailbox,
    messages: messages.map((row) => ({
      id: row.provider_message_id,
      role: row.role,
      later_reply: row.later_reply,
    })),
  });
  const actionable = messages.filter((row) => row.role === "PROSPECT" && !row.later_reply);
  let obligation = input.inbound
    ? findCommunicationObligationByIdentity(mailbox, input.inbound.provider_message_id)
    : null;
  let recovered = false;
  let sent = false;
  let body: string | null = null;
  if (input.execute_jobs && input.provider) {
    recordCommunicationHeartbeat({ runtime: "worker", now, deployment: input.deployment, instance: "CommunicationObligationWorker", success: true, work_seen: actionable.length });
    for (const message of actionable) {
      const current = findCommunicationObligationByIdentity(mailbox, message.provider_message_id);
      if (!current || current.state === "CONFIRMED" || current.state === "COVERED" || current.state === "SUPPRESSED" || current.state === "NO_REPLY_POLICY") continue;
      const age = Date.parse(now) - Date.parse(message.received_at);
      const mustRecover = shouldMarkRecovered({
        provider_message_id: message.provider_message_id,
        provider_received_at: message.received_at,
        now,
        missing_obligation: !current,
        release_parity_fail: true,
        repair_required: message.provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID
          || (input.recovered_ids ?? []).includes(message.provider_message_id)
          || age > COMMUNICATION_OBLIGATION_AGE_SLO_MS,
      });
      if (mustRecover) {
        markRecoveredTurn({
          provider_message_id: message.provider_message_id,
          now,
          reason: "SLO_BREACHED_OR_RELEASE_PARITY",
          marked_before_send: true,
        });
      }
      void remainingPacingFromProvider({
        provider_received_at: message.received_at,
        now,
        slo_breached: mustRecover,
      });
      const executed = await executeCommunicationObligationWorker({
        obligation: current,
        visible_body: message.visible_body,
        now,
        provider: input.provider,
        prior_infinity_outbound_count: input.prior_infinity_outbound_count ?? 4,
        previous_intent: input.previous_intent ?? "REQUEST_INPUTS",
        previous_outbound: input.previous_outbound ?? "prior-infinity-outbound",
        stage: input.stage ?? "QUALIFIED",
        recovered: mustRecover,
      });
      if (executed.obligation.provider_message_id === (input.inbound?.provider_message_id ?? message.provider_message_id)) {
        obligation = executed.obligation;
        body = executed.body;
      }
      sent = sent || executed.sent;
      recovered = recovered || executed.recovered || mustRecover;
      recordCommunicationHeartbeat({ runtime: "worker", now, deployment: input.deployment, success: executed.sent || executed.obligation.state !== "CLAIMED", work_claimed: executed.sent ? 1 : 0 });
    }
  }
  const overdue = listCommunicationObligations().filter((row) => row.state === "CLAIMED" || row.state === "SCHEDULED");
  const sentRows = listCommunicationObligations().filter((row) => row.state === "SENT");
  const antiEntropy = reconcileCutoverThreadAntiEntropy({
    messages: messages.map((row) => ({ id: row.provider_message_id, visible: row.visible_body, received_at: row.received_at })),
    mailbox_id: mailbox,
    thread_id: input.thread_id,
    now,
    overdue: overdue.filter((row) => Date.parse(now) - Date.parse(row.received_at) > COMMUNICATION_OBLIGATION_AGE_SLO_MS),
    sent: sentRows,
  });
  const watch = evaluateCommunicationWatchdog({
    obligations: listCommunicationObligations(),
    now,
    rearm_count: antiEntropy.rearm_count,
  });
  recordCommunicationHeartbeat({
    runtime: "watchdog",
    now,
    deployment: input.deployment,
    success: true,
    work_seen: listCommunicationObligations().length,
    invoked_by: invoked,
  });
  recordCommunicationHeartbeat({ runtime: "provider", now, deployment: input.deployment, success: true, work_seen: messages.length, invoked_by: invoked });
  let noSend = null as Awaited<ReturnType<typeof executeNoSendCanary>> | null;
  if (input.run_no_send_canary) {
    noSend = await executeNoSendCanary({ now, mailbox_id: mailbox, invoked_by: invoked === "cron" ? "cron" : "synthetic_canary" });
  }
  const shadow = evaluateShadowCompose({});
  await persistCommunicationObligationStore().catch(() => undefined);
  await persistCommunicationReleaseState().catch(() => undefined);  return {
    skipped: false as const,
    obligation,
    watchdog: watch,
    reconciler: antiEntropy,
    coverage,
    recovered,
    sent,
    body,
    hq: projectCommunicationObligationHq({ now }),
    thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
    no_send_canary: noSend,
    shadow,
  };
}
