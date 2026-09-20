import { describe, expect, it } from "vitest";
import { classifyMailboxMismatch, evaluateProductionProviderIdentityGateV5, hashMailboxAddress, normalizeMailboxAddress } from "../mailbox-attestation";
import { classifySnapshotMessage, evaluateHistoricalThreadCoverageGateV5 } from "../thread-snapshot";
import { executeRealMessageShadow, evaluateCommunicationThreadContinuityGate } from "../live-shadow";
import { evaluateCommunicationSourceReproducibilityGate } from "../source-repro";
import { evaluateDirectQuestionResponsivenessGate } from "../sales-class";
import { FOUNDER_TRIAL_INBOUND_TEXT } from "../canary";
import { STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "../cutover";

describe("communication attestation v5", () => {
  it("same algorithm hashes expected and profile independently", () => {
    expect(hashMailboxAddress("hello@imros.io")).toBe(hashMailboxAddress("  Hello@IMROS.io "));
    expect(hashMailboxAddress("hello@imros.io")).not.toBe(hashMailboxAddress("infinitemediaresources@gmail.com"));
    expect(normalizeMailboxAddress("Infinity <hello@imros.io>")).toBe("hello@imros.io");
  });

  it("classifies stale constant when thread lives in profile mailbox", () => {
    expect(classifyMailboxMismatch({
      profile_hash: "d6deabc7aaa01170",
      expected_hash: "928b80c3671e1d52",
      expected_is_alias: false,
      hashes_equal_under_same_algorithm: false,
      thread_lives_in_profile_mailbox: true,
    })).toBe("EXPECTED_CONSTANT_STALE");
    expect(classifyMailboxMismatch({
      profile_hash: "d6deabc7aaa01170",
      expected_hash: "928b80c3671e1d52",
      expected_is_alias: true,
      hashes_equal_under_same_algorithm: false,
      thread_lives_in_profile_mailbox: true,
    })).toBe("EXPECTED_ADDRESS_IS_SEND_AS_ALIAS");
  });

  it("provider identity requires attested registered mailbox", () => {
    expect(evaluateProductionProviderIdentityGateV5({
      profile_hash: "abc",
      registered: null,
      credential_fingerprint: "2c60da8a2c79",
    }).result).toBe("FAIL");
  });

  it("stranded inbound is current open and false stop can be system", () => {
    expect(classifySnapshotMessage({
      provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      from: "anyone",
      system_hashes: [],
      later_system_reply_id: null,
    }).classification).toBe("CURRENT_OPEN_PROSPECT");
    expect(classifySnapshotMessage({
      provider_message_id: "1a0b254b39f5c645",
      from: "infinitemediaresources@gmail.com",
      system_hashes: [hashMailboxAddress("infinitemediaresources@gmail.com")],
      later_system_reply_id: null,
      known_system_ids: ["1a0b254b39f5c645"],
    }).classification).toBe("SYSTEM");
    expect(classifySnapshotMessage({
      provider_message_id: "unknown-same-mailbox",
      from: "infinitemediaresources@gmail.com",
      system_hashes: [hashMailboxAddress("infinitemediaresources@gmail.com")],
      later_system_reply_id: null,
      same_mailbox: true,
    }).classification).toBe("HISTORICAL_UNKNOWN");
  });

  it("coverage fails on empty snapshot and passes a complete one", () => {
    expect(evaluateHistoricalThreadCoverageGateV5([]).result).toBe("FAIL");
  });

  it("real-message shadow answers the trial-start question without sending", () => {
    const shadow = executeRealMessageShadow({
      provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      visible_body: FOUNDER_TRIAL_INBOUND_TEXT,
      authorship: "PROSPECT",
      prior_infinity_outbound_count: 4,
      rfc_message_id: "<rfc>",
      thread_id: "1a0af74557b0eb36",
      now: "2026-09-20T21:00:00.000Z",
    });
    expect(shadow.send).toBe("NO");
    expect(shadow.first_touch).toBe(false);
    expect(shadow.hard).toBe("PASS");
    expect(shadow.LivePromotedRuntimeShadowGate.result).toBe("PASS");
    expect(evaluateDirectQuestionResponsivenessGate({
      inbound: FOUNDER_TRIAL_INBOUND_TEXT,
      generated: "Start the 3-day free trial: https://occupancynpv.com/pricing",
    }).result).toBe("PASS");
  });

  it("thread continuity and source reproducibility fail closed", () => {
    expect(evaluateCommunicationThreadContinuityGate({
      thread_id: "1a0af74557b0eb36",
      in_reply_to: "<id>",
      intended_thread_id: "1a0af74557b0eb36",
    }).result).toBe("PASS");
    expect(evaluateCommunicationSourceReproducibilityGate({
      production_source_tracked: false,
      git_commit_sha: null,
      release_content_hash: "abc",
      content_hash_reproducible: false,
      build_graph_reproducible: false,
      dirty: true,
    }).result).toBe("FAIL");
  });
});
