import { HUMAN_FIRST_PUBLIC_LANGUAGE_GATE } from "./constants";
import { pageContent } from "./answer-authority/page-inspect";
import type { Gate } from "./types";

export const FOUNDER_REPORTED_MACHINE_VOICE_PAGES = 28 as const;

export type HumanFirstFinding = {
  id: string;
  excerpt: string;
  semantic: true;
};

export type HumanFirstPublicLanguageGateResult = {
  gate: typeof HUMAN_FIRST_PUBLIC_LANGUAGE_GATE;
  overall: Gate;
  findings: HumanFirstFinding[];
  visibleAnswerChunk: number;
  hideTheEngine: number;
  relatedPagePlaceholders: number;
  intentOwnershipAuthoring: number;
  factoryProcessLanguage: number;
};

const AUTHORING_PATTERNS: Array<{ id: string; re: RegExp; bucket: keyof Pick<HumanFirstPublicLanguageGateResult, "visibleAnswerChunk" | "hideTheEngine" | "relatedPagePlaceholders" | "intentOwnershipAuthoring" | "factoryProcessLanguage"> }> = [
  { id: "AnswerChunk", re: /\banswer\s*chunk\b/i, bucket: "visibleAnswerChunk" },
  { id: "buried AnswerChunk", re: /buried\s+answer\s*chunk/i, bucket: "visibleAnswerChunk" },
  { id: "Hide the engine", re: /hide the engine/i, bucket: "hideTheEngine" },
  { id: "authoring engine hide", re: /authoring engine|content engine should hide|keep the engine hidden/i, bucket: "hideTheEngine" },
  { id: "Related page one/two", re: /\brelated page (one|two|three|\d+)\b/i, bucket: "relatedPagePlaceholders" },
  { id: "insert related page", re: /insert related page|placeholder related/i, bucket: "relatedPagePlaceholders" },
  { id: "nearby page does not own this intent", re: /nearby page does not own|does not own this (search )?\w* ?intent/i, bucket: "intentOwnershipAuthoring" },
  { id: "this page owns the intent", re: /this page owns the intent|owns this \w+ intent|search intent owner|intent ownership/i, bucket: "intentOwnershipAuthoring" },
  { id: "Clients search this question because", re: /clients search this question because/i, bucket: "intentOwnershipAuthoring" },
  { id: "adjacent intent", re: /adjacent intent|model-presentation intent/i, bucket: "intentOwnershipAuthoring" },
  { id: "factory authoring", re: /\b(page factory|content factory|factory copy|factory authoring|factory instruction|factory template)\b/i, bucket: "factoryProcessLanguage" },
  { id: "generated page", re: /\bgenerated page\b|\bthis page was generated\b/i, bucket: "factoryProcessLanguage" },
  { id: "content engine", re: /\bcontent engine\b|\bauthoring note\b|\bauthoring system\b/i, bucket: "factoryProcessLanguage" },
  { id: "template instruction", re: /\btemplate instruction\b|\bbuild this page\b/i, bucket: "factoryProcessLanguage" },
  { id: "SEO process", re: /\bseo page\b|\bseo process\b|\bseo-process\b/i, bucket: "factoryProcessLanguage" },
  { id: "internal link graph", re: /\binternal link graph\b|\bcontent graph\b|\bquestion graph\b/i, bucket: "factoryProcessLanguage" },
  { id: "canonical owner", re: /\bcanonical owner\b|\bstandalone eligibility\b/i, bucket: "factoryProcessLanguage" },
  { id: "wording clone", re: /\bwording clone\b|\bimplementation commentary\b/i, bucket: "factoryProcessLanguage" },
];

function publicVisibleCopy(source: string): string {
  const stripped = source
    .replace(/import[\s\S]*?from\s+["'][^"']+["'];?/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/data-answer-chunk-id\s*=\s*["'][^"']*["']/gi, " ")
    .replace(/canonical:\s*["'][^"']+["']/g, " ")
    .replace(/className\s*=\s*\{?["'`][\s\S]*?["'`]\}?/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ");
  const answers = [...stripped.matchAll(/answer=\{?"([^"]+)"\}?/g)].map((item) => item[1]);
  const headings = [...stripped.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)].map((item) =>
    item[1].replace(/<[^>]+>/g, " "),
  );
  const paras = [...stripped.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((item) => item[1].replace(/<[^>]+>/g, " "));
  const labels = [...stripped.matchAll(/\blabel:\s*"([^"]+)"/g)].map((item) => item[1]);
  const quotes = [...stripped.matchAll(/["']([^"']{12,})["']/g)]
    .map((item) => item[1])
    .filter((item) => !/^https?:|^\/[a-z0-9-/]+$/i.test(item) && !/^(app|lib|data)-/.test(item));
  const extracted = [...answers, ...headings, ...paras, ...labels, ...quotes].join(". ").replace(/\s+/g, " ").trim();
  if (extracted.length > 40) return extracted;
  return `${extracted} ${stripped.replace(/<[^>]+>/g, " ")}`.replace(/\s+/g, " ").trim();
}

function excerptAround(text: string, match: RegExpMatchArray): string {
  const start = Math.max(0, (match.index ?? 0) - 40);
  return text.slice(start, start + 120).trim();
}

export function evaluateHumanFirstPublicLanguageGate(html: string): HumanFirstPublicLanguageGateResult {
  const text = publicVisibleCopy(html);
  const findings: HumanFirstFinding[] = [];
  const counts = {
    visibleAnswerChunk: 0,
    hideTheEngine: 0,
    relatedPagePlaceholders: 0,
    intentOwnershipAuthoring: 0,
    factoryProcessLanguage: 0,
  };
  for (const pattern of AUTHORING_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern.re.source, pattern.re.flags.includes("g") ? pattern.re.flags : `${pattern.re.flags}g`));
    for (const match of matches) {
      counts[pattern.bucket] += 1;
      findings.push({ id: pattern.id, excerpt: excerptAround(text, match), semantic: true });
    }
  }
  return {
    gate: HUMAN_FIRST_PUBLIC_LANGUAGE_GATE,
    overall: findings.length === 0 ? "PASS" : "FAIL",
    findings,
    ...counts,
  };
}

export function evaluateHumanFirstPublicLanguageAcrossFiles(
  files: Array<{ path: string; content: string; encoding?: string }>,
  routes?: string[],
): HumanFirstPublicLanguageGateResult & { pagesScanned: number; remaining: number } {
  const pageFiles = files.filter((file) => {
    const path = file.path.replace(/\\/g, "/");
    if (file.encoding === "base64") return false;
    if (routes?.length) {
      return routes.some((route) => path === (route === "/" ? "app/page.tsx" : `app${route.replace(/\/+$/, "")}/page.tsx`));
    }
    return path.endsWith("/page.tsx") || path === "app/page.tsx";
  });
  const merged = evaluateHumanFirstPublicLanguageGate(pageFiles.map((file) => file.content).join("\n\n"));
  return {
    ...merged,
    pagesScanned: pageFiles.length,
    remaining: merged.findings.length,
  };
}

export function auditPublicMachineVoice(
  files: Array<{ path: string; content: string; encoding?: string }>,
  routes: string[],
): {
  publicMachineVoiceFindings: number;
  repaired: number;
  remaining: number;
  byRoute: Array<{ route: string; count: number; ids: string[] }>;
} {
  const byRoute = routes.map((route) => {
    const html = pageContent(files, route);
    const result = evaluateHumanFirstPublicLanguageGate(html);
    return { route, count: result.findings.length, ids: result.findings.map((item) => item.id) };
  });
  const remaining = byRoute.reduce((sum, row) => sum + row.count, 0);
  return {
    publicMachineVoiceFindings: FOUNDER_REPORTED_MACHINE_VOICE_PAGES,
    repaired: Math.max(0, FOUNDER_REPORTED_MACHINE_VOICE_PAGES - remaining),
    remaining,
    byRoute: byRoute.filter((row) => row.count > 0),
  };
}

export const HUMAN_FIRST_BAD_FIXTURES = [
  "Hide the engine.",
  "A buried AnswerChunk can still answer this question.",
  "Related page one",
  "Clients search this question because a nearby page does not own this intent.",
] as const;

export const HUMAN_FIRST_GOOD_FIXTURE =
  "Brokers compare two leases in today's dollars. A finance team can see which offer costs less after free rent.";
