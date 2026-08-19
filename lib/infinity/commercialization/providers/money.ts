/** Canonical money fields: finite number or null. Never undefined, NaN, Infinity, or invented zero. */

export function normalizeUsdAmount(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
}

export function normalizePremiumFlag(value: unknown): boolean | null {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

export function unknownCostCannotAuthorize(amountUsd: number | null): boolean {
  return amountUsd == null;
}
