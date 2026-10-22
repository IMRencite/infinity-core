import { describe, expect, it, beforeEach } from "vitest";
import {
  candidateQuarantineKey,
  isCandidateQuarantined,
  quarantineCandidateQcExhausted,
  resetCandidateQuarantineStoreForTests,
} from "../venture-candidate-quarantine-v1";
import {
  hydratePortfolioCandidateQuarantineCache,
  resetPortfolioCandidateQuarantineCacheForTests,
  type DurablePortfolioCandidateStateRow,
} from "../durable/durable-portfolio-candidate-state-v1";
import { resolveAlternateTopicDecision } from "../durable/durable-content-self-healing-v1";
import { resolveLiveVentureContentContinuityV1 } from "../live-venture-content-continuity-v1";
import {
  evaluateLiveVentureDailyOutputFloorQc,
  evaluateLiveVentureDailyOutputOrchestrationQc,
} from "../venture-daily-output-v1";
import { mapProvenanceToLedgerTriggerType } from "../durable/portfolio-cron-provenance-v1";
import { preserveImmutableCyclePayloadFields } from "../durable/autonomous-portfolio-durable-execution-v1";
import { evaluateCtShirtConceptRotationQc } from "../venture-daily-output-v1";

function quarantineRow(input: {
  venture_id: string;
  candidate_key: string;
  lane: "CONTENT_SLUG" | "SHIRT_CONCEPT";
}): DurablePortfolioCandidateStateRow {
  const now = new Date().toISOString();
  return {
    venture_id: input.venture_id,
    lane: input.lane,
    candidate_key: input.candidate_key,
    revision_identity: null,
    terminal_state: "QUARANTINED_QC_EXHAUSTED",
    failure_class: "QC_EXHAUSTED",
    attempt_count: 3,
    failure_reasons: ["QC_EXHAUSTED"],
    quarantine_reason: "QC_EXHAUSTED",
    quarantined_at: now,
    last_cycle_id: null,
    last_release_sha: null,
    payload: {},
    updated_at: now,
  };
}

describe("business output completion repair v1", () => {
  beforeEach(() => {
    resetCandidateQuarantineStoreForTests();
    resetPortfolioCandidateQuarantineCacheForTests();
  });

  it("durable quarantine survives simulated cold start via cache hydrate", () => {
    const key = candidateQuarantineKey({ venture_id: "club-throttle", slug: "garage-culture-as-rider-social-life" });
    hydratePortfolioCandidateQuarantineCache(
      [quarantineRow({ venture_id: "club-throttle", candidate_key: key, lane: "CONTENT_SLUG" })],
      { replace: true },
    );
    expect(
      isCandidateQuarantined({ venture_id: "club-throttle", candidate_key: key, lane: "CONTENT_SLUG" }),
    ).toBe(true);
  });

  it("quarantined slug excluded from self-heal selection after reset", () => {
    const slugA = "garage-culture-as-rider-social-life";
    quarantineCandidateQcExhausted({
      venture_id: "club-throttle",
      candidate_key: candidateQuarantineKey({ venture_id: "club-throttle", slug: slugA }),
      failure_reasons: ["EDITORIAL_QC_FAIL"],
    });
    const continuity = resolveLiveVentureContentContinuityV1({ venture_id: "club-throttle" });
    expect(continuity.self_heal_candidate_slug).not.toBe(slugA);
  });

  it("duplicate quarantine writes remain idempotent in memory store", () => {
    const key = candidateQuarantineKey({ venture_id: "club-throttle", slug: "a" });
    quarantineCandidateQcExhausted({ venture_id: "club-throttle", candidate_key: key, failure_reasons: ["x"] });
    quarantineCandidateQcExhausted({ venture_id: "club-throttle", candidate_key: key, failure_reasons: ["y"] });
    expect(isCandidateQuarantined({ venture_id: "club-throttle", candidate_key: key })).toBe(true);
  });

  it("HOLD_ALTERNATE_TOPIC only while repair in-flight", () => {
    expect(
      resolveAlternateTopicDecision({
        published_count: 0,
        self_heal_exhausted: false,
        self_heal_attempts: 1,
        quarantined: false,
      }),
    ).toBe("HOLD_ALTERNATE_TOPIC");
    expect(
      resolveAlternateTopicDecision({
        published_count: 0,
        self_heal_exhausted: true,
        self_heal_attempts: 4,
        quarantined: true,
      }),
    ).toBe("RELEASE_ALTERNATE_TOPIC");
  });

  it("daily output QC semantic split: orchestration can pass while floor fails", () => {
    const continuity = resolveLiveVentureContentContinuityV1({ venture_id: "club-throttle" });
    const orchestration = evaluateLiveVentureDailyOutputOrchestrationQc({
      venture_id: "club-throttle",
      continuity,
    });
    const floor = evaluateLiveVentureDailyOutputFloorQc({ venture_id: "club-throttle", continuity });
    expect(orchestration.result).toBe("PASS");
    expect(floor.result).toBe("FAIL");
  });

  it("ledger maps AUTHENTICATED_CRON_SHAPED to CRON_SHAPED", () => {
    expect(mapProvenanceToLedgerTriggerType("AUTHENTICATED_CRON_SHAPED")).toBe("CRON_SHAPED");
    expect(mapProvenanceToLedgerTriggerType("REAL_CRON_PLATFORM_CONFIRMED")).toBe("REAL_CRON");
  });

  it("payload merge preserves immutable release identity fields", () => {
    const merged = preserveImmutableCyclePayloadFields(
      {
        runtime_release_sha: "8556e7ee40f6665346756b401d64b074e6f446bc",
        runtime_deployment_id: "dpl_8zJuBNjDrS73MLoaovQ9wKR4D618",
        ct_daily_output: { x: 1 },
      },
      { ct_daily_output: { x: 2 }, runtime_release_sha: null },
    );
    expect(merged.runtime_release_sha).toBe("8556e7ee40f6665346756b401d64b074e6f446bc");
    expect(merged.runtime_deployment_id).toBe("dpl_8zJuBNjDrS73MLoaovQ9wKR4D618");
  });

  it("CT shirt concept rotation QC", () => {
    expect(
      evaluateCtShirtConceptRotationQc({
        first_concept_art_qc_fail: true,
        second_concept_passes: true,
        selected_concept_id: "ct-merch-concept-v44-1",
        second_concept_id: "ct-merch-concept-v44-1",
      }),
    ).toBe("PASS");
  });
});
