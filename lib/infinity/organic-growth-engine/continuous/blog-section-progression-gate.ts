import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import { isAuthorityBlogDraft } from "./blog-authority-gates";
import { pairHeadingsToParagraphs } from "./article-section-renderer";

export const BLOG_SECTION_PROGRESSION_GATE = "BlogSectionProgressionGate" as const;

function named(reasons: string[]): OrganicNamedGate {
  return {
    gate: BLOG_SECTION_PROGRESSION_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? [...new Set(reasons)] : ["OK"],
  };
}

function sectionFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/\d+/g, "#")
    .split(/\s+/)
    .filter((w) => w.length > 5)
    .slice(0, 40)
    .join(" ");
}

export function evaluateBlogSectionProgressionGate(draft: OrganicDraft): OrganicNamedGate {
  if (!isAuthorityBlogDraft(draft)) return named([]);
  const sections = pairHeadingsToParagraphs(draft.headings, draft.body);
  const reasons: string[] = [];
  let prior = "";
  for (const section of sections) {
    const text = section.paragraphs.join(" ");
    if (text.split(/\s+/).length < 35) continue;
    const fp = sectionFingerprint(text);
    if (prior && fp === prior) reasons.push("SECTION_DOES_NOT_ADVANCE");
    if (prior && fp.slice(0, 120) === prior.slice(0, 120)) reasons.push("SECTION_DOES_NOT_ADVANCE");
    prior = fp;
  }
  return named(reasons);
}
