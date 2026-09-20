import { describe, expect, it } from "vitest";
import { admitProviderMessage, evaluateImmutableAdmissionBoundaryGate, recoveryAdmissionForTarget } from "../admission";
import { applyHumanAttestationExpiry, createHumanAttestationRequests, evaluateAttestationPathGate } from "../human-attestation";
import { casOwnership, cutoverMayTakeOwnership, ensureOwnershipRow, evaluateCrossPathOwnershipGateV7, resetOwnershipClaims } from "../ownership-claim";
import { evaluateShadowStorageIsolationGate, insertCommunicationShadowAttempt, resetCommunicationShadowAttempts } from "../shadow-store";
import { evaluateStaleConversationLanguageGate } from "../stale-language";
import { atomicFlipThreadToObligationV7, evaluateCommunicationSchemaCompatibilityGate, evaluateCutoverPreconditionsV7 } from "../cutover-v7";
import { classifyPublicPresence, evaluateBillingFlowCorroborationGate } from "../offer-corroboration";
import { lookupSendTimeSuppression } from "../send-time-suppression";
import { buildReferencesChain, evaluateThreadingPreparationGate } from "../threading";
import { invalidateFalseInfinityOptOut, persistSuppressionRecord, resetClosedLoopDurableState } from "../../closed-loop-durable";
import { HISTORICAL_FALSE_STOP_MESSAGE_ID, STRANDED_FOUNDER_TRIAL_INBOUND_ID, setCommunicationCutoverEpochValue } from "../cutover";
import { evaluateDirectQuestionResponsivenessGate } from "../sales-class";

const NOW = "2026-09-20T22:00:00.000Z";
const WATERMARK = 1_758_367_301_000;

describe("communication recovery release v7", () => {
  it("creates owed human requests that expiry cannot sink", () => {
    const [mailbox, offer] = createHumanAttestationRequests(NOW);
    expect(mailbox.status).toBe("AWAITING_HUMAN");
    expect(offer.status).toBe("AWAITING_HUMAN");
    expect(mailbox.owner).toBe("FOUNDER");
    const expired = applyHumanAttestationExpiry({ ...mailbox, due_at: "2026-09-20T21:00:00.000Z" }, NOW);
    expect(expired.status).toBe("AWAITING_HUMAN");
    expect(expired.escalation_count).toBe(1);
    expect(evaluateAttestationPathGate({
      endpoint_exists: true,
      rejects_unauthenticated: true,
      ordinary_prompt_accepted: false,
    }).result).toBe("PASS");
  });

  it("admits only explicit recovery from the snapshot dry-run", () => {
    const deny = new Set(["old-1", "old-2", HISTORICAL_FALSE_STOP_MESSAGE_ID, "echo-out"]);
    const admission = recoveryAdmissionForTarget(NOW);
    const live = admitProviderMessage({
      provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      provider_internal_date_ms: WATERMARK - 1,
      watermark_ms: WATERMARK,
      snapshot_deny: deny,
      admission,
      role: "CURRENT_OPEN_PROSPECT",
    });
    const oldMutated = admitProviderMessage({
      provider_message_id: "hist-old-not-in-snapshot",
      provider_internal_date_ms: WATERMARK - 1000,
      watermark_ms: WATERMARK,
      snapshot_deny: deny,
      admission: null,
      role: "HISTORICAL_UNKNOWN",
      mutated_history_id: true,
    });
    const echo = admitProviderMessage({
      provider_message_id: "echo-out",
      provider_internal_date_ms: WATERMARK + 10,
      watermark_ms: WATERMARK,
      snapshot_deny: deny,
      admission: null,
      role: "SYSTEM",
    });
    const systemStop = admitProviderMessage({
      provider_message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID,
      provider_internal_date_ms: WATERMARK + 10,
      watermark_ms: WATERMARK,
      snapshot_deny: deny,
      admission: null,
      role: "SYSTEM",
    });
    const labelChange = admitProviderMessage({
      provider_message_id: "old-2",
      provider_internal_date_ms: WATERMARK - 5,
      watermark_ms: WATERMARK,
      snapshot_deny: deny,
      admission: null,
      role: "HISTORICAL_UNKNOWN",
    });
    const fresh = admitProviderMessage({
      provider_message_id: "brand-new",
      provider_internal_date_ms: WATERMARK + 5,
      watermark_ms: WATERMARK,
      snapshot_deny: deny,
      admission: null,
      role: "PROSPECT",
    });
    expect(live).toBe("ADMITTED");
    expect(evaluateImmutableAdmissionBoundaryGate({
      old_new_history: oldMutated,
      echo,
      system_stop: systemStop,
      label_change: labelChange,
      new_post_watermark: fresh,
      dry_run_live: "1",
    }).result).toBe("PASS");
  });

  it("uses CAS ownership and fails closed when missing", () => {
    resetOwnershipClaims();
    const missing = casOwnership({
      mailbox_id: "occupancynpv-canary",
      thread_id: "1a0af74557b0eb36",
      answered_inbound_provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      from: ["CLAIMED"],
      to: "SENDING",
      owner_path: "OBLIGATION",
      owner_id: "ob-1",
      expected_version: 1,
      now: NOW,
      fenced: true,
    });
    expect(missing.ok).toBe(false);
    expect(missing.reason).toBe("MISSING_OWNERSHIP_FAIL_CLOSED");
    const row = ensureOwnershipRow({
      mailbox_id: "occupancynpv-canary",
      thread_id: "1a0af74557b0eb36",
      answered_inbound_provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      now: NOW,
    });
    const sending = casOwnership({
      mailbox_id: row.mailbox_id,
      thread_id: row.thread_id,
      answered_inbound_provider_message_id: row.answered_inbound_provider_message_id,
      from: ["AVAILABLE"],
      to: "SENDING",
      owner_path: "OBLIGATION",
      owner_id: "ob-1",
      expected_version: row.version,
      now: NOW,
      fenced: true,
    });
    expect(sending.ok).toBe(true);
    expect(cutoverMayTakeOwnership(sending.row)).toBe(false);
    expect(evaluateCrossPathOwnershipGateV7({
      legacy_uses_cas: true,
      obligation_uses_cas: true,
      missing_fails_closed: true,
      frozen_blocks_send: true,
    }).result).toBe("PASS");
  });

  it("keeps shadow out of live obligations", () => {
    resetCommunicationShadowAttempts();
    insertCommunicationShadowAttempt({
      shadow_id: "shadow:1",
      mailbox_id: "occupancynpv-canary",
      provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      thread_id: "1a0af74557b0eb36",
      deployment_id: "dpl_test",
      release_sha: "abc",
      planner_version: "conversation-planner-v1",
      offer_truth_version: "occupancynpv-offer-truth-v1",
      draft_hash: "hash",
      authorship: "PROSPECT",
      intent: "HIGH_INTENT",
      first_touch: false,
      hard_gates: "PASS",
      soft_gates: "PASS",
      fallback: "AVAILABLE",
      threading: "PASS",
      send_authority: false,
      terminal: "SHADOW_PASS",
      created_at: NOW,
    });
    expect(evaluateShadowStorageIsolationGate({
      live_table: "communication_obligations",
      shadow_table: "communication_shadow_attempts",
      send_authority: false,
      visible_to_claim: false,
    }).result).toBe("PASS");
  });

  it("voids false STOP idempotently and keeps send-time suppression clear", () => {
    resetClosedLoopDurableState();
    persistSuppressionRecord({ recipient: "canary@example.com", source_message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID });
    const first = invalidateFalseInfinityOptOut({ expected_source_message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID });
    const second = invalidateFalseInfinityOptOut({ expected_source_message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID });
    expect(first.invalidated).toBe(true);
    expect(second.invalidated).toBe(true);
    expect(lookupSendTimeSuppression({
      message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID,
      thread_id: "1a0af74557b0eb36",
      recipient: "canary@example.com",
    }).verdict).toBe("CLEAR");
  });

  it("rejects stale immediacy and requires a start action", () => {
    expect(evaluateStaleConversationLanguageGate({
      generated: "Just saw this — starting right away.",
      inbound_age_ms: 8 * 60 * 60 * 1000,
    }).result).toBe("FAIL");
    expect(evaluateDirectQuestionResponsivenessGate({
      inbound: "Yeah, I think I’d rather just try it. How do I start the free trial?",
      generated: "Start the 3-day free trial: https://occupancynpv.com/pricing",
    }).result).toBe("PASS");
    expect(classifyPublicPresence({ html_contains: false, js_rendered: true, rendered_verified: false })).toBe("RENDER_NOT_PROVEN");
    expect(evaluateBillingFlowCorroborationGate({
      payment_fields_before_trial: null,
      inspected_without_business_event: true,
    }).result).toBe("NOT_PROVEN");
  });

  it("prepares threading without creating a draft", () => {
    const target = "<rfc-target@imros>";
    expect(evaluateThreadingPreparationGate({
      thread_id: "1a0af74557b0eb36",
      intended_thread_id: "1a0af74557b0eb36",
      subject: "Re: OccupancyNPV",
      target_rfc_message_id: target,
      in_reply_to: target,
      references: buildReferencesChain("<prior@imros>", target),
      created_gmail_draft: false,
    }).result).toBe("PASS");
  });

  it("rolls back cutover when human attestation is outstanding", () => {
    setCommunicationCutoverEpochValue("LEGACY");
    resetOwnershipClaims();
    const blocked = evaluateCutoverPreconditionsV7({
      recovery_ready: false,
      serving_deployment: "dpl_a",
      shadow_deployment: "dpl_a",
      shadow_fresh: true,
      epoch: "LEGACY",
      recovered_incident: true,
      mailbox_attested: false,
      offer_attested: false,
      suppression_clear: true,
      admission_active: true,
      watermark_present: true,
    });
    expect(blocked.result).toBe("FAIL");
    const flipped = atomicFlipThreadToObligationV7({
      now: NOW,
      mailbox_id: "occupancynpv-canary",
      obligation_id: "ob:recovery",
      preconditions: {
        recovery_ready: false,
        serving_deployment: "dpl_a",
        shadow_deployment: "dpl_a",
        shadow_fresh: true,
        epoch: "LEGACY",
        recovered_incident: true,
        mailbox_attested: false,
        offer_attested: false,
        suppression_clear: true,
        admission_active: true,
        watermark_present: true,
      },
    });
    expect(flipped.transaction).toBe("ROLLED_BACK");
    expect(evaluateCommunicationSchemaCompatibilityGate({
      dropped_live_uniqueness: false,
      shadow_separate: true,
      ownership_columns_added: true,
    }).result).toBe("PASS");
  });
});
