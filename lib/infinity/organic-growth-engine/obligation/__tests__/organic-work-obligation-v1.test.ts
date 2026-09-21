import { describe, expect, it } from "vitest";
import { evaluateContentCannibalizationGate, evaluateOrganicContentDecisionGate, selectFirstOccupancyNpvOrganicOpportunity } from "../opportunity";
import { evaluateOrganicWorkLivenessInvariant, transitionOrganicWork } from "../transition";
import { executeOrganicGrowthSchedulerTick, resumeOrganicPublishingAfterRepairedCanary } from "../scheduler";
import { occupancynpvLeaseInputsDraft } from "../../continuous/occupancynpv-lease-inputs-page";
import { evaluateOrganicContentQualityGate, evaluateOrganicEvidenceGate } from "../../continuous/quality";
import { composeOccupancyNpvOrganicLiveFiles } from "../../continuous/occupancynpv-publisher";
import { FIRST_LEASE_INPUTS_QUESTION, FIRST_LEASE_INPUTS_ROUTE } from "../opportunity";
import { evaluateOrganicProductionPublishGate, evaluateOrganicPublishSafetyGate, evaluateProductionContentCanaryGate } from "../gates";

describe("OrganicWorkObligation", () => {
  it("uses a single writer with legal transitions and owner/deadline", () => {
    const created = transitionOrganicWork({
      current: null,
      to_state: "SELECTED",
      expected_version: 0,
      actor: "OrganicGrowthScheduler",
      reason: "FIRST_VOC",
      now: "2026-09-20T05:00:00.000Z",
      owner: "OrganicGrowthWorker",
      next_action_at: "2026-09-20T05:00:00.000Z",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(evaluateOrganicWorkLivenessInvariant(created.obligation, "2026-09-20T05:00:00.000Z").result).toBe("PASS");
    const illegal = transitionOrganicWork({
      current: created.obligation,
      to_state: "VERIFIED",
      expected_version: created.obligation.version,
      actor: "HQ",
      reason: "SKIP",
      now: "2026-09-20T05:01:00.000Z",
    });
    expect(illegal.ok).toBe(false);
    const cas = transitionOrganicWork({
      current: created.obligation,
      to_state: "SCHEDULED",
      expected_version: 99,
      actor: "OrganicGrowthScheduler",
      reason: "STALE",
      now: "2026-09-20T05:01:00.000Z",
    });
    expect(cas.ok).toBe(false);
  });

  it("selects the lease-input checklist from real sales VOC without cannibalizing process pages", () => {
    const opportunity = selectFirstOccupancyNpvOrganicOpportunity("2026-09-20T05:00:00.000Z");
    expect(opportunity.question).toBe(FIRST_LEASE_INPUTS_QUESTION);
    expect(opportunity.decision).toBe("NEW_PAGE");
    expect(evaluateOrganicContentDecisionGate({
      decision: opportunity.decision,
      reason: opportunity.decision_reason,
    }).result).toBe("PASS");
    expect(evaluateContentCannibalizationGate({
      question: opportunity.question,
      existing_questions: ["How do you compare two commercial lease options?"],
    }).result).toBe("PASS");
  });

  it("arms a daily scheduler run without Cursor or founder trigger", () => {
    resumeOrganicPublishingAfterRepairedCanary();
    const tick = executeOrganicGrowthSchedulerTick({
      now: "2026-09-20T07:00:00.000Z",
      trigger_source: "VERCEL_CRON",
      execute_publish: true,
    });
    expect(tick.state.cursor_triggered).toBe(false);
    expect(tick.state.founder_triggered).toBe(false);
    expect(tick.state.manual_trigger).toBe(false);
    expect(tick.obligation?.owner).toBeTruthy();
    expect(tick.obligation?.next_action_at).toBeTruthy();
    expect(tick.execute_publish).toBe(true);
  });

  it("passes quality, evidence, and bundle injection for the first live asset", () => {
    const draft = occupancynpvLeaseInputsDraft();
    expect(evaluateOrganicContentQualityGate(draft).result).toBe("PASS");
    expect(evaluateOrganicEvidenceGate(draft, true).result).toBe("PASS");
    const composed = composeOccupancyNpvOrganicLiveFiles();
    expect(composed.files.some((file) => file.path.replace(/\\/g, "/").includes("what-numbers-do-you-need-to-compare-two-commercial-leases"))).toBe(true);
    expect(evaluateOrganicPublishSafetyGate({
      canonical: `https://occupancynpv.com${FIRST_LEASE_INPUTS_ROUTE}`,
      slug_unique: true,
      url_collision: false,
      redirect_conflict: false,
      overwrite: false,
      production_host: true,
      staging_url: false,
      noindex: false,
    }).result).toBe("PASS");
    expect(evaluateOrganicProductionPublishGate({
      decision: { gate: "OrganicContentDecisionGate", result: "PASS", reasons: [] },
      cannibalization: { gate: "ContentCannibalizationGate", result: "PASS", reasons: [] },
      human_value: { gate: "HumanValue", result: "PASS", reasons: [] },
      evidence: { gate: "ContentEvidenceGate", result: "PASS", reasons: [] },
      freshness: { gate: "Freshness", result: "PASS", reasons: [] },
      product_truth: { gate: "ProductClaimTruthGate", result: "PASS", reasons: [] },
      commercial_integrity: { gate: "CommercialIntegrity", result: "PASS", reasons: [] },
      seo: { gate: "OrganicSEOGate", result: "PASS", reasons: [] },
      geo: { gate: "GEOReadinessGate", result: "PASS", reasons: [] },
      internal_links: { gate: "BidirectionalInternalLinkGate", result: "PASS", reasons: [] },
      schema: { gate: "SchemaValidationGate", result: "PASS", reasons: [] },
      visual: { gate: "ContentVisualUtilityGate", result: "PASS", reasons: [] },
      rendered_quality: { gate: "OrganicRenderedQualityGate", result: "PASS", reasons: [] },
      publish_safety: { gate: "OrganicPublishSafetyGate", result: "PASS", reasons: [] },
    }).result).toBe("PASS");
    expect(evaluateProductionContentCanaryGate({
      http_status: 200,
      production_host: true,
      canonical_ok: true,
      title_ok: true,
      h1_ok: true,
      body_ok: true,
      schema_ok: true,
      robots_ok: true,
      indexable: true,
      sitemap_ok: true,
    }).result).toBe("PASS");
  });
});
