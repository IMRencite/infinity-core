import { contrastRatio } from "../../obligation/qc-escape-gates";
import { evaluateElementLevelContrastGate, type RenderedTextElement } from "../../obligation/qc-escape-v3-gates";
import { CURRENT_BLOG_QC_VERSION, type CheckResult } from "./types";

function cta(input: { color: string; background: string; ratio: number | null; kind?: RenderedTextElement["background_kind"] }): RenderedTextElement {
  return {
    selector: "a.vg-cta",
    text_sample: "Start the 3-day trial",
    tag: "A",
    font_size: 16,
    font_weight: 600,
    computed_color: input.color,
    computed_background: input.background,
    effective_background: input.background,
    background_kind: input.kind ?? "SOLID",
    opacity: 1,
    parent_opacity: 1,
    visibility: "visible",
    display: "inline-block",
    bounding_box: { x: 24, y: 420, width: 220, height: 44 },
    z_index: "1",
    overflow: "visible",
    contrast_ratio: input.ratio,
    required: true,
  };
}

export const KNOWN_BAD_SECOND_QC_CTA = cta({
  color: "#122033",
  background: "#1d4e78",
  ratio: contrastRatio("#122033", "#1d4e78"),
});

export const KNOWN_GOOD_SECOND_QC_CTA = cta({
  color: "#102033",
  background: "#f4f7fb",
  ratio: contrastRatio("#102033", "#f4f7fb"),
});

export const SHARED_COMPONENT = "a.vg-cta inside .pv-cta-panel";

export function evaluateEscapedDefectRegressionCheck(): CheckResult {
  const bad = evaluateElementLevelContrastGate([KNOWN_BAD_SECOND_QC_CTA]);
  const good = evaluateElementLevelContrastGate([KNOWN_GOOD_SECOND_QC_CTA]);
  const pass = bad.result === "FAIL" && good.result === "PASS";
  return {
    check: "EscapedDefectRegressionCheck",
    result: pass ? "PASS" : "FAIL",
    reasons: pass
      ? ["KNOWN_BAD_REJECTED", "KNOWN_GOOD_ACCEPTED", CURRENT_BLOG_QC_VERSION]
      : [bad.result === "FAIL" ? "KNOWN_BAD_OK" : "KNOWN_BAD_LEAKED", good.result === "PASS" ? "KNOWN_GOOD_OK" : "KNOWN_GOOD_REJECTED"],
  };
}

export function evaluateSharedComponentSweep(pages: Array<{ name: string; elements: RenderedTextElement[] }>): CheckResult {
  const failed = pages.filter((page) => evaluateElementLevelContrastGate(page.elements).result !== "PASS");
  return {
    check: "SharedComponentSweep",
    result: failed.length ? "FAIL" : "PASS",
    reasons: failed.length ? failed.map((page) => page.name) : [SHARED_COMPONENT, `${pages.length}_PAGES`],
  };
}
