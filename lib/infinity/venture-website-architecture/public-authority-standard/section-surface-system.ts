import type { Gate } from "../types";
import {
  AUTHORITY_SECTION_SURFACE_SYSTEM,
  SECTION_SURFACE_CONTRAST_GATE,
  SECTION_SURFACE_RHYTHM_GATE,
} from "../constants";

export const AUTHORITY_SECTION_SURFACE_VARIANTS = [
  "DEFAULT",
  "SUBTLE",
  "TINTED",
  "EMPHASIS",
  "DARK_ACCENT",
  "EDITORIAL",
] as const;

export type AuthoritySectionSurfaceVariant = (typeof AUTHORITY_SECTION_SURFACE_VARIANTS)[number];

export type AuthoritySectionSurfaceSystem = {
  model: typeof AUTHORITY_SECTION_SURFACE_SYSTEM;
  variants: readonly AuthoritySectionSurfaceVariant[];
  derivedFrom: "PublicAuthoritySiteProfile";
  ventureColorsForbiddenInGlobalStandard: true;
  mechanicalStripingRejected: true;
  allWhiteMonotonyRejected: true;
  adjacentHighEmphasisRejected: true;
  backgroundsMaySpanSection: true;
  contentRemainsConstrained: true;
};

export const AUTHORITY_SECTION_SURFACE_SYSTEM_CONTRACT: AuthoritySectionSurfaceSystem = {
  model: AUTHORITY_SECTION_SURFACE_SYSTEM,
  variants: AUTHORITY_SECTION_SURFACE_VARIANTS,
  derivedFrom: "PublicAuthoritySiteProfile",
  ventureColorsForbiddenInGlobalStandard: true,
  mechanicalStripingRejected: true,
  allWhiteMonotonyRejected: true,
  adjacentHighEmphasisRejected: true,
  backgroundsMaySpanSection: true,
  contentRemainsConstrained: true,
};

export const SECTION_TYPE_SURFACE: Record<string, AuthoritySectionSurfaceVariant> = {
  HERO: "DEFAULT",
  ANSWER_SURFACES: "DEFAULT",
  DEFINITION: "DEFAULT",
  EXPLANATION: "SUBTLE",
  HOW_IT_WORKS: "TINTED",
  EXAMPLE: "SUBTLE",
  ASSUMPTIONS: "DEFAULT",
  EDGE_CASES: "TINTED",
  MISTAKES: "SUBTLE",
  DECISION: "EDITORIAL",
  LIMITS: "DEFAULT",
  CTA: "EMPHASIS",
  AUTHORITY_REFERENCES: "SUBTLE",
  RELATED: "TINTED",
  HUB_DISCOVERY: "TINTED",
  LEGAL: "DEFAULT",
};

export function surfaceForSectionType(sectionType: string, archetype = "QUESTION_AUTHORITY"): AuthoritySectionSurfaceVariant {
  if (archetype === "LEGAL") return "DEFAULT";
  if (archetype === "PRODUCT" && sectionType === "CTA") return "EMPHASIS";
  if (archetype === "TOPIC_HUB" && (sectionType === "RELATED" || sectionType === "HUB_DISCOVERY")) return "TINTED";
  return SECTION_TYPE_SURFACE[sectionType] ?? "DEFAULT";
}

export function evaluateSectionSurfaceRhythm(input: {
  surfaces: AuthoritySectionSurfaceVariant[];
  longPage: boolean;
}): {
  gate: typeof SECTION_SURFACE_RHYTHM_GATE;
  allWhiteMonotony: number;
  mechanicalZebra: number;
  adjacentHighEmphasis: number;
  overall: Gate;
} {
  const run = input.surfaces;
  const allDefault = run.length >= 6 && run.every((item) => item === "DEFAULT");
  const allWhiteMonotony = input.longPage && allDefault ? 1 : 0;
  let zebra = 0;
  if (run.length >= 6) {
    const alternating = run.every((item, index) =>
      index === 0 ? true : item !== run[index - 1] && (item === "DEFAULT" || run[index - 1] === "DEFAULT"),
    );
    if (alternating) zebra = 1;
  }
  let adjacentHighEmphasis = 0;
  const hot = new Set<AuthoritySectionSurfaceVariant>(["EMPHASIS", "DARK_ACCENT"]);
  for (let index = 1; index < run.length; index += 1) {
    if (hot.has(run[index]!) && hot.has(run[index - 1]!)) adjacentHighEmphasis += 1;
  }
  return {
    gate: SECTION_SURFACE_RHYTHM_GATE,
    allWhiteMonotony,
    mechanicalZebra: zebra,
    adjacentHighEmphasis,
    overall: allWhiteMonotony === 0 && zebra === 0 && adjacentHighEmphasis === 0 ? "PASS" : "FAIL",
  };
}

export function evaluateSectionSurfaceContrast(input: {
  variants: AuthoritySectionSurfaceVariant[];
  textOnEmphasisLight: boolean;
  cardsDistinctOnTinted: boolean;
  linksReadable: boolean;
  html?: string;
  css?: string;
}): {
  gate: typeof SECTION_SURFACE_CONTRAST_GATE;
  contrastFailures: number;
  overall: Gate;
} {
  const css = input.css ?? "";
  const html = input.html ?? "";
  const unknown = input.variants.some((item) => !AUTHORITY_SECTION_SURFACE_VARIANTS.includes(item));
  const unscopedEmphasisLinks =
    /\[data-surface="EMPHASIS"\]\s+a\s*\{[^}]*color:\s*#d7e8ff/i.test(css) &&
    !/\[data-surface="EMPHASIS"\][^{]*\.pv-cta-panel a/i.test(css);
  const nestedLight = /data-surface="EMPHASIS"[\s\S]{0,6000}data-surface="(SUBTLE|TINTED|DEFAULT|EDITORIAL)"/.test(html);
  const inkReset = /--pv-surface-ink-reset/.test(css) || /\[data-surface="EMPHASIS"\] \.sn-title/.test(css);
  const leak = nestedLight && !inkReset;
  const failures = [unknown, !input.textOnEmphasisLight, !input.cardsDistinctOnTinted, !input.linksReadable, unscopedEmphasisLinks, leak].filter(Boolean).length;
  return {
    gate: SECTION_SURFACE_CONTRAST_GATE,
    contrastFailures: failures,
    overall: failures === 0 ? "PASS" : "FAIL",
  };
}

export function extractSurfaceSequence(html: string): AuthoritySectionSurfaceVariant[] {
  return [...html.matchAll(/data-surface="([A-Z_]+)"/g)]
    .map((item) => item[1])
    .filter((item): item is AuthoritySectionSurfaceVariant =>
      (AUTHORITY_SECTION_SURFACE_VARIANTS as readonly string[]).includes(item),
    );
}
