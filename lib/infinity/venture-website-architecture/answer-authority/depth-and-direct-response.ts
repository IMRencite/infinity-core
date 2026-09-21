import { DIRECT_RESPONSE_PAGE_PATTERN_REGISTRY } from "../constants";
import { pagePattern } from "../page-pattern-registry";
import { DIRECT_RESPONSE_ELEMENTS, WORD_COUNT_GUIDANCE } from "./constants";
import { approxWordCount, extractAnswerFirstBlocks, hasMarker } from "./page-inspect";
import type { CtaSequencePlan, DirectResponseElement, Gate, ObjectionKnowledgeGraph, PageDepthAssessment } from "./types";

export function wordCountIsHardQuota(): false {
  return false;
}

export function bandForRole(role: string, route: string): PageDepthAssessment["wordCountBand"] {
  if (route === "/" || role === "HOMEPAGE" || role === "COMPARISON") return "CORE_MONEY_PAGE";
  if (role === "EDUCATIONAL_HUB") return "MAJOR_HUB";
  if (role === "QUESTION_PAGE" || role === "EDUCATIONAL_ARTICLE" || role === "HOW_IT_WORKS" || role === "PERSONA") return "HIGH_VALUE_EDUCATIONAL";
  if (role === "FAQ") return "SUPPORTING_QUESTION";
  return "UTILITY";
}

export function evaluateAuthorityPageDepth(input: {
  route: string;
  role: string;
  content: string;
  topicComplexity: "HIGH" | "MEDIUM" | "LOW";
  buyerSophistication?: "HIGH" | "MEDIUM" | "LOW";
}): PageDepthAssessment {
  const approxWords = approxWordCount(input.content);
  const band = bandForRole(input.role, input.route);
  const guidance = WORD_COUNT_GUIDANCE[band];
  const belowGuidanceBand = approxWords < guidance.min && input.topicComplexity !== "LOW";
  const hasDirect = extractAnswerFirstBlocks(input.content).length > 0 || input.route === "/";
  const hasExample = /illustrative|worked example|example/i.test(input.content);
  const hasSource = /AuthorityRefs|investopedia|naiop|boma|bls\.gov/i.test(input.content);
  const hasVisual = /data-visualization|<table|ProductUiFrame/.test(input.content);
  const hasConversion = /early-access|Request Pilot Access|PrimaryCTA/.test(input.content);
  const questionCoverage = hasDirect && /h2|h3/.test(input.content) ? "PASS" : "FAIL";
  const visualAdequacy = input.topicComplexity === "HIGH" && !hasVisual ? "FAIL" : hasVisual || input.topicComplexity === "LOW" ? "PASS" : "FAIL";
  const visualSufficiency = input.topicComplexity === "HIGH" && (input.content.match(/data-visualization/g) ?? []).length < 2 ? "FAIL" : visualAdequacy;
  const sourceAdequacy = input.role === "LEGAL" || input.role === "CONVERSION" || input.role === "PRICING" || hasSource ? "PASS" : "FAIL";
  const exampleAdequacy = input.topicComplexity === "HIGH" && !hasExample ? "FAIL" : "PASS";
  const conversionPath = input.role === "LEGAL" || hasConversion ? "PASS" : "FAIL";
  const overall =
    questionCoverage === "PASS" &&
    visualSufficiency === "PASS" &&
    sourceAdequacy === "PASS" &&
    exampleAdequacy === "PASS" &&
    !belowGuidanceBand
      ? "PASS"
      : "FAIL";
  return {
    route: input.route,
    role: input.role,
    intentComplexity: input.topicComplexity,
    topicComplexity: input.topicComplexity,
    approxWords,
    wordCountBand: band,
    belowGuidanceBand,
    explicitDepthJustificationRequired: belowGuidanceBand,
    wordCountHardQuota: false,
    questionCoverage,
    visualAdequacy: visualSufficiency,
    sourceAdequacy,
    exampleAdequacy,
    conversionPath,
    overall,
  };
}

export function directResponsePagePatternRegistry() {
  void DIRECT_RESPONSE_PAGE_PATTERN_REGISTRY;
  return {
    model: DIRECT_RESPONSE_PAGE_PATTERN_REGISTRY,
    elements: DIRECT_RESPONSE_ELEMENTS,
    longFormProduct: pagePattern("LONG_FORM_DIRECT_RESPONSE_PRODUCT_PAGE"),
    principles: [
      "high clarity",
      "specificity",
      "value communication",
      "mechanism explanation",
      "objection handling",
      "offer clarity",
      "benefit stacking",
      "decision sequencing",
      "CTA repetition at readiness points",
      "risk clarification",
    ],
    copiedBrandedFrameworks: false,
  };
}

export function planCtaSequence(content: string): CtaSequencePlan {
  const ctaCount = (content.match(/PrimaryCTA|Request Pilot Access/g) ?? []).length;
  const placements: CtaSequencePlan["placements"] = [];
  if (/pv-hero[\s\S]{0,800}PrimaryCTA|pv-hero[\s\S]{0,800}Request Pilot Access/.test(content)) placements.push("early CTA");
  if (/workflow[\s\S]{0,600}Request Pilot Access|proposed workflow/i.test(content)) placements.push("mechanism CTA");
  if (/Pricing|\$290/.test(content) && /Request Pilot Access/.test(content)) placements.push("pricing CTA");
  if (/objection|who is this not|risk/i.test(content)) placements.push("post-objection CTA");
  if (/pv-cta-band|final|Request a validation pilot/.test(content)) placements.push("final CTA");
  void ctaCount;
  return { model: "CTASequencePlan", placements, afterEveryParagraph: false };
}

export function buildObjectionKnowledgeGraph(): ObjectionKnowledgeGraph {
  return {
    model: "ObjectionKnowledgeGraph",
    nodes: [
      { objectionId: "obj_finished", objection: "Is this a finished product?", sourceClass: "faq", addressedOn: ["/faq"] },
      { objectionId: "obj_payment", objection: "Is payment collected on this site?", sourceClass: "pricing", addressedOn: ["/faq", "/pricing"] },
      { objectionId: "obj_advice", objection: "Is this legal or investment advice?", sourceClass: "risk", addressedOn: ["/faq"] },
      { objectionId: "obj_lower_npv", objection: "Is lower NPV always the better lease?", sourceClass: "market_research", addressedOn: ["/commercial-lease-npv", "/compare-commercial-leases"] },
      { objectionId: "obj_who_not", objection: "Who is this not for?", sourceClass: "workflow", addressedOn: [] },
      { objectionId: "obj_spreadsheet", objection: "Why not keep rebuilding the spreadsheet?", sourceClass: "workflow", addressedOn: ["/"] },
    ],
  };
}

export function evaluateDirectResponsePage(input: { route: string; content: string; commercial: boolean }): {
  present: DirectResponseElement[];
  missing: DirectResponseElement[];
  offerClarity: Gate;
  objectionHandling: Gate;
  ctaProgression: Gate;
  genericSaasOnly: boolean;
  overall: Gate;
} {
  const checks: Array<[DirectResponseElement, RegExp]> = [
    ["BIG_PROMISE", /without rebuilding|compare commercial lease|focused workflow/i],
    ["WHO_FOR", /tenant-rep|tenant representation|boutique CRE/i],
    ["PROBLEM", /rebuild|scattered|spreadsheet|face rent/i],
    ["PROBLEM_COST", /deal by deal|hidden cell|rebuilds a workbook/i],
    ["WHY_CURRENT_METHOD_FAILS", /separate tab|separate emails|headline/i],
    ["MECHANISM", /discount|cash-flow|NPV|shared occupancy/i],
    ["PRODUCT_WORKFLOW", /workflow|capture|client summary/i],
    ["VALUE_STACK", /Cash-flow compare|NPV \+ sensitivity|Client summary/i],
    ["BENEFIT_MAPPING", /shareable|keeps cash-flow/i],
    ["WORKED_EXAMPLE", /illustrative|Lease A/i],
    ["COMPARISON", /Lease A|Lease B|side-by-side/i],
    ["USE_CASES", /tenant-rep|broker/i],
    ["WHO_NOT_FOR", /who is this not for|not for landlords|not for property managers/i],
    ["OBJECTION_HANDLING", /not a finished product|payment is not collected|not automatically/i],
    ["PRICING", /\$290|\$149/],
    ["RISK_REVERSAL", /not collected|interest only/i],
    ["FAQ", /data-section-type="FAQ"|<h2>Is payment|<h2>Is this a finished/i],
    ["AUTHORITY", /resources|NPV|AuthorityRefs/i],
    ["CTA_SEQUENCE", /Request Pilot Access/],
    ["DISCLOSURE", /Disclosure|not legal advice/i],
  ];
  const present = checks.filter(([, pattern]) => pattern.test(input.content)).map(([name]) => name);
  const missing = DIRECT_RESPONSE_ELEMENTS.filter((item) => !present.includes(item));
  const offerClarity = /\$290|\$149|Request Pilot Access|pilot/i.test(input.content) ? "PASS" : "FAIL";
  const objectionHandling = present.includes("OBJECTION_HANDLING") && present.includes("WHO_NOT_FOR") ? "PASS" : "FAIL";
  const cta = planCtaSequence(input.content);
  const ctaProgression =
    !input.commercial ||
    (cta.placements.includes("early CTA") && cta.placements.includes("final CTA") && cta.placements.includes("post-objection CTA"))
      ? "PASS"
      : "FAIL";
  const genericSaasOnly = /unlimited seats|start free trial|trusted by \d+ teams/i.test(input.content) && !/NPV|lease/i.test(input.content);
  const required: DirectResponseElement[] = ["BIG_PROMISE", "PROBLEM", "MECHANISM", "PRICING", "CTA_SEQUENCE", "DISCLOSURE", "WHO_NOT_FOR", "OBJECTION_HANDLING", "FAQ"];
  const overall = !input.commercial || required.every((item) => present.includes(item)) ? (input.commercial ? "FAIL" : "PASS") : "FAIL";
  const commercialOverall = input.commercial && required.every((item) => present.includes(item)) ? "PASS" : input.commercial ? "FAIL" : "PASS";
  void overall;
  return {
    present,
    missing,
    offerClarity,
    objectionHandling,
    ctaProgression,
    genericSaasOnly,
    overall: commercialOverall,
  };
}

export function evaluatePagePatternFulfillment(input: { patternId: string; content: string }): { patternId: string; required: number; present: number; overall: Gate } {
  const pattern = pagePattern(input.patternId);
  const present = pattern.requiredBlocks.filter((block) => {
    const needle = block.toLowerCase();
    if (needle.includes("direct answer") || needle.includes("explicit question")) return /AnswerFirst|data-answer-first/.test(input.content);
    if (needle.includes("pricing")) return /\$290|\$149|Pricing/.test(input.content);
    if (needle.includes("cta")) return /Request Pilot Access|PrimaryCTA/.test(input.content);
    if (needle.includes("disclosure")) return /Disclosure|not legal advice/.test(input.content);
    if (needle.includes("source") || needle.includes("authority")) return /AuthorityRefs|investopedia|naiop/.test(input.content);
    if (needle.includes("visual") || needle.includes("product")) return /data-visualization|ProductUiFrame|<table/.test(input.content);
    if (needle.includes("example")) return /illustrative|example/.test(input.content);
    if (needle.includes("limitation") || needle.includes("mistake")) return /mistake|does not|not automatically/.test(input.content);
    if (needle.includes("workflow") || needle.includes("mechanism")) return /workflow|discount|cash-flow/.test(input.content);
    if (needle.includes("objection")) return /objection|not for|finished product/.test(input.content);
    if (needle.includes("faq")) return /<h2>Is |finished product/.test(input.content);
    if (needle.includes("who for")) return /tenant-rep|broker/.test(input.content);
    if (needle.includes("who not")) return /who is this not for/.test(input.content);
    if (needle.includes("problem")) return /rebuild|spreadsheet|face rent/.test(input.content);
    if (needle.includes("related")) return /RelatedContent|related concepts/.test(input.content);
    if (needle.includes("internal")) return /href="\//.test(input.content);
    return hasMarker(input.content, new RegExp(block.split(" ")[0], "i"));
  }).length;
  return {
    patternId: input.patternId,
    required: pattern.requiredBlocks.length,
    present,
    overall: present >= pattern.requiredBlocks.length ? "PASS" : "FAIL",
  };
}
