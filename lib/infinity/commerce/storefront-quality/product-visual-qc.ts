export const PRODUCT_VISUAL_QC = "ProductVisualQC" as const;

export const KNOWN_BAD_PRODUCT_VISUAL = {
  id: "black_polygon_shirt_plus_basic_text",
  markers: ["garmentWithPrintSvg", "KICKSTANDS", "polygon shirt", "product-core-garment.svg", "product-kickstands-up-garment.svg"],
} as const;

export function evaluateProductVisualQC(input: {
  src?: string;
  svg?: string;
  provider_preview?: string | null;
  approved_artwork?: boolean;
}): { gate: typeof PRODUCT_VISUAL_QC; result: "PASS" | "FAIL"; reasons: string[]; class?: string } {
  const blob = `${input.src ?? ""} ${input.svg ?? ""}`;
  const reasons: string[] = [];
  if (/product-core-garment\.svg|product-kickstands-up-garment\.svg|garmentWithPrintSvg/i.test(blob)) {
    reasons.push("raw_svg_shirt");
    return { gate: PRODUCT_VISUAL_QC, result: "FAIL", reasons, class: "KNOWN_BAD_PRODUCT_VISUAL" };
  }
  if (/<polygon|<path d="M\d+ .*shirt|KICKSTANDS<\/text>/i.test(input.svg ?? "")) {
    reasons.push("homemade_polygon_garment");
    return { gate: PRODUCT_VISUAL_QC, result: "FAIL", reasons, class: "KNOWN_BAD_PRODUCT_VISUAL" };
  }
  if (/CT<\/text>|text-only placeholder/i.test(blob) && /\.svg/.test(input.src ?? "")) {
    reasons.push("text_only_placeholder_garment_art");
  }
  if (!input.provider_preview && !input.approved_artwork) reasons.push("provider_preview_absent");
  return { gate: PRODUCT_VISUAL_QC, result: reasons.length ? "FAIL" : "PASS", reasons };
}
