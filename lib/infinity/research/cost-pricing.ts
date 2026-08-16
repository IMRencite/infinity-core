/**
 * Centralized provider pricing configuration for research cost estimation.
 * Prices may change; update here rather than scattering constants.
 *
 * Search grounding billing varies by model generation and may not be exposed
 * in provider usage metadata — record uncertainty explicitly when unknown.
 */

export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  /** When null, search grounding cost cannot be estimated from metadata alone. */
  estimatedUsdPerSearchQuery: number | null;
  pricingSource: string;
  pricingUncertainty: string | null;
};

const GEMINI_PRICING: Record<string, ModelPricing> = {
  "gemini-2.5-flash": {
    inputUsdPerMillionTokens: 0.15,
    outputUsdPerMillionTokens: 0.6,
    estimatedUsdPerSearchQuery: null,
    pricingSource: "google_ai_developer_docs_estimate",
    pricingUncertainty:
      "Google Search grounding billing varies by model; exact per-query cost not returned in API metadata.",
  },
  "gemini-2.5-pro": {
    inputUsdPerMillionTokens: 1.25,
    outputUsdPerMillionTokens: 10,
    estimatedUsdPerSearchQuery: null,
    pricingSource: "google_ai_developer_docs_estimate",
    pricingUncertainty:
      "Google Search grounding billing varies by model; exact per-query cost not returned in API metadata.",
  },
  "gemini-3.5-flash": {
    inputUsdPerMillionTokens: 0.15,
    outputUsdPerMillionTokens: 0.6,
    estimatedUsdPerSearchQuery: null,
    pricingSource: "google_ai_developer_docs_estimate",
    pricingUncertainty:
      "Gemini 3 search grounding billed per query; exact per-query cost not returned in API metadata.",
  },
};

export function resolveModelPricing(modelId: string): ModelPricing {
  const direct = GEMINI_PRICING[modelId];
  if (direct) {
    return direct;
  }

  if (modelId.startsWith("gemini-3.5-flash")) {
    return GEMINI_PRICING["gemini-3.5-flash"]!;
  }
  if (modelId.startsWith("gemini-2.5-flash")) {
    return GEMINI_PRICING["gemini-2.5-flash"]!;
  }
  if (modelId.startsWith("gemini-2.5-pro")) {
    return GEMINI_PRICING["gemini-2.5-pro"]!;
  }

  return {
    inputUsdPerMillionTokens: 0.15,
    outputUsdPerMillionTokens: 0.6,
    estimatedUsdPerSearchQuery: null,
    pricingSource: "fallback_unknown_model",
    pricingUncertainty:
      "Model pricing unknown; token estimate recorded but total cost may be incomplete.",
  };
}

export function estimateResearchCostUsd(input: {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  searchQueryCount: number;
}): { estimatedCostUsd: number | null; costUncertainty: string | null } {
  const pricing = resolveModelPricing(input.modelId);
  const tokenCost =
    (input.inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens +
    (input.outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens;

  if (pricing.estimatedUsdPerSearchQuery === null && input.searchQueryCount > 0) {
    return {
      estimatedCostUsd: tokenCost > 0 ? tokenCost : null,
      costUncertainty:
        pricing.pricingUncertainty ??
        "Token cost estimated; search grounding cost not included due to missing provider pricing metadata.",
    };
  }

  const searchCost =
    (pricing.estimatedUsdPerSearchQuery ?? 0) * Math.max(0, input.searchQueryCount);

  return {
    estimatedCostUsd: tokenCost + searchCost,
    costUncertainty: pricing.pricingUncertainty,
  };
}
