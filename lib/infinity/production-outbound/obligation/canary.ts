import type { NamedOutboundLoopGate } from "../closed-loop";
import { planConversation } from "../conversation-planner";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import { evaluateOfferDrivenSalesAdvancementGate, evaluateVentureOfferTruthGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import type { CommercialAction, SalesStagePolicy } from "@/lib/infinity/always-closing-sales/doctrine";
import { STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "./cutover";
import {
  allocateCommunicationAttempt,
  claimCommunicationObligation,
  ingestProviderMessage,
  scheduleCommunicationObligation,
  writeAheadOutboundLedger,
  type ObligationProvider,
} from "./worker";
import { applyCommunicationObligationTransition, findCommunicationObligationByIdentity, getCommunicationObligation, updateCommunicationAttempt } from "./store";
import type { CommunicationAttempt, CommunicationObligation } from "./types";
import { attachEvidenceClass } from "./evidence";
import { vercelRuntimeIdentity } from "./release";
import { createClient } from "@supabase/supabase-js";

export const COMMUNICATION_CANARY_SCOPE = "communication-no-send-canary-v4" as const;

export const FOUNDER_TRIAL_INBOUND_TEXT = "Yeah, I think I’d rather just try it. How do I start the free trial?";
export const NO_SEND_CANARY_MESSAGE_ID = "canary:no-send:communication-release-parity-v2";
export const INTERNAL_LANGUAGE = /canonical|runtime|planner|composer|semantic|obligation|eligible_at|next-best commercial action|venture offer|DealWorkspace|gate|verified path/i;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function noopProvider(): ObligationProvider {
  return {
    send: async () => ({ accepted: false, provider_message_id: null, error: "NO_OP_PROVIDER_SEND", status: 0 }),
    findByRfc: async () => ({ present: false, provider_message_id: null }),
  };
}

export function evaluateShadowCompose(input: {
  visible_body?: string;
  prior_infinity_outbound_count?: number;
  previous_intent?: string | null;
  previous_outbound?: string | null;
  stage?: string | null;
}): {
  plan: ReturnType<typeof planConversation>;
  body: string;
  gates: Record<string, NamedOutboundLoopGate>;
  LiveInboundShadowComposeGate: NamedOutboundLoopGate;
} {
  const visible = input.visible_body ?? FOUNDER_TRIAL_INBOUND_TEXT;
  const plan = planConversation({
    visible_body: visible,
    previous_intent: input.previous_intent ?? "REQUEST_INPUTS",
    previous_outbound: input.previous_outbound ?? "prior-infinity-outbound",
    stage: input.stage ?? "QUALIFIED",
    prior_infinity_outbound_count: input.prior_infinity_outbound_count ?? 4,
  });
  const composed = composeOccupancyNpvAlwaysClosingReply({
    inbound: visible,
    intent: plan.intent,
    turn: 4,
  });
  const profile = loadVentureOfferProfile("occupancynpv");
  const offer = evaluateVentureOfferTruthGate({ profile, claimed: composed.body });
  const advancement = evaluateOfferDrivenSalesAdvancementGate({
    stage: plan.stage as SalesStagePolicy,
    profile,
    generated: composed.body,
    next_action: plan.next_action as CommercialAction,
    inbound: visible,
  });
  const firstTouch = plan.stage === "FIRST_TOUCH" || plan.first_touch_legal === true && plan.prior_infinity_outbound_count === 0;
  const trial = /3-day/i.test(composed.body);
  const noCard = /no credit card/i.test(composed.body);
  const noBill = /no automatic billing/i.test(composed.body);
  const pricing = /https:\/\/occupancynpv.com\/pricing/i.test(composed.body);
  const leak = INTERNAL_LANGUAGE.test(composed.body);
  const highIntent = plan.intent === "POSITIVE_INTEREST" && plan.next_action === "START_TRIAL" && plan.stage !== "FIRST_TOUCH";
  const gates = {
    planner: named("ShadowPlanner", highIntent ? "PASS" : "FAIL", [plan.intent, plan.next_action, plan.stage]),
    first_touch: named("ShadowFirstTouch", !firstTouch && plan.stage !== "FIRST_TOUCH" ? "PASS" : "FAIL", [plan.stage]),
    trial: named("ShadowTrial", trial ? "PASS" : "FAIL", [trial ? "3-DAY" : "MISSING_3_DAY"]),
    no_card: named("ShadowNoCard", noCard ? "PASS" : "FAIL", [noCard ? "NO_CARD" : "MISSING_NO_CARD"]),
    no_billing: named("ShadowNoBilling", noBill ? "PASS" : "FAIL", [noBill ? "NO_AUTO_BILL" : "MISSING_NO_AUTO_BILL"]),
    pricing: named("ShadowPricing", pricing ? "PASS" : "FAIL", [pricing ? "PRICING" : "MISSING_PRICING"]),
    leak: named("InternalLanguageLeakageGate", leak ? "FAIL" : "PASS", [leak ? "LEAK" : "CLEAN"]),
    offer,
    advancement,
  };
  const failed = Object.values(gates).filter((row) => row.result !== "PASS");
  return {
    plan,
    body: composed.body,
    gates,
    LiveInboundShadowComposeGate: named(
      "LiveInboundShadowComposeGate",
      failed.length ? "FAIL" : "PASS",
      failed.length ? failed.map((row) => row.gate) : ["SHADOW_VALID"],
    ),
  };
}

export function persistShadowAttempt(input: {
  obligation: CommunicationObligation;
  now: string;
  invoked_by: string;
}): CommunicationAttempt {
  const shadow = evaluateShadowCompose({ visible_body: FOUNDER_TRIAL_INBOUND_TEXT });
  const identity = vercelRuntimeIdentity();
  const attempt = allocateCommunicationAttempt({
    obligation: input.obligation,
    now: input.now,
    strategy: `SHADOW:${shadow.plan.strategy_id}`,
    planner_version: shadow.plan.planner_version,
  });
  updateCommunicationAttempt(attempt.attempt_id, {
    stage: shadow.LiveInboundShadowComposeGate.result === "PASS" ? "VALIDATED" : "COMPOSED",
    outcome: shadow.LiveInboundShadowComposeGate.result === "PASS" ? "PASS" : "FAIL",
    completed_at: input.now,
    recovered: true,
    actor: `SHADOW:${input.invoked_by}`,
    deployment_id: identity.deployment_id,
    failure_reason: shadow.LiveInboundShadowComposeGate.result === "FAIL" ? shadow.LiveInboundShadowComposeGate.reasons.join(",") : null,
    body_hash: "shadow-no-send",
  });
  return attempt;
}

export type CanaryStageResult = "PASS" | "FAIL" | "DEGRADED" | "NOT_REACHED" | "NO-OP";

export type NoSendCanaryStages = {
  obligation: CanaryStageResult;
  claim: CanaryStageResult;
  planner: CanaryStageResult;
  compose: CanaryStageResult;
  hard_validation: CanaryStageResult;
  soft_validation: CanaryStageResult;
  ledger: CanaryStageResult;
  provider_send: "NO-OP";
};

export type NoSendCanaryResult = {
  invoked_by: string;
  first_failure_stage: string | "NONE";
  exception_class: string | null;
  exception_message: string | null;
  created: CommunicationObligation | null;
  obligation: CommunicationObligation | null;
  claim: boolean;
  planner: boolean;
  compose: boolean;
  validate: boolean;
  ledger: boolean;
  stages: NoSendCanaryStages;
  provider_send: "NO-OP";
  gate: ReturnType<typeof attachEvidenceClass>;
};

type MutableCanaryStage = "obligation" | "claim" | "planner" | "compose" | "hard_validation" | "soft_validation" | "ledger";
const LATER_STAGES: MutableCanaryStage[] = [
  "claim",
  "planner",
  "compose",
  "hard_validation",
  "soft_validation",
  "ledger",
];

function writeStage(next: NoSendCanaryStages, key: MutableCanaryStage, value: CanaryStageResult): void {
  if (key === "obligation") next.obligation = value;
  else if (key === "claim") next.claim = value;
  else if (key === "planner") next.planner = value;
  else if (key === "compose") next.compose = value;
  else if (key === "hard_validation") next.hard_validation = value;
  else if (key === "soft_validation") next.soft_validation = value;
  else next.ledger = value;
}

function stagesAfter(failed: keyof NoSendCanaryStages, marked: Partial<NoSendCanaryStages>): NoSendCanaryStages {
  const next: NoSendCanaryStages = {
    obligation: marked.obligation ?? "PASS",
    claim: marked.claim ?? "PASS",
    planner: marked.planner ?? "PASS",
    compose: marked.compose ?? "PASS",
    hard_validation: marked.hard_validation ?? "PASS",
    soft_validation: marked.soft_validation ?? "PASS",
    ledger: marked.ledger ?? "PASS",
    provider_send: "NO-OP",
  };
  if (failed === "obligation") {
    writeStage(next, "obligation", "FAIL");
    for (const key of LATER_STAGES) writeStage(next, key, "NOT_REACHED");
    return next;
  }
  const start = LATER_STAGES.indexOf(failed as MutableCanaryStage);
  if (start >= 0) {
    writeStage(next, failed as MutableCanaryStage, marked[failed as MutableCanaryStage] ?? "FAIL");
    for (const key of LATER_STAGES.slice(start + 1)) writeStage(next, key, "NOT_REACHED");
  }
  return next;
}

export async function executeNoSendCanary(input: {
  now: string;
  mailbox_id?: string;
  invoked_by?: string;
}): Promise<NoSendCanaryResult> {
  const identity = vercelRuntimeIdentity();
  const invoked = input.invoked_by ?? "synthetic_canary";
  const finish = (
    stage: string | "NONE",
    exception_class: string | null,
    exception_message: string | null,
    created: CommunicationObligation | null,
    marked: Partial<NoSendCanaryStages>,
  ): NoSendCanaryResult => {
    const stages = stage === "NONE"
      ? {
        obligation: "PASS" as const,
        claim: "PASS" as const,
        planner: "PASS" as const,
        compose: "PASS" as const,
        hard_validation: "PASS" as const,
        soft_validation: "PASS" as const,
        ledger: "PASS" as const,
        provider_send: "NO-OP" as const,
      }
      : stagesAfter(stage as keyof NoSendCanaryStages, marked);
    return {
      invoked_by: invoked,
      first_failure_stage: stage,
      exception_class,
      exception_message,
      created,
      obligation: created,
      claim: stages.claim === "PASS",
      planner: stages.planner === "PASS",
      compose: stages.compose === "PASS",
      validate: stages.hard_validation === "PASS",
      ledger: stages.ledger === "PASS",
      stages,
      provider_send: "NO-OP",
      gate: attachEvidenceClass(
        named(
          "CommunicationNoSendCanaryGate",
          stage === "NONE" ? "PASS" : "FAIL",
          [stage, exception_class ?? "NONE", invoked, identity.release_sha ?? identity.git_sha ?? "NO_SHA"],
        ),
        "SYNTHETIC_PROD",
        { now: input.now, git_sha: identity.release_sha ?? identity.git_sha, deployment_id: identity.deployment_id },
      ),
    };
  };
  try {
    const mailbox = input.mailbox_id ?? "occupancynpv-canary";
    const ingested = ingestProviderMessage({
      mailbox_id: mailbox,
      thread_id: "canary:no-send",
      provider_message_id: `${NO_SEND_CANARY_MESSAGE_ID}:${input.now}`,
      visible_body: FOUNDER_TRIAL_INBOUND_TEXT,
      received_at: input.now,
      now: input.now,
      same_mailbox_test_mode: true,
    });
    if (!ingested.obligation) {
      return finish("obligation", "NO_OBLIGATION", "ingestProviderMessage returned no obligation", null, { obligation: "FAIL" });
    }
    const scheduled = scheduleCommunicationObligation(ingested.obligation, input.now);
    const claimed = scheduled.ok ? claimCommunicationObligation(scheduled.obligation, input.now) : { ok: false as const, obligation: ingested.obligation };
    if (!claimed.ok) {
      return finish("claim", "CLAIM_FAIL", scheduled.ok ? "claimCommunicationObligation rejected" : "scheduleCommunicationObligation rejected", ingested.obligation, {
        obligation: "PASS",
        claim: "FAIL",
      });
    }
    const shadow = evaluateShadowCompose({});
    if (shadow.plan.intent !== "POSITIVE_INTEREST" || shadow.plan.stage === "FIRST_TOUCH") {
      return finish("planner", "PLANNER_FAIL", `${shadow.plan.intent}:${shadow.plan.stage}`, claimed.obligation, {
        obligation: "PASS",
        claim: "PASS",
        planner: "FAIL",
      });
    }
    if (!shadow.body) {
      return finish("compose", "COMPOSE_EMPTY", "shadow compose produced no body", claimed.obligation, {
        obligation: "PASS",
        claim: "PASS",
        planner: "PASS",
        compose: "FAIL",
      });
    }
    if (shadow.LiveInboundShadowComposeGate.result !== "PASS") {
      return finish("hard_validation", "HARD_GATE_FAIL", shadow.LiveInboundShadowComposeGate.reasons.join(","), claimed.obligation, {
        obligation: "PASS",
        claim: "PASS",
        planner: "PASS",
        compose: "PASS",
        hard_validation: "FAIL",
      });
    }
    const attempt = allocateCommunicationAttempt({
      obligation: claimed.obligation,
      now: input.now,
      strategy: shadow.plan.strategy_id,
      planner_version: shadow.plan.planner_version,
    });
    const ahead = writeAheadOutboundLedger({ obligation: claimed.obligation, attempt, body: shadow.body, now: input.now });
    if (ahead.ledger === "EXISTING") {
      return finish("ledger", "LEDGER_EXISTING", "write-ahead ledger collided", claimed.obligation, {
        obligation: "PASS",
        claim: "PASS",
        planner: "PASS",
        compose: "PASS",
        hard_validation: "PASS",
        soft_validation: "PASS",
        ledger: "FAIL",
      });
    }
    const noop = await noopProvider().send({
      to: "canary@invalid.example",
      subject: "NO-SEND CANARY",
      body: shadow.body,
      thread_id: claimed.obligation.thread_id,
      rfc_message_id: ahead.rfc_message_id,
      custom_header: ahead.custom_header,
      in_reply_to: claimed.obligation.provider_message_id,
    });
    if (noop.error !== "NO_OP_PROVIDER_SEND" || noop.accepted) {
      return finish("provider_send", "PROVIDER_NOT_NOOP", noop.error ?? "SEND_ACCEPTED", claimed.obligation, {
        obligation: "PASS",
        claim: "PASS",
        planner: "PASS",
        compose: "PASS",
        hard_validation: "PASS",
        soft_validation: "PASS",
        ledger: "PASS",
      });
    }
    applyCommunicationObligationTransition({
      current: getCommunicationObligation(claimed.obligation.obligation_id) ?? claimed.obligation,
      to_state: "NO_REPLY_POLICY",
      expected_version: (getCommunicationObligation(claimed.obligation.obligation_id) ?? claimed.obligation).version,
      actor: "NoSendCanary",
      reason: "SYNTHETIC_NO_SEND",
      now: input.now,
      terminal_reason: "SYNTHETIC_CANARY_EXCLUDED",
      next_action: "DONE",
    });
    return finish("NONE", null, null, getCommunicationObligation(claimed.obligation.obligation_id) ?? claimed.obligation, {});
  } catch (error) {
    return finish(
      "obligation",
      error instanceof Error ? error.name : "Error",
      error instanceof Error ? error.message : "CANARY_EXCEPTION",
      null,
      { obligation: "FAIL" },
    );
  }
}

export async function persistNoSendCanaryResult(result: NoSendCanaryResult, now: string): Promise<void> {
  if (process.env.VITEST) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const identity = vercelRuntimeIdentity();
  await client.from("cloud_runtime_state").upsert({
    scope: COMMUNICATION_CANARY_SCOPE,
    version: 1,
    instance_id: "communication-no-send-canary",
    payload: {
      invoked_by: result.invoked_by,
      first_failure_stage: result.first_failure_stage,
      exception_class: result.exception_class,
      exception_message: result.exception_message,
      stages: result.stages,
      release_sha: identity.release_sha,
      release_tree_hash: identity.release_tree_hash,
      deployment_id: identity.deployment_id,
      observed_at: now,
    },
    updated_at: now,
  });
}

export function evaluateCommunicationProviderReadCanaryGate(input: {
  ok: boolean;
  mailbox: string | null;
  error?: string | null;
}): NamedOutboundLoopGate {
  return named("CommunicationProviderReadCanaryGate", input.ok && Boolean(input.mailbox) ? "PASS" : "FAIL", [
    input.mailbox ?? "NO_MAILBOX",
    input.error ?? "OK",
  ]);
}

export function evaluateCommunicationProviderIdentityParityGate(input: {
  production_mailbox: string | null;
  forensic_mailbox: string | null;
  watchdog_mailbox: string | null;
  expected: string;
}): NamedOutboundLoopGate {
  const same = Boolean(input.production_mailbox)
    && input.production_mailbox === input.forensic_mailbox
    && input.production_mailbox === input.watchdog_mailbox
    && input.production_mailbox === input.expected;
  return named("CommunicationProviderIdentityParityGate", same ? "PASS" : "FAIL", [
    input.production_mailbox ?? "NO_PROD",
    input.forensic_mailbox ?? "NO_FORENSIC",
    input.watchdog_mailbox ?? "NO_WATCHDOG",
  ]);
}

export { STRANDED_FOUNDER_TRIAL_INBOUND_ID };
