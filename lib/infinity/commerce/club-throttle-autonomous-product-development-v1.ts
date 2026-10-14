import { canonicalReplacementConversionRequired } from "./club-throttle-canonical-replacement-closeout-v42.2-v1.ts";

export const CLUB_THROTTLE_AUTONOMOUS_PRODUCT_DEVELOPMENT_V1 =
  "CLUB_THROTTLE_AUTONOMOUS_PRODUCT_DEVELOPMENT_V1" as const;

export type ClubThrottleProductConcept = {
  concept_id: string;
  theme: string;
  market_signal: string;
  brand_fit_score: number;
  differentiation_note: string;
  manufacturing_authorized: false;
  qc_state: "CONCEPT" | "DESIGN_BRIEF" | "QC_PASSED" | "PUBLISHED" | "HELD" | "ARTWORK" | "STOREFRONT_READY";
};

const AGGREGATE_THEME_SIGNALS = [
  { theme: "Vintage garage workshop aesthetic", signal: "Rider culture nostalgia; tool-wall and bench motifs (original art only)" },
  { theme: "Night ride visibility culture", signal: "After-dark riding content engagement; safety + style (no competitor logos)" },
  { theme: "Club ride camaraderie", signal: "Group ride etiquette journal interest; community identity merchandise" },
] as const;

export function rankClubThrottleProductOpportunities(): ClubThrottleProductConcept[] {
  const now = Date.now();
  return AGGREGATE_THEME_SIGNALS.map((row, index) => ({
    concept_id: `ct-merch-concept-v43-${index + 1}`,
    theme: row.theme,
    market_signal: row.signal,
    brand_fit_score: 72 + index * 4,
    differentiation_note: "Original structured creative; aggregate market signals only — no copyrighted competitor art",
    manufacturing_authorized: false as const,
    qc_state: "CONCEPT" as const,
  })).sort((a, b) => b.brand_fit_score - a.brand_fit_score);
}

export function clubThrottleAutonomousProductDevelopmentQc(concepts: ClubThrottleProductConcept[]): "PASS" | "FAIL" {
  if (concepts.length === 0) return "FAIL";
  if (concepts.some((c) => c.manufacturing_authorized)) return "FAIL";
  void canonicalReplacementConversionRequired();
  return concepts.every((c) => c.manufacturing_authorized === false) ? "PASS" : "FAIL";
}

export function additionalProviderManufacturingBlocked(): boolean {
  return true;
}
