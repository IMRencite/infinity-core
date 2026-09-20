import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  AFTERNOON_SEND_HYPOTHESIS,
  DEFAULT_CAMPAIGN_BUSINESS_DAYS,
  DEFAULT_FOLLOW_UP_1_BUSINESS_DAYS,
  DEFAULT_FOLLOW_UP_2_BUSINESS_DAYS,
  DEFAULT_MAX_TOUCHES,
  DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY,
  DEFAULT_STARTING_PROSPECT_TARGET,
  FIVE_CONTACTS_IS_INSUFFICIENT,
  GROWTH_EXPERIMENT_ACTIVE,
  GROWTH_TACTIC_SELECTION_ENGINE,
  INFINITY_FIRST_CONTACT_IDENTITY,
  INFINITY_TRUTHFUL_IDENTITY,
  MORNING_SEND_HYPOTHESIS,
} from "../contract";
import {
  evaluateAutonomousCommunicationQualityGate,
  evaluateInfinityIdentityTruthfulnessGate,
  identityReply,
  planResponseDelay,
} from "../communication";
import { buildGlobalGrowthNexusFloorView } from "../hq";
import {
  activateOccupancynpvFirstGrowthExperiment,
  advanceOccupancynpvGrowthExperiment,
  evaluateOccupancynpvMessageQuality,
  OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
  OCCUPANCYNPV_MESSAGE_VARIANTS,
  OCCUPANCYNPV_MINIMUM_QUALIFIED_CONVERSATIONS,
  OCCUPANCYNPV_PER_DEAL_PRICE_USD,
  OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
  OCCUPANCYNPV_TARGET_SEGMENT,
  occupancynpvGrowthSelectionInput,
  occupancynpvGrowthSendCycle,
  occupancynpvGrowthSourcingCycle,
  occupancynpvRankedTactics,
} from "../occupancynpv-experiment";
import {
  evaluateOutboundDeliverabilityHealthGate,
  evaluateOutreachEvidenceSufficiencyGate,
  shouldStopColdSequence,
} from "../outreach";
import { evaluateLiveOutboundCommunicationPathGate } from "../path-gate";
import { evaluatePassiveEvidenceWaitingGate } from "../readiness";
import { askReviewGrowthRecommendation, occupancynpvGrowthRecommendation } from "../recommendations";
import { selectFirstGrowthTactic, selectGrowthTactics } from "../selection";
import { evaluateTrialActivationGate } from "../trial";
import {
  evaluateOccupancynpvGrowthOutboundAuthority,
  evaluateProductionGrowthRuntimeReadinessGate,
} from "../production-readiness";

const ROOT = process.cwd();

describe("tactic selection", () => {
  it("ranks OccupancyNPV outbound first from economics, not founder preference", () => {
    expect(GROWTH_TACTIC_SELECTION_ENGINE).toBe("GrowthTacticSelectionEngine");
    const ranked = occupancynpvRankedTactics();
    expect(ranked[0]?.tactic).toBe("OUTBOUND_EMAIL");
    expect(ranked[0]?.timeToEvidence).toBe("FAST");
    expect(ranked[1]?.tactic).toBe("INTERACTIVE_PREVIEW");
    expect(ranked.map((row) => row.tactic)).toEqual(expect.arrayContaining(["SEO", "ORGANIC_CONTENT", "DEMO"]));
    expect(ranked.find((row) => row.tactic === "FREE_TRIAL")?.implementationReadiness).toBe("BLOCKED");
  });

  it("does not hard-code outbound when outreach is inappropriate", () => {
    const first = selectFirstGrowthTactic({
      ...occupancynpvGrowthSelectionInput(true),
      outreachAppropriate: false,
      traffic: "PRESENT",
      organicDemandEvidenced: true,
    });
    expect(first.tactic).not.toBe("OUTBOUND_EMAIL");
    expect(selectGrowthTactics({
      ...occupancynpvGrowthSelectionInput(true),
      outreachAppropriate: false,
    })[0]?.tactic).not.toBe("OUTBOUND_EMAIL");
  });
});

describe("targeting", () => {
  it("selects tenant-rep brokers from canonical economics", () => {
    expect(OCCUPANCYNPV_TARGET_SEGMENT.segment).toMatch(/tenant-representation/i);
    expect(OCCUPANCYNPV_TARGET_SEGMENT.evidence).toMatch(/VentureEconomicsIntelligenceContract/);
    expect(OCCUPANCYNPV_TARGET_SEGMENT.qualification).toMatch(/not suppressed/i);
    expect(OCCUPANCYNPV_TARGET_SEGMENT.estimatedReachableAudience).toBe("UNKNOWN");
    expect(OCCUPANCYNPV_TARGET_SEGMENT.confidence).toBe("MEDIUM");
  });
});

describe("campaign sizing", () => {
  it("uses adaptive 10/day × 20 days ≈ 200 with a 15-conversation minimum", () => {
    const campaign = activateOccupancynpvFirstGrowthExperiment({ persist: false });
    expect(campaign.campaign_id).toBe(OCCUPANCYNPV_GROWTH_CAMPAIGN_ID);
    expect(campaign.daily_new_contact_target).toBe(DEFAULT_NEW_QUALIFIED_CONTACTS_PER_BUSINESS_DAY);
    expect(campaign.campaign_duration_business_days).toBe(DEFAULT_CAMPAIGN_BUSINESS_DAYS);
    expect(campaign.initial_prospect_target).toBe(DEFAULT_STARTING_PROSPECT_TARGET);
    expect(campaign.adaptive_volume).toBe(true);
    expect(campaign.minimum_qualified_conversations).toBe(OCCUPANCYNPV_MINIMUM_QUALIFIED_CONVERSATIONS);
    expect(OCCUPANCYNPV_MINIMUM_QUALIFIED_CONVERSATIONS).toBeGreaterThan(FIVE_CONTACTS_IS_INSUFFICIENT);
    expect(campaign.conservative_daily_ramp).toBe(5);
  });
});

describe("send timing", () => {
  it("uses recipient local morning and afternoon hypotheses", () => {
    const campaign = activateOccupancynpvFirstGrowthExperiment({ persist: false });
    expect(campaign.timezone_strategy).toBe("recipient_local_time");
    expect(campaign.send_windows).toEqual([MORNING_SEND_HYPOTHESIS, AFTERNOON_SEND_HYPOTHESIS]);
    expect(campaign.weekday_strategy).toMatch(/Tuesday–Thursday/);
    expect(campaign.weekday_strategy).toMatch(/Monday\/Friday/);
  });
});

describe("follow-up", () => {
  it("bounds three touches and stops on reply, unsubscribe, bounce, and complaint", () => {
    const campaign = activateOccupancynpvFirstGrowthExperiment({ persist: false });
    expect(campaign.max_touches).toBe(DEFAULT_MAX_TOUCHES);
    expect(campaign.follow_up_1_business_days).toBe(DEFAULT_FOLLOW_UP_1_BUSINESS_DAYS);
    expect(campaign.follow_up_2_business_days).toBe(DEFAULT_FOLLOW_UP_2_BUSINESS_DAYS);
    expect(shouldStopColdSequence("reply")).toBe(true);
    expect(shouldStopColdSequence("unsubscribe")).toBe(true);
    expect(shouldStopColdSequence("hard_bounce")).toBe(true);
    expect(shouldStopColdSequence("complaint")).toBe(true);
    expect(campaign.stop_on).toEqual(expect.arrayContaining([
      "reply",
      "unsubscribe",
      "hard_bounce",
      "complaint",
    ]));
  });
});

describe("identity", () => {
  it("opens as I’m Infinity, blocks impersonation, and answers identity questions truthfully", () => {
    expect(OCCUPANCYNPV_MESSAGE_VARIANTS).toHaveLength(2);
    expect(OCCUPANCYNPV_MESSAGE_VARIANTS.every((row) => !row.body.startsWith(INFINITY_FIRST_CONTACT_IDENTITY))).toBe(true);
    expect(OCCUPANCYNPV_MESSAGE_VARIANTS.every((row) => row.body.includes("— Infinity"))).toBe(true);
    expect(OCCUPANCYNPV_MESSAGE_VARIANTS.every((row) => row.body.includes("OccupancyNPV | occupancynpv.com"))).toBe(true);
    expect(OCCUPANCYNPV_MESSAGE_VARIANTS[0]!.body).toMatch(/spreadsheet|rebuild|messy/i);
    expect(evaluateOccupancynpvMessageQuality()).toEqual({ identity: "PASS", quality: "PASS" });
    expect(evaluateInfinityIdentityTruthfulnessGate({
      opening: "Hi, I’m Sarah from sales",
      askedAboutIdentity: false,
    }).result).toBe("FAIL");
    expect(identityReply("IDENTITY_QUESTION")).toBe(INFINITY_TRUTHFUL_IDENTITY);
    expect(evaluateAutonomousCommunicationQualityGate({
      message: OCCUPANCYNPV_MESSAGE_VARIANTS[0]!.body,
      ignoresThread: false,
      repeatsContent: false,
      unsupportedClaim: false,
      continuesAfterOptOut: false,
      wrongVentureContext: false,
    }).result).toBe("PASS");
  });
});

describe("response pacing", () => {
  it("varies routine delay, considers recipient local time, and never delays urgent issues", () => {
    const urgent = planResponseDelay({ urgent: true, afterHoursRecipientLocal: true, complexity: "LOW" });
    expect(urgent.delayMinutes).toBe(0);
    expect(urgent.artificiallyDelayedUrgent).toBe(false);
    const afterHours = planResponseDelay({ urgent: false, afterHoursRecipientLocal: true, complexity: "LOW" });
    expect(afterHours.queueForNextWindow).toBe(true);
    const low = planResponseDelay({ urgent: false, afterHoursRecipientLocal: false, complexity: "LOW" });
    const high = planResponseDelay({ urgent: false, afterHoursRecipientLocal: false, complexity: "HIGH" });
    expect(low.delayMinutes).toBeGreaterThanOrEqual(3);
    expect(high.delayMinutes).toBeGreaterThan(low.delayMinutes);
  });
});

describe("provider path", () => {
  it("does not mark the live path ready from configuration and never sends an unsolicited test", () => {
    const path = evaluateLiveOutboundCommunicationPathGate();
    expect(path.gate).toBe("LiveOutboundCommunicationPathGate");
    expect(path.sentUnsolicitedTest).toBe(false);
    if (!path.durableWriteVerified || !path.liveCredentials) {
      expect(path.result).toBe("FAIL");
    }
    expect(path.reasons.includes("DURABLE_WRITE_VERIFICATION_MISSING") || path.durableWriteVerified).toBe(true);
  });
});

describe("deliverability", () => {
  it("fails volume increase while bounce or complaint health is unsafe", () => {
    expect(evaluateOutboundDeliverabilityHealthGate({
      hardBounceRate: 0,
      complaintRate: 0,
      increasingVolumeWhileUnhealthy: false,
    }).result).toBe("PASS");
    expect(evaluateOutboundDeliverabilityHealthGate({
      hardBounceRate: 0.2,
      complaintRate: 0.01,
      increasingVolumeWhileUnhealthy: true,
    }).result).toBe("FAIL");
  });
});

describe("evidence sufficiency", () => {
  it("rejects a five-contact high-confidence no-demand claim", () => {
    const campaign = activateOccupancynpvFirstGrowthExperiment({ persist: false });
    expect(campaign.ledger.prospectsSourced).toBe(0);
    expect(campaign.ledger.attempted).toBe(0);
    expect(evaluateOutreachEvidenceSufficiencyGate({
      prospectsSourced: FIVE_CONTACTS_IS_INSUFFICIENT,
      qualifiedConversations: 0,
      claimedNoDemand: true,
      confidence: "HIGH",
    }).result).toBe("FAIL");
    expect(evaluateOutreachEvidenceSufficiencyGate({
      prospectsSourced: 0,
      qualifiedConversations: 0,
      claimedNoDemand: false,
      confidence: "LOW",
    }).result).toBe("PASS");
  });
});

describe("automation", () => {
  it("advances the campaign without fabricating sourced or sent counts", () => {
    const advanced = advanceOccupancynpvGrowthExperiment({ persist: false, now: "2026-09-10T17:30:00.000Z" });
    expect(advanced.status).toBe(GROWTH_EXPERIMENT_ACTIVE);
    expect(advanced.trial_enabled).toBe(false);
    expect(advanced.prices_locked).toEqual({
      professional_usd: OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
      per_deal_usd: OCCUPANCYNPV_PER_DEAL_PRICE_USD,
    });
    expect(occupancynpvGrowthSourcingCycle()).toEqual({
      sourced: 0,
      qualified: 0,
      queued: 0,
      reason: "ISOLATED_GROWTH_DEPLOYMENT_ARTIFACT_REQUIRED",
    });
    expect(occupancynpvGrowthSendCycle(advanced.ledger).sent).toBe(0);
    expect(advanced.ledger.prospectsSourced).toBe(0);
    expect(advanced.ledger.attempted).toBe(0);
    expect(evaluateTrialActivationGate({ enabled: advanced.trial_enabled, authorized: false }).result).toBe("PASS");
  });
});

describe("production readiness", () => {
  it("does not infer send or deploy authority from working-tree campaign state", () => {
    const authority = evaluateOccupancynpvGrowthOutboundAuthority();
    expect(authority.routineOutboundSend).toBe("NOT_AUTHORIZED");
    expect(authority.deploymentAuthority).toBe("NOT_AUTHORIZED");
    expect(authority.reasons).toEqual(expect.arrayContaining([
      "ISOLATED_GROWTH_DEPLOYMENT_ARTIFACT_REQUIRED",
      "AUTHORITY_NOT_INFERRED_FROM_CODE_OR_EXPERIMENT_FLAG",
      "CANONICAL_DEPLOYMENT_AUTHORITY_NONE",
    ]));
    const gate = evaluateProductionGrowthRuntimeReadinessGate();
    expect(gate.gate).toBe("ProductionGrowthRuntimeReadinessGate");
    expect(gate.result).toBe("FAIL");
    expect(gate.productionContainsRuntime).toBe(false);
    expect(gate.schedulerSeesCampaign).toBe(false);
    expect(gate.sourcingReady).toBe(false);
    expect(gate.sendQueueReady).toBe(false);
    expect(gate.reasons).toEqual(expect.arrayContaining([
      "PRODUCTION_DOES_NOT_CONTAIN_GROWTH_RUNTIME",
      "ROUTINE_OUTBOUND_SEND_NOT_AUTHORIZED",
    ]));
  });
});

describe("HQ", () => {
  it("shows OccupancyNPV campaign fields and keeps AskReview designed-only", () => {
    const floor = buildGlobalGrowthNexusFloorView();
    const occ = floor.views.find((view) => view.strategy.venture_id === CRE_VENTURE_ID);
    const ask = floor.views.find((view) => view.strategy.venture_id === ASKREVIEW_VENTURE_ID);
    expect(occ?.strategy.current_status).toBe(GROWTH_EXPERIMENT_ACTIVE);
    expect(occ?.campaign.campaignId).toBe(OCCUPANCYNPV_GROWTH_CAMPAIGN_ID);
    expect(occ?.campaign.dailyTarget).toBe(10);
    expect(occ?.campaign.selectedSegment).toMatch(/tenant/i);
    expect(occ?.campaign.sendTimeExperiment).toContain("08:30-10:30");
    expect(occ?.campaign.currentBestWindow).toMatch(/experimental/i);
    expect(occ?.campaign.nextSendWindow).toMatch(/no qualified prospects queued/i);
    expect(occ?.nextLearningObjective).toBeTruthy();
    expect(occ?.trial.enabled).toBe(false);
    expect(ask?.strategy.authorized_to_execute).toBe(false);
    expect(askReviewGrowthRecommendation().strategy.current_evidence.join(" ")).toMatch(/PRODUCTION PAUSED/);
    expect(evaluatePassiveEvidenceWaitingGate({
      status: occupancynpvGrowthRecommendation().strategy.current_status,
      activeOrRecentEvidenceTactic: true,
      legitimateExternalDependency: false,
    }).result).toBe("PASS");
    const panel = readFileSync(join(ROOT, "components/dashboard/operator-console/department-detail-panel.tsx"), "utf8");
    expect(panel).toContain("Selected Segment");
    expect(panel).toContain("Contacts Sourced");
    expect(panel).toContain("Contacts Sent");
    expect(panel).toContain("Qualified Conversations");
    expect(panel).toContain("Send-Time Experiment");
    expect(panel).toContain("Current Best Window");
    expect(panel).toContain("Next Send Window");
    expect(panel).toContain("Next Learning Objective");
  });
});
