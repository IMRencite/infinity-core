import type { ClassifiedValue, EvidenceClass, ScenarioCase } from "./types";
import { UNKNOWN_IS_NOT_ZERO } from "./types";

export function classified(
  display: string,
  classification: EvidenceClass,
  note: string,
  numeric: number | null = null,
  unit: string | null = null,
): ClassifiedValue {
  if (classification === "UNKNOWN" && numeric === 0) {
    throw new Error(`UNKNOWN_MUST_NOT_BE_ZERO:${display}`);
  }
  return { display, numeric, unit, classification, note };
}

export function unknownValue(label: string, reason: string): ClassifiedValue {
  return classified(`UNKNOWN — RESEARCH REQUIRED (${label})`, "UNKNOWN", `${reason} ${UNKNOWN_IS_NOT_ZERO}`, null, null);
}

export function unknownScenario(name: ScenarioCase["name"], price: ClassifiedValue): ScenarioCase {
  const unknown = (label: string) =>
    unknownValue(label, "Research ran; this input still lacks evidence and is not defaulted.");
  return {
    name,
    price,
    conversion: unknown("conversion"),
    cac: unknown("CAC"),
    retention: unknown("retention"),
    revenue: unknown("scenario revenue"),
    gross_margin: unknown("scenario gross margin"),
    contribution_margin: unknown("scenario contribution margin"),
    cac_payback: unknown("CAC payback"),
    ltv: unknown("scenario LTV"),
    ltv_cac: unknown("scenario LTV:CAC"),
    break_even_customers: unknown("break-even customers"),
  };
}

export function stripeCardPresentFeeUsd(amountUsd: number): number {
  return Math.round((amountUsd * 0.029 + 0.3) * 100) / 100;
}
