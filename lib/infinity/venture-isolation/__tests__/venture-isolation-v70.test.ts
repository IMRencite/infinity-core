import { describe, expect, it } from "vitest";
import {
  CLUB_THROTTLE_PUBLIC_CONTENT_CONTAMINATION_V3,
  CLUB_THROTTLE_SHIRT_TOPIC,
  SHIRT_ARTICLE_CONTAMINATION_FIXTURE,
  clubThrottleBrandTruthRequired,
  evaluateBrandAlignmentGate,
  evaluateConversionAlignmentGate,
  evaluateCustomerFacingLanguageGate,
  evaluateGenericContentPatternGate,
  evaluateInternalProcessLanguageGate,
  evaluateKnownBadVentureFixtures,
  evaluatePageTopicPurityGate,
  evaluateRecommendationIsolationGate,
  evaluateVentureIsolationGate,
} from "../venture-isolation";
import { clubThrottleJournalDrafts, composeClubThrottleJournalFiles, evaluateClubThrottleJournalQuality } from "@/lib/infinity/organic-growth-engine/continuous/club-throttle-journal";
import { countSubstantiveWords } from "@/lib/infinity/organic-growth-engine/continuous/content-quality-v4";
import { evaluateKnownBadCarouselFixtures } from "@/lib/infinity/organic-growth-engine/continuous/featured-blogs-carousel";
import { assembleHardenedContracts } from "@/lib/infinity/autonomous-venture-operations/hardened-contracts";

describe("venture isolation and carousel fixtures", () => {
  it("fails the permanent contamination fixtures", () => {
    expect(evaluateKnownBadVentureFixtures()).toEqual({
      cap_rate_link: "FAIL",
      occupancy_featured: "FAIL",
      occupancy_recommends_apparel: "FAIL",
      route_padding: "FAIL",
      process_leak: "FAIL",
      foreign_schema: "FAIL",
      global_fallback: "FAIL",
      contamination_v3_customer: "FAIL",
    });
    expect(evaluateCustomerFacingLanguageGate(CLUB_THROTTLE_PUBLIC_CONTENT_CONTAMINATION_V3).result).toBe("FAIL");
    expect(evaluateVentureIsolationGate({
      venture_id: "club-throttle",
      html_or_text: SHIRT_ARTICLE_CONTAMINATION_FIXTURE,
    }).result).toBe("FAIL");
    expect(evaluatePageTopicPurityGate({
      boundary: CLUB_THROTTLE_SHIRT_TOPIC,
      body: SHIRT_ARTICLE_CONTAMINATION_FIXTURE,
    }).reasons).toContain("FAIL_TOPIC_PURITY");
    expect(evaluateInternalProcessLanguageGate(SHIRT_ARTICLE_CONTAMINATION_FIXTURE).result).toBe("FAIL");
    expect(evaluateCustomerFacingLanguageGate("founder live review plus store ID pending founder").result).toBe("FAIL");
    expect(evaluateGenericContentPatternGate([
      "How it works: After this page a reader should repeat the same teaching sample twice.",
      "How it works: After this page a reader should repeat the same teaching sample twice.",
    ]).result).toBe("FAIL");
  });

  it("passes Club Throttle journal V5 source after consumer rewrites land", () => {
    const quality = evaluateClubThrottleJournalQuality();
    expect(quality.result).toBe("PASS");
    expect(quality.failed).toHaveLength(0);
    const drafts = clubThrottleJournalDrafts();
    const shirt = drafts.find((draft) => draft.canonical.includes("how-riders-choose-a-shirt"));
    expect(shirt).toBeTruthy();
    expect(countSubstantiveWords(shirt!)).toBeGreaterThanOrEqual(2000);
    expect(evaluateCustomerFacingLanguageGate(shirt!.body).result).toBe("PASS");
    expect(evaluateVentureIsolationGate({ venture_id: "club-throttle", html_or_text: shirt!.body }).result).toBe("PASS");
    expect(evaluatePageTopicPurityGate({ boundary: CLUB_THROTTLE_SHIRT_TOPIC, body: shirt!.body }).result).toBe("PASS");
    expect(evaluateBrandAlignmentGate({ venture_id: "club-throttle", text: shirt!.body }).result).toBe("PASS");
    expect(evaluateConversionAlignmentGate({ boundary: CLUB_THROTTLE_SHIRT_TOPIC, text: shirt!.body }).result).toBe("PASS");
    drafts.forEach((draft) => expect(countSubstantiveWords(draft)).toBeGreaterThanOrEqual(2000));
  });

  it("scopes composed Journal recommendations to Club Throttle", () => {
    const shirt = composeClubThrottleJournalFiles().find((file) => file.path.includes("how-riders-choose-a-shirt"))?.content ?? "";
    expect(shirt).not.toMatch(/cap rate|occupancynpv|commercial-lease|compare-commercial-leases/i);
    expect(shirt).toContain("/journal/");
    expect(evaluateRecommendationIsolationGate({
      venture_id: "club-throttle",
      hrefs: [...shirt.matchAll(/href="([^"]+)"/g)].map((row) => row[1]!),
    }).result).toBe("PASS");
    expect(clubThrottleBrandTruthRequired()).toBe(true);
    expect(assembleHardenedContracts().cross_venture_content_can_publish).toBe(false);
    expect(assembleHardenedContracts().broken_carousel_can_publish).toBe(false);
    expect(evaluateKnownBadCarouselFixtures().scrollleft_stuck).toBe("FAIL");
    expect(evaluateKnownBadCarouselFixtures().arrows_above).toBe("FAIL");
    expect(evaluateKnownBadCarouselFixtures().arrows_flanking).toBe("PASS");
  });
});
