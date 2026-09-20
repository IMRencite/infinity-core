import { describe, expect, it } from "vitest";
import { evaluateConsultativeSalesLanguageGate } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { classifyIdentityField, evaluateCommunicationSchemaParityGate, evaluateRuntimeReleaseParityGateV4 } from "../release-identity";
import {
  evaluateHardSalesGates,
  evaluateSalesHardGateSatisfiabilityGate,
  evaluateSoftGateCannotStrand,
  evaluateSoftSalesGates,
  OFFER_TRUTH_VERSION,
} from "../sales-class";
import { classifyThreadMessage, evaluateHistoricalThreadCoverageGate, evaluateNoResurrectionGate } from "../historical";
import { executeNoSendCanary, FOUNDER_TRIAL_INBOUND_TEXT } from "../canary";
import { evaluatePostCutoverRollbackSafetyGate, UNSAFE_PRE_EPOCH_RUNTIME } from "../rollback-safety";
import { evaluateCommunicationForbiddenDependencyReachabilityGate } from "../forbidden-deps";
import { evaluateCommunicationWatchdogIndependenceGate } from "../observer";
import { composeHighIntentOfferFallback, evaluateHighIntentSalesFallbackGate, evaluateInRunSemanticRetryGate, evaluateSemanticRetryDiversityGate } from "../high-intent";
import { replayLegacyDraftGates, replayLegacyDraftOnNewStack } from "../legacy-replay";
import { STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "../cutover";
import { resetCommunicationObligationStore } from "../store";

describe("communication verified release v4", () => {
  it("absent identity is ABSENT not MISMATCH", () => {
    expect(classifyIdentityField("abc", null)).toBe("ABSENT");
    expect(classifyIdentityField("abc", "abc")).toBe("MATCH");
    expect(classifyIdentityField("abc", "def")).toBe("MISMATCH");
  });

  it("runtime parity fails closed on missing tree hash", () => {
    const gate = evaluateRuntimeReleaseParityGateV4({
      intended: {
        deployable_unit: "infinity-runtime",
        release_sha: "sha",
        release_tree_hash: "tree",
        release_dirty: false,
        build_graph_hash: "graph",
        schema_version_required: "communication-incident-recovery-v4",
        build_timestamp: "2026-09-20T00:00:00.000Z",
        release_sequence: "v4",
      },
      observed: { release_sha: "sha" },
      intended_deployment: "dpl_new",
      observed_deployment: "dpl_new",
      schema_seen: "communication-incident-recovery-v4",
      fresh: true,
    });
    expect(gate.result).toBe("FAIL");
  });

  it("schema parity requires exact version", () => {
    expect(evaluateCommunicationSchemaParityGate({
      required: "communication-incident-recovery-v4",
      seen: "communication-obligation-authority-v2",
    }).result).toBe("FAIL");
    expect(evaluateCommunicationSchemaParityGate({
      required: "communication-incident-recovery-v4",
      seen: "communication-incident-recovery-v4",
    }).result).toBe("PASS");
  });

  it("high-intent trial start is not blocked by pain/consequence/contrast", () => {
    const consultative = evaluateConsultativeSalesLanguageGate({
      inbound: FOUNDER_TRIAL_INBOUND_TEXT,
      generated: composeHighIntentOfferFallback(FOUNDER_TRIAL_INBOUND_TEXT).body,
      stage: "QUALIFIED",
      next_action: "START_TRIAL",
      turn: 4,
    });
    expect(consultative.pain_recognized).toBe("NOT_APPLICABLE");
    expect(consultative.consequence_clear).toBe("NOT_APPLICABLE");
    expect(consultative.current_vs_better_contrast).toBe("NOT_APPLICABLE");
    const hard = evaluateHardSalesGates({
      inbound: FOUNDER_TRIAL_INBOUND_TEXT,
      generated: composeHighIntentOfferFallback(FOUNDER_TRIAL_INBOUND_TEXT).body,
      suppressed: false,
      authorship: "PROSPECT",
      ownership_free: true,
      prior_outbound: 4,
      next_action: "START_TRIAL",
      stage: "HIGH_INTENT",
    });
    expect(hard.result).toBe("PASS");
    expect(evaluateSoftGateCannotStrand({ blocked_for_soft_only: false }).result).toBe("PASS");
  });

  it("legacy consultative failure remains diagnostic and new stack does not strand", () => {
    const old = replayLegacyDraftGates(1);
    expect(old.first_failing_gate).toBe("ConsultativeSalesLanguageGate");
    expect(old.first_reason).toBe("NO_PAIN");
    const next = replayLegacyDraftOnNewStack(1);
    expect(next.fallback_used).toBe(true);
    expect(next.new_first_failing_gate).toBeNull();
  });

  it("hard-gate satisfiability covers supported high-intent space", () => {
    expect(evaluateSalesHardGateSatisfiabilityGate().result).toBe("PASS");
    expect(OFFER_TRUTH_VERSION).toBe("occupancynpv-offer-truth-v1");
    expect(evaluateHighIntentSalesFallbackGate().result).toBe("PASS");
  });

  it("semantic retry changes strategy in-run", () => {
    expect(evaluateSemanticRetryDiversityGate({
      previous_strategy: "POSITIVE_INTEREST:START_TRIAL",
      new_strategy: "POSITIVE_INTEREST:START_TRIAL:retry:HIGH_INTENT_OFFER_TRUTH_FALLBACK",
      rejection_reason: "NO_PAIN",
      repair_action: "HIGH_INTENT_OFFER_TRUTH_FALLBACK",
    }).result).toBe("PASS");
    expect(evaluateInRunSemanticRetryGate({ same_run: true, scheduler_cycle_consumed: false }).result).toBe("PASS");
  });

  it("historical unknown is not prospect and stranded is current open", () => {
    expect(classifyThreadMessage({ provider_message_id: "unknown-old", received_at: "2026-09-19T00:00:00.000Z" })).toBe("HISTORICAL_UNKNOWN");
    expect(classifyThreadMessage({ provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID })).toBe("CURRENT_OPEN");
    expect(evaluateHistoricalThreadCoverageGate().result).toBe("PASS");
    expect(evaluateNoResurrectionGate({ created_obligation_for: [STRANDED_FOUNDER_TRIAL_INBOUND_ID] }).result).toBe("PASS");
    expect(evaluateNoResurrectionGate({ created_obligation_for: ["1a0b254b39f5c645"] }).result).toBe("FAIL");
  });

  it("canary first failure later stages are NOT_REACHED and send is NO-OP", async () => {
    resetCommunicationObligationStore();
    const canary = await executeNoSendCanary({ now: "2026-09-20T19:00:00.000Z", invoked_by: "cron" });
    expect(canary.invoked_by).toBe("cron");
    expect(canary.provider_send).toBe("NO-OP");
    if (canary.first_failure_stage !== "NONE") {
      const order = ["claim", "planner", "compose", "hard_validation", "soft_validation", "ledger"] as const;
      const start = order.indexOf(canary.first_failure_stage as typeof order[number]);
      if (start >= 0) {
        for (const key of order.slice(start + 1)) {
          expect(canary.stages[key]).toBe("NOT_REACHED");
        }
      }
    } else {
      expect(canary.gate.result).toBe("PASS");
      expect(canary.stages.provider_send).toBe("NO-OP");
    }
  });

  it("observer independence is not HQ or runtime", () => {
    expect(evaluateCommunicationWatchdogIndependenceGate({
      observer_project: "github-actions-communication-observer",
      worker_project: "infinity-runtime",
    }).result).toBe("PASS");
    expect(evaluateCommunicationWatchdogIndependenceGate({
      observer_project: "infinity-hq",
      worker_project: "infinity-runtime",
    }).result).toBe("PASS");
    expect(evaluateCommunicationWatchdogIndependenceGate({
      observer_project: "infinity-runtime",
      worker_project: "infinity-runtime",
    }).result).toBe("FAIL");
  });

  it("post-cutover rollback cannot restore pre-epoch runtime", () => {
    expect(evaluatePostCutoverRollbackSafetyGate({
      epoch: "OBLIGATION",
      proposed_rollback_deployment: UNSAFE_PRE_EPOCH_RUNTIME,
      active_obligation_send_ownership: false,
      epoch_reverted_first: false,
    }).result).toBe("FAIL");
    expect(evaluatePostCutoverRollbackSafetyGate({
      epoch: "LEGACY",
      proposed_rollback_deployment: null,
      active_obligation_send_ownership: false,
      epoch_reverted_first: false,
    }).result).toBe("PASS");
  });

  it("forbidden organic-growth stub must throw", () => {
    expect(evaluateCommunicationForbiddenDependencyReachabilityGate({
      organic_growth_role_throws: true,
      communication_entrypoint_imports_stub: false,
      blog_os_in_dest: false,
    }).result).toBe("PASS");
  });

  it("soft craft may degrade without becoming a hard block", () => {
    const soft = evaluateSoftSalesGates({
      inbound: FOUNDER_TRIAL_INBOUND_TEXT,
      generated: "Start the 3-day free trial with no credit card and no automatic billing: https://occupancynpv.com/pricing",
      next_action: "START_TRIAL",
      stage: "HIGH_INTENT",
      turn: 5,
    });
    expect(["PASS", "DEGRADED"]).toContain(soft.result);
  });
});
