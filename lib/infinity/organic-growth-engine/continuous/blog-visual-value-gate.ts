import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import { resolveVentureEditorialProfile } from "./venture-editorial-profiles";

export const BLOG_VISUAL_VALUE_GATE = "BlogVisualValueGate" as const;
export const BLOG_VISUAL_INFORMATION_ARCHITECTURE = "BlogVisualInformationArchitecture" as const;

export type VisualInformationKind =
  | "TABLE"
  | "PROCESS_DIAGRAM"
  | "TIMELINE"
  | "STEP_FLOW"
  | "CHART"
  | "GRAPH"
  | "DECISION_TREE"
  | "CHOICE_MATRIX"
  | "CHECKLIST"
  | "CALLOUT"
  | "QUICK_REFERENCE"
  | "ANNOTATED_DIAGRAM"
  | "ILLUSTRATION"
  | "EDITORIAL_PHOTOGRAPHY"
  | "NONE";

export type BlogVisualValueAssessment = {
  visual_required: boolean;
  recommended_kinds: VisualInformationKind[];
  rationale: string[];
};

function named(reasons: string[]): OrganicNamedGate {
  return {
    gate: BLOG_VISUAL_VALUE_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? [...new Set(reasons)] : ["OK"],
  };
}

export function assessBlogVisualInformationNeeds(draft: OrganicDraft): BlogVisualValueAssessment {
  const text = `${draft.h1}\n${draft.headings.join("\n")}\n${draft.body}`.toLowerCase();
  const profile = resolveVentureEditorialProfile(draft);
  const recommended: VisualInformationKind[] = [];
  const rationale: string[] = [];

  const comparisonHeavy =
    (text.match(/\bversus\b|\bvs\.?\b|\bcompared to\b|\bpros and cons\b|\balternative\b/gi) ?? []).length >= 3
    || draft.headings.filter((h) => /versus|vs\.|compare|which|better/i.test(h)).length >= 2;
  const sequential =
    (text.match(/\bstep \d|\bfirst,|\bthen,|\bfinally,|\bstage \d|\btimeline\b/gi) ?? []).length >= 4;
  const quantitative =
    (text.match(/\$\d|%\s|\bpercent\b|\b\d{4}\b|\bchart\b|\bgraph\b|\bdata\b/gi) ?? []).length >= 6;
  const decision =
    (text.match(/\bchoose\b|\bdecision\b|\bshould you\b|\bkeep or return\b|\bwhen to\b/gi) ?? []).length >= 4;
  const checklist = (text.match(/\bchecklist\b|\bbefore you\b.*\bafter you\b|\bfive-stage\b/gi) ?? []).length >= 2;
  const storyLed =
    profile?.archetypes.includes("STORY_LED_GUIDE") || profile?.archetypes.includes("CULTURE_EDITORIAL");

  if (comparisonHeavy) {
    recommended.push("TABLE", "CHOICE_MATRIX");
    rationale.push("comparison-heavy topic benefits tabular clarity");
  }
  if (sequential) {
    recommended.push("STEP_FLOW", "PROCESS_DIAGRAM");
    rationale.push("sequential process benefits flow visual");
  }
  if (quantitative && /\bsource\b|\bcited\b|\baccording to\b/i.test(text)) {
    recommended.push("CHART", "GRAPH");
    rationale.push("quantitative claims with sourcing may support charts");
  } else if (quantitative) {
    rationale.push("quantitative language without sourcing — chart not recommended");
  }
  if (decision) recommended.push("DECISION_TREE");
  if (checklist) recommended.push("CHECKLIST", "QUICK_REFERENCE");
  if (storyLed && recommended.length === 0) {
    recommended.push("EDITORIAL_PHOTOGRAPHY");
    rationale.push("story-led editorial — photography and typography rhythm sufficient");
  }

  let visual_required =
    (comparisonHeavy && !storyLed)
    || (sequential && text.split(/\s+/).length > 1800 && !storyLed)
    || (quantitative && /\bsource\b|\baccording to\b/i.test(text));

  if (storyLed) {
    visual_required = false;
    if (!recommended.includes("EDITORIAL_PHOTOGRAPHY")) recommended.push("EDITORIAL_PHOTOGRAPHY");
  }

  if (!visual_required && recommended.length === 0) {
    recommended.push("NONE");
    rationale.push("prose-first article — no mandatory inline visual");
  }

  return {
    visual_required,
    recommended_kinds: [...new Set(recommended)],
    rationale,
  };
}

export function evaluateBlogVisualValueGate(input: {
  draft: OrganicDraft;
  has_inline_table?: boolean;
  has_inline_diagram?: boolean;
  has_hero_image?: boolean;
}): OrganicNamedGate & { assessment: BlogVisualValueAssessment } {
  const assessment = assessBlogVisualInformationNeeds(input.draft);
  const reasons: string[] = [];
  if (assessment.visual_required) {
    const hasUsefulVisual =
      input.has_inline_table
      || input.has_inline_diagram
      || (input.has_hero_image && assessment.recommended_kinds.includes("EDITORIAL_PHOTOGRAPHY"));
    if (!hasUsefulVisual) reasons.push("VISUAL_VALUE_MISSING");
  }
  if (
    (input.has_inline_table || input.has_inline_diagram)
    && !assessment.visual_required
    && !assessment.recommended_kinds.some((k) => k !== "NONE" && k !== "EDITORIAL_PHOTOGRAPHY")
  ) {
    reasons.push("DECORATIVE_VISUAL_WITHOUT_VALUE");
  }
  return { ...named(reasons), assessment };
}
