import { describe, expect, it } from "vitest";
import { clubThrottleShirtV5Body } from "../club-throttle-v5-body-shirt";
import { CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE } from "../fixtures/club-throttle-shirt-dry-legacy-sample";
import {
  evaluateBlogConsumerEditorialQualityGate,
  evaluateBlogManualToneDetector,
  evaluateBlogSemanticRepetitionGate,
} from "../blog-consumer-editorial-quality";
import type { OrganicDraft } from "../quality";
import { CLUB_THROTTLE_EDITORIAL_PROFILE } from "../venture-editorial-profiles";

function draftFromShirt(): OrganicDraft {
  const shirt = clubThrottleShirtV5Body();
  return {
    title: "How riders choose a shirt that survives the ride home",
    meta_description: shirt.answer,
    h1: "How riders choose a shirt that survives the ride home",
    headings: shirt.headings,
    body: shirt.body,
    direct_answer: shirt.answer,
    citations: [],
    schema: [],
    canonical: "https://clubthrottle.com/journal/apparel/how-riders-choose-a-shirt/",
    breadcrumbs: [],
    internal_links: ["/journal/apparel/streetwear-vs-riding-gear/"],
    word_count: shirt.body.split(/\s+/).length,
    visible_faqs: shirt.faqs,
    origin: "https://clubthrottle.com",
  };
}

describe("BlogConsumerEditorialQualityGate", () => {
  it("flags dry legacy manual tone sample", () => {
    const legacy: OrganicDraft = {
      ...draftFromShirt(),
      headings: CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.headings,
      body: CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.body,
    };
    expect(evaluateBlogManualToneDetector({ draft: legacy, profile: CLUB_THROTTLE_EDITORIAL_PROFILE }).result).toBe(
      "FAIL",
    );
    expect(evaluateBlogSemanticRepetitionGate(legacy).result).toBe("FAIL");
  });

  it("passes recomposed Club Throttle shirt editorial body", () => {
    const draft = draftFromShirt();
    expect(evaluateBlogConsumerEditorialQualityGate(draft).result).toBe("PASS");
  });
});
