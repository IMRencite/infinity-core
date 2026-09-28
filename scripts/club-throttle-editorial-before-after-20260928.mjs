#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { clubThrottleShirtV5Body } from "../lib/infinity/organic-growth-engine/continuous/club-throttle-v5-body-shirt.ts";
import { CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE } from "../lib/infinity/organic-growth-engine/continuous/fixtures/club-throttle-shirt-dry-legacy-sample.ts";
import {
  evaluateBlogConsumerEditorialQualityGate,
  evaluateBlogManualToneDetector,
  evaluateBlogSemanticRepetitionGate,
  evaluateBlogShareabilityGate,
} from "../lib/infinity/organic-growth-engine/continuous/blog-consumer-editorial-quality.ts";
import { CLUB_THROTTLE_EDITORIAL_PROFILE } from "../lib/infinity/organic-growth-engine/continuous/venture-editorial-profiles.ts";

function draft(body, headings) {
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

const oldDraft = draft(CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.body, CLUB_THROTTLE_SHIRT_DRY_LEGACY_SAMPLE.headings);
const newDraft = draft(clubThrottleShirtV5Body().body, clubThrottleShirtV5Body().headings);

const report = {
  collected_at: new Date().toISOString(),
  route: "/journal/apparel/how-riders-choose-a-shirt/",
  old: {
    word_count: oldDraft.word_count,
    manual_tone: evaluateBlogManualToneDetector({ draft: oldDraft, profile: CLUB_THROTTLE_EDITORIAL_PROFILE }),
    semantic_repetition: evaluateBlogSemanticRepetitionGate(oldDraft),
    shareability: evaluateBlogShareabilityGate(oldDraft),
    consumer_editorial: evaluateBlogConsumerEditorialQualityGate(oldDraft),
  },
  new: {
    word_count: newDraft.word_count,
    manual_tone: evaluateBlogManualToneDetector({ draft: newDraft, profile: CLUB_THROTTLE_EDITORIAL_PROFILE }),
    semantic_repetition: evaluateBlogSemanticRepetitionGate(newDraft),
    shareability: evaluateBlogShareabilityGate(newDraft),
    consumer_editorial: evaluateBlogConsumerEditorialQualityGate(newDraft),
  },
};

writeFileSync(".infinity/blog-os/club-throttle-shirt-editorial-before-after-20260928.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
