import type { ClubThrottleConceptBrief } from "./club-throttle-concept-preflight.ts";
import { chromaKeyPromptSuffix } from "./lot-line-chroma-key.ts";
import type { ChromaKeyColor } from "./lot-line-chroma-key.ts";

const GARMENT_SEMANTIC_TERMS = [
  "shirt",
  "t-shirt",
  "tee",
  "hoodie",
  "apparel",
  "garment",
  "wear",
  "wearing",
  "back graphic",
  "back print",
  "front print",
  "merch",
  "merchandise",
  "mockup",
  "model",
  "person",
  "rider wearing",
  "product",
  "mannequin",
  "sleeve",
  "neckline",
  "torso",
] as const;

/** Positive-only provider prompt — no garment/mockup vocabulary. */
export function compileIsolatedGraphicProviderPrompt(
  brief: ClubThrottleConceptBrief,
  keyColor: ChromaKeyColor,
): string {
  const chromaSuffix = chromaKeyPromptSuffix(keyColor);
  const themeLine =
    brief.design_mode === "TYPOGRAPHY_FIRST" || brief.design_mode === "PHRASE_FIRST"
      ? `Bold original typography emblem for "${brief.name}". ${brief.commercial_hook}.`
      : `Bold original illustration emblem for "${brief.name}". ${brief.commercial_hook}.`;
  return [
    "Create one isolated standalone graphic emblem centered on the canvas.",
    themeLine,
    `Visual mood: ${brief.market_signals[0] ?? brief.commercial_hook}.`,
    "Single cohesive graphic with clean closed boundary; high contrast; readable at distance.",
    "Composition fills the frame as one graphic object — not a small poster on empty space.",
    chromaSuffix,
  ].join(" ");
}

export function scanProviderPromptGarmentTerms(prompt: string): {
  CT_FINAL_PROVIDER_PROMPT_GARMENT_TERMS: string[];
  CT_POSITIVE_GARMENT_PRIMING_TERMS: string[];
  CT_NEGATED_GARMENT_TERMS: string[];
} {
  const lower = prompt.toLowerCase();
  const found = GARMENT_SEMANTIC_TERMS.filter((term) => lower.includes(term.toLowerCase()));
  const negated = found.filter((term) => {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx < 0) return false;
    const window = lower.slice(Math.max(0, idx - 8), idx + term.length + 4);
    return /\bno\s+$/.test(window) || window.includes("without ");
  });
  const positive = found.filter((t) => !negated.includes(t));
  return {
    CT_FINAL_PROVIDER_PROMPT_GARMENT_TERMS: found,
    CT_POSITIVE_GARMENT_PRIMING_TERMS: positive,
    CT_NEGATED_GARMENT_TERMS: negated,
  };
}

export function providerPromptGarmentSemanticCount(prompt: string): number {
  return scanProviderPromptGarmentTerms(prompt).CT_POSITIVE_GARMENT_PRIMING_TERMS.length;
}

export function v43ProviderPromptIsolationQc(prompt: string): "PASS" | "FAIL" {
  return providerPromptGarmentSemanticCount(prompt) === 0 ? "PASS" : "FAIL";
}

export function v43SingleChromaKeyQc(prompt: string, keyColor: ChromaKeyColor): "PASS" | "FAIL" {
  const rgb = `rgb(${keyColor.r},${keyColor.g},${keyColor.b})`;
  const upper = prompt.toUpperCase();
  const occurrences =
    (prompt.match(new RegExp(`RGB\\(${keyColor.r},${keyColor.g},${keyColor.b}\\)`, "g"))?.length ?? 0) +
    (prompt.toLowerCase().split(rgb.toLowerCase()).length - 1);
  return occurrences >= 1 && occurrences <= 2 ? "PASS" : "FAIL";
}

export function creativeRetryStrategyChangedQc(prompt: string, keyColor: ChromaKeyColor): "PASS" | "FAIL" {
  return v43ProviderPromptIsolationQc(prompt) === "PASS" && v43SingleChromaKeyQc(prompt, keyColor) === "PASS"
    ? "PASS"
    : "FAIL";
}
