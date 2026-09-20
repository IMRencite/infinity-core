import { applyCommunicationObligationTransition, findCommunicationObligationByIdentity, incrementReconcilerRearm } from "./store";
import { ingestProviderMessage } from "./worker";
import type { CommunicationObligation } from "./types";
import type { NamedOutboundLoopGate } from "../closed-loop";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export type CommunicationReconcilerAction =
  | "INSERT_MISSING_OBLIGATION"
  | "REARM_OVERDUE"
  | "CONFIRM_SENT"
  | "DETECT_ORPHAN"
  | "RESOLVE_SENDING";

const FORBIDDEN = new Set(["CLASSIFY", "COMPOSE", "SEND", "CHOOSE_OFFER", "SUPPRESS", "BUSINESS_ESCALATE", "MARK_NEVER_ATTEMPTED_FAILED"]);

export function evaluateCommunicationReconcilerPurity(actions: string[]): NamedOutboundLoopGate {
  const forbidden = actions.filter((action) => FORBIDDEN.has(action) || /^(CLASSIFY|COMPOSE|SEND|CHOOSE_OFFER|SUPPRESS|BUSINESS_ESCALATE)$/i.test(action));
  if (forbidden.length) {
    return named("CommunicationReconcilerPurityGate", "FAIL", forbidden);
  }
  return named("CommunicationReconcilerPurityGate", "PASS", ["ANTI_ENTROPY_ONLY"]);
}

export function reconcileCutoverThreadAntiEntropy(input: {
  messages: Array<{
    id: string;
    visible: string;
    received_at: string;
    rfc_message_id?: string | null;
    custom_header?: string | null;
    from_self?: boolean;
  }>;
  mailbox_id: string;
  thread_id: string;
  now: string;
  overdue?: CommunicationObligation[];
  sent?: CommunicationObligation[];
}): {
  actions: CommunicationReconcilerAction[];
  purity: NamedOutboundLoopGate;
  rearm_count: number;
  inserted: number;
} {
  const actions: CommunicationReconcilerAction[] = [];
  let inserted = 0;
  let rearms = 0;
  for (const message of input.messages) {
    const existing = findCommunicationObligationByIdentity(input.mailbox_id, message.id);
    if (!existing) {
      const result = ingestProviderMessage({
        mailbox_id: input.mailbox_id,
        thread_id: input.thread_id,
        provider_message_id: message.id,
        visible_body: message.visible,
        received_at: message.received_at,
        now: input.now,
        rfc_message_id: message.rfc_message_id,
        custom_header: message.custom_header,
        from_self: message.from_self,
        same_mailbox_test_mode: true,
      });
      if (result.inserted) {
        actions.push("INSERT_MISSING_OBLIGATION");
        inserted += 1;
      }
    }
  }
  for (const obligation of input.overdue ?? []) {
    if (obligation.state === "SCHEDULED" || obligation.state === "CLAIMED") {
      const rearmed = applyCommunicationObligationTransition({
        current: obligation,
        to_state: "SCHEDULED",
        expected_version: obligation.version,
        actor: "CommunicationReconciler",
        reason: "REARM_OVERDUE",
        now: input.now,
        next_action_at: input.now,
        next_action: obligation.next_action ?? "RETRY_SEND",
        owner: obligation.owner ?? "CommunicationWorker",
        due_at: obligation.due_at,
      });
      if (rearmed.ok) {
        actions.push("REARM_OVERDUE");
        rearms += 1;
        incrementReconcilerRearm();
      }
    }
  }
  for (const obligation of input.sent ?? []) {
    if (obligation.state === "SENT") {
      applyCommunicationObligationTransition({
        current: obligation,
        to_state: "CONFIRMED",
        expected_version: obligation.version,
        actor: "CommunicationReconciler",
        reason: "PROVIDER_TRUTH_CONFIRMED",
        now: input.now,
        terminal_reason: "PROVIDER_CONFIRMED",
        next_action: "DONE",
      });
      actions.push("CONFIRM_SENT");
    }
  }
  return {
    actions,
    purity: evaluateCommunicationReconcilerPurity(actions),
    rearm_count: rearms,
    inserted,
  };
}
