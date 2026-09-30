import { describe, expect, it } from "vitest";
import { clubThrottleShirtV5Body } from "../club-throttle-v5-body-shirt";
import { CLUB_THROTTLE_SHIRT_FALSE_POSITIVE_V5 } from "../fixtures/club-throttle-shirt-false-positive-v5";
import { occupancyInterestRatesEditorialCandidateBody } from "../occupancy-v5-editorial-candidate-interest-rates";
import {
  evaluateBlogHeadingDensityGate,
  evaluateEditorialSpecificityGate,
  evaluateHumanFirstEditorialQcV2,
} from "../blog-editorial-narrative-gates";
import { evaluateHumanFirstEditorialQc } from "../blog-human-flow-gates";
import type { OrganicDraft } from "../quality";

function ctDraft(body: string, headings: string[], faqs?: OrganicDraft["visible_faqs"]): OrganicDraft {
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
    visible_faqs: faqs,
    origin: "https://clubthrottle.com",
  };
}

describe("BlogEditorialNarrativeGates", () => {
  it("fails founder-rejected false-positive V5 fixture", () => {
    const draft = ctDraft(
      CLUB_THROTTLE_SHIRT_FALSE_POSITIVE_V5.body,
      CLUB_THROTTLE_SHIRT_FALSE_POSITIVE_V5.headings,
      CLUB_THROTTLE_SHIRT_FALSE_POSITIVE_V5.faqs,
    );
    const v2 = evaluateHumanFirstEditorialQcV2(draft);
    expect(v2.result).toBe("FAIL");
    expect(v2.reasons).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/HEADLINE_TO_HEADLINE|MICRO_SECTION|TEMPLATED|NO_NARRATIVE|SEO_SCAFFOLDING|FAQ_REPEATS/),
      ]),
    );
    expect(evaluateHumanFirstEditorialQc(draft).result).toBe("FAIL");
  });

  it("passes narrative rewrite body", () => {
    const shirt = clubThrottleShirtV5Body();
    const draft = ctDraft(shirt.body, shirt.headings, shirt.faqs);
    expect(evaluateBlogHeadingDensityGate(draft).result).toBe("PASS");
    expect(evaluateEditorialSpecificityGate(draft).result).toBe("PASS");
    expect(evaluateHumanFirstEditorialQcV2(draft).result).toBe("PASS");
    expect(evaluateHumanFirstEditorialQc(draft).result).toBe("PASS");
  });

  it("passes Occupancy editorial candidate under operator thresholds", () => {
    const occ = occupancyInterestRatesEditorialCandidateBody();
    const draft: OrganicDraft = {
      title: "How do interest rates affect commercial property values?",
      meta_description: occ.answer,
      h1: "How do interest rates affect commercial property values?",
      headings: occ.headings,
      body: occ.body,
      direct_answer: occ.answer,
      citations: [],
      schema: [],
      canonical: "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
      breadcrumbs: [],
      internal_links: [],
      word_count: occ.body.split(/\s+/).length,
      visible_faqs: occ.faqs,
      origin: "https://occupancynpv.com",
    };
    expect(evaluateHumanFirstEditorialQcV2(draft).result).toBe("PASS");
  });
});
