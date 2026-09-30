import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import {
  resolveVentureEditorialProfile,
  type VentureEditorialProfile,
} from "./venture-editorial-profiles";

export const BLOG_STATEMENT_DENSITY_GATE = "BlogStatementDensityGate" as const;
export const BLOG_NARRATIVE_FLOW_GATE = "BlogNarrativeFlowGate" as const;
export const BLOG_READER_MOMENTUM_GATE = "BlogReaderMomentumGate" as const;
export const BLOG_SECTION_PROGRESSION_GATE = "BlogSectionProgressionGate" as const;
export const HOLISTIC_EDITORIAL_JUDGE = "HolisticEditorialJudge" as const;
export const HUMAN_FIRST_EDITORIAL_QC = "HumanFirstEditorialQc" as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["OK"] };
}

function visibleText(draft: OrganicDraft): string {
  return `${draft.h1}\n${draft.headings.join("\n")}\n${draft.body}\n${draft.direct_answer ?? ""}`;
}

function paragraphs(draft: OrganicDraft): string[] {
  return draft.body.split(/\n{2,}/).filter((block) => block.trim().length > 40);
}

const DECLARATIVE_OPEN =
  /^(the|a|an|when|if|fabric|wash|cotton|collar|value|cap|noi|debt|buyers|owners|higher|same|how do|which|do higher|is that|are that|this page|marketing copy)\b/i;

const DECLARATIVE_VERB = /\b(is|are|means|refers to|does|changes|matters because|can|will|should not)\b/i;

export function evaluateBlogStatementDensityGate(draft: OrganicDraft): OrganicNamedGate {
  const blocks = paragraphs(draft);
  const reasons: string[] = [];
  let streak = 0;
  let maxStreak = 0;
  for (const block of blocks) {
    const first = block.trim().split(/(?<=[.!?])\s+/)[0] ?? block;
    if (DECLARATIVE_OPEN.test(first) && DECLARATIVE_VERB.test(first)) {
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }
  if (maxStreak >= 8) reasons.push("STATEMENT_DENSITY_HIGH");
  const definitional = (visibleText(draft).match(/\b(is|are|means|refers to)\b/gi) ?? []).length;
  const words = visibleText(draft).split(/\s+/).length;
  if (definitional > Math.max(35, words / 28)) reasons.push("EXCESS_DEFINITION_CHAIN");
  return named(BLOG_STATEMENT_DENSITY_GATE, reasons);
}

const TEXTBOOK_HEADING =
  /in plain numbers|versus|how to read|limitations of|where to go next inside|buyer impact|seller impact|owner and operator|decision support for|common mistakes and misconceptions|limitations and tradeoffs|key takeaways|market context without|financing example|what owners should review when/i;

export function evaluateBlogSectionProgressionGate(draft: OrganicDraft): OrganicNamedGate {
  const reasons: string[] = [];
  const textbook = draft.headings.filter((h) => TEXTBOOK_HEADING.test(h)).length;
  if (draft.headings.length >= 6 && textbook >= Math.ceil(draft.headings.length * 0.35)) {
    reasons.push("TEXTBOOK_SECTION_SEQUENCE");
  }
  const generic = draft.headings.filter((h) =>
    /^(construction|value|wash|fit|limitations|related resources|featured reads)$/i.test(h.trim()),
  ).length;
  if (generic >= 3) reasons.push("GENERIC_HEADINGS");
  return named(BLOG_SECTION_PROGRESSION_GATE, reasons);
}

export function evaluateBlogNarrativeFlowGate(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  const reasons: string[] = [];
  const text = visibleText(draft).toLowerCase();
  const transitions =
    (text.match(/\b(that is why|so when|which means|after that|before you|in practice|here is|the catch|once you|then you|instead of|rather than)\b/gi) ?? [])
      .length;
  if (paragraphs(draft).length >= 10 && transitions < 3) reasons.push("WEAK_SECTION_TRANSITIONS");
  if (profile?.venture_id === "club-throttle" && !/\byou\b|\byour\b/i.test(draft.body.slice(0, 800))) {
    reasons.push("NO_READER_ORIENTATION");
  }
  return named(BLOG_NARRATIVE_FLOW_GATE, reasons);
}

export function evaluateBlogReaderMomentumGate(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  const opening = draft.body.slice(0, 500);
  const reasons: string[] = [];
  const hook =
    /\?|you know|you've|when you|after the|before the|almost \$|disappears|parking|gas station|lot test|here is the catch|better bet|feel like/i.test(
      opening,
    );
  if (!hook) reasons.push("WEAK_HOOK");
  const consequence = /disappear|lose|fail|cost|surprise|burn|crack|roll|limp|pressure|offset|recover/i.test(
    visibleText(draft),
  );
  if (!consequence) reasons.push("LOW_CONSEQUENCE");
  if (profile?.venture_id === "occupancynpv") {
    const scenario = /\$\d|120,?000|1\.54|286,?000|2,?000,?000|7%|6%/i.test(draft.body);
    if (!scenario) reasons.push("NO_CONCRETE_SCENARIO");
  }
  return named(BLOG_READER_MOMENTUM_GATE, reasons);
}

export type HolisticEditorialFinding = {
  id: string;
  pass: boolean;
  weight: number;
};

export function evaluateHolisticEditorialJudge(draft: OrganicDraft): OrganicNamedGate & { findings: HolisticEditorialFinding[] } {
  const profile = resolveVentureEditorialProfile(draft);
  const text = visibleText(draft);
  const findings: HolisticEditorialFinding[] = [
    {
      id: "KEEP_READING",
      pass: evaluateBlogReaderMomentumGate(draft).result === "PASS",
      weight: 2,
    },
    {
      id: "PUBLICATION_NOT_MANUAL",
      pass: evaluateBlogStatementDensityGate(draft).result === "PASS" && evaluateBlogSectionProgressionGate(draft).result === "PASS",
      weight: 2,
    },
    {
      id: "SECTIONS_EARN_PLACE",
      pass: evaluateBlogNarrativeFlowGate(draft).result === "PASS",
      weight: 1,
    },
    {
      id: "VENTURE_VOICE",
      pass: profile != null && (profile.venture_id === "club-throttle" ? /rider|ride|jacket|lot|bars/i.test(text) : /noi|cap rate|ltv|dscr|refinanc/i.test(text)),
      weight: 1,
    },
    {
      id: "NOT_PROCEDURAL_ONLY",
      pass: !/step \d|first,? second,? third|in this guide we will/i.test(text),
      weight: 1,
    },
  ];
  const score = findings.reduce((sum, row) => sum + (row.pass ? row.weight : 0), 0);
  const max = findings.reduce((sum, row) => sum + row.weight, 0);
  const reasons: string[] = [];
  if (score / max < 0.75) {
    for (const row of findings.filter((f) => !f.pass)) reasons.push(`JUDGE_${row.id}`);
  }
  return { ...named(HOLISTIC_EDITORIAL_JUDGE, reasons), findings };
}

export function evaluateHumanFirstEditorialQc(
  draft: OrganicDraft,
  profile?: VentureEditorialProfile | null,
): OrganicNamedGate {
  const resolved = profile ?? resolveVentureEditorialProfile(draft);
  if (!resolved) return named(HUMAN_FIRST_EDITORIAL_QC, ["NO_EDITORIAL_PROFILE"]);
  const gates = [
    evaluateBlogStatementDensityGate(draft),
    evaluateBlogNarrativeFlowGate(draft),
    evaluateBlogReaderMomentumGate(draft),
    evaluateBlogSectionProgressionGate(draft),
    evaluateHolisticEditorialJudge(draft),
  ];
  const reasons = gates.filter((g) => g.result === "FAIL").flatMap((g) => g.reasons.filter((r) => r !== "OK"));
  return named(HUMAN_FIRST_EDITORIAL_QC, [...new Set(reasons)]);
}
