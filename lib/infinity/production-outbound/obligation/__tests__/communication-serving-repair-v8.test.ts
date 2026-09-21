import { describe, expect, it } from "vitest";
import { admitProviderMessage, evaluateDenyListRecoveryPrecedenceGate, recoveryAdmissionForTarget } from "../admission";
import {
  armHumanAttestationClock,
  blockHumanRequestsByUnavailableActionPath,
  createHumanAttestationRequests,
  evaluateHumanClockStartGate,
} from "../human-attestation";
import { acquireInboundOwnershipKeysAtomic, ensureOwnershipRow, resetOwnershipClaims } from "../ownership-claim";
import {
  computeIndependentBuildGraphHash,
  evaluateBadPromotionCoverageGate,
  evaluateCronRouteExistsGate,
  evaluateServingEvidenceBindingGate,
  evaluateTrackedRuntimeSourceGate,
} from "../release-gates-v8";
import { evaluateProvisionalSuppressionGate, resolveStopSuppression } from "../provisional-suppression";
import { evaluateSendUncertaintyGate, resolveUncertainSend } from "../send-uncertain";
import { dryRunCutoverAssertions, evaluateCommunicationCutoverDryRunGate } from "../cutover-v8";
import { classifyPageCopyClaim } from "../offer-corroboration";
import { resetClosedLoopDurableState } from "../../closed-loop-durable";
import { HISTORICAL_FALSE_STOP_MESSAGE_ID, STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "../cutover";
import { PRE_CUTOVER_SNAPSHOT_MESSAGE_IDS } from "../snapshot-ids";

const NOW = "2026-09-20T23:00:00.000Z";

describe("communication serving repair v8", () => {
  it("fails cron and tracked-source gates when the tick route is missing", () => {
    expect(evaluateCronRouteExistsGate({
      cron_paths: ["/api/runtime/communication-tick"],
      built_routes: ["/api/runtime/communication-attest"],
    }).result).toBe("FAIL");
    expect(evaluateTrackedRuntimeSourceGate({
      required_files: ["app/api/runtime/communication-tick/route.ts"],
      tracked_files: ["app/api/runtime/communication-attest/route.ts"],
      dirty_required: [],
    }).result).toBe("FAIL");
    expect(evaluateCronRouteExistsGate({
      cron_paths: ["/api/runtime/communication-tick"],
      built_routes: ["/api/runtime/communication-tick"],
    }).result).toBe("PASS");
  });

  it("computes build graph hash independently of content hash", () => {
    const graph = computeIndependentBuildGraphHash({
      cron_paths: ["/api/runtime/communication-tick"],
      route_files: { "app/api/runtime/communication-tick/route.ts": "tick" },
      package_name: "infinity-core",
      dependency_names: ["next"],
    });
    const content = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(graph).not.toBe(content.slice(0, 16));
    expect(graph.length).toBe(64);
  });

  it("binds readiness only to the serving deployment", () => {
    expect(evaluateServingEvidenceBindingGate({
      evidence_deployment: "dpl_old",
      serving_deployment: "dpl_new",
      evidence_content_hash: "aaa",
      serving_content_hash: "aaa",
      fresh: true,
    }).result).toBe("FAIL");
    expect(evaluateServingEvidenceBindingGate({
      evidence_deployment: "dpl_new",
      serving_deployment: "dpl_new",
      evidence_content_hash: "bbb",
      serving_content_hash: "bbb",
      fresh: true,
    }).result).toBe("PASS");
  });

  it("does not start the human clock until the action path works", () => {
    const [mailbox] = createHumanAttestationRequests(NOW);
    const blocked = blockHumanRequestsByUnavailableActionPath([mailbox], NOW);
    expect(blocked[0].status).toBe("BLOCKED_BY_UNAVAILABLE_ACTION_PATH");
    expect(evaluateHumanClockStartGate({
      attest_route_serving: false,
      externally_reachable: false,
      authentication_action_proven: false,
      working_link: false,
      notification_delivered: false,
    }).result).toBe("FAIL");
    const armed = armHumanAttestationClock(blocked, NOW);
    expect(armed[0].status).toBe("AWAITING_HUMAN");
    expect(armed[0].requested_at).toBe(NOW);
  });

  it("treats UNKNOWN STOP as provisional block and SYSTEM STOP as invalidated", () => {
    resetClosedLoopDurableState();
    const system = resolveStopSuppression({ role: "SYSTEM", body: "STOP", source_message_id: "sys-1", recipient: "a@example.com", now: NOW });
    const prospect = resolveStopSuppression({ role: "PROSPECT", body: "STOP", source_message_id: "p-1", recipient: "a@example.com", now: NOW });
    resetClosedLoopDurableState();
    const unknown = resolveStopSuppression({ role: "UNKNOWN", body: "STOP", source_message_id: "u-1", recipient: "a@example.com", now: NOW });
    resetClosedLoopDurableState();
    const falseStop = resolveStopSuppression({
      role: "SYSTEM",
      body: "STOP",
      source_message_id: HISTORICAL_FALSE_STOP_MESSAGE_ID,
      recipient: "a@example.com",
      now: NOW,
    });
    expect(evaluateProvisionalSuppressionGate({
      system: system.action,
      prospect: prospect.action,
      unknown: unknown.action,
      false_stop: falseStop.action,
    }).result).toBe("PASS");
  });

  it("resolves expired SENDING against provider truth without blind resend", () => {
    expect(evaluateSendUncertaintyGate({
      expired: "SEND_UNCERTAIN",
      found: resolveUncertainSend({ provider_found: true }),
      absent: resolveUncertainSend({ provider_found: false }),
      unknown: resolveUncertainSend({ provider_found: null }),
    }).result).toBe("PASS");
  });

  it("lets explicit recovery admission override the snapshot deny-list", () => {
    const deny = new Set<string>(PRE_CUTOVER_SNAPSHOT_MESSAGE_IDS);
    const without = admitProviderMessage({
      provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      provider_internal_date_ms: 1,
      watermark_ms: 2,
      snapshot_deny: deny,
      admission: null,
      role: "CURRENT_OPEN_PROSPECT",
    });
    const withAdmission = admitProviderMessage({
      provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      provider_internal_date_ms: 1,
      watermark_ms: 2,
      snapshot_deny: deny,
      admission: recoveryAdmissionForTarget(NOW),
      role: "CURRENT_OPEN_PROSPECT",
    });
    expect(deny.size).toBe(28);
    expect(evaluateDenyListRecoveryPrecedenceGate({
      deny_without_admission: without,
      deny_with_active_admission: withAdmission,
    }).result).toBe("PASS");
  });

  it("claims multiple inbound keys atomically or not at all", () => {
    resetOwnershipClaims();
    const a = { mailbox_id: "occupancynpv-canary", thread_id: "t1", answered_inbound_provider_message_id: "m1" };
    const b = { mailbox_id: "occupancynpv-canary", thread_id: "t1", answered_inbound_provider_message_id: "m2" };
    ensureOwnershipRow({ ...a, now: NOW });
    ensureOwnershipRow({ ...b, now: NOW });
    const claimed = acquireInboundOwnershipKeysAtomic({
      keys: [a, b],
      owner_path: "OBLIGATION",
      owner_id: "ob-1",
      now: NOW,
    });
    expect(claimed.ok).toBe(true);
    expect(claimed.claimed).toBe(2);
  });

  it("labels page-copy offer evidence as stated, not flow-corroborated", () => {
    expect(classifyPageCopyClaim({ stated_on_page: true, flow_corroborated: null, conflict: false })).toBe("STATED_ON_PAGE");
    expect(classifyPageCopyClaim({ stated_on_page: true, flow_corroborated: false, conflict: false })).toBe("STATED_ON_PAGE");
    expect(classifyPageCopyClaim({ stated_on_page: false, flow_corroborated: null, conflict: false })).toBe("NOT_PROVEN");
  });

  it("rolls back a dry-run cutover when attestations are missing", () => {
    const assertions = dryRunCutoverAssertions({
      serving_evidence: true,
      attestations: false,
      suppression_clear: true,
      admission_active: true,
      shadow_fresh: true,
      epoch: "LEGACY",
      ownership_state: "AVAILABLE",
    });
    expect(assertions.find((row) => row.name === "Rollback")?.result).toBe("PASS");
    expect(evaluateCommunicationCutoverDryRunGate(assertions).result).toBe("FAIL");
    expect(evaluateBadPromotionCoverageGate({ scanned: true, uncovered: 0 }).result).toBe("PASS");
  });
});
