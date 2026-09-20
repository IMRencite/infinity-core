import { describe, expect, it } from "vitest";
import { evaluateIsolatedProductionArtifactContract, evaluateProductionArtifactContaminationGate } from "../isolated-artifact";
import { evaluateOutboundProspectQualificationGate, type QualifiedOutboundProspect } from "../qualification";
import { evaluatePerProspectOutboundAuthorizationGate } from "../per-prospect-auth";
import { evaluateOutboundSchedulerWindowCoverageGate, recipientLocalWindowEligible } from "../scheduler-coverage";
import { evaluateQualifiedProspectSourceAuthorizationGate } from "../prospect-source";
import { evaluateOccupancynpvGrowthOutboundAuthority, evaluateProductionGrowthRuntimeReadinessGate } from "../production-readiness";
import { occupancynpvBoundedGrowthGrantRecorded } from "../founder-grant";
import { OCCUPANCYNPV_GROWTH_CAMPAIGN_ID } from "../occupancynpv-experiment";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";

describe("bounded founder grant", () => {
  it("records the grant without authorizing dirty-tree deploy or send", () => {
    expect(occupancynpvBoundedGrowthGrantRecorded()).toBe(true);
    const authority = evaluateOccupancynpvGrowthOutboundAuthority();
    expect(authority.routineOutboundSend).toBe("NOT_AUTHORIZED");
    expect(authority.deploymentAuthority).toBe("NOT_AUTHORIZED");
    expect(authority.blockingAuthorization).toBe("ISOLATED_GROWTH_DEPLOYMENT_ARTIFACT_REQUIRED");
    expect(authority.reasons).toEqual(expect.arrayContaining([
      "ISOLATED_GROWTH_DEPLOYMENT_ARTIFACT_REQUIRED",
      "AUTHORITY_NOT_INFERRED_FROM_CODE_OR_EXPERIMENT_FLAG",
    ]));
  });
});

describe("isolated artifact", () => {
  it("fails isolation because growth runtime is not on HEAD and AskReview stays out", () => {
    const isolation = evaluateIsolatedProductionArtifactContract();
    const contamination = evaluateProductionArtifactContaminationGate();
    expect(isolation.result).toBe("FAIL");
    expect(isolation.reasons).toEqual(expect.arrayContaining([
      "HEAD_MISSING:lib/infinity/growth-engine/occupancynpv-experiment.ts",
      "HEAD_MISSING:app/api/runtime/venture-operating-cycle/route.ts",
      "DEPENDENCY_CLOSURE_NOT_ON_BASELINE",
    ]));
    expect(contamination.result).toBe("PASS");
    expect(isolation.artifact.askReviewIncluded).toBe(0);
    expect(isolation.artifact.included.join(" ")).not.toMatch(/askreview/i);
  });
});

describe("scheduler coverage", () => {
  it("passes hourly cadence and rejects twelve-hour-only cadence", () => {
    expect(evaluateOutboundSchedulerWindowCoverageGate({
      cronExpressions: ["0 * * * *", "0 12 * * *"],
    }).result).toBe("PASS");
    const twelve = evaluateOutboundSchedulerWindowCoverageGate({
      cronExpressions: ["0 */12 * * *", "0 12 * * *"],
    });
    expect(twelve.result).toBe("FAIL");
    expect(recipientLocalWindowEligible(9, 0)).toBe(true);
    expect(recipientLocalWindowEligible(11, 0)).toBe(false);
    expect(recipientLocalWindowEligible(13, 30)).toBe(true);
    expect(recipientLocalWindowEligible(16, 0)).toBe(false);
  });
});

describe("qualification", () => {
  it("rejects residential-only and unpublished email", () => {
    const base: QualifiedOutboundProspect = {
      contract: "QualifiedOutboundProspectContract",
      venture_id: CRE_VENTURE_ID,
      campaign_id: OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
      prospect_id: "prs_test",
      business_name: "Example Realty",
      person_name: "Alex",
      role: "residential realtor",
      business_relevance: false,
      segment_match: false,
      source_provider: "duckduckgo_html",
      source_url: "https://example.com/team",
      discovery_timestamp: "2026-09-10T00:00:00.000Z",
      public_business_context: "residential home sales",
      business_domain: "example.com",
      business_email: null,
      geography: "US",
      timezone: null,
      timezone_basis: null,
      qualification_confidence: "LOW",
      reason_for_contact_evidence: "",
      contact_eligible: false,
      duplicate: false,
      suppressed: false,
      fabricated_email: false,
    };
    const rejected = evaluateOutboundProspectQualificationGate(base);
    expect(rejected.result).toBe("FAIL");
    expect(rejected.reasons).toEqual(expect.arrayContaining([
      "IRRELEVANT_RESIDENTIAL_OR_CONSUMER",
      "SEGMENT_MISMATCH",
      "NO_PUBLISHED_BUSINESS_EMAIL",
    ]));
  });
});

describe("per-prospect send", () => {
  it("does not treat campaign authorization as per-prospect authorization", () => {
    const gate = evaluatePerProspectOutboundAuthorizationGate({
      prospect: {
        contract: "QualifiedOutboundProspectContract",
        venture_id: CRE_VENTURE_ID,
        campaign_id: OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
        prospect_id: "prs_unqualified",
        business_name: "Unknown",
        person_name: null,
        role: null,
        business_relevance: false,
        segment_match: false,
        source_provider: "duckduckgo_html",
        source_url: "not-a-url",
        discovery_timestamp: "2026-09-10T00:00:00.000Z",
        public_business_context: "unknown",
        business_domain: null,
        business_email: null,
        geography: null,
        timezone: null,
        timezone_basis: null,
        qualification_confidence: "LOW",
        reason_for_contact_evidence: "",
        contact_eligible: false,
        duplicate: false,
        suppressed: false,
        fabricated_email: false,
      },
      campaignId: OCCUPANCYNPV_GROWTH_CAMPAIGN_ID,
      campaignStatus: "GROWTH_EXPERIMENT_ACTIVE",
      message: "I’m Infinity. OccupancyNPV compares lease occupancy scenarios.",
      variantId: "variant_problem_framing",
      recipientLocalHour: 9,
      recipientLocalMinute: 0,
      recipientLocalWeekday: 2,
      dailySent: 0,
      dailyCap: 5,
    });
    expect(gate.prospectSendAuthorized).toBe(false);
    expect(gate.result).toBe("FAIL");
  });
});

describe("source and production readiness", () => {
  it("does not treat a configured public-web default as production-ready without isolation", () => {
    const source = evaluateQualifiedProspectSourceAuthorizationGate();
    expect(source.gate).toBe("QualifiedProspectSourceAuthorizationGate");
    expect(source.source.vendor_neutral).toBe(true);
    expect(source.source.contact_data_coverage).toBe("PUBLISHED_BUSINESS_EMAIL_ONLY");
    const ready = evaluateProductionGrowthRuntimeReadinessGate();
    expect(ready.result).toBe("FAIL");
    expect(ready.productionContainsRuntime).toBe(false);
    expect(ready.sourcingReady).toBe(false);
    expect(ready.sendQueueReady).toBe(false);
  });
});
