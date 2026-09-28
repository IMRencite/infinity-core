/** Semantic z-index bands for public venture shells — avoid arbitrary global stacking. */
export const VENTURE_STACKING_LAYERS = {
  baseContent: 0,
  sectionDecoration: 1,
  cards: 2,
  stickySectionControls: 5,
  navigation: 10,
  dropdown: 20,
  modal: 40,
  systemAlert: 50,
} as const;

export type VentureStackingLayer = keyof typeof VENTURE_STACKING_LAYERS;

export const SUSPICIOUS_GLOBAL_Z_INDEX_THRESHOLD = 100;

export function evaluateVentureZIndexContract(css: string): {
  result: "PASS" | "FAIL";
  suspicious: number[];
  reasons: string[];
} {
  const matches = [...css.matchAll(/z-index:\s*(-?\d+)/g)].map((m) => Number(m[1]));
  const suspicious = matches.filter((z) => z >= SUSPICIOUS_GLOBAL_Z_INDEX_THRESHOLD);
  const reasons: string[] = [];
  if (suspicious.length > 0) {
    reasons.push(`SUSPICIOUS_GLOBAL_Z_INDEX:${suspicious.join(",")}`);
  }
  return { result: reasons.length === 0 ? "PASS" : "FAIL", suspicious, reasons };
}
