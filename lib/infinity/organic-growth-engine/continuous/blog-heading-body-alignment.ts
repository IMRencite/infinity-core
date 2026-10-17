import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import { isAuthorityBlogDraft } from "./blog-authority-gates";
import { pairHeadingsToParagraphs } from "./article-section-renderer";

export const HEADING_BODY_SEMANTIC_ALIGNMENT_GATE = "HeadingBodySemanticAlignmentGate" as const;

/** Club Throttle shirt article — founder V9 regression (crossed blank/stop sections). */
export const CLUB_THROTTLE_SHIRT_HEADING_BODY_EXPECTATIONS: Array<{
  heading_match: RegExp;
  must_include: RegExp[];
  must_not_dominate: RegExp[];
}> = [
  {
    heading_match: /what the stop reveals/i,
    must_include: [/gas station|bike.?night|jacket comes off|back graphic|lot lights|sodium/i],
    must_not_dominate: [/grams per square meter|\bgsm\b|fabric weight is plain talk|cotton breathes and takes ink/i],
  },
  {
    heading_match: /why the blank matters/i,
    must_include: [/fabric weight|\bgsm\b|cotton|blend|knit|blank decides/i],
    must_not_dominate: [/bike.?night etiquette|pull off at a gas station|mirror test riders/i],
  },
];

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["OK"] };
}

export function evaluateHeadingBodySemanticAlignmentGate(input: {
  draft: OrganicDraft;
  expectations?: typeof CLUB_THROTTLE_SHIRT_HEADING_BODY_EXPECTATIONS;
}): OrganicNamedGate {
  if (!isAuthorityBlogDraft(input.draft)) return named(HEADING_BODY_SEMANTIC_ALIGNMENT_GATE, []);
  const expectations = input.expectations ?? [];
  if (!expectations.length) return named(HEADING_BODY_SEMANTIC_ALIGNMENT_GATE, []);
  const sections = pairHeadingsToParagraphs(input.draft.headings, input.draft.body);
  const reasons: string[] = [];
  for (const rule of expectations) {
    const section = sections.find((s) => rule.heading_match.test(s.heading));
    if (!section) continue;
    const text = section.paragraphs.join(" ");
    if (!rule.must_include.some((re) => re.test(text))) {
      reasons.push("HEADING_BODY_TOPIC_MISSING");
    }
    for (const ban of rule.must_not_dominate) {
      if (ban.test(text)) reasons.push("HEADING_BODY_SEMANTIC_CROSS");
    }
  }
  return named(HEADING_BODY_SEMANTIC_ALIGNMENT_GATE, [...new Set(reasons)]);
}
