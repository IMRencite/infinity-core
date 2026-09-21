import { createOpenAiProviderAdapter } from "@/lib/infinity/ai-providers/openai/provider";

export const ADVERSARIAL_COST_PRICING_VERSION = "openai_adapter_v1";

export type AdversarialTokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export function estimateAdversarialReviewCostUsd(
  tokenUsage: AdversarialTokenUsage,
): { estimatedCostUsd: number | null; pricingVersion: string; known: boolean } {
  if (tokenUsage.totalTokens <= 0) {
    return { estimatedCostUsd: null, pricingVersion: ADVERSARIAL_COST_PRICING_VERSION, known: false };
  }

  const adapter = createOpenAiProviderAdapter();
  const estimate = adapter.estimateCost({
    modelId: "openai-reasoning",
    tokenEstimate: {
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      totalTokens: tokenUsage.totalTokens,
    },
  });

  const total = estimate.totalCost ?? null;
  if (total == null || !Number.isFinite(total) || total < 0) {
    return { estimatedCostUsd: null, pricingVersion: ADVERSARIAL_COST_PRICING_VERSION, known: false };
  }

  return {
    estimatedCostUsd: Math.round(total * 1_000_000) / 1_000_000,
    pricingVersion: ADVERSARIAL_COST_PRICING_VERSION,
    known: true,
  };
}

export function aggregateAdversarialCostUsd(
  reviews: Array<{ estimatedCostUsd: number | null }>,
): { estimatedCostUsd: number | null; known: boolean; pricedReviewCount: number } {
  const priced = reviews.filter((review) => review.estimatedCostUsd != null);
  if (priced.length === 0) {
    return { estimatedCostUsd: null, known: false, pricedReviewCount: 0 };
  }
  const total = priced.reduce((sum, review) => sum + (review.estimatedCostUsd ?? 0), 0);
  return {
    estimatedCostUsd: Math.round(total * 1_000_000) / 1_000_000,
    known: priced.length === reviews.length,
    pricedReviewCount: priced.length,
  };
}
