import type { OrganicDraft } from "@/lib/infinity/organic-growth-engine/continuous/quality";
import { CLUB_THROTTLE_BRAND_PROFILE } from "@/lib/infinity/commerce/brand/club-throttle-profile";

export const VENTURE_ISOLATION_CONTRACT = "VentureIsolation" as const;

export type DomainClass = "IN_SCOPE" | "ADJACENT_ALLOWED" | "OUT_OF_SCOPE" | "FOREIGN_VENTURE";

export type VentureDomainBoundary = {
  venture_id: string;
  in_scope: string[];
  adjacent_allowed: string[];
  out_of_scope: string[];
  foreign_venture: string[];
};

export type PageTopicBoundary = {
  page_id: string;
  venture_id: string;
  primary_topic: string;
  primary_reader_job: string;
  must_cover: string[];
  allowed_supporting: string[];
  out_of_scope_for_page: string[];
  conversion_intent: { primary: string; secondary: string };
};

export const CLUB_THROTTLE_DOMAIN_BOUNDARY: VentureDomainBoundary = {
  venture_id: "club-throttle",
  in_scope: ["motorcycle streetwear", "tees", "hoodies", "apparel", "fabric", "fit", "printing", "wash", "motorcycle culture", "bike-night", "rider community", "collections", "products"],
  adjacent_allowed: ["protective gear distinction", "weather layering", "rider culture"],
  out_of_scope: ["commercial real estate", "leases", "cap rates", "CAM", "occupancy costs", "NPV", "healthcare", "counseling"],
  foreign_venture: ["occupancynpv", "OccupancyNPV", "cap rate", "commercial lease"],
};

export const OCCUPANCYNPV_DOMAIN_BOUNDARY: VentureDomainBoundary = {
  venture_id: "occupancynpv",
  in_scope: ["commercial leases", "occupancy cost", "CAM", "NPV", "cap rate", "tenant improvement"],
  adjacent_allowed: ["broker workflow", "discount rate"],
  out_of_scope: ["motorcycle streetwear", "tees", "hoodies", "bike-night"],
  foreign_venture: ["club-throttle", "Club Throttle", "heavyweight tee"],
};

import { CLUB_THROTTLE_SHIRT_TOPIC } from "@/lib/infinity/organic-growth-engine/continuous/club-throttle-v5-body-shirt";
export { CLUB_THROTTLE_SHIRT_TOPIC };

export const SHIRT_ARTICLE_CONTAMINATION_FIXTURE = [
  "How riders choose a shirt that survives the ride home",
  "Fabric weight and a size chart matter.",
  "If a section is only one generic sentence it fails the section-depth gate.",
  "Publication still requires founder live review. A compose pass is not a live pass.",
  "Do the learning test. Count the two-second gap. Walk the aisle. Name the sweep.",
  "If the lamp is out, stay. A 40 percent blocked aisle is a leave.",
  "How is cap rate calculated?",
  "Compare commercial leases",
  "https://occupancynpv.com/commercial-lease-npv/how-is-cap-rate-calculated/",
].join("\n");

/** Permanent regression corpus — must never pass customer-facing gates. */
export const CLUB_THROTTLE_PUBLIC_CONTENT_CONTAMINATION_V3 = [
  SHIRT_ARTICLE_CONTAMINATION_FIXTURE,
  "A 90 minute gap after a 7:10 sunset is a teaching example, not a dare.",
  "Six bikes with a named sweep is a teaching formation, not a race entry.",
  "A 6 ounce knit and a 10 percent length change after a hot wash cycle are teaching numbers.",
  "The comparison table does not get you a pass because the trip is three minutes.",
  "If the page failed actionability, add another example before publishing.",
  "Store ID is pending and provider readiness is unproven.",
].join("\n\n");

const FOREIGN_BY_VENTURE: Record<string, RegExp> = {
  "club-throttle": /occupancynpv|occupancy-?cost|cap rate|commercial lease|\/commercial-lease-npv|\/compare-commercial-leases|CAM reconciliation|lease NPV/i,
  occupancynpv: /club throttle|heavyweight tee|bike-night etiquette|\/journal\/apparel|motorcycle streetwear/i,
};

const PROCESS_LEAK = /section-depth gate|founder live review|content-normalization|compose pass|live pass|\bQC\b|learning test|page failed actionability|\bfixture\b|content-quality-framework|publication authorization|store id|store ID|provider readiness|pending founder|approved-art|provider spec|provider-backed|Gelato fabric|deployment|source QC|rendered QC|Content V4|actionability gate/i;

const FOREIGN_SCHEMA = /occupancynpv\.com|#occupancynpv|OccupancyNPV/i;

export function ventureDomainBoundary(ventureId: string): VentureDomainBoundary {
  if (ventureId === "club-throttle") return CLUB_THROTTLE_DOMAIN_BOUNDARY;
  if (ventureId === "occupancynpv") return OCCUPANCYNPV_DOMAIN_BOUNDARY;
  return { venture_id: ventureId, in_scope: [], adjacent_allowed: [], out_of_scope: [], foreign_venture: [] };
}

export function classifyDomainToken(ventureId: string, text: string): DomainClass {
  const boundary = ventureDomainBoundary(ventureId);
  const hay = text.toLowerCase();
  if (boundary.foreign_venture.some((row) => hay.includes(row.toLowerCase())) || FOREIGN_BY_VENTURE[ventureId]?.test(text)) {
    return "FOREIGN_VENTURE";
  }
  if (boundary.out_of_scope.some((row) => hay.includes(row.toLowerCase()))) return "OUT_OF_SCOPE";
  if (boundary.adjacent_allowed.some((row) => hay.includes(row.toLowerCase()))) return "ADJACENT_ALLOWED";
  return "IN_SCOPE";
}

export function evaluateVentureIsolationGate(input: { venture_id: string; html_or_text: string }): {
  gate: "VentureIsolationGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (FOREIGN_BY_VENTURE[input.venture_id]?.test(input.html_or_text)) reasons.push("FAIL_VENTURE_BOUNDARY");
  if (input.venture_id === "club-throttle" && /occupancynpv|cap rate|commercial lease/i.test(input.html_or_text)) {
    reasons.push("FAIL_LINK_BOUNDARY");
  }
  return { gate: "VentureIsolationGate", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluatePageTopicPurityGate(input: { boundary: PageTopicBoundary; body: string }): {
  gate: "PageTopicPurityGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const foreign = evaluateVentureIsolationGate({ venture_id: input.boundary.venture_id, html_or_text: input.body });
  if (foreign.result === "FAIL") reasons.push("FOREIGN_VENTURE");
  const drifted = input.boundary.out_of_scope_for_page.filter((token) => new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(input.body));
  if (drifted.length) reasons.push("FAIL_TOPIC_PURITY");
  if (drifted.length >= 3 && input.body.split(/\s+/).length >= 1800) reasons.push("FAIL_TOPIC_PADDING");
  return { gate: "PageTopicPurityGate", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateInternalProcessLanguageGate(text: string): {
  gate: "InternalProcessLanguageGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons = PROCESS_LEAK.test(text) ? ["FAIL_INTERNAL_PROCESS_LEAK"] : [];
  return { gate: "InternalProcessLanguageGate", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateCustomerFacingLanguageGate(text: string): {
  gate: "CustomerFacingLanguageGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const leak = evaluateInternalProcessLanguageGate(text);
  const extra =
    /if this section is too short|the page failed|add the example before publishing|reread the teaching sample|if this answer is generic|this section needs another heading|teaching example|teaching formation|teaching numbers?|teaching sample|does not get a pass|does not get you a pass|if the page worked|before you publish|learning test|section-depth|for learning the method|after this page a reader should|a serious reader will ask|recalculate the teaching sample|write three lines before you talk|labeled teaching sample|worked teaching sample/i.test(
      text,
    );
  const reasons = [...leak.reasons, ...(extra ? ["FAIL_CUSTOMER_FACING_LANGUAGE"] : [])];
  return { gate: "CustomerFacingLanguageGate", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateCrossArticleTemplateSimilarityGate(bodies: string[]): {
  gate: "CrossArticleTemplateSimilarityGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [...evaluateGenericContentPatternGate(bodies).reasons];
  const sharedPhrases = [
    "does not get a pass",
    "does not get you a pass",
    "teaching example",
    "teaching formation",
    "teaching numbers",
    "Official pages stay official",
    "This is not legal advice and not automatically",
  ];
  const hits = sharedPhrases.filter((phrase) => bodies.filter((body) => body.includes(phrase)).length >= 3);
  if (hits.length) reasons.push("FAIL_CROSS_ARTICLE_TEMPLATE");
  return {
    gate: "CrossArticleTemplateSimilarityGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: [...new Set(reasons)],
  };
}

export function evaluateGenericContentPatternGate(bodies: string[]): {
  gate: "GenericContentPatternGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const scaffold = bodies.filter((body) => /how it works:|after this page a reader should|teaching sample|pageCloser/i.test(body));
  if (scaffold.length >= 2) reasons.push("FAIL_GENERIC_CONTENT_PATTERN");
  const keys = new Map<string, number>();
  for (const body of bodies) {
    for (const para of body.split(/\n\n+/).map((row) => row.trim()).filter(Boolean)) {
      const key = para.slice(0, 160).toLowerCase();
      if (key.split(/\s+/).length > 18) keys.set(key, (keys.get(key) ?? 0) + 1);
    }
  }
  if ([...keys.values()].some((count) => count >= 2)) reasons.push("FAIL_GENERIC_CONTENT_PATTERN");
  return { gate: "GenericContentPatternGate", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateRecommendationIsolationGate(input: { venture_id: string; hrefs: string[] }): {
  gate: "RecommendationIsolationGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const foreign = input.hrefs.filter((href) => {
    if (input.venture_id === "club-throttle") return /occupancynpv|commercial-lease|compare-commercial|\/resources\/?$/i.test(href);
    if (input.venture_id === "occupancynpv") return /clubthrottle|\/journal\//i.test(href);
    return false;
  });
  if (foreign.length) reasons.push("FAIL_RECOMMENDATION_ISOLATION");
  return { gate: "RecommendationIsolationGate", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateSchemaVentureIsolationGate(input: { venture_id: string; schema_text: string }): {
  gate: "SchemaVentureIsolationGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (input.venture_id === "club-throttle" && FOREIGN_SCHEMA.test(input.schema_text)) reasons.push("FAIL_SCHEMA_ISOLATION");
  if (input.venture_id === "occupancynpv" && /clubthrottle\.com|#club-throttle/i.test(input.schema_text)) reasons.push("FAIL_SCHEMA_ISOLATION");
  return { gate: "SchemaVentureIsolationGate", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateBrandAlignmentGate(input: { venture_id: string; text: string }): {
  gate: "BrandAlignmentGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (evaluateVentureIsolationGate({ venture_id: input.venture_id, html_or_text: input.text }).result === "FAIL") {
    reasons.push("FAIL_BRAND_ALIGNMENT");
  }
  if (evaluateInternalProcessLanguageGate(input.text).result === "FAIL") reasons.push("FAIL_BRAND_ALIGNMENT");
  if (input.venture_id === "club-throttle") {
    const voice = /rider|shirt|garage|road|print|fabric|lot|night/i.test(input.text);
    if (!voice) reasons.push("FAIL_BRAND_ALIGNMENT");
  }
  return { gate: "BrandAlignmentGate", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateConversionAlignmentGate(input: { boundary: PageTopicBoundary; text: string }): {
  gate: "ConversionAlignmentGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (input.boundary.venture_id === "club-throttle" && /occupancynpv|cap rate|commercial lease calculator/i.test(input.text)) {
    reasons.push("FAIL_CONVERSION_ALIGNMENT");
  }
  if (input.boundary.page_id.includes("how-riders-choose-a-shirt") && !/size chart|keep or return|streetwear versus riding gear|\/shop|\/collections/i.test(input.text)) {
    reasons.push("FAIL_CONVERSION_ALIGNMENT");
  }
  return { gate: "ConversionAlignmentGate", result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateKnownBadVentureFixtures(): {
  cap_rate_link: "FAIL";
  occupancy_featured: "FAIL";
  occupancy_recommends_apparel: "FAIL";
  route_padding: "FAIL";
  process_leak: "FAIL";
  foreign_schema: "FAIL";
  global_fallback: "FAIL";
  contamination_v3_customer: "FAIL";
} {
  const shirt = {
    venture_id: "club-throttle",
    html_or_text: SHIRT_ARTICLE_CONTAMINATION_FIXTURE,
  };
  return {
    cap_rate_link: evaluateVentureIsolationGate(shirt).result as "FAIL",
    occupancy_featured: evaluateRecommendationIsolationGate({
      venture_id: "club-throttle",
      hrefs: ["/commercial-lease-npv/how-is-cap-rate-calculated/"],
    }).result as "FAIL",
    occupancy_recommends_apparel: evaluateVentureIsolationGate({
      venture_id: "occupancynpv",
      html_or_text: "Featured Reads: /journal/apparel/how-riders-choose-a-shirt motorcycle streetwear",
    }).result as "FAIL",
    route_padding: evaluatePageTopicPurityGate({
      boundary: CLUB_THROTTLE_SHIRT_TOPIC,
      body: SHIRT_ARTICLE_CONTAMINATION_FIXTURE,
    }).result as "FAIL",
    process_leak: evaluateInternalProcessLanguageGate(SHIRT_ARTICLE_CONTAMINATION_FIXTURE).result as "FAIL",
    foreign_schema: evaluateSchemaVentureIsolationGate({
      venture_id: "club-throttle",
      schema_text: '{"@id":"https://occupancynpv.com/#org"}',
    }).result as "FAIL",
    global_fallback: evaluateRecommendationIsolationGate({
      venture_id: "club-throttle",
      hrefs: ["/resources"],
    }).result as "FAIL",
    contamination_v3_customer: evaluateCustomerFacingLanguageGate(CLUB_THROTTLE_PUBLIC_CONTENT_CONTAMINATION_V3)
      .result as "FAIL",
  };
}

export function clubThrottleBrandTruthRequired(): boolean {
  return Boolean(CLUB_THROTTLE_BRAND_PROFILE.truth.venture_id && CLUB_THROTTLE_DOMAIN_BOUNDARY.venture_id);
}

export function evaluateDraftVenturePublishBlock(input: {
  venture_id: string;
  draft: OrganicDraft;
  html?: string;
  schema_text?: string;
  recommendation_hrefs?: string[];
  topic?: PageTopicBoundary;
}): { result: "PASS" | "PUBLISHING_BLOCKED"; reasons: string[] } {
  const text = `${input.draft.body}\n${input.draft.headings.join(" ")}\n${input.html ?? ""}`;
  const reasons = [
    ...evaluateVentureIsolationGate({ venture_id: input.venture_id, html_or_text: text }).reasons,
    ...evaluateInternalProcessLanguageGate(text).reasons,
    ...evaluateBrandAlignmentGate({ venture_id: input.venture_id, text }).reasons,
    ...evaluateSchemaVentureIsolationGate({ venture_id: input.venture_id, schema_text: input.schema_text ?? "" }).reasons,
    ...evaluateRecommendationIsolationGate({
      venture_id: input.venture_id,
      hrefs: input.recommendation_hrefs ?? input.draft.internal_links,
    }).reasons,
  ];
  if (input.topic) {
    reasons.push(...evaluatePageTopicPurityGate({ boundary: input.topic, body: input.draft.body }).reasons);
    reasons.push(...evaluateConversionAlignmentGate({ boundary: input.topic, text }).reasons);
  }
  return { result: reasons.length ? "PUBLISHING_BLOCKED" : "PASS", reasons };
}
