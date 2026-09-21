export const RENDERED_PRODUCT_RESULT_QUALITY_GATE = "RenderedProductResultQualityGate" as const;
export const PRODUCT_RESULT_REQUIRED_VIEWPORTS = [375, 390, 768, 1280] as const;

export type ProductResultViewportEvidence = {
  route: string;
  viewportWidth: number;
  overflowPx?: number;
  result?: "PASS" | "FAIL";
};

export type RenderedProductResultQualityGateResult = {
  gate: typeof RENDERED_PRODUCT_RESULT_QUALITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  resultTitlePresent: boolean;
  primaryOutcomeIdentifiable: boolean;
  metricsStructured: boolean;
  rawDebugAbsent: boolean;
  nextActionsPresent: boolean;
  customerFacingLanguage: boolean;
  accessibleInteraction: boolean;
  renderedEvidencePresent: boolean;
};

const TITLE = /Lease Comparison Results|NPV Comparison Results|data-product-result/i;
const OUTCOME = /lower NPV at current assumptions|economically equal|data-result-outcome/i;
const METRIC = /NPV|data-result-metric/i;
const RAW = /Client-facing comparison|NPV difference \(B − A\)|Lower NPV scenario:|\[object Object\]/i;
const ACTIONS = /Compare Another[\s\S]*Edit Inputs[\s\S]*Back to Dashboard|data-primary-action="compare-another"|data-result-actions/i;
const ADVICE = /This is not legal, accounting, or investment advice|Lower NPV means the modeled occupancy cash flows|data-result-disclaimer|AskReview is independent software/i;
const DIALOG = /role="dialog"|aria-modal="true"|aria-labelledby/i;

export function evaluateRenderedProductResultQualityGate(input: {
  html: string;
  css?: string;
  evidence?: ProductResultViewportEvidence[] | null;
}): RenderedProductResultQualityGateResult {
  const html = `${input.html}\n${input.css ?? ""}`;
  const reasons: string[] = [];
  const resultTitlePresent = TITLE.test(html);
  const primaryOutcomeIdentifiable = OUTCOME.test(html);
  const metricsStructured = METRIC.test(html) && /data-result-metric|ResultMetric|<dt>NPV<\/dt>/i.test(html);
  const rawDebugAbsent = !RAW.test(html);
  const nextActionsPresent = ACTIONS.test(html);
  const customerFacingLanguage = !/Client-facing comparison/i.test(html) && ADVICE.test(html);
  const accessibleInteraction = (DIALOG.test(html) && /Escape|onKey|aria-label="Close results"/i.test(html))
    || (/data-product-result/.test(html) && /data-result-actions/.test(html) && /aria-labelledby/.test(html));
  const required = PRODUCT_RESULT_REQUIRED_VIEWPORTS;
  const samples = input.evidence ?? [];
  const renderedEvidencePresent = required.every((width) =>
    samples.some((sample) => sample.viewportWidth === width && /workspaces|askreview|locations/.test(sample.route) && (sample.result ?? "PASS") === "PASS"),
  );
  if (!resultTitlePresent) reasons.push("RESULT_TITLE_MISSING");
  if (!primaryOutcomeIdentifiable) reasons.push("PRIMARY_OUTCOME_UNCLEAR");
  if (!metricsStructured) reasons.push("METRICS_UNSTRUCTURED");
  if (!rawDebugAbsent) reasons.push("RAW_DEBUG_OUTPUT");
  if (!nextActionsPresent) reasons.push("POST_RESULT_ACTION_MISSING");
  if (!customerFacingLanguage) reasons.push("INTERNAL_RESULT_LANGUAGE");
  if (!accessibleInteraction) reasons.push("RESULT_INTERACTION_INACCESSIBLE");
  if (!renderedEvidencePresent) reasons.push("MISSING_RENDERED_EVIDENCE");
  return {
    gate: RENDERED_PRODUCT_RESULT_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    resultTitlePresent,
    primaryOutcomeIdentifiable,
    metricsStructured,
    rawDebugAbsent,
    nextActionsPresent,
    customerFacingLanguage,
    accessibleInteraction,
    renderedEvidencePresent,
  };
}
