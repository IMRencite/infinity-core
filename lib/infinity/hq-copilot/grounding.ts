import type { HqCopilotContextPackage } from "./context-builder";
import type { HqCopilotSource } from "./types";
import { uniqueSources } from "./sources";

const NUMBER_RE = /\d[\d,]*(?:\.\d+)?/g;

export function validateCopilotSources(
  sources: HqCopilotSource[],
  context: HqCopilotContextPackage,
): HqCopilotSource[] {
  const allowed = new Set(context.sources.map((s) => `${s.type}:${s.id ?? s.label}`));
  return uniqueSources(
    sources.filter((source) => allowed.has(`${source.type}:${source.id ?? source.label}`)),
  );
}

export function answerConflictsWithFacts(answer: string, context: HqCopilotContextPackage): boolean {
  const numbers = answer.match(NUMBER_RE) ?? [];
  for (const raw of numbers) {
    const n = Number(raw.replaceAll(",", ""));
    if (!Number.isFinite(n) || n <= 40) continue;
    if (!context.factText.includes(raw) && !context.factText.includes(String(n))) {
      return true;
    }
  }
  return false;
}

export function mentionsUnrecordedMetric(question: string, context: HqCopilotContextPackage): boolean {
  const q = question.toLowerCase();
  const facts = context.factText.toLowerCase();
  if (/\b(cac|customer acquisition cost)\b/.test(q)) {
    return !/\brecorded cac\b/.test(facts);
  }
  if (/\bgross margin\b/.test(q)) {
    return !/\brecorded gross margin\b/.test(facts);
  }
  return false;
}
