import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { resetPublicWebResearchCheckpoints } from "@/lib/infinity/research/public-web";
import { resetCommunicationProviderRuntime } from "@/lib/infinity/communication-provider";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/mission-runtime/tick-auth";
import {
  ACQUISITION_TRIGGERS,
  auditCommunicationCapabilities,
  extractProspectsFromFindings,
  extractPublishedContactability,
  founderCommandRequestText,
  invokeMarketValidationAcquisitionRuntime,
  isAcquisitionTrigger,
  prepareValidationDraft,
  rankPreparedProspects,
  resolvePreparationBlocker,
} from "../index";

const NOW = new Date("2026-08-29T16:00:00.000Z");
const ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const TEAM = "https://example.com/hale-occupier-advisors/team/jordan-hale";
const HTML = `<html><head><title>Hale Occupier Advisors</title></head><body>
<p>Jordan Hale is a tenant representation broker advising occupiers on commercial leases.</p>
<p>Priya Shah is a tenant representation broker for office occupiers.</p>
<a href="mailto:office@example.com">office@example.com</a>
<form action="/contact"><input name="message" /></form>
</body></html>`;

describe("AUTONOMOUS CRE COHORT COMPLETION + PUBLIC CONTACTABILITY + OUTREACH READINESS V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPublicWebResearchCheckpoints();
    resetCommunicationProviderRuntime();
  });

  it("does not request communication authorization before an executable action exists", () => {
    expect(
      resolvePreparationBlocker({
        highConfidence: 1,
        actionable: 0,
        drafts: 0,
        pathsExhausted: true,
      }),
    ).toBe("ACQUISITION_PREPARATION_INCOMPLETE");
    expect(
      resolvePreparationBlocker({
        highConfidence: 2,
        actionable: 2,
        drafts: 2,
        pathsExhausted: true,
      }),
    ).toBe("COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED");
    expect(auditCommunicationCapabilities().every((row) => !row.available && !row.verified)).toBe(true);
  });

  it("extracts only published public-business contact and never guesses email", () => {
    const fromTeam = extractPublishedContactability({ url: TEAM, text: "tenant representation broker", html: "" });
    expect(fromTeam.status).toBe("PUBLIC_PROFESSIONAL_PROFILE");
    expect(fromTeam.scope).toBe("DIRECT_CONTACT");
    const fromContact = extractPublishedContactability({
      url: "https://example.com/contact",
      text: "Contact Hale Occupier Advisors",
      html: `<a href="mailto:office@example.com">office@example.com</a>`,
    });
    expect(fromContact.status).toBe("DIRECT_PUBLIC_BUSINESS_EMAIL");
    expect(fromContact.channel).toBe("office@example.com");
    expect(fromContact.scope).toBe("ORGANIZATION_LEVEL_CONTACT");
    const guessed = extractPublishedContactability({
      url: "https://otherfirm.com/about",
      text: "Jordan Hale tenant representation",
      html: "",
    });
    expect(guessed.status).toBe("CONTACT_CHANNEL_NOT_YET_IDENTIFIED");
    expect(guessed.channel).toBeNull();
  });

  it("prepares grounded drafts without finished-product or traction claims", () => {
    const draft = prepareValidationDraft({
      prospectId: "prs_test",
      name: "Jordan Hale",
      organization: "Hale Occupier Advisors",
      publicRole: "tenant-representation broker",
      publicProfileUrl: TEAM,
      publicContactChannel: TEAM,
      persona: "tenant_rep_broker",
      qualification: {
        contractId: "cre_lease_npv_qualified_prospect_v1",
        qualified: true,
        reason: "Qualified CRE prospect.",
        highConfidence: true,
        status: "PROSPECT_QUALIFIED",
        contactChannelAvailable: true,
        confidence: "HIGH",
      },
      lineage: { sourceUrls: [TEAM], findingId: null, grounded: true, fabricated: false },
    });
    expect(draft.messagesSent).toBe(0);
    expect(draft.finishedProductClaim).toBe(false);
    expect(draft.fabricatedTraction).toBe(false);
    expect(draft.body).toMatch(/not a finished product/i);
    expect(draft.body).not.toMatch(/we already have customers|proven traction|existing paying customers/i);
    expect(draft.body).toContain("Hale Occupier Advisors");
  });

  it("runs continued discovery, ranking, and Command governance without sending", async () => {
    const result = await invokeMarketValidationAcquisitionRuntime({
      organizationId: ORG,
      now: NOW,
      liveDiscovery: true,
      search: async (query) => [
        {
          query,
          title: "Hale Occupier Advisors — Tenant Representation Team",
          url: TEAM,
          snippet: "Tenant representation brokers.",
          provider: "injected",
          rank: 1,
          observedAt: NOW.toISOString(),
          costState: "UNKNOWN",
          traceId: "pws_c1",
        },
      ],
      fetchImpl: async (url) =>
        Promise.resolve(new Response(HTML, { status: 200, headers: { "content-type": "text/html" } })),
    });
    expect(result.discovery.highConfidenceQualified).toBeGreaterThanOrEqual(1);
    expect(result.discovery.highConfidenceQualified).toBeLessThanOrEqual(8);
    expect(result.discovery.fabricatedProspects).toBe(false);
    expect(result.discovery.outreach?.draftsPrepared).toBeGreaterThanOrEqual(1);
    expect(result.unauthorizedActions.realOutreach).toBe(0);
    expect(result.performance.countsAsMarketEvidence).toBe(false);
    expect(result.counts.qualifiedSubmissions).toBe(0);
    expect(result.governance.blocker).not.toBe("FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED");
    expect(result.command.recentEvents.some((event) => event.stepType === "CONTACTABILITY_RESEARCH")).toBe(true);
    expect(result.command.recentEvents.some((event) => event.stepType === "OUTREACH_PREPARATION")).toBe(true);
    expect(result.experiment.clock.restarted).toBe(false);
    expect(result.experiment.artifactId).toBe("art_d20f8a53a3ef1de20ebe");
    const request = founderCommandRequestText({
      actionable: result.discovery.outreach?.actionable ?? 0,
      channelSummary: "public professional profile",
      blocker: result.governance.blocker,
    });
    expect(request).toMatch(/No messages have been sent/);
    expect(authorizeRuntimeTickRequest(new Request("https://x/api/runtime/tick"), { NODE_ENV: "test" }).ok).toBe(false);
    const dashboard = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");
    const money = readFileSync(join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"), "utf8");
    expect(dashboard).toContain("InfinityHqExperience");
    expect(money).toContain('money: "Money"');
    expect(isAcquisitionTrigger("AUTHORIZATION_GRANTED")).toBe(true);
    expect(isAcquisitionTrigger("COMMUNICATIONS_MISSION_COMPLETED")).toBe(true);
    expect(isAcquisitionTrigger("RESEARCH_FAILURE_CLEARED")).toBe(true);
    expect(ACQUISITION_TRIGGERS).toContain("REAL_SUBMISSION_RECEIVED");
    expect(result.command.nowInspecting.authorizationRequired).toBeNull();
    expect(result.nextMission.financialAuthorizationRequired).toBe(false);
    expect(result.discovery.outreach?.campaign.campaign).toBe("cre_validation_initial_cohort_v1");
    expect(result.discovery.outreach?.campaign.source).toBe("public_professional_outreach");
    const sameOrg = extractProspectsFromFindings([
      {
        findingId: "a",
        claim: "Jordan Hale of Hale Occupier Advisors is a tenant-representation broker.",
        grounded: true,
        sourceUrls: ["https://example.com/hale-occupier-advisors/team/jordan-hale"],
      },
      {
        findingId: "b",
        claim: "Priya Shah of Hale Occupier Advisors is a tenant-representation broker.",
        grounded: true,
        sourceUrls: ["https://example.com/hale-occupier-advisors/team/priya-shah"],
      },
      {
        findingId: "c",
        claim: "Morgan Lee of Hale Occupier Advisors is a tenant-representation broker.",
        grounded: true,
        sourceUrls: ["https://example.com/hale-occupier-advisors/team/morgan-lee"],
      },
    ]);
    expect(sameOrg).toHaveLength(2);
    const ranked = rankPreparedProspects(result.discovery.prospects, new Map(result.discovery.prospects.map((prospect) => [prospect.prospectId, prospect.contactability!])));
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked.every((item) => item.prospect.qualification.confidence === "HIGH")).toBe(true);
  });
});
