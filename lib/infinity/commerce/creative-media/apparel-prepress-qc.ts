export const APPAREL_PREPRESS_QC = "ApparelPrepressQC" as const;

export function evaluateApparelPrepressQC(input: {
  bytes?: number;
  width?: number;
  height?: number;
  accidental_text?: boolean;
  third_party_logo?: boolean;
  watermark?: boolean;
  shirt_mockup?: boolean;
}): { gate: typeof APPAREL_PREPRESS_QC; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if ((input.bytes ?? 0) < 40_000) reasons.push("resolution_insufficient");
  if (input.width && input.height && input.height / input.width < 1.1) reasons.push("aspect_not_vertical_back_print");
  if (input.accidental_text) reasons.push("accidental_text");
  if (input.third_party_logo) reasons.push("third_party_logo");
  if (input.watermark) reasons.push("watermark");
  if (input.shirt_mockup) reasons.push("grok_generated_product_truth");
  return { gate: APPAREL_PREPRESS_QC, result: reasons.length ? "FAIL" : "PASS", reasons };
}
