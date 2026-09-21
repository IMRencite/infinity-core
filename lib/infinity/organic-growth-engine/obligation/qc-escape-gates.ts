import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

const INTERNAL_LANGUAGE = /this page (answers|exists to)|input checklist only|not a second process explainer|search intent|content cluster|content opportunity|voc signal|cannibalization|production candidate|seo objective|geo objective|validation page|generated page|organic opportunity/i;
const MATURITY_LEAK = /validation\s*\/\s*pilot|pilot concept|validation concept|proof of concept|not a finished product|not generally available|experimental product|test product|prototype product|request pilot access|\bpilot access\b/i;

export function evaluatePublicContentInternalLanguageGate(copy: string): NamedOutboundLoopGate {
  return INTERNAL_LANGUAGE.test(copy)
    ? named("PublicContentInternalLanguageGate", "FAIL", ["INTERNAL_STRATEGY_LEAK"])
    : named("PublicContentInternalLanguageGate", "PASS", ["NO_INTERNAL_LEAK"]);
}

export function evaluateProductClaimTruthGate(copy: string): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (/guarantees? (a |the )?(winner|result|saving)/i.test(copy)) reasons.push("UNVERIFIED_GUARANTEE");
  if (/\btrial\b/i.test(copy) && !/3-day|3 day/i.test(copy)) reasons.push("TRIAL_TERM_MISSTATED");
  if (/\btrial\b/i.test(copy) && !/no credit card/i.test(copy)) reasons.push("TRIAL_CARD_MISSTATED");
  if (/\btrial\b/i.test(copy) && !/no automatic billing/i.test(copy)) reasons.push("TRIAL_BILLING_MISSTATED");
  if (/\/pricing/.test(copy) === false && /occupancynpv/i.test(copy) && /\btrial\b/i.test(copy)) reasons.push("PRICING_URL_MISSING");
  return named("ProductClaimTruthGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["CLAIMS_MATCH_VENTURE_TRUTH"]);
}

export function evaluateProductMaturityTruthGate(input: {
  copy: string;
  canonical_permits_pilot?: boolean;
}): NamedOutboundLoopGate {
  if (input.canonical_permits_pilot) return named("ProductMaturityTruthGate", "PASS", ["CANONICAL_PERMITS"]);
  return MATURITY_LEAK.test(input.copy)
    ? named("ProductMaturityTruthGate", "FAIL", ["PUBLIC_MATURITY_LEAK"])
    : named("ProductMaturityTruthGate", "PASS", ["LIVE_PRODUCT_LANGUAGE"]);
}

export function evaluateAboveFoldRedundancyGate(input: {
  hero_answer: string;
  intro: string;
  first_section_intro?: string;
}): NamedOutboundLoopGate {
  const hero = normalize(input.hero_answer);
  const intro = normalize(input.intro);
  if (!hero || !intro) return named("AboveFoldRedundancyGate", "PASS", ["NO_PAIR"]);
  if (hero === intro || (hero.length > 40 && intro.includes(hero.slice(0, 80)))) {
    return named("AboveFoldRedundancyGate", "FAIL", ["HERO_INTRO_DUPLICATE"]);
  }
  if (input.first_section_intro && normalize(input.first_section_intro) === hero) {
    return named("AboveFoldRedundancyGate", "FAIL", ["HERO_SECTION_DUPLICATE"]);
  }
  return named("AboveFoldRedundancyGate", "PASS", ["DISTINCT_ABOVE_FOLD"]);
}

export function evaluateContentRedundancyGate(blocks: string[]): NamedOutboundLoopGate {
  const normalized = blocks.map(normalize).filter((row) => row.length > 40);
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      if (normalized[i] === normalized[j] || overlap(normalized[i], normalized[j]) > 0.82) {
        return named("ContentRedundancyGate", "FAIL", ["REPEATED_BLOCK"]);
      }
    }
  }
  return named("ContentRedundancyGate", "PASS", ["UNIQUE_BLOCKS"]);
}

export function evaluateHumanResourceDepthGate(input: {
  asset_type: string;
  direct_answer: boolean;
  primary_inputs_covered: number;
  checklist: boolean;
  worked_example: boolean;
  mistakes: boolean;
  next_step: boolean;
  user_can_gather: boolean;
  hero_dominates?: boolean;
  coverage?: Array<{ id: string; required?: boolean; level: string }>;
  unique_information_density?: "PASS" | "FAIL";
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (!input.direct_answer) reasons.push("MISSING_DIRECT_ANSWER");
  if (input.asset_type === "CHECKLIST" && input.primary_inputs_covered < 6) reasons.push("MISSING_PRIMARY_INPUTS");
  if (input.asset_type === "CHECKLIST" && !input.checklist) reasons.push("MISSING_CHECKLIST");
  if (input.asset_type === "CHECKLIST" && !input.worked_example) reasons.push("MISSING_WORKED_EXAMPLE");
  if (!input.mistakes) reasons.push("MISSING_MISTAKES");
  if (!input.next_step) reasons.push("MISSING_NEXT_STEP");
  if (!input.user_can_gather) reasons.push("NOT_ACTIONABLE");
  if (input.hero_dominates) reasons.push("HERO_DOMINATES");
  if (input.asset_type === "CHECKLIST" && !input.coverage) {
    reasons.push("STRUCTURE_ONLY_NOT_SUBSTANCE");
  }
  if (input.coverage) {
    const weak = input.coverage.filter((row) => row.required === true && (row.level === "NOT_COVERED" || row.level === "MENTION_ONLY"));
    if (weak.length) reasons.push("PRIMARY_NODES_NOT_EXPLAINED");
  }
  if (input.unique_information_density === "FAIL") reasons.push("LOW_INFORMATION_DENSITY");
  return named("HumanResourceDepthGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["SUBSTANTIVE_COVERAGE"]);
}

export function evaluateThinContentRiskGate(input: {
  unique_sections: number;
  repeated_ratio: number;
  missing_obvious_subtopics: string[];
  generic?: boolean;
  faq_only_depth?: boolean;
  asset_type?: string;
  mention_only_ratio?: number;
  unique_information_density?: "PASS" | "FAIL";
  table_only_body?: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  const minSections = input.asset_type === "CHECKLIST" ? 8 : 4;
  if (input.unique_sections < minSections) reasons.push("TOO_FEW_SECTIONS");
  if (input.repeated_ratio > 0.35) reasons.push("HIGH_REPETITION");
  if (input.missing_obvious_subtopics.length) reasons.push("MISSING_SUBTOPICS");
  if (input.generic) reasons.push("GENERIC");
  if (input.faq_only_depth) reasons.push("FAQ_PADDING");
  if (input.asset_type === "CHECKLIST" && input.mention_only_ratio == null && input.unique_information_density == null) {
    reasons.push("STRUCTURE_COUNT_NOT_DEPTH");
  }
  if ((input.mention_only_ratio ?? 0) > 0.25) reasons.push("MENTION_ONLY_DEPTH");
  if (input.unique_information_density === "FAIL") reasons.push("LOW_INFORMATION_DENSITY");
  if (input.table_only_body) reasons.push("TABLE_ONLY_BODY");
  return named("ThinContentRiskGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["NOT_THIN"]);
}

export function evaluateTextContrastGate(pairs: Array<{ name: string; fg: string; bg: string; ratio?: number }>): NamedOutboundLoopGate {
  const failed = pairs.filter((row) => (row.ratio ?? contrastRatio(row.fg, row.bg)) < 4.5);
  return failed.length
    ? named("TextContrastGate", "FAIL", failed.map((row) => row.name))
    : named("TextContrastGate", "PASS", ["CONTRAST_AA"]);
}

export function evaluateRenderedTextVisibilityGate(input: {
  white_on_white?: boolean;
  light_on_light?: boolean;
  hidden?: boolean;
  zero_height?: boolean;
  browser_evidence: boolean;
}): NamedOutboundLoopGate {
  if (!input.browser_evidence) return named("RenderedTextVisibilityGate", "NOT_PROVEN", ["NO_BROWSER_EVIDENCE"]);
  const reasons: string[] = [];
  if (input.white_on_white || input.light_on_light) reasons.push("LOW_CONTRAST_RENDER");
  if (input.hidden) reasons.push("HIDDEN_TEXT");
  if (input.zero_height) reasons.push("ZERO_HEIGHT_LABEL");
  return named("RenderedTextVisibilityGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["VISIBLE"]);
}

export function evaluateOrganicRenderedQualityGate(input: {
  desktop?: NamedOutboundLoopGate;
  tablet?: NamedOutboundLoopGate;
  mobile?: NamedOutboundLoopGate;
  contrast?: NamedOutboundLoopGate;
  visibility?: NamedOutboundLoopGate;
  table_responsive?: NamedOutboundLoopGate;
  screenshot_capture?: NamedOutboundLoopGate;
  visual_inspection?: NamedOutboundLoopGate;
  element_contrast?: NamedOutboundLoopGate;
  layout?: NamedOutboundLoopGate;
  content_density_visual?: NamedOutboundLoopGate;
  deployment_identity?: NamedOutboundLoopGate;
  evidence: {
    desktop_viewport?: number;
    tablet_viewport?: number;
    mobile_viewport?: number;
    screenshot?: boolean;
    computed_contrast?: boolean;
    url?: string;
    evidence_id?: string;
    deployment_id?: string;
    visual_inspection_result?: "PASS" | "FAIL";
    text_element_count?: number;
    enumerated_all_text?: boolean;
  };
}): NamedOutboundLoopGate {
  if (!input.evidence.screenshot || !input.evidence.computed_contrast || !input.evidence.desktop_viewport || !input.evidence.tablet_viewport || !input.evidence.mobile_viewport) {
    return named("OrganicRenderedQualityGate", "FAIL", ["ASSUMED_RENDER_PASS_WITHOUT_BROWSER_EVIDENCE"]);
  }
  if (!input.evidence.evidence_id || !input.evidence.deployment_id || input.evidence.visual_inspection_result == null || !input.evidence.enumerated_all_text) {
    return named("OrganicRenderedQualityGate", "FAIL", ["SCREENSHOT_PRESENCE_IS_NOT_VISUAL_PASS"]);
  }
  const failed = [
    input.desktop,
    input.tablet,
    input.mobile,
    input.contrast,
    input.visibility,
    input.table_responsive,
    input.screenshot_capture,
    input.visual_inspection,
    input.element_contrast,
    input.layout,
    input.content_density_visual,
    input.deployment_identity,
  ].filter((row) => row && row.result === "FAIL");
  return named("OrganicRenderedQualityGate", failed.length ? "FAIL" : "PASS", failed.length ? failed.map((row) => row!.gate) : ["EVIDENCE_PROVEN_RENDER"]);
}

export function evaluateRepairedProductionContentCanaryGate(input: {
  live_http: number;
  required_content_gates: NamedOutboundLoopGate[];
  rendered: NamedOutboundLoopGate;
  evidence_integrity?: NamedOutboundLoopGate;
}): NamedOutboundLoopGate {
  if (input.live_http !== 200) return named("RepairedProductionContentCanaryGate", "FAIL", ["HTTP"]);
  if (!input.evidence_integrity) return named("RepairedProductionContentCanaryGate", "FAIL", ["PARENT_TRUSTED_UNSUPPORTED_CHILD_PASS"]);
  const failed = [...input.required_content_gates, input.rendered, input.evidence_integrity].filter((row) => row.result !== "PASS");
  return named("RepairedProductionContentCanaryGate", failed.length ? "FAIL" : "PASS", failed.length ? failed.map((row) => row.gate) : ["REPAIRED_LIVE"]);
}

export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function luminance(color: string): number {
  const hex = color.replace("#", "");
  if (hex.length < 6) return 1;
  const n = (start: number) => parseInt(hex.slice(start, start + 2), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(n(0)) + 0.7152 * lin(n(2)) + 0.0722 * lin(n(4));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function overlap(a: string, b: string): number {
  const left = new Set(a.split(" ").filter((word) => word.length > 3));
  const right = new Set(b.split(" ").filter((word) => word.length > 3));
  if (!left.size || !right.size) return 0;
  let hit = 0;
  for (const word of left) if (right.has(word)) hit += 1;
  return hit / Math.min(left.size, right.size);
}

export function scanPublicMaturityLeaks(copy: string): { phrase: string; kind: "PUBLIC_LEAK" | "INTERNAL_ONLY" }[] {
  return [
    "pilot concept",
    "validation / pilot",
    "validation concept",
    "Input checklist only",
  ].flatMap((phrase) => (copy.includes(phrase) ? [{ phrase, kind: "PUBLIC_LEAK" as const }] : []));
}
