import type { EconomicConfidenceLevel, EconomicRange } from "../comparable-economics/provenance";
import type { PricingArchitecture, PricingArchitectureTier, RevenueModelProvenance } from "./types";

function tier(
  id: PricingArchitectureTier["id"],
  monthly: EconomicRange,
  setup: EconomicRange,
  provenance: RevenueModelProvenance,
  scope: string[],
  confidence: EconomicConfidenceLevel,
): PricingArchitectureTier {
  return {
    id,
    monthly,
    annual: {
      low: monthly.low != null ? monthly.low * 12 : null,
      base: monthly.base != null ? monthly.base * 12 : null,
      high: monthly.high != null ? monthly.high * 12 : null,
    },
    setupFee: setup,
    includedScope: scope,
    upsells: [],
    customerSegment: id === "entry" ? "price-sensitive SMB" : id === "premium" ? "multi-location / higher-touch" : "core SMB",
    confidence: monthly.base != null || monthly.low != null ? confidence : "NONE",
    sourceBasis: provenance,
  };
}

export function composePricingArchitecture(input: {
  monthly: EconomicRange;
  setup: EconomicRange;
  tierEvidence: boolean;
  provenance: RevenueModelProvenance;
  includedScope: string[];
  confidence?: EconomicConfidenceLevel;
}): PricingArchitecture {
  const confidence = input.confidence ?? (input.monthly.base != null ? "MEDIUM" : "NONE");
  const hasRange = input.monthly.low != null && input.monthly.high != null && input.monthly.low !== input.monthly.high;
  if (!hasRange && input.monthly.base == null && input.monthly.low == null) {
    return {
      appropriate: false,
      entry: null,
      base: null,
      premium: null,
      setup: input.setup,
      rationale: "No grounded monthly price range; tiers are not forced.",
    };
  }
  if (!input.tierEvidence && !hasRange) {
    return {
      appropriate: false,
      entry: null,
      base: tier("base", input.monthly, input.setup, input.provenance, input.includedScope, confidence),
      premium: null,
      setup: input.setup,
      rationale: "Single modeled price point; packaging tiers are not invented.",
    };
  }
  const low = { low: input.monthly.low, base: input.monthly.low, high: input.monthly.low };
  const mid = input.monthly;
  const high = { low: input.monthly.high, base: input.monthly.high, high: input.monthly.high };
  return {
    appropriate: true,
    entry: tier("entry", low, input.setup, input.provenance, input.includedScope, confidence),
    base: tier("base", mid, input.setup, input.provenance, input.includedScope, confidence),
    premium: tier("premium", high, input.setup, input.provenance, input.includedScope, confidence),
    setup: input.setup,
    rationale: "Entry/base/premium taken from the observed comparable monthly range. Setup is one-time and not mixed into MRR.",
  };
}
