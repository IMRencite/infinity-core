import type { FounderResearchFinding } from "../research-packet";
import {
  isKnownNumber,
  mergeRanges,
  unknownRange,
  type EconomicEvidenceClass,
  type EconomicRange,
} from "./provenance";
import { parseMoneyRange } from "./pricing";

function parsePercents(claim: string, kind: "margin" | "churn"): number[] {
  const lower = claim.toLowerCase();
  if (kind === "margin" && !/margin/.test(lower)) return [];
  if (kind === "churn" && !/churn/.test(lower)) return [];
  const values: number[] = [];
  for (const match of claim.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    values.push(value > 1 ? value / 100 : value);
  }
  return values;
}

export function modelLtv(input: {
  findings: FounderResearchFinding[];
  monthlyPrice: EconomicRange;
  provenance: EconomicEvidenceClass;
}): {
  monthlyRevenue: EconomicRange;
  grossMarginPercent: EconomicRange;
  monthlyChurn: EconomicRange;
  lifetimeMonths: EconomicRange;
  range: EconomicRange;
  formula: string;
} {
  const monthlyRevenue = input.monthlyPrice;
  const marginHits = input.findings.flatMap((finding) => parsePercents(finding.claim, "margin"));
  const churnHits = input.findings.flatMap((finding) => parsePercents(finding.claim, "churn"));

  const grossMarginPercent = marginHits.length
    ? {
        low: Math.min(...marginHits),
        base: marginHits.reduce((sum, value) => sum + value, 0) / marginHits.length,
        high: Math.max(...marginHits),
      }
    : unknownRange();

  const monthlyChurn = churnHits.length
    ? {
        low: Math.min(...churnHits),
        base: churnHits.reduce((sum, value) => sum + value, 0) / churnHits.length,
        high: Math.max(...churnHits),
      }
    : unknownRange();

  const lifetimeMonths =
    isKnownNumber(monthlyChurn.base) && monthlyChurn.base > 0
      ? {
          low: isKnownNumber(monthlyChurn.high) && monthlyChurn.high > 0 ? 1 / monthlyChurn.high : null,
          base: 1 / monthlyChurn.base,
          high: isKnownNumber(monthlyChurn.low) && monthlyChurn.low > 0 ? 1 / monthlyChurn.low : null,
        }
      : unknownRange();

  const ltvFromClaim = input.findings
    .filter((finding) => /\bltv\b|lifetime value/i.test(finding.claim))
    .map((finding) => parseMoneyRange(finding.claim));

  let range = unknownRange();
  let formula = "UNKNOWN — missing contribution margin and/or churn";
  if (ltvFromClaim.some((item) => item.base != null)) {
    range = mergeRanges(ltvFromClaim.filter((item) => item.base != null));
    formula = "LTV from comparable lifetime-value observations";
  } else if (
    isKnownNumber(monthlyRevenue.base) &&
    isKnownNumber(grossMarginPercent.base) &&
    isKnownNumber(lifetimeMonths.base)
  ) {
    const contribution = (low: number | null, mid: number | null, high: number | null) => {
      const price = mid ?? low ?? high;
      const margin = grossMarginPercent.base;
      const life = lifetimeMonths.base;
      if (!isKnownNumber(price) || !isKnownNumber(margin) || !isKnownNumber(life)) return null;
      return Math.round(price * margin * life);
    };
    range = {
      low:
        isKnownNumber(monthlyRevenue.low) && isKnownNumber(lifetimeMonths.low)
          ? Math.round(monthlyRevenue.low * (grossMarginPercent.low ?? grossMarginPercent.base) * lifetimeMonths.low)
          : null,
      base: contribution(monthlyRevenue.low, monthlyRevenue.base, monthlyRevenue.high),
      high:
        isKnownNumber(monthlyRevenue.high) && isKnownNumber(lifetimeMonths.high)
          ? Math.round(monthlyRevenue.high * (grossMarginPercent.high ?? grossMarginPercent.base) * lifetimeMonths.high)
          : null,
    };
    formula = "LTV = monthly revenue × gross margin × (1 / monthly churn) when churn and margin are supported";
  }

  return {
    monthlyRevenue,
    grossMarginPercent,
    monthlyChurn,
    lifetimeMonths,
    range,
    formula,
  };
}
