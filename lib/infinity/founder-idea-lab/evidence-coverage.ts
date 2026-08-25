export const EVIDENCE_DIMENSIONS = [
  "demand",
  "market",
  "competition",
  "monetization",
  "pricing",
  "distribution",
  "buildability",
  "capital_efficiency",
  "speed_to_revenue",
] as const;

export type EvidenceDimension = (typeof EVIDENCE_DIMENSIONS)[number];
export type EvidencePolarity = "positive" | "negative" | "mixed" | "unknown";
export type EvidenceCoverageLevel = "none" | "partial" | "adequate";

export type DimensionCoverage = {
  dimension: EvidenceDimension;
  polarity: EvidencePolarity;
  coverage: EvidenceCoverageLevel;
  confidence: number | null;
  evidenceRefs: string[];
  founderHypothesisOnly: boolean;
};

export type EvidenceCoverage = {
  dimensions: Record<EvidenceDimension, DimensionCoverage>;
  researched: boolean;
  materialCoverageSufficient: boolean;
  unknownCount: number;
  groundedCount: number;
};

export function emptyDimension(dimension: EvidenceDimension, founderHypothesisOnly = false): DimensionCoverage {
  return {
    dimension,
    polarity: "unknown",
    coverage: "none",
    confidence: null,
    evidenceRefs: [],
    founderHypothesisOnly,
  };
}

export function emptyEvidenceCoverage(input?: { researched?: boolean }): EvidenceCoverage {
  const dimensions = Object.fromEntries(
    EVIDENCE_DIMENSIONS.map((dimension) => [dimension, emptyDimension(dimension)]),
  ) as Record<EvidenceDimension, DimensionCoverage>;
  return summarizeCoverage(dimensions, Boolean(input?.researched));
}

export function summarizeCoverage(
  dimensions: Record<EvidenceDimension, DimensionCoverage>,
  researched: boolean,
): EvidenceCoverage {
  const values = Object.values(dimensions);
  const unknownCount = values.filter((item) => item.polarity === "unknown").length;
  const groundedCount = values.filter((item) => item.coverage !== "none" && !item.founderHypothesisOnly).length;
  const material = ["demand", "market", "competition", "monetization"] as const;
  return {
    dimensions,
    researched,
    materialCoverageSufficient:
      researched &&
      material.every(
        (dimension) =>
          dimensions[dimension].coverage === "adequate" && dimensions[dimension].polarity !== "unknown",
      ),
    unknownCount,
    groundedCount,
  };
}

export function polarityFromSignals(input: {
  positive: number;
  negative: number;
  mixed?: number;
}): EvidencePolarity {
  const mixed = input.mixed ?? 0;
  if (input.positive === 0 && input.negative === 0 && mixed === 0) return "unknown";
  if (input.positive > 0 && input.negative > 0) return "mixed";
  if (mixed > 0 && (input.positive > 0 || input.negative > 0)) return "mixed";
  if (mixed > 0 && input.positive === 0 && input.negative === 0) return "mixed";
  if (input.negative > 0) return "negative";
  return "positive";
}
