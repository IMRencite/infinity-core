import { unknownAmount } from "@/lib/infinity/treasury/types";
import type { Layer, MoneyTruth, NamedGate } from "./types";
import { VENTURE_ECONOMICS_ACTUAL_VS_MODELED_CONTRACT } from "./types";

export type LayeredMetric = {
  name: string;
  modeled: MoneyTruth | string;
  actual: MoneyTruth | string;
  forecast: MoneyTruth | string;
};

export function layeredMoney(modeled: MoneyTruth, actual: MoneyTruth, forecast: MoneyTruth = unknownAmount()): LayeredMetric["modeled"][] {
  return [modeled, actual, forecast];
}

export function evaluateVentureEconomicsActualVsModeledContract(input: {
  modeled_overwritten_by_actual?: boolean;
  actual_inferred_from_forecast?: boolean;
  blended?: boolean;
}): NamedGate {
  const reasons: string[] = [];
  if (input.modeled_overwritten_by_actual) reasons.push("MODELED_OVERWRITTEN");
  if (input.actual_inferred_from_forecast) reasons.push("ACTUAL_INFERRED_FROM_FORECAST");
  if (input.blended) reasons.push("BLENDED_LAYERS");
  return {
    gate: VENTURE_ECONOMICS_ACTUAL_VS_MODELED_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function keepLayersSeparate<T extends { layer: Layer }>(rows: T[]): { modeled: T[]; actual: T[]; forecast: T[] } {
  return {
    modeled: rows.filter((row) => row.layer === "MODELED"),
    actual: rows.filter((row) => row.layer === "ACTUAL"),
    forecast: rows.filter((row) => row.layer === "FORECAST"),
  };
}
