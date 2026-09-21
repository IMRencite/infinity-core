import { describe, expect, it } from "vitest";
import {
  applyFounderHoldDecision,
  currentSecondQcHold,
  decideMissedDayWithoutCandidate,
  DurableBlogStore,
  BACKLOG_RECOVERY_ORDER,
  evaluateHoldActionabilityCheck,
  evaluateRenderedPageVerificationCheck,
  exitConditionHash,
  persistDurableHold,
  resetDurableHolds,
  startFounderReviewClock,
  CURRENT_BLOG_QC_VERSION,
  CURRENT_HOLD_ID,
} from "../durable";
import { attemptLiveVerify, attemptPublish } from "../durable/pipeline";
import { dueAtEndOfOperatingDay } from "../durable/creator";
import { evidenceIsStale, freezeV2Now } from "../durable/hold";

const NOW = "2026-09-21T05:10:00.000Z";
const GOOD = {
  url: "https://example.test/preview",
  status: 200 as const,
  html: `<html><head><title>Compare two commercial leases</title></head><body><h1>What numbers do you need to compare two commercial leases?</h1><p>Starting rent</p></body></html>`,
  expected_h1: "compare two commercial leases",
  background_kind: "SOLID" as const,
  contrast_proven: true,
};

describe("blog-os durable v4", () => {
  it("HoldActionabilityCheck fails without a started founder clock and dual owners", () => {
    resetDurableHolds();
    const hold = persistDurableHold(currentSecondQcHold(NOW));
    expect(hold.engineering_owner).toBe("OrganicRelease");
    expect(hold.founder_decision_owner).toBe("FOUNDER");
    expect(evaluateHoldActionabilityCheck({ ...hold, founder_decision_owner: "OrganicRelease" }).result).toBe("FAIL");
    expect(evaluateHoldActionabilityCheck(hold).result).toBe("FAIL");
    const started = startFounderReviewClock(hold, NOW);
    expect(started.requested_at).toBeNull();
    expect(started.founder_review_status).toBe("NOT_ACTIONABLE_ENGINEERING_BLOCKED");
    expect(evaluateHoldActionabilityCheck(started).result).toBe("FAIL");
    const external = startFounderReviewClock({
      ...hold,
      evidence_pack_url: "https://founder-decision.example/review",
    }, NOW);
    expect(external.founder_review_status).toBe("AWAITING_HUMAN");
    expect(evaluateHoldActionabilityCheck(external).result).toBe("PASS");
  });

  it("freezes the exit condition hash and marks earlier evidence stale", () => {
    const frozen = freezeV2Now();
    expect(exitConditionHash()).toHaveLength(64);
    expect(evidenceIsStale(new Date(Date.parse(frozen.frozen_at) - 1000).toISOString())).toBe(true);
    expect(evidenceIsStale(frozen.frozen_at)).toBe(false);
  });

  it("blocks PUBLISHED without PRE_PUBLISH and LIVE_VERIFIED without LIVE_POST_PUBLISH", () => {
    resetDurableHolds();
    const store = new DurableBlogStore();
    store.insertDailyObligation({
      id: "blog:occupancynpv:2026-09-21",
      venture_id: "occupancynpv",
      operating_date: "2026-09-21",
      operating_timezone: "America/New_York",
      required_count: 1,
      candidate_id: "cand:test",
      expected_url: "https://example.test/preview",
      pipeline_state: "QC_PASSED",
      hold_id: null,
      qc_version: CURRENT_BLOG_QC_VERSION,
      owner: "TEST",
      created_at: NOW,
      due_at: dueAtEndOfOperatingDay("2026-09-21"),
      last_attempt_at: null,
      next_attempt_at: NOW,
      failure_reason: null,
      published_at: null,
      live_verified_at: null,
      live_url: null,
      recovered: false,
      clean: false,
      missed_reason: null,
      decision_owner: null,
      decided_at: null,
      updated_at: NOW,
    });
    expect(store.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-21",
      to: "PUBLISHED",
      actor: "PUBLISHER",
      invoked_by: "TEST",
      now: NOW,
    }).reason).toBe("PRE_PUBLISH_REQUIRED");
    expect(attemptPublish({
      store,
      venture_id: "occupancynpv",
      operating_date: "2026-09-21",
      now: NOW,
      hold: null,
      pre_publish: { ...GOOD, mode: "PRE_PUBLISH" },
    }).ok).toBe(true);
    expect(store.transition({
      venture_id: "occupancynpv",
      operating_date: "2026-09-21",
      to: "LIVE_VERIFIED",
      actor: "LIVE_VERIFIER",
      invoked_by: "TEST",
      now: NOW,
    }).reason).toBe("LIVE_POST_PUBLISH_REQUIRED");
    expect(attemptLiveVerify({
      store,
      venture_id: "occupancynpv",
      operating_date: "2026-09-21",
      now: NOW,
      live: { ...GOOD, mode: "LIVE_POST_PUBLISH", url: "https://occupancynpv.com/example/" },
    }).ok).toBe(true);
    expect(evaluateRenderedPageVerificationCheck({ ...GOOD, mode: "PRE_PUBLISH" }).result).toBe("PASS");
  });

  it("records Sep 18/19 as MISSED_RECORDED and keeps the recovery order", () => {
    expect(decideMissedDayWithoutCandidate().decision).toBe("MISSED_RECORDED");
    expect(BACKLOG_RECOVERY_ORDER[0]?.operating_date).toBe("current_operating_day");
    expect(BACKLOG_RECOVERY_ORDER[1]?.operating_date).toBe("2026-09-20");
    expect(BACKLOG_RECOVERY_ORDER[2]?.decision).toBe("MISSED_RECORDED");
    expect(BACKLOG_RECOVERY_ORDER[3]?.decision).toBe("MISSED_RECORDED");
    expect(CURRENT_HOLD_ID).toContain("second-qc-escape");
    expect(applyFounderHoldDecision({
      hold: persistDurableHold(currentSecondQcHold(NOW)),
      actor: "FOUNDER",
      decision: "CLEAR",
      evidence_complete: false,
      now: NOW,
    }).accepted).toBe(false);
  });
});
