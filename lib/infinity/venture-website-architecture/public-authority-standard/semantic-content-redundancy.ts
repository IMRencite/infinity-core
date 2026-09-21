import type { Gate } from "./types";

export const SEMANTIC_CONTENT_REDUNDANCY_GATE = "SemanticContentRedundancyGate" as const;

export type RedundancyBlockKind =
  | "heading"
  | "paragraph"
  | "bullet"
  | "callout"
  | "answer_chunk"
  | "table"
  | "caption"
  | "summary"
  | "cta"
  | "related_card";

export type RedundancyBlock = {
  id: string;
  kind: RedundancyBlockKind;
  text: string;
  sectionId?: string;
  adjacentSectionId?: string;
};

export type RedundancyCandidate = {
  leftId: string;
  rightId: string;
  similarity: number;
  exact: boolean;
  nearDuplicate: boolean;
  differentiated: boolean;
  decision: "FAIL" | "RETAIN";
  reason: string;
};

const DIFFERENTIATION =
  /\b(if|unless|except|because|before you|that means|so you|normalize|then |next|instead|when one|when two|risk|compare them|can move|can hide|can flip)\b/i;

const SYNONYMS: Record<string, string> = {
  both: "two",
  same: "one",
  identical: "one",
  buildings: "building",
  options: "option",
  proposals: "option",
  leases: "option",
  distort: "wrong",
  hide: "wrong",
  common: "",
  mistake: "",
  sample: "",
  treats: "",
};

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => SYNONYMS[token] ?? token)
    .filter((token) => token.length > 2);
}

function jaccard(a: string[], b: string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const token of left) if (right.has(token)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

function trigramOverlap(a: string, b: string): number {
  const grams = (value: string) => {
    const compact = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const out = new Set<string>();
    for (let i = 0; i < compact.length - 2; i += 1) out.add(compact.slice(i, i + 3));
    return out;
  };
  const left = grams(a);
  const right = grams(b);
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const item of left) if (right.has(item)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

export function semanticSimilarity(left: string, right: string): number {
  const tokenScore = jaccard(tokens(left), tokens(right));
  const gramScore = trigramOverlap(left, right);
  return Math.max(tokenScore, gramScore * 0.92 + tokenScore * 0.08);
}

export function hasDifferentiatedValue(left: string, right: string): boolean {
  const richer = left.length >= right.length ? left : right;
  return DIFFERENTIATION.test(richer) && semanticSimilarity(left, right) < 0.93;
}

export function nearby(left: RedundancyBlock, right: RedundancyBlock): boolean {
  if (left.id === right.id) return false;
  if (left.sectionId && left.sectionId === right.sectionId) return true;
  if (left.sectionId && left.sectionId === right.adjacentSectionId) return true;
  if (right.sectionId && right.sectionId === left.adjacentSectionId) return true;
  return Boolean(left.sectionId && right.sectionId);
}

export function evaluateSemanticPair(left: string, right: string): {
  similarity: number;
  exact: boolean;
  nearDuplicate: boolean;
  differentiated: boolean;
  overall: Gate;
} {
  const normalizedLeft = left.trim().replace(/\s+/g, " ");
  const normalizedRight = right.trim().replace(/\s+/g, " ");
  const exact = normalizedLeft.toLowerCase() === normalizedRight.toLowerCase();
  const similarity = exact ? 1 : semanticSimilarity(normalizedLeft, normalizedRight);
  const differentiated = !exact && hasDifferentiatedValue(normalizedLeft, normalizedRight);
  const nearDuplicate = !exact && similarity >= 0.52 && !differentiated;
  const overall = exact || nearDuplicate ? "FAIL" : "PASS";
  return { similarity, exact, nearDuplicate, differentiated, overall };
}

export function evaluateSemanticNavSurfaceRedundancy(
  surfaces: Array<{ kicker?: string; heading?: string; description?: string }>,
): { redundant: number; overall: Gate; failures: string[] } {
  const failures: string[] = [];
  let redundant = 0;
  for (const surface of surfaces) {
    const kick = (surface.kicker ?? "").trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
    const head = (surface.heading ?? "").trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
    const desc = (surface.description ?? "").trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
    if (kick && head && kick === head) {
      redundant += 1;
      failures.push("kicker_repeats_heading_root");
    }
    if (kick && desc && kick === desc) {
      redundant += 1;
      failures.push("kicker_repeats_description_root");
    }
  }
  return { redundant, overall: redundant === 0 ? "PASS" : "FAIL", failures };
}

export function extractSemanticNavSurfaces(source: string): Array<{ kicker: string; heading: string; description: string }> {
  const surfaces: Array<{ kicker: string; heading: string; description: string }> = [];
  for (const block of source.matchAll(/<nav\b[^>]*class(?:Name)?="[^"]*sn-block[\s\S]*?<\/nav>/gi)) {
    const text = block[0] ?? "";
    const kicker = (text.match(/sn-kicker[^>]*>([\s\S]*?)</i)?.[1] ?? "").replace(/<[^>]+>/g, " ").trim();
    const heading = (text.match(/sn-title[^>]*>([\s\S]*?)</i)?.[1] ?? "").replace(/<[^>]+>/g, " ").trim();
    const description = (text.match(/sn-desc[^>]*>([\s\S]*?)</i)?.[1] ?? "").replace(/<[^>]+>/g, " ").trim();
    if (kicker || heading) surfaces.push({ kicker, heading, description });
  }
  return surfaces;
}

export function evaluateSemanticContentRedundancy(input: {
  blocks: RedundancyBlock[];
  pageArchetype?: string;
  navSurfaces?: Array<{ kicker?: string; heading?: string; description?: string }>;
  html?: string;
}): {
  gate: typeof SEMANTIC_CONTENT_REDUNDANCY_GATE;
  overall: Gate;
  candidates: RedundancyCandidate[];
  exactDuplicates: number;
  nearDuplicates: number;
  retained: number;
  kickerHeadingRedundant: number;
} {
  if (input.pageArchetype === "LEGAL" || input.pageArchetype === "CONTACT") {
    return {
      gate: SEMANTIC_CONTENT_REDUNDANCY_GATE,
      overall: "PASS",
      candidates: [],
      exactDuplicates: 0,
      nearDuplicates: 0,
      retained: 0,
      kickerHeadingRedundant: 0,
    };
  }
  const navSurfaces = input.navSurfaces ?? (input.html ? extractSemanticNavSurfaces(input.html) : []);
  const nav = evaluateSemanticNavSurfaceRedundancy(navSurfaces);
  const candidates: RedundancyCandidate[] = [];
  for (let i = 0; i < input.blocks.length; i += 1) {
    for (let j = i + 1; j < input.blocks.length; j += 1) {
      const left = input.blocks[i];
      const right = input.blocks[j];
      if (!nearby(left, right)) continue;
      if (left.text.trim().length < 12 || right.text.trim().length < 12) continue;
      const pair = evaluateSemanticPair(left.text, right.text);
      if (pair.overall === "PASS" && pair.similarity < 0.55) continue;
      candidates.push({
        leftId: left.id,
        rightId: right.id,
        similarity: pair.similarity,
        exact: pair.exact,
        nearDuplicate: pair.nearDuplicate,
        differentiated: pair.differentiated,
        decision: pair.overall === "FAIL" ? "FAIL" : "RETAIN",
        reason: pair.exact
          ? "exact_restatement"
          : pair.nearDuplicate
            ? "near_duplicate_without_new_decision_value"
            : "useful_reinforcement",
      });
    }
  }
  const exactDuplicates = candidates.filter((item) => item.exact).length;
  const nearDuplicates = candidates.filter((item) => item.nearDuplicate).length;
  const retained = candidates.filter((item) => item.decision === "RETAIN").length;
  return {
    gate: SEMANTIC_CONTENT_REDUNDANCY_GATE,
    overall:
      candidates.some((item) => item.decision === "FAIL") || nav.overall === "FAIL" ? "FAIL" : "PASS",
    candidates,
    exactDuplicates,
    nearDuplicates,
    retained,
    kickerHeadingRedundant: nav.redundant,
  };
}

const SECTION_RE = /data-section-id=["']([^"']+)["']|data-section-type=["']([^"']+)["']/i;

export function extractRedundancyBlocks(source: string): RedundancyBlock[] {
  const blocks: RedundancyBlock[] = [];
  const sections = source.split(/<section\b/i);
  sections.forEach((section, sectionIndex) => {
    const sectionId =
      section.match(SECTION_RE)?.[1] ?? section.match(SECTION_RE)?.[2] ?? `section_${sectionIndex}`;
    const adjacentSectionId = `section_${sectionIndex + 1}`;
    const push = (kind: RedundancyBlockKind, text: string, extra = "") => {
      const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (clean.length < 8) return;
      blocks.push({
        id: `${sectionId}:${kind}:${blocks.length}${extra}`,
        kind,
        text: clean,
        sectionId,
        adjacentSectionId,
      });
    };
    for (const match of section.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)) push("heading", match[1] ?? "");
    for (const match of section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) push("paragraph", match[1] ?? "");
    for (const match of section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) push("bullet", match[1] ?? "");
    for (const match of section.matchAll(/<(?:aside|EditorialHighlight)\b[^>]*>([\s\S]*?)<\/(?:aside|EditorialHighlight)>/gi)) {
      push("callout", match[1] ?? "");
    }
    for (const match of section.matchAll(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi)) push("caption", match[1] ?? "");
    for (const match of section.matchAll(/answer=\{?"([^"]+)"\}?/gi)) push("answer_chunk", match[1] ?? "");
  });
  return blocks;
}
