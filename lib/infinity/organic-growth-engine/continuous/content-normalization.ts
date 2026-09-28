import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import { countSubstantiveWords, SUBSTANTIVE_WORD_FLOOR } from "./content-quality-v4";

export const CONTENT_NORMALIZATION_GATE = "ContentNormalizationGate" as const;
export const EMPTY_SECTION_GATE = "EmptySectionGate" as const;
export const DUPLICATE_DRAFT_GATE = "DuplicateDraftGate" as const;
export const SOURCE_RENDER_PARITY_GATE = "SourceRenderParityGate" as const;

export function visibleArticleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?(?:\/>|<\/script>)/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countRenderedSubstantiveWords(html: string): number {
  return visibleArticleText(html).split(" ").filter((word) => word && !/^https?:/i.test(word)).length;
}

export function evaluateContentNormalizationGate(input: { body?: string; html?: string }): OrganicNamedGate {
  const text = `${input.body ?? ""}\n${input.html ? visibleArticleText(input.html) : ""}`;
  const reasons: string[] = [];
  if (/\\n|\\r\\n/.test(text)) reasons.push("FAIL_CONTENT_NORMALIZATION:LITERAL_NEWLINE");
  if (/(^|\s)##\s+\S/m.test(text) || text.includes("## Fabric") || text.includes("## Print")) {
    reasons.push("FAIL_CONTENT_NORMALIZATION:MARKDOWN_HEADING");
  }
  if (/(^|\s)###\s+\S/m.test(text)) reasons.push("FAIL_CONTENT_NORMALIZATION:MARKDOWN_H3");
  if (/```/.test(text)) reasons.push("FAIL_CONTENT_NORMALIZATION:CODE_FENCE");
  if (/\[[^\]]+\]\([^)]*$/.test(text)) reasons.push("FAIL_CONTENT_NORMALIZATION:UNFINISHED_MARKDOWN_LINK");
  if (/(^|\n)\s*[-*]\s+\S/.test(input.body ?? "") && /[-*]\s+\S/.test(visibleArticleText(input.html ?? input.body ?? ""))) {
    if (!input.html && /(^|\n)\s*[-*]\s+\S/.test(input.body ?? "")) {
      reasons.push("FAIL_CONTENT_NORMALIZATION:RAW_MARKDOWN_BULLET");
    }
  }
  if (/\\u00|\\x[0-9a-f]{2}/i.test(text)) reasons.push("FAIL_CONTENT_NORMALIZATION:BAD_ESCAPE");
  return {
    gate: CONTENT_NORMALIZATION_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["CONTENT_NORMALIZED"],
  };
}

export function evaluateEmptySectionGate(input: { headings: string[]; body: string; html?: string }): OrganicNamedGate {
  const reasons: string[] = [];
  const source = input.html ?? input.body;
  const headingBlocks = source.split(/#{2,3}\s+|(?:<h[23][^>]*>)/i);
  if (input.html) {
    const emptyHtml = /<h2[^>]*>[\s\S]*?<\/h2>\s*(<h2|<\/div>|<\/section>)/i.test(input.html);
    if (emptyHtml) reasons.push("FAIL_EMPTY_SECTIONS");
  }
  const markdownSections = input.body.split(/^##\s+/m).slice(1);
  for (const section of markdownSections) {
    const body = section.replace(/^[^\n]+\n/, "").trim();
    if (!body || body.length < 40) reasons.push("FAIL_EMPTY_SECTIONS");
  }
  if (!markdownSections.length && input.headings.length >= 4) {
    const paragraphs = input.body.split(/\n\n+/).filter((row) => row.trim());
    const emptyish = paragraphs.filter((row) => row.replace(/^#+\s+/, "").split(/\s+/).length < 12).length;
    if (emptyish >= Math.max(3, input.headings.length - 2) && paragraphs.length <= input.headings.length + 2) {
      reasons.push("FAIL_EMPTY_SECTIONS");
    }
  }
  return {
    gate: EMPTY_SECTION_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? [...new Set(reasons)] : ["SECTIONS_HAVE_BODIES"],
  };
}

export function evaluateDuplicateDraftGate(input: { body: string; headings?: string[] }): OrganicNamedGate {
  const reasons: string[] = [];
  const paras = input.body.split(/\n\n+/).map((row) => row.trim()).filter(Boolean);
  const counts = new Map<string, number>();
  for (const para of paras) {
    const key = para.slice(0, 180).toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if ([...counts.values()].some((count) => count >= 2 && [...counts.keys()].find((key) => counts.get(key) === count && key.split(" ").length > 18))) {
    reasons.push("FAIL_DUPLICATE_CONTENT");
  }
  const headings = input.headings ?? [];
  if (headings.length >= 4) {
    const twice = headings.filter((heading, index) => headings.indexOf(heading) !== index);
    if (twice.length) reasons.push("FAIL_DUPLICATE_CONTENT:REPEATED_HEADINGS");
  }
  const half = Math.floor(input.body.length / 2);
  if (half > 400) {
    const left = input.body.slice(0, half).replace(/\s+/g, " ").trim();
    const right = input.body.slice(half).replace(/\s+/g, " ").trim();
    const overlap = left.slice(0, 240);
    if (overlap.length > 80 && right.includes(overlap.slice(0, 80))) reasons.push("FAIL_DUPLICATE_CONTENT:CONCATENATED_DRAFT");
  }
  return {
    gate: DUPLICATE_DRAFT_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? [...new Set(reasons)] : ["NO_DUPLICATE_DRAFT"],
  };
}

export function evaluateSourceRenderParityGate(input: {
  draft: OrganicDraft;
  rendered_html: string;
}): OrganicNamedGate & { source_words: number; rendered_words: number } {
  const source_words = countSubstantiveWords(input.draft);
  const rendered_words = countRenderedSubstantiveWords(input.rendered_html);
  const reasons: string[] = [];
  if (source_words >= SUBSTANTIVE_WORD_FLOOR && rendered_words < 600) reasons.push("FAIL_RENDER_CONTENT_LOSS");
  if (source_words >= SUBSTANTIVE_WORD_FLOOR && rendered_words < SUBSTANTIVE_WORD_FLOOR) {
    reasons.push("FAIL_RENDER_WORD_FLOOR");
  }
  if (/(^|\s)##\s+\S/.test(visibleArticleText(input.rendered_html)) || /\\n/.test(input.rendered_html.replace(/JSON\.stringify|__html/g, ""))) {
    reasons.push("FAIL_RENDER_MARKDOWN_OR_ESCAPE");
  }
  return {
    gate: SOURCE_RENDER_PARITY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["SOURCE_RENDER_PARITY"],
    source_words,
    rendered_words,
  };
}
