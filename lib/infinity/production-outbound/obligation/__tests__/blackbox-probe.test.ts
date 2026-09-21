import { describe, expect, it } from "vitest";
import { ingestProviderMessage } from "../worker";
import { resetCommunicationObligationStore } from "../store";
import {
  classifyBlackBoxProbeTurn,
  isBlackBoxProbeMessage,
  probeSloStatus,
  shouldPageProbe,
} from "../blackbox-probe";
import { abandonFounderTrialArtifact, COMMUNICATION_STAKES, isAbandonedFounderTrial } from "../stakes";
import { STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "../cutover";
import { COMMUNICATION_GATES_FROZEN, COMMUNICATION_RELEASE_PATH_CHECKS } from "../release-gates-v8";

describe("black-box probe", () => {
  it("recognizes the probe mailbox and excludes it from clean turns", () => {
    expect(isBlackBoxProbeMessage({ subject: "[INFINITY-PROBE abc] ping" })).toBe(true);
    expect(isBlackBoxProbeMessage({ custom_header: "X-Infinity-Probe: 1" })).toBe(true);
    expect(isBlackBoxProbeMessage({ from: "probe@example.com", probe_mailbox: "probe@example.com" })).toBe(true);
    expect(isBlackBoxProbeMessage({ subject: "Re: OccupancyNPV" })).toBe(false);
    expect(classifyBlackBoxProbeTurn().counts_toward_clean).toBe(false);
    expect(classifyBlackBoxProbeTurn().clean_eligible).toBe(false);
  });

  it("pages only after an armed SLO miss", () => {
    expect(probeSloStatus({
      sent_at: "2026-09-21T04:00:00.000Z",
      replied_at: "2026-09-21T04:08:00.000Z",
      now: "2026-09-21T04:10:00.000Z",
    })).toBe("PASS");
    expect(probeSloStatus({
      sent_at: "2026-09-21T04:00:00.000Z",
      replied_at: null,
      now: "2026-09-21T04:10:00.000Z",
    })).toBe("IN_FLIGHT");
    expect(probeSloStatus({
      sent_at: "2026-09-21T04:00:00.000Z",
      replied_at: null,
      now: "2026-09-21T04:21:00.000Z",
    })).toBe("SLO_MISS");
    expect(shouldPageProbe("SLO_MISS", false)).toBe(false);
    expect(shouldPageProbe("SLO_MISS", true)).toBe(true);
  });

  it("marks ingested probe mail as recovered and not clean-eligible", () => {
    resetCommunicationObligationStore();
    const ingested = ingestProviderMessage({
      thread_id: "probe-thread",
      provider_message_id: "probe-1",
      visible_body: "probe ping",
      received_at: "2026-09-21T04:00:00.000Z",
      now: "2026-09-21T04:01:00.000Z",
      subject: "[INFINITY-PROBE abc] ping",
    });
    expect(ingested.obligation?.clean_eligible).toBe(false);
    expect(ingested.obligation?.recovered).toBe(true);
    expect(ingested.obligation?.recovery_reason_codes).toContain("BLACKBOX_PROBE_EXCLUDED");
  });
});

describe("communication stakes", () => {
  it("records no real prospects and abandons the founder trial", () => {
    expect(COMMUNICATION_STAKES.real_prospects_on_legacy).toBe(false);
    expect(COMMUNICATION_STAKES.decision).toBe("HARD_CUTOVER");
    expect(isAbandonedFounderTrial(STRANDED_FOUNDER_TRIAL_INBOUND_ID)).toBe(true);
    const abandoned = abandonFounderTrialArtifact("2026-09-21T04:20:00.000Z");
    expect(abandoned.recovered).toBe(true);
    expect(abandoned.clean_eligible).toBe(false);
    expect(abandoned.counts_toward_clean).toBe(false);
    expect(abandoned.classification).toBe("ABANDONED_TEST_ARTIFACT");
  });

  it("keeps the gate list frozen and the release path small", () => {
    expect(COMMUNICATION_GATES_FROZEN).toBe(true);
    expect([...COMMUNICATION_RELEASE_PATH_CHECKS]).toEqual([
      "clean_checkout",
      "identity_baked_into_artifact",
      "production_stage_skip_domain",
      "staged_smoke",
      "promote_staged_production_only",
      "wait_real_cron_route",
      "rollback_if_cron_absent",
    ]);
  });
});
