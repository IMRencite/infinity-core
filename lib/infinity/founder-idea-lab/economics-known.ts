import type { LoadedMonetizationPlan } from "@/lib/infinity/venture-selection/types";

/**
 * Historic research-adapter placeholders. These numbers were filled when a
 * qualitative unit-economics layer was marked known. They are simulation-shaped
 * defaults and must never satisfy BUILD / validated economics.
 */
export const RESEARCH_ADAPTER_PLACEHOLDER_SUPPORTED = {
  estimatedCAC: 140,
  estimatedLTV: 880,
  ltvCacRatio: 6.3,
} as const;

export const RESEARCH_ADAPTER_PLACEHOLDER_UNSUPPORTED = {
  estimatedCAC: 900,
  estimatedLTV: 250,
  ltvCacRatio: 0.28,
} as const;

function isKnownNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function matchesPlaceholder(
  plan: Pick<LoadedMonetizationPlan, "estimatedCAC" | "estimatedLTV" | "ltvCacRatio">,
  placeholder: { estimatedCAC: number; estimatedLTV: number; ltvCacRatio: number },
): boolean {
  return (
    plan.estimatedCAC === placeholder.estimatedCAC &&
    plan.estimatedLTV === placeholder.estimatedLTV &&
    plan.ltvCacRatio === placeholder.ltvCacRatio
  );
}

export function isResearchAdapterPlaceholderEconomics(
  plan: Pick<LoadedMonetizationPlan, "estimatedCAC" | "estimatedLTV" | "ltvCacRatio"> | null | undefined,
): boolean {
  if (!plan) return false;
  return (
    matchesPlaceholder(plan, RESEARCH_ADAPTER_PLACEHOLDER_SUPPORTED) ||
    matchesPlaceholder(plan, RESEARCH_ADAPTER_PLACEHOLDER_UNSUPPORTED)
  );
}

/**
 * Numeric CAC, LTV, and ratio are all present (including genuine zero).
 * Placeholders do not count as observed/validated economics.
 */
export function unitEconomicsNumericallyKnown(
  plan: Pick<LoadedMonetizationPlan, "estimatedCAC" | "estimatedLTV" | "ltvCacRatio"> | null | undefined,
): boolean {
  if (!plan) return false;
  if (isResearchAdapterPlaceholderEconomics(plan)) return false;
  return isKnownNumber(plan.estimatedCAC) && isKnownNumber(plan.estimatedLTV) && isKnownNumber(plan.ltvCacRatio);
}
