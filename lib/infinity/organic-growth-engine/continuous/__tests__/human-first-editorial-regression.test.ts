import { describe, expect, it } from "vitest";
import { clubThrottleShirtV5Body } from "../club-throttle-v5-body-shirt";
import { occupancyInterestRatesEditorialCandidateBody } from "../occupancy-v5-editorial-candidate-interest-rates";
import { evaluateConsumerEditorialPublishStack } from "../consumer-editorial-publish-loop";
import { CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE } from "../fixtures/club-throttle-shirt-dry-legacy-sample";
import { OCCUPANCY_INTEREST_RATES_DRY_LEGACY_SAMPLE } from "../fixtures/occupancy-interest-rates-dry-legacy-sample";
import {
  evaluateBlogConsumerEditorialQualityGate,
  evaluateBlogManualToneDetector,
} from "../blog-consumer-editorial-quality";
import { evaluateHumanFirstEditorialQc, evaluateHumanFirstEditorialQcV2 } from "../blog-human-flow-gates";
import { CLUB_THROTTLE_SHIRT_FALSE_POSITIVE_V5 } from "../fixtures/club-throttle-shirt-false-positive-v5";
import type { OrganicDraft } from "../quality";
import { CLUB_THROTTLE_EDITORIAL_PROFILE, OCCUPANCY_EDITORIAL_PROFILE } from "../venture-editorial-profiles";

function ctDraft(body: string, headings: string[]): OrganicDraft {
  return {
    title: "How riders choose a shirt that survives the ride home",
    meta_description: "test",
    h1: "How riders choose a shirt that survives the ride home",
    headings,
    body,
    direct_answer: body.slice(0, 200),
    citations: [],
    schema: [],
    canonical: "https://clubthrottle.com/journal/apparel/how-riders-choose-a-shirt/",
    breadcrumbs: [],
    internal_links: [],
    word_count: body.split(/\s+/).length,
    origin: "https://clubthrottle.com",
  };
}

function occDraft(body: string, headings: string[]): OrganicDraft {
  return {
    title: "How do interest rates affect commercial property values?",
    meta_description: "test",
    h1: "How do interest rates affect commercial property values?",
    headings,
    body,
    direct_answer: body.slice(0, 200),
    citations: [],
    schema: [],
    canonical: "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
    breadcrumbs: [],
    internal_links: [],
    word_count: body.split(/\s+/).length,
    origin: "https://occupancynpv.com",
  };
}

describe("Human-first editorial regression fixtures", () => {
  it("fails dry Club Throttle shirt manual fixture", () => {
    const legacy = ctDraft(
      CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.body,
      CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.headings,
    );
    expect(evaluateHumanFirstEditorialQc(legacy).result).toBe("FAIL");
    expect(evaluateBlogConsumerEditorialQualityGate(legacy).result).toBe("FAIL");
  });

  it("fails frozen false-positive V5 shirt (founder rejected)", () => {
    const draft = {
      ...ctDraft(CLUB_THROTTLE_SHIRT_FALSE_POSITIVE_V5.body, CLUB_THROTTLE_SHIRT_FALSE_POSITIVE_V5.headings),
      visible_faqs: CLUB_THROTTLE_SHIRT_FALSE_POSITIVE_V5.faqs,
    };
    expect(evaluateHumanFirstEditorialQcV2(draft).result).toBe("FAIL");
    expect(evaluateHumanFirstEditorialQc(draft).result).toBe("FAIL");
  });

  it("passes Club Throttle narrative rewrite for publish stack", () => {
    const shirt = clubThrottleShirtV5Body();
    const draft = {
      ...ctDraft(shirt.body, shirt.headings),
      visible_faqs: shirt.faqs,
      direct_answer: shirt.answer,
    };
    expect(evaluateHumanFirstEditorialQc(draft).result).toBe("PASS");
    expect(evaluateBlogConsumerEditorialQualityGate(draft).result).toBe("PASS");
    expect(evaluateConsumerEditorialPublishStack({ draft }).result).toBe("PASS");
  });

  it("fails dry Occupancy interest-rates fixture", () => {
    const legacy = occDraft(
      OCCUPANCY_INTEREST_RATES_DRY_LEGACY_SAMPLE.body,
      OCCUPANCY_INTEREST_RATES_DRY_LEGACY_SAMPLE.headings,
    );
    expect(evaluateBlogManualToneDetector({ draft: legacy, profile: OCCUPANCY_EDITORIAL_PROFILE }).result).toBe(
      "FAIL",
    );
    expect(evaluateHumanFirstEditorialQc(legacy).result).toBe("FAIL");
  });

  it("passes Occupancy editorial candidate for publish stack", () => {
    const occ = occupancyInterestRatesEditorialCandidateBody();
    const draft = occDraft(occ.body, occ.headings);
    expect(evaluateHumanFirstEditorialQc(draft).result).toBe("PASS");
    expect(evaluateConsumerEditorialPublishStack({ draft }).result).toBe("PASS");
  });
});
