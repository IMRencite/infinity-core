export type FinancialTruth =
  | "UNKNOWN"
  | "NOT_YET_MEASURED"
  | "NOT_APPLICABLE"
  | "ESTIMATE"
  | "ACTUAL"
  | "ZERO";

export type TruthfulValue = {
  display: string;
  truth: FinancialTruth;
};

export function formatUnknownField(): TruthfulValue {
  return { display: "UNKNOWN", truth: "UNKNOWN" };
}

export function formatNotYetMeasured(label = "NOT YET MEASURED"): TruthfulValue {
  return { display: label, truth: "NOT_YET_MEASURED" };
}

export function formatNotApplicable(): TruthfulValue {
  return { display: "NOT APPLICABLE", truth: "NOT_APPLICABLE" };
}

export function formatEstimate(value: number, formatter: (n: number) => string = String): TruthfulValue {
  return { display: `${formatter(value)} ESTIMATE`, truth: "ESTIMATE" };
}

export function formatActual(value: number, formatter: (n: number) => string = String): TruthfulValue {
  if (value === 0) return { display: "$0 ACTUAL", truth: "ZERO" };
  return { display: `${formatter(value)} ACTUAL`, truth: "ACTUAL" };
}

export function formatKnownZeroCost(): TruthfulValue {
  return { display: "$0", truth: "ZERO" };
}

export function formatCost(value: number | null | undefined, costKnown: boolean): TruthfulValue {
  if (!costKnown) return formatUnknownField();
  if (value == null) return formatUnknownField();
  if (value === 0) return formatKnownZeroCost();
  return { display: `$${value.toFixed(2)}`, truth: "ACTUAL" };
}

export function formatFinancialNumber(
  value: number | null | undefined,
  kind: "estimate" | "actual" | "score" = "score",
): TruthfulValue {
  if (value == null || !Number.isFinite(value)) {
    return kind === "actual" ? formatNotYetMeasured() : formatUnknownField();
  }
  if (kind === "estimate") return formatEstimate(value);
  if (kind === "actual") return formatActual(value);
  return { display: String(value), truth: "UNKNOWN" };
}

export function formatCurrencyEstimate(value: number | null | undefined): TruthfulValue {
  if (value == null || !Number.isFinite(value)) return formatNotYetMeasured();
  return formatEstimate(value, (n) => `$${n.toLocaleString()}`);
}

export function formatCurrencyActual(value: number | null | undefined): TruthfulValue {
  if (value == null || !Number.isFinite(value)) return formatNotYetMeasured();
  return formatActual(value, (n) => `$${n.toLocaleString()}`);
}

export function fmtTruth(value: unknown, suffix = "", kind: "estimate" | "actual" | "score" = "score"): string {
  if (value == null || value === "") {
    return kind === "actual" ? "NOT YET MEASURED" : "UNKNOWN";
  }
  if (typeof value === "number") {
    return formatFinancialNumber(value, kind).display + (kind === "score" ? suffix : "");
  }
  return String(value);
}

export function buildCostLabel(knownCostUsd: number | null | undefined, costKnown: boolean): string {
  return formatCost(knownCostUsd, costKnown).display;
}
