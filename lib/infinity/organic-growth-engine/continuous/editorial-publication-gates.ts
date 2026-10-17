import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import { resolveVentureEditorialProfile } from "./venture-editorial-profiles";

export const EDITORIAL_PUBLICATION_QUALITY_GATE = "EditorialPublicationQualityGate" as const;

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["OK"] };
}

const INSTRUCTION_DENSE =
  /\b(measure your|size chart|compare to|wash inside out|tumble low|front print belongs|exchange when|return when|GSM|ounces per|direct-to-garment|screen print)\b/gi;

const CULTURE_TOKENS =
  /\b(closet|drawer|every week|weekend|grab|reach for|identity|merch|memor|instinct|your shirt|keep wearing|bike night|the one you)\b/i;

const REQUIREMENT_DUMP = /\b(browse the shop|after dark collection|related reads|in conclusion|to summarize)\b/i;

export function evaluateEditorialPublicationQualityGate(draft: OrganicDraft): OrganicNamedGate {
  const profile = resolveVentureEditorialProfile(draft);
  const text = `${draft.h1}\n${draft.body}`;
  const words = draft.body.split(/\s+/).length;
  const reasons: string[] = [];

  if (profile?.venture_id === "club-throttle" && words > 500) {
    const instructions = (draft.body.match(new RegExp(INSTRUCTION_DENSE.source, "gi")) ?? []).length;
    const culture = (text.match(new RegExp(CULTURE_TOKENS.source, "gi")) ?? []).length;
    if (instructions >= 8 && culture < 5) reasons.push("SCENARIO_WRAPPED_INSTRUCTION_MANUAL");
    if (instructions >= 10) reasons.push("FACT_DENSITY_TOO_HIGH");
    if (culture < 4) reasons.push("LOW_CULTURAL_RESONANCE");
    const thesisDeveloped =
      /mockup|checkout|first wash|jacket comes off|drawer|every week/i.test(text)
      && culture >= 4;
    if (!thesisDeveloped) reasons.push("THESIS_NOT_DEVELOPED");
    if (instructions > culture + 4) reasons.push("UTILITY_DOMINATES_EDITORIAL");
    if (REQUIREMENT_DUMP.test(draft.body.slice(-600))) reasons.push("ENDING_REQUIREMENT_DUMP");
    const shareObs =
      /drawer|same shirts|twenty|mockup|first wash|disappear when you/i.test(text)
      && !/browse the shop/i.test(draft.body.slice(-400));
    if (!shareObs) reasons.push("LOW_GENUINE_SHARE_IMPULSE");
    if (draft.headings.length >= 6 && words < 1400) reasons.push("INSUFFICIENT_IDEA_DEPTH");
  }

  return named(EDITORIAL_PUBLICATION_QUALITY_GATE, reasons);
}
