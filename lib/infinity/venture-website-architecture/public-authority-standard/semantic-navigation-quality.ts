import { SEMANTIC_NAVIGATION_VARIANTS } from "./constants";
import { evaluateSemanticPair } from "./semantic-content-redundancy";
import type { Gate, PublicPageArchetype } from "./types";

export const SEMANTIC_NAVIGATION_QUALITY_GATE = "SemanticNavigationQualityGate" as const;

export type SemanticNavigationVariant = (typeof SEMANTIC_NAVIGATION_VARIANTS)[number];

export type SemanticNavigationCard = {
  title: string;
  description: string;
  href: string;
  icon: string;
  relationship: string;
  archetype?: string;
};

export type SemanticNavigationBlockRecord = {
  variant: string;
  title: string;
  cards: SemanticNavigationCard[];
  pageRoute: string;
  pageArchetype: PublicPageArchetype | string;
};

const ARCHETYPE_DEFAULT_VARIANT: Record<string, SemanticNavigationVariant> = {
  TOPIC_HUB: "RELATED_TOPICS",
  QUESTION_AUTHORITY: "LEARN_NEXT",
  COMPARISON: "COMPARE_NEXT",
  HOW_TO: "LEARN_NEXT",
  PRODUCT: "USE_THE_TOOL",
  PERSONA: "FOR_YOUR_ROLE",
  RESOURCE_LIBRARY: "RELATED_TOPICS",
  PRICING: "USE_THE_TOOL",
  CALCULATOR_TOOL: "USE_THE_TOOL",
};

const SKIP_ARCHETYPES = new Set(["LEGAL", "CONTACT"]);

export function expectedSemanticNavigationVariant(archetype: string): SemanticNavigationVariant | "NOT_REQUIRED" {
  if (SKIP_ARCHETYPES.has(archetype)) return "NOT_REQUIRED";
  return ARCHETYPE_DEFAULT_VARIANT[archetype] ?? "RELATED_QUESTIONS";
}

export function evaluateSemanticNavigationQuality(input: {
  blocks: SemanticNavigationBlockRecord[];
  pageArchetype: string;
  searchIntent?: string;
}): {
  gate: typeof SEMANTIC_NAVIGATION_QUALITY_GATE;
  overall: Gate;
  cardCount: Gate;
  crawlable: Gate;
  uniqueDestinations: Gate;
  iconPresence: Gate;
  relevance: Gate;
  accessibility: Gate;
  duplicateBlock: Gate;
  failures: string[];
} {
  if (SKIP_ARCHETYPES.has(input.pageArchetype)) {
    return {
      gate: SEMANTIC_NAVIGATION_QUALITY_GATE,
      overall: input.blocks.length === 0 ? "PASS" : "FAIL",
      cardCount: "PASS",
      crawlable: "PASS",
      uniqueDestinations: "PASS",
      iconPresence: "PASS",
      relevance: "PASS",
      accessibility: "PASS",
      duplicateBlock: "PASS",
      failures: input.blocks.length ? ["semantic_nav_not_used_on_this_archetype"] : [],
    };
  }
  const failures: string[] = [];
  if (!input.blocks.length) {
    return {
      gate: SEMANTIC_NAVIGATION_QUALITY_GATE,
      overall: "FAIL",
      cardCount: "FAIL",
      crawlable: "FAIL",
      uniqueDestinations: "FAIL",
      iconPresence: "FAIL",
      relevance: "FAIL",
      accessibility: "FAIL",
      duplicateBlock: "PASS",
      failures: ["missing_semantic_navigation"],
    };
  }
  let cardCount: Gate = "PASS";
  let crawlable: Gate = "PASS";
  let uniqueDestinations: Gate = "PASS";
  let iconPresence: Gate = "PASS";
  let relevance: Gate = "PASS";
  let accessibility: Gate = "PASS";
  const signatures = new Set<string>();
  let duplicateBlock: Gate = "PASS";
  for (const block of input.blocks) {
    if (!(SEMANTIC_NAVIGATION_VARIANTS as readonly string[]).includes(block.variant)) {
      failures.push(`unknown_variant:${block.variant}`);
      relevance = "FAIL";
    }
    if (block.cards.length < 3 || block.cards.length > 6) {
      cardCount = "FAIL";
      failures.push("card_count");
    }
    const hrefs = block.cards.map((card) => card.href.replace(/\/+$/, "") || "/");
    if (new Set(hrefs).size !== hrefs.length) {
      uniqueDestinations = "FAIL";
      failures.push("duplicate_destination");
    }
    if (hrefs.includes(block.pageRoute.replace(/\/+$/, "") || "/")) {
      relevance = "FAIL";
      failures.push("self_destination");
    }
    for (const card of block.cards) {
      if (!card.href.startsWith("/") && !card.href.startsWith("https://")) {
        crawlable = "FAIL";
        failures.push("uncrawlable_href");
      }
      if (!card.icon || /[\u{1F300}-\u{1FAFF}]/u.test(card.icon)) {
        iconPresence = "FAIL";
        failures.push("missing_or_emoji_icon");
      }
      if (!card.title.trim() || card.title.split(/\s+/).length > 8) {
        relevance = "FAIL";
        failures.push("unclear_title");
      }
      if (!card.description.trim() || card.description.split(/\s+/).length > 22) {
        relevance = "FAIL";
        failures.push("weak_description");
      }
      if (evaluateSemanticPair(card.title, card.description).exact) {
        relevance = "FAIL";
        failures.push("title_repeats_description");
      }
      if (!card.relationship) {
        relevance = "FAIL";
        failures.push("missing_relationship");
      }
    }
    const signature = `${block.variant}:${hrefs.slice().sort().join("|")}`;
    if (signatures.has(signature)) duplicateBlock = "FAIL";
    signatures.add(signature);
  }
  if (duplicateBlock === "FAIL") failures.push("mechanical_repeat_block");
  const overall =
    cardCount === "PASS" &&
    crawlable === "PASS" &&
    uniqueDestinations === "PASS" &&
    iconPresence === "PASS" &&
    relevance === "PASS" &&
    accessibility === "PASS" &&
    duplicateBlock === "PASS"
      ? "PASS"
      : "FAIL";
  return {
    gate: SEMANTIC_NAVIGATION_QUALITY_GATE,
    overall,
    cardCount,
    crawlable,
    uniqueDestinations,
    iconPresence,
    relevance,
    accessibility,
    duplicateBlock,
    failures,
  };
}
