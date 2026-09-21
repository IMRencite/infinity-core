import type { CostCategory, NamedGate } from "./types";
import { EPISTEMIC_MONTHLY_BURN_CONTRACT, FOUNDER_CAPITAL_POLICY_READINESS_GATE } from "./types";
import { inspectFinancialGovernance } from "./store";

export const MATERIAL_MONTHLY_BURN_CATEGORIES = [
  "INFRASTRUCTURE",
  "PROVIDER_API",
  "GROWTH",
  "FULFILLMENT",
] as const;

const GROWTH_FAMILY: CostCategory[] = ["GROWTH", "ADVERTISING", "COMMUNICATION"];

export type EpistemicBurnTotalState = "KNOWN" | "PARTIAL" | "UNKNOWN";

export type EpistemicMonthlyBurn = {
  contract: typeof EPISTEMIC_MONTHLY_BURN_CONTRACT;
  period: string;
  known_amount: number;
  estimated_amount: number | null;
  unknown_components: string[];
  estimated_components: string[];
  actual_components: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  completeness: EpistemicBurnTotalState;
  total_state: EpistemicBurnTotalState;
  total_amount: number | null;
};

function monthKey(iso = new Date().toISOString()): string {
  return iso.slice(0, 7);
}

function familyCategories(material: (typeof MATERIAL_MONTHLY_BURN_CATEGORIES)[number]): CostCategory[] {
  if (material === "GROWTH") return GROWTH_FAMILY;
  return [material];
}

function displayName(material: (typeof MATERIAL_MONTHLY_BURN_CATEGORIES)[number]): string {
  if (material === "PROVIDER_API") return "provider/API";
  if (material === "INFRASTRUCTURE") return "infrastructure";
  if (material === "GROWTH") return "growth";
  return "fulfillment";
}

export function computeEpistemicMonthlyBurn(now = new Date().toISOString()): EpistemicMonthlyBurn {
  const period = monthKey(now);
  const costs = inspectFinancialGovernance().costs.filter(
    (row) => row.committed_or_spent === "SPENT" && row.occurred_at.startsWith(period) && row.synthetic === false,
  );
  const known_amount = costs
    .filter((row) => row.actual_or_estimated === "ACTUAL" && row.amount != null)
    .reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const estimatedRows = costs.filter((row) => row.actual_or_estimated === "ESTIMATED" && row.amount != null);
  const estimated_amount = estimatedRows.length === 0 ? null : estimatedRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);

  const actual_components: string[] = [];
  const estimated_components: string[] = [];
  const unknown_components: string[] = [];

  for (const material of MATERIAL_MONTHLY_BURN_CATEGORIES) {
    const cats = familyCategories(material);
    const rows = costs.filter((row) => cats.includes(row.category));
    const hasActual = rows.some((row) => row.actual_or_estimated === "ACTUAL" && row.amount != null);
    const hasEstimated = rows.some((row) => row.actual_or_estimated === "ESTIMATED" && row.amount != null);
    const label = displayName(material);
    if (hasActual) actual_components.push(label);
    else if (hasEstimated) estimated_components.push(label);
    else unknown_components.push(label);
  }

  let total_state: EpistemicBurnTotalState = "UNKNOWN";
  if (unknown_components.length === 0 && estimated_components.length === 0) total_state = "KNOWN";
  else if (actual_components.length > 0 || estimated_components.length > 0) total_state = "PARTIAL";

  return {
    contract: EPISTEMIC_MONTHLY_BURN_CONTRACT,
    period,
    known_amount,
    estimated_amount,
    unknown_components,
    estimated_components,
    actual_components,
    confidence: total_state === "KNOWN" ? "HIGH" : total_state === "PARTIAL" ? "LOW" : "INSUFFICIENT",
    completeness: total_state,
    total_state,
    total_amount: total_state === "KNOWN" ? known_amount : null,
  };
}

export function evaluateEpistemicMonthlyBurnContract(burn = computeEpistemicMonthlyBurn()): NamedGate {
  const reasons: string[] = [];
  if (burn.contract !== EPISTEMIC_MONTHLY_BURN_CONTRACT) reasons.push("CONTRACT_MISSING");
  if (burn.total_state !== "KNOWN" && burn.total_amount != null) reasons.push("UNKNOWN_TOTAL_COLLAPSED_TO_NUMBER");
  if (burn.total_state === "KNOWN" && burn.unknown_components.length > 0) reasons.push("KNOWN_WITH_UNKNOWN_COMPONENTS");
  if (burn.known_amount === 0 && burn.unknown_components.length > 0 && burn.total_state === "KNOWN") {
    reasons.push("ABSENCE_TREATED_AS_KNOWN_ZERO");
  }
  return { gate: EPISTEMIC_MONTHLY_BURN_CONTRACT, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateFounderCapitalPolicyReadinessGate(): NamedGate {
  const burn = computeEpistemicMonthlyBurn();
  const contract = evaluateEpistemicMonthlyBurnContract(burn);
  const reasons: string[] = [...contract.reasons];
  if (burn.total_state !== "KNOWN" && burn.total_amount === 0) reasons.push("TOTAL_ZERO_WITH_INCOMPLETE_BURN");
  if (burn.unknown_components.length > 0 && burn.total_state === "KNOWN") reasons.push("UNKNOWN_COLLAPSED_TO_KNOWN");
  if (!("known_amount" in burn) || !("unknown_components" in burn) || !("estimated_components" in burn)) {
    reasons.push("EPISTEMIC_FIELDS_MISSING");
  }
  return {
    gate: FOUNDER_CAPITAL_POLICY_READINESS_GATE,
    result: contract.result === "PASS" && reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function formatEpistemicTotal(burn: EpistemicMonthlyBurn): string {
  if (burn.total_state === "KNOWN" && burn.total_amount != null) {
    return `$${burn.total_amount.toFixed(burn.total_amount % 1 === 0 ? 0 : 2)}`;
  }
  return burn.total_state;
}

export function formatKnownBurn(amount: number): string {
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

export function formatEstimatedBurn(amount: number | null): string {
  if (amount == null) return "UNKNOWN";
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}
