import { describe, expect, it } from "vitest";
import { clubThrottleShirtV5Body } from "../club-throttle-v5-body-shirt";
import { CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE } from "../fixtures/club-throttle-shirt-dry-legacy-sample";
import type { OrganicDraft } from "../quality";
import { runBoundedConsumerEditorialRepair } from "../consumer-editorial-publish-loop";

function shirtDraft(body: string, headings: string[]): OrganicDraft {
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
    visible_faqs: shirt.faqs,
    origin: "https://clubthrottle.com",
  };
}

describe("ConsumerEditorialRepairLoop", () => {
  it("blocks dry draft without repair adapter", () => {
    const dry = shirtDraft(
      CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.body,
      CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.headings,
    );
    const result = runBoundedConsumerEditorialRepair({ draft: dry });
    expect(result.publish_allowed).toBe(false);
    expect(result.attempts.length).toBeGreaterThan(0);
    expect(result.attempts[0]?.revision_hints.length).toBeGreaterThan(0);
  });

  it("allows bounded repair when adapter supplies passing draft", () => {
    const dry = shirtDraft(
      CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.body,
      CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.headings,
    );
    const good = clubThrottleShirtV5Body();
    const result = runBoundedConsumerEditorialRepair({
      draft: dry,
      repair: ({ attempt }) => (attempt === 1 ? shirtDraft(good.body, good.headings) : null),
    });
    expect(result.publish_allowed).toBe(true);
    expect(result.attempts).toHaveLength(1);
  });
});
