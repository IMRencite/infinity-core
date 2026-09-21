import { evaluateSemanticPair } from "./semantic-content-redundancy";
import { EDITORIAL_HIGHLIGHT_KINDS } from "./constants";
import type { Gate } from "./types";

export const EDITORIAL_HIGHLIGHT_QUALITY_GATE = "EditorialHighlightQualityGate" as const;

export type EditorialHighlightRecord = {
  kind: string;
  title: string;
  body: string;
  adjacentText?: string;
  attributed?: boolean;
  sourceId?: string;
  sourceUrl?: string;
  fabricatedAttribution?: boolean;
  quoted?: boolean;
};

const FABRICATED =
  /\b(as one broker said|customers say|our clients|testimonial|case study shows|"[A-Z][a-z]+ [A-Z]\.)/;

export function evaluateEditorialHighlightQuality(input: {
  highlights: EditorialHighlightRecord[];
  pageArchetype?: string;
  wordCount?: number;
}): {
  gate: typeof EDITORIAL_HIGHLIGHT_QUALITY_GATE;
  overall: Gate;
  addsValue: Gate;
  notDuplicate: Gate;
  scannable: Gate;
  visuallyDifferentiated: Gate;
  truthful: Gate;
  fabricatedQuoteRisk: Gate;
  density: Gate;
  failures: string[];
} {
  if (input.pageArchetype === "LEGAL" || input.pageArchetype === "CONTACT") {
    return {
      gate: EDITORIAL_HIGHLIGHT_QUALITY_GATE,
      overall: input.highlights.length === 0 ? "PASS" : "FAIL",
      addsValue: "PASS",
      notDuplicate: "PASS",
      scannable: "PASS",
      visuallyDifferentiated: "PASS",
      truthful: "PASS",
      fabricatedQuoteRisk: "PASS",
      density: "PASS",
      failures: input.highlights.length ? ["highlights_not_used_on_this_archetype"] : [],
    };
  }
  const failures: string[] = [];
  let addsValue: Gate = "PASS";
  let notDuplicate: Gate = "PASS";
  let scannable: Gate = "PASS";
  let truthful: Gate = "PASS";
  let fabricatedQuoteRisk: Gate = "PASS";
  for (const item of input.highlights) {
    if (!(EDITORIAL_HIGHLIGHT_KINDS as readonly string[]).includes(item.kind) && item.kind !== "WHAT_CHANGES" && item.kind !== "LIMITATION" && item.kind !== "WORKED_EXAMPLE" && item.kind !== "FOR_TENANT_REP" && item.kind !== "FOR_FINANCE") {
      failures.push(`unknown_kind:${item.kind}`);
    }
    if (item.body.trim().length < 12) {
      addsValue = "FAIL";
      failures.push("empty_highlight");
    }
    if (item.body.trim().split(/\s+/).length > 48) {
      scannable = "FAIL";
      failures.push("highlight_too_long");
    }
    if (item.adjacentText) {
      const pair = evaluateSemanticPair(item.body, item.adjacentText);
      if (pair.overall === "FAIL") {
        notDuplicate = "FAIL";
        failures.push("highlight_restates_adjacent");
      } else if (!pair.differentiated && pair.similarity >= 0.5) {
        addsValue = "FAIL";
        failures.push("highlight_lacks_new_value");
      }
    }
    if (item.fabricatedAttribution || (item.attributed && !item.sourceId && !item.sourceUrl)) {
      fabricatedQuoteRisk = "FAIL";
      truthful = "FAIL";
      failures.push("fabricated_or_unsourced_attribution");
    }
    if (item.quoted && !item.sourceUrl && !item.sourceId) {
      fabricatedQuoteRisk = "FAIL";
      failures.push("quoted_without_provenance");
    }
    if (FABRICATED.test(item.body) || FABRICATED.test(item.title)) {
      fabricatedQuoteRisk = "FAIL";
      failures.push("fabricated_voice");
    }
  }
  const words = input.wordCount ?? 0;
  const softMax = words >= 2000 ? 8 : 6;
  const density: Gate = input.highlights.length > 12 || (words >= 2000 && input.highlights.length > softMax + 4) ? "FAIL" : "PASS";
  if (density === "FAIL") failures.push("highlight_overuse");
  const visuallyDifferentiated: Gate = input.highlights.length === 0 || input.highlights.every((item) => item.kind) ? "PASS" : "FAIL";
  const overall =
    addsValue === "PASS" &&
    notDuplicate === "PASS" &&
    scannable === "PASS" &&
    truthful === "PASS" &&
    fabricatedQuoteRisk === "PASS" &&
    density === "PASS" &&
    visuallyDifferentiated === "PASS"
      ? "PASS"
      : "FAIL";
  return {
    gate: EDITORIAL_HIGHLIGHT_QUALITY_GATE,
    overall,
    addsValue,
    notDuplicate,
    scannable,
    visuallyDifferentiated,
    truthful,
    fabricatedQuoteRisk,
    density,
    failures,
  };
}

export function evaluateAuthorityQuoteProvenance(input: {
  text: string;
  sourceId?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  competitor?: boolean;
  permittedCompetitor?: boolean;
}): Gate {
  if (!input.text.trim()) return "FAIL";
  if (input.text.length > 280) return "FAIL";
  if (!input.sourceId || !input.sourceTitle || !input.sourceUrl) return "FAIL";
  if (input.competitor && !input.permittedCompetitor) return "FAIL";
  return "PASS";
}
