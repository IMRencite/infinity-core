export const COMMERCIAL_CREATIVE_QC = "CommercialCreativeQC" as const;

export type CommercialCreativeReport = {
  gate: typeof COMMERCIAL_CREATIVE_QC;
  result: "PASS" | "FAIL";
  reasons: string[];
  dimensions: {
    brand_fit: "PASS" | "FAIL";
    originality: "PASS" | "FAIL";
    ip: "PASS" | "FAIL";
    garment_composition: "PASS" | "FAIL";
    visual_sophistication: "PASS" | "FAIL";
    wearability: "PASS" | "FAIL";
    commercial_desirability: "PASS" | "FAIL";
    cultural_relevance: "PASS" | "FAIL";
    generic_pod_risk: "LOW" | "HIGH";
    ai_placeholder_risk: "LOW" | "HIGH";
    print_suitability: "PASS" | "FAIL";
  };
};

const GEOMETRIC_PLACEHOLDER = /<(rect|line|circle|path|polyline)[^>]*(stroke|fill)=/gi;
const ROAD_SHAPE = /lane|road tick|road wedge|arc path|simple midnight chevron/i;
const MANUFACTURER = /harley-davidson|honda|yamaha|kawasaki|ducati|bmw motorrad|motogp/i;

export function evaluateCommercialCreativeQC(input: {
  svg?: string;
  title?: string;
  story?: string;
  placement?: "SMALL_FRONT_CHEST" | "LARGE_FRONT" | "SMALL_FRONT_LARGE_BACK" | "LARGE_BACK" | "UNKNOWN";
  brand?: string;
  finished_merchandise?: boolean;
}): CommercialCreativeReport {
  const art = `${input.svg ?? ""} ${input.title ?? ""} ${input.story ?? ""}`;
  const shapes = input.svg?.match(GEOMETRIC_PLACEHOLDER) ?? [];
  const onlyGeometry = Boolean(input.svg) && shapes.length >= 2 && !/<text[\s>]/i.test(input.svg ?? "") && !/helmet|throttle|exhaust|rider|night ride/i.test(art);
  const reasons: string[] = [];
  if (input.finished_merchandise !== false && (onlyGeometry || ROAD_SHAPE.test(art))) {
    reasons.push("UNSOPHISTICATED_GEOMETRY");
  }
  if (MANUFACTURER.test(art)) reasons.push("IP_MANUFACTURER_MARK");
  if (!input.placement || input.placement === "UNKNOWN") reasons.push("GARMENT_COMPOSITION_UNSET");
  if (!/club throttle|motorcycle|rider|throttle|night/i.test(art)) reasons.push("BRAND_FIT");
  if (/lorem|placeholder|generic pod|elevate your/i.test(art)) reasons.push("GENERIC_POD");

  const fail = reasons.length > 0;
  return {
    gate: COMMERCIAL_CREATIVE_QC,
    result: fail ? "FAIL" : "PASS",
    reasons,
    dimensions: {
      brand_fit: reasons.includes("BRAND_FIT") ? "FAIL" : "PASS",
      originality: reasons.includes("UNSOPHISTICATED_GEOMETRY") ? "FAIL" : "PASS",
      ip: reasons.includes("IP_MANUFACTURER_MARK") ? "FAIL" : "PASS",
      garment_composition: reasons.includes("GARMENT_COMPOSITION_UNSET") ? "FAIL" : "PASS",
      visual_sophistication: reasons.includes("UNSOPHISTICATED_GEOMETRY") ? "FAIL" : "PASS",
      wearability: fail ? "FAIL" : "PASS",
      commercial_desirability: reasons.includes("UNSOPHISTICATED_GEOMETRY") || reasons.includes("GENERIC_POD") ? "FAIL" : "PASS",
      cultural_relevance: reasons.includes("BRAND_FIT") ? "FAIL" : "PASS",
      generic_pod_risk: reasons.includes("GENERIC_POD") || reasons.includes("UNSOPHISTICATED_GEOMETRY") ? "HIGH" : "LOW",
      ai_placeholder_risk: /placeholder|lorem/i.test(art) ? "HIGH" : "LOW",
      print_suitability: fail ? "FAIL" : "PASS",
    },
  };
}

export const CLUB_THROTTLE_LIVE_GEOMETRY_FIXTURES = [
  { title: "Throttle Core", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#efeae2"/><rect x="70" y="40" width="60" height="40" fill="none" stroke="#111"/><line x1="20" y1="100" x2="180" y2="100" stroke="#111"/></svg>` },
  { title: "After Dark", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#111"/><line x1="100" y1="10" x2="100" y2="70" stroke="#c00"/><path d="M10 100 L190 100" stroke="#fff"/></svg>` },
  { title: "Redline", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#111"/><path d="M20 80 A80 80 0 0 1 180 80" fill="none" stroke="#fff"/><line x1="160" y1="20" x2="190" y2="50" stroke="#c00"/></svg>` },
] as const;

export const CLUB_THROTTLE_GEOMETRIC_KNOWN_BAD = {
  title: "Territory road",
  story: "A simple midnight chevron and throttle arc on a rectangle field.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#111"/><circle cx="40" cy="60" r="18" fill="none" stroke="#fff"/><path d="M10 100 L190 100" stroke="#fff"/><path d="M80 20 A40 40 0 0 1 160 20" fill="none" stroke="#c00"/></svg>`,
  placement: "UNKNOWN" as const,
};
