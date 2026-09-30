import { describe, expect, it } from "vitest";
import { clubThrottleShirtV5Body } from "@/lib/infinity/organic-growth-engine/continuous/club-throttle-v5-body-shirt";
import { CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE } from "@/lib/infinity/organic-growth-engine/continuous/fixtures/club-throttle-shirt-dry-legacy-sample";
import { evaluateContentQualityFramework } from "@/lib/infinity/organic-growth-engine/continuous/content-quality-framework";
import { occupancynpvInterestRateDraft } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-blog";
import type { OrganicDraft } from "@/lib/infinity/organic-growth-engine/continuous/quality";
import {
  editorialBypassAttemptRejected,
  evaluateArticlePublishEditorialAuthorization,
  evaluateVentureEditorialPublishingInfrastructure,
  shouldPauseAutonomousPublishingForEditorial,
} from "../venture-editorial-publishing-enforcement";

function ctDraft(body: string, headings: string[]): OrganicDraft {
  const shirt = clubThrottleShirtV5Body();
  return {
    title: "How riders choose a shirt that survives the ride home",
    meta_description: shirt.answer,
    h1: "How riders choose a shirt that survives the ride home",
    headings,
    body,
    direct_answer: shirt.answer,
    citations: [],
    schema: [],
    canonical: "https://clubthrottle.com/journal/apparel/how-riders-choose-a-shirt/",
    breadcrumbs: [],
    internal_links: [],
    word_count: body.split(/\s+/).length,
    origin: "https://clubthrottle.com",
  };
}

describe("venture editorial publishing enforcement", () => {
  it("blocks venture launch readiness when public blog capability lacks editorial contract", () => {
    const infra = evaluateVentureEditorialPublishingInfrastructure({
      ventureId: "unknown-venture",
      publicBlogOrJournalCapability: true,
    });
    expect(infra.result).toBe("FAIL");
    expect(infra.reasons).toContain("MISSING_VENTURE_EDITORIAL_EXPERIENCE_CONTRACT");
  });

  it("allows known ventures with editorial contracts", () => {
    expect(
      evaluateVentureEditorialPublishingInfrastructure({
        ventureId: "club-throttle",
        publicBlogOrJournalCapability: true,
      }).result,
    ).toBe("PASS");
  });

  it("blocks dry-but-accurate consumer draft when factual passes and human fails", () => {
    const dry = ctDraft(
      CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.body,
      CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.headings,
    );
    const factual = evaluateContentQualityFramework(dry);
    const auth = evaluateArticlePublishEditorialAuthorization({
      draft: dry,
      factualContentQcPassed: factual.result === "PASS",
    });
    expect(auth.publishAllowed).toBe(false);
    expect(auth.reasons.some((r) => r.includes("FACTUAL_PASS") || r.includes("STATEMENT") || r.includes("TEXTBOOK"))).toBe(
      true,
    );
  });

  it("allows actionable engaging candidate when factual and human pass", () => {
    const shirt = clubThrottleShirtV5Body();
    const draft = ctDraft(shirt.body, shirt.headings);
    const auth = evaluateArticlePublishEditorialAuthorization({
      draft,
      factualContentQcPassed: true,
    });
    expect(auth.publishAllowed).toBe(true);
  });

  it("blocks live occupancy interest-rate body on publish stack while factual may pass", () => {
    const live = occupancynpvInterestRateDraft();
    const factual = evaluateContentQualityFramework(live);
    const auth = evaluateArticlePublishEditorialAuthorization({
      draft: live,
      factualContentQcPassed: factual.result === "PASS",
    });
    expect(auth.publishAllowed).toBe(false);
  });

  it("rejects editorial bypass flags", () => {
    expect(editorialBypassAttemptRejected({ skipHumanEditorialQc: true }).allowed).toBe(false);
    expect(editorialBypassAttemptRejected({ forcePublish: true }).allowed).toBe(false);
  });

  it("maps editorial failures to autonomous pause", () => {
    expect(shouldPauseAutonomousPublishingForEditorial(["STATEMENT_DENSITY_HIGH", "OTHER"])).toBe(true);
    expect(shouldPauseAutonomousPublishingForEditorial(["URL_HIERARCHY"])).toBe(false);
  });
});
