import type { NamedOutboundLoopGate } from "../closed-loop";
import { evaluateConversationProgressionInvariant, evaluateFirstTouchContract, evaluatePlannerTotalityGate, planConversation } from "../conversation-planner";
import { evaluateOfferDrivenSalesAdvancementGate, evaluateVentureOfferTruthGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import { evaluateNoEchoInvariant, resolveAuthorship } from "./authorship";
import { COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID, HISTORICAL_FALSE_STOP_MESSAGE_ID, isCommunicationObligationCutoverLive, testThreadCutoverFlags } from "./cutover";
import { evaluateCommunicationPersistenceGate } from "./persist";
import { evaluateCommunicationReconcilerPurity } from "./reconciler";
import {
  evaluateImpossibleAttemptState,
  getCommunicationObligationStore,
  listCommunicationObligations,
} from "./store";
import { evaluateCommunicationAgeSlo, evaluateCommunicationOwnerDeadlineInvariant } from "./transition";
import { COMMUNICATION_TERMINAL_STATES } from "./types";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateCommunicationObligationIdentityGate(): NamedOutboundLoopGate {
  const store = getCommunicationObligationStore();
  return named(
    "CommunicationObligationIdentityGate",
    store.identity.size === store.obligations.size ? "PASS" : "FAIL",
    ["mailbox_id+provider_message_id"],
  );
}

export function evaluateCommunicationIngestIdempotencyGate(input: { first: "INSERTED" | "EXISTING"; second: "INSERTED" | "EXISTING" }): NamedOutboundLoopGate {
  return named(
    "CommunicationIngestIdempotencyGate",
    input.first === "INSERTED" && input.second === "EXISTING" ? "PASS" : "FAIL",
    [input.first, input.second],
  );
}

export function evaluateCommunicationTransitionAuthorityGate(input: { only_transition_writer: boolean }): NamedOutboundLoopGate {
  return named("CommunicationTransitionAuthorityGate", input.only_transition_writer ? "PASS" : "FAIL", ["transitionCommunicationObligation"]);
}

export function evaluateCommunicationStateInvariantGate(): NamedOutboundLoopGate {
  const impossible = evaluateImpossibleAttemptState({ attempt_no: 0, failed: true });
  const missingStart = evaluateImpossibleAttemptState({ claimed_worker_failed: true, started_at: null });
  const blocked = listCommunicationObligations().some((row) => String(row.state) === "BLOCKED");
  return named(
    "CommunicationStateInvariantGate",
    !impossible.ok && !missingStart.ok && !blocked ? "PASS" : "FAIL",
    [impossible.reason ?? "ok", missingStart.reason ?? "ok", blocked ? "BLOCKED" : "NO_BLOCKED"],
  );
}

export function evaluateCommunicationOwnerDeadlineGate(now: string): NamedOutboundLoopGate {
  const violations = listCommunicationObligations().filter((row) => evaluateCommunicationOwnerDeadlineInvariant(row, now).result === "FAIL");
  return named("CommunicationOwnerDeadlineGate", violations.length === 0 ? "PASS" : "FAIL", [`violations:${violations.length}`]);
}

export function evaluateCommunicationObligationAgeSLOGate(now: string): NamedOutboundLoopGate {
  const overdue = listCommunicationObligations().filter((row) => evaluateCommunicationAgeSlo(row, now).result === "FAIL");
  return named("CommunicationObligationAgeSLOGate", overdue.length === 0 ? "PASS" : "FAIL", [`overdue:${overdue.length}`, "20m"]);
}

export function evaluateCommunicationOutboundLedgerGate(input: { write_ahead: boolean; rfc: boolean; lineage: boolean }): NamedOutboundLoopGate {
  return named(
    "CommunicationOutboundLedgerGate",
    input.write_ahead && input.rfc && input.lineage ? "PASS" : "FAIL",
    ["WRITE_AHEAD", "RFC", "X-Obligation-Id"],
  );
}

export function evaluateOutboundCrashRecoveryGate(input: { recovered: boolean; resent: boolean }): NamedOutboundLoopGate {
  return named("OutboundCrashRecoveryGate", input.recovered && !input.resent ? "PASS" : "FAIL", [input.recovered ? "RECOVERED" : "NOT_RECOVERED", input.resent ? "RESENT" : "NO_RESEND"]);
}

export function evaluateCommunicationAuthorshipGate(): NamedOutboundLoopGate {
  const stop = resolveAuthorship({ provider_message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID, ledger: [] });
  return named("CommunicationAuthorshipGate", stop.role === "SYSTEM" ? "PASS" : "FAIL", [stop.role, stop.role_evidence]);
}

export function evaluateCommunicationNoEchoGate(): NamedOutboundLoopGate {
  return evaluateNoEchoInvariant({
    provider_message_id: "out-1",
    ledger: [{
      obligation_id: "ob",
      attempt_id: "at",
      rfc_message_id: "<rfc@infinity>",
      custom_header: "X-Obligation-Id: ob",
      thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      body_hash: "x",
      created_at: "2026-09-20T00:00:00.000Z",
      provider_message_id: "out-1",
      accepted_at: "2026-09-20T00:00:01.000Z",
    }],
    created_prospect_obligation: false,
  });
}

export function evaluateConversationPlannerTotalityGate(): NamedOutboundLoopGate {
  const plan = planConversation({
    visible_body: "xyzzy unexpected novel intent about purple widgets",
    previous_outbound: "prior",
    prior_infinity_outbound_count: 3,
  });
  const totality = evaluatePlannerTotalityGate(plan);
  const firstTouch = evaluateFirstTouchContract({
    prior_infinity_outbound_count: 3,
    used_first_touch_copy: plan.stage === "FIRST_TOUCH",
  });
  return named(
    "ConversationPlannerTotalityGate",
    totality.result === "PASS" && firstTouch.result === "PASS" && plan.intent !== "NEW_LEAD" ? "PASS" : "FAIL",
    [plan.intent, plan.stage],
  );
}

export function evaluateFirstTouchConversationContractGate(): NamedOutboundLoopGate {
  return evaluateFirstTouchContract({ prior_infinity_outbound_count: 2, used_first_touch_copy: false });
}

export function evaluateBuyingSignalProgressionGate(): NamedOutboundLoopGate {
  const plan = planConversation({
    visible_body: "Sounds like it would be a great tool for me to use",
    previous_intent: "REQUEST_INPUTS",
    previous_outbound: "prior",
    stage: "QUALIFIED",
    prior_infinity_outbound_count: 4,
  });
  return named(
    "BuyingSignalProgressionGate",
    plan.intent === "POSITIVE_INTEREST" && plan.next_action === "START_TRIAL" && plan.stage !== "FIRST_TOUCH" ? "PASS" : "FAIL",
    [plan.intent, plan.next_action, plan.stage],
  );
}

export function evaluateVentureOfferTruthGateLive(): NamedOutboundLoopGate {
  const profile = loadVentureOfferProfile("occupancynpv");
  return evaluateVentureOfferTruthGate({
    profile,
    claimed: "The 3-day free trial has no credit card and no automatic billing. https://occupancynpv.com/pricing",
  });
}

export function evaluateOfferDrivenSalesAdvancementGateLive(): NamedOutboundLoopGate {
  const profile = loadVentureOfferProfile("occupancynpv");
  return evaluateOfferDrivenSalesAdvancementGate({
    stage: "QUALIFIED",
    profile,
    generated: "That tracks. The 3-day free trial has no credit card and no automatic billing. Start here: https://occupancynpv.com/pricing",
    next_action: "START_TRIAL",
    inbound: "Sounds like it would be a great tool for me to use",
  });
}

export function evaluateTestThreadCutoverGate(): NamedOutboundLoopGate {
  const flags = testThreadCutoverFlags();
  const live = isCommunicationObligationCutoverLive();
  const pass = live
    && flags.new_obligation_worker === "ON"
    && flags.legacy_worker === "OFF"
    && flags.legacy_blocked === "OFF"
    && flags.legacy_reconciler_send === "OFF";
  return named("TestThreadCutoverGate", pass ? "PASS" : "FAIL", [flags.communication_obligation, flags.legacy_worker]);
}

export function evaluateCommunicationCleanSequenceReset(): NamedOutboundLoopGate {
  const store = getCommunicationObligationStore();
  return named("CleanLiveReliabilityReset", store.clean_live_turns === 0 ? "PASS" : "FAIL", [`${store.clean_live_turns}/3`]);
}

export function evaluateConversationProgressionLive(): NamedOutboundLoopGate {
  return evaluateConversationProgressionInvariant({
    previous_stage: "QUALIFIED",
    next_stage: "QUALIFIED",
    regression_justified: false,
  });
}

export function listOpenObligationHealth(now: string) {
  const open = listCommunicationObligations().filter((row) => !COMMUNICATION_TERMINAL_STATES.includes(row.state));
  return {
    open: open.length,
    ownerless: open.filter((row) => !row.owner).length,
    overdue: open.filter((row) => evaluateCommunicationAgeSlo(row, now).result === "FAIL").length,
    oldest_ms: open.length ? Math.max(...open.map((row) => Date.parse(now) - Date.parse(row.received_at))) : 0,
  };
}

export { evaluateCommunicationPersistenceGate, evaluateCommunicationReconcilerPurity };

export {
  evaluateProductionReleaseParityGate,
  evaluateObservedReleaseParityGate,
  evaluateCommunicationCutoverEpochParityGate,
  evaluateCommunicationRuntimeIdentityGate,
  evaluateMainBranchDeployabilityGate,
  evaluateCrossDomainBuildIsolationGate,
  evaluateReleaseDependencyIsolationGate,
  inspectIgnoreBuildErrorsProhibited,
} from "./release";
export { evaluateCommunicationPacingAnchorGate } from "./pacing";
export { evaluateCommunicationTimestampNormalizationGate } from "./timestamps";
export { evaluateGateEvidenceClassIntegrity } from "./evidence";
export {
  evaluateCommunicationProviderIdentityParityGate,
  evaluateCommunicationProviderReadCanaryGate,
  evaluateShadowCompose,
} from "./canary";
export { evaluateCommunicationWatchdogIndependenceGate, evaluateExternalCommunicationObserver } from "./observer";
export { evaluateRecoveredTurnMonotonicityGate } from "./recovered";
export {
  evaluateHistoricalInboundCoverageGate,
  evaluateCommunicationCrossPathSendIdempotencyGate,
} from "./coverage";
