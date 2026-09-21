import { HUMAN_READABILITY_GATE } from "./constants";

const JARGON = [
  { term: "npv", define: /npv means|net present value|today's dollars|today dollars/i },
  { term: "discount rate", define: /discount rate|price of waiting|shrink later cash/i },
  { term: "cam", define: /cam|common area|shared building cost/i },
  { term: "tenant improvement", define: /tenant improvement|ti allowance|build-out money/i },
  { term: "effective rent", define: /effective rent|average.*rent|one rent number/i },
];

export type HumanReadabilityGateResult = {
  model: typeof HUMAN_READABILITY_GATE;
  overall: "PASS" | "FAIL";
  target: "approximately 4th grade";
  fleschKincaidGrade: number;
  averageSentenceWords: number;
  longestParagraphWords: number;
  activeVoice: "PASS" | "FAIL";
  paragraphLength: "PASS" | "FAIL";
  jargonExplained: "PASS" | "FAIL";
  keywordStuffing: boolean;
  sameStartStreak: boolean;
  failures: string[];
};

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 8);
}

function syllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean) return 0;
  const groups = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

function paragraphs(html: string): string[] {
  return (html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? []).map((item) => item.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function isPassive(sentence: string): boolean {
  return /\b(is|are|was|were|be|been|being)\s+\w+ed\b/i.test(sentence);
}

function visibleText(html: string): string {
  const answers = [...html.matchAll(/answer=\{?"([^"]+)"\}?/g)].map((item) => item[1]);
  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((item) => item[1].replace(/<[^>]+>/g, " "));
  const parasText = paragraphs(html);
  const visible = [...answers, ...headings, ...parasText].join(". ").replace(/\s+/g, " ").trim();
  if (visible.length > 80) return visible;
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function evaluateHumanReadabilityGate(html: string): HumanReadabilityGateResult {
  const text = visibleText(html);
  const sent = sentences(text);
  const wordList = words(text);
  const avgSentence = sent.length ? wordList.length / sent.length : 99;
  const syllableCount = wordList.reduce((sum, word) => sum + syllables(word), 0);
  const asw = wordList.length ? syllableCount / wordList.length : 2;
  const grade = 0.39 * avgSentence + 11.8 * asw - 15.59;
  const paraLens = paragraphs(html).map((item) => words(item).length);
  const longestPara = paraLens.length ? Math.max(...paraLens) : 0;
  const passive = sent.filter(isPassive).length;
  const activePass = sent.length === 0 ? "FAIL" : passive / sent.length <= 0.35 ? "PASS" : "FAIL";
  const paraPass = longestPara <= 150 ? "PASS" : "FAIL";
  const usedJargon = JARGON.filter((item) => new RegExp(item.term, "i").test(text));
  const jargonPass = usedJargon.every((item) => item.define.test(text)) ? "PASS" : "FAIL";
  const counts = new Map<string, number>();
  for (const word of wordList.filter((item) => item.length > 5)) counts.set(word, (counts.get(word) ?? 0) + 1);
  const stuffing = [...counts.values()].some((count) => count > wordList.length * 0.08 && count > 40);
  let sameStart = false;
  for (let i = 2; i < sent.length; i += 1) {
    const a = sent[i - 2].split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "");
    const b = sent[i - 1].split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "");
    const c = sent[i].split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (a && a === b && b === c && a.length > 2) sameStart = true;
  }
  const failures: string[] = [];
  if (grade > 7.2) failures.push("GRADE_TOO_HIGH");
  if (avgSentence > 16) failures.push("SENTENCES_TOO_LONG");
  if (paraPass === "FAIL") failures.push("PARAGRAPH_TOO_LONG");
  if (activePass === "FAIL") failures.push("TOO_MUCH_PASSIVE");
  if (jargonPass === "FAIL") failures.push("JARGON_UNDEFINED");
  if (stuffing) failures.push("KEYWORD_STUFFING");
  if (sameStart) failures.push("REPEATED_SENTENCE_STARTS");
  if (/AnswerChunk|Model-presentation intent|Related page one|Hide the engine|wording clone|this page owns|adjacent intent|Clients search this question|buried AnswerChunk/i.test(text)) {
    failures.push("MACHINE_OR_AUTHORING_VOICE");
  }
  return {
    model: HUMAN_READABILITY_GATE,
    overall: failures.length ? "FAIL" : "PASS",
    target: "approximately 4th grade",
    fleschKincaidGrade: Number(grade.toFixed(2)),
    averageSentenceWords: Number(avgSentence.toFixed(2)),
    longestParagraphWords: longestPara,
    activeVoice: activePass,
    paragraphLength: paraPass,
    jargonExplained: jargonPass,
    keywordStuffing: stuffing,
    sameStartStreak: sameStart,
    failures,
  };
}
