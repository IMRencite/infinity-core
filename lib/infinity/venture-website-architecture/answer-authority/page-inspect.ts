import { wordCountOf } from "../quality-gates";

export function routeToPagePath(route: string): string {
  return route === "/" ? "app/page.tsx" : `app${route}/page.tsx`;
}

export function pageContent(files: Array<{ path: string; content: string }>, route: string): string {
  const expected = routeToPagePath(route);
  return files.find((file) => file.path.replace(/\\/g, "/") === expected)?.content ?? "";
}

export function pageBlob(files: Array<{ path: string; content: string }>): string {
  return files.map((file) => file.content).join("\n");
}

export function approxWordCount(content: string): number {
  return wordCountOf(content);
}

export function extractAnswerFirstBlocks(content: string): Array<{ question: string; answer: string }> {
  const blocks: Array<{ question: string; answer: string }> = [];
  const pattern = /AnswerFirst\s+question="([^"]+)"\s+answer="([^"]+)"/g;
  for (const match of content.matchAll(pattern)) {
    blocks.push({ question: match[1], answer: match[2] });
  }
  return blocks;
}

export function extractInternalHrefsInBody(content: string): string[] {
  const withoutChrome = content
    .replace(/SiteBreadcrumb[\s\S]*?\/>/g, " ")
    .replace(/VentureFooter[\s\S]*?\/>/g, " ");
  return [...withoutChrome.matchAll(/href\s*[:=]\s*["'](\/[^"']*)["']/g)].map((match) => match[1].replace(/\/$/, "") || "/");
}

export function hasMarker(content: string, pattern: RegExp): boolean {
  return pattern.test(content);
}

export function uniqueCompositionTypes(content: string): string[] {
  const types = [...content.matchAll(/data-section-type="([^"]+)"/g)].map((match) => match[1]);
  const patterns = [...content.matchAll(/data-pattern-id="([^"]+)"/g)].map((match) => match[1]);
  return [...new Set([...types, ...patterns])];
}

export function presentVisualTypes(content: string): string[] {
  const named = [...content.matchAll(/data-visualization="([^"]+)"/g)].map((match) => match[1]);
  if (/<table|pv-compare/.test(content)) named.push("table");
  if (/ProductUiFrame|pv-product-frame/.test(content)) named.push("product_ui");
  if (/pv-workflow|WORKFLOW_DIAGRAM/.test(content)) named.push("process_flow");
  if (/pv-bar|chart/.test(content)) named.push("chart");
  if (/callout|Disclosure|pv-caption/.test(content)) named.push("callout");
  return [...new Set(named)];
}

export function answerWordCount(answer: string): number {
  return answer.split(/\s+/).filter(Boolean).length;
}
