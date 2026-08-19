import type { AdversarialFinding } from "../types";

export type UncertaintyDerivation = {
  remainingUncertainty: number;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  evidenceSources: string[];
};

/** Explicit fallback when no category-specific evidence exists. Not the normal path. */
export const FALLBACK_UNCERTAINTY = 0.55;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function countGroundedEvidence(items: unknown[]): number {
  return items.filter((item) => {
    const record = item as Record<string, unknown>;
    return record.grounded === true;
  }).length;
}

function countSourceUrls(items: unknown[]): number {
  let count = 0;
  for (const item of items) {
    const record = item as Record<string, unknown>;
    if (Array.isArray(record.sourceUrls)) {
      count += record.sourceUrls.filter((url): url is string => typeof url === "string").length;
    }
  }
  return count;
}

export function countEvidenceForCategory(
  candidate: {
    demandEvidence: unknown[];
    monetizationEvidence: unknown[];
    distributionEvidence: unknown[];
    competitionEvidence: unknown[];
  },
  category: string,
): { groundedCount: number; sourceUrlCount: number } {
  switch (category) {
    case "demand":
      return {
        groundedCount: countGroundedEvidence(candidate.demandEvidence),
        sourceUrlCount: countSourceUrls(candidate.demandEvidence),
      };
    case "acquisition":
      return {
        groundedCount: countGroundedEvidence(candidate.distributionEvidence),
        sourceUrlCount:
          countSourceUrls(candidate.distributionEvidence) +
          countSourceUrls(candidate.monetizationEvidence),
      };
    case "pricing":
      return {
        groundedCount: countGroundedEvidence(candidate.monetizationEvidence),
        sourceUrlCount: countSourceUrls(candidate.monetizationEvidence),
      };
    case "economic":
      return {
        groundedCount:
          countGroundedEvidence(candidate.demandEvidence) +
          countGroundedEvidence(candidate.competitionEvidence),
        sourceUrlCount:
          countSourceUrls(candidate.competitionEvidence) + countSourceUrls(candidate.demandEvidence),
      };
    default:
      return { groundedCount: 0, sourceUrlCount: 0 };
  }
}

const ADVERSARIAL_CATEGORY_KEYS: Record<string, string[]> = {
  acquisition: ["acquisition_risk", "distribution_feasibility", "cac_feasibility"],
  demand: ["demand_risk"],
  pricing: ["pricing_risk"],
  economic: ["competition_risk", "execution_risk"],
};

const FINDING_KEYWORDS: Record<string, RegExp> = {
  acquisition: /cac|acquisition|distribution|channel|outbound|ads spend/i,
  demand: /demand|willingness to pay|customer count|adoption|market size/i,
  pricing: /pricing|price point|willingness to pay|monetization/i,
  economic: /retention|churn|unit economics|margin|switching/i,
};

export function adversarialBoostForCategory(
  category: string,
  riskInputs?: Record<string, number>,
  findings?: AdversarialFinding[],
): number {
  let boost = 0;

  if (riskInputs) {
    const keys = ADVERSARIAL_CATEGORY_KEYS[category] ?? [];
    const values = keys
      .map((key) => riskInputs[key])
      .filter((value): value is number => typeof value === "number");
    if (values.length > 0) {
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      boost = Math.max(0, Math.min(0.25, (avg - 0.45) * 0.5));
    }
  }

  if (findings?.length) {
    const pattern = FINDING_KEYWORDS[category];
    if (pattern) {
      for (const finding of findings) {
        const text = `${finding.category} ${finding.finding}`;
        if (pattern.test(text)) {
          boost = Math.min(0.25, boost + finding.severity * 0.06);
        }
      }
    }
  }

  return boost;
}

export function deriveRemainingUncertainty(input: {
  category: string;
  confidence: number;
  sourceUrlCount: number;
  groundedEvidenceCount: number;
  monetizationConfidence: number;
  adversarialBoost: number;
  hasExplicitEstimate: boolean;
}): UncertaintyDerivation {
  const evidenceSources: string[] = [];
  if (input.sourceUrlCount > 0) {
    evidenceSources.push(`${input.sourceUrlCount} persisted source URL(s)`);
  }
  if (input.groundedEvidenceCount > 0) {
    evidenceSources.push(`${input.groundedEvidenceCount} grounded evidence item(s)`);
  }
  if (input.confidence >= 0.6) {
    evidenceSources.push(`assumption confidence ${input.confidence.toFixed(2)}`);
  }
  if (input.monetizationConfidence >= 0.65) {
    evidenceSources.push(`monetization confidence ${input.monetizationConfidence.toFixed(2)}`);
  }

  const hasEvidence =
    input.sourceUrlCount > 0 ||
    input.groundedEvidenceCount > 0 ||
    input.confidence >= 0.62 ||
    (input.hasExplicitEstimate && input.monetizationConfidence >= 0.7);

  if (!hasEvidence) {
    return {
      remainingUncertainty: clamp01(FALLBACK_UNCERTAINTY + input.adversarialBoost),
      fallbackUsed: true,
      fallbackReason: "No category-specific evidence; using explicit fallback uncertainty",
      evidenceSources: [],
    };
  }

  const resolvedFraction = clamp01(
    0.12 * Math.min(input.sourceUrlCount, 4) / 4 +
      0.28 * Math.min(input.groundedEvidenceCount, 5) / 5 +
      0.3 * input.confidence +
      0.3 * input.monetizationConfidence,
  );

  return {
    remainingUncertainty: clamp01(1 - resolvedFraction + input.adversarialBoost),
    fallbackUsed: false,
    fallbackReason: null,
    evidenceSources,
  };
}
