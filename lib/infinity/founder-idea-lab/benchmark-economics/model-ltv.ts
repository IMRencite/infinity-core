import { unknownRange, type EconomicRange } from "../comparable-economics/provenance";

function known(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function modelLtvFromParts(input: {
  monthlyPrice: EconomicRange;
  grossMargin: EconomicRange;
  lifetimeMonths: EconomicRange;
}): { range: EconomicRange; formula: string } {
  if (!known(input.monthlyPrice.base) || !known(input.grossMargin.base) || !known(input.lifetimeMonths.base)) {
    return { range: unknownRange(), formula: "UNKNOWN — LTV requires monthly revenue, gross margin, and lifetime. revenue/churn without margin is not used." };
  }
  const point = (price: number | null, margin: number | null, life: number | null) =>
    known(price) && known(margin) && known(life) ? Math.round(price * margin * life) : null;
  return {
    range: {
      low: point(input.monthlyPrice.low, input.grossMargin.low, input.lifetimeMonths.low),
      base: point(input.monthlyPrice.base, input.grossMargin.base, input.lifetimeMonths.base),
      high: point(input.monthlyPrice.high, input.grossMargin.high, input.lifetimeMonths.high),
    },
    formula: "LTV = monthly revenue × gross margin × expected lifetime months",
  };
}

export function ltvCacScenarios(ltv: EconomicRange, cac: EconomicRange): {
  conservative: number | null;
  base: number | null;
  upside: number | null;
} {
  const ratio = (top: number | null, bottom: number | null) =>
    known(top) && known(bottom) && bottom > 0 ? Math.round((top / bottom) * 100) / 100 : null;
  return {
    conservative: ratio(ltv.low, cac.high),
    base: ratio(ltv.base, cac.base),
    upside: ratio(ltv.high, cac.low),
  };
}

export function paybackScenarios(input: {
  cac: EconomicRange;
  monthlyPrice: EconomicRange;
  grossMargin: EconomicRange;
}): { conservative: number | null; base: number | null; upside: number | null; range: EconomicRange } {
  const months = (cac: number | null, price: number | null, margin: number | null) => {
    if (!known(cac) || !known(price) || !known(margin) || price * margin <= 0) return null;
    return Math.round((cac / (price * margin)) * 10) / 10;
  };
  const conservative = months(input.cac.high, input.monthlyPrice.low, input.grossMargin.low);
  const base = months(input.cac.base, input.monthlyPrice.base, input.grossMargin.base);
  const upside = months(input.cac.low, input.monthlyPrice.high, input.grossMargin.high);
  return {
    conservative,
    base,
    upside,
    range: { low: upside, base, high: conservative },
  };
}
