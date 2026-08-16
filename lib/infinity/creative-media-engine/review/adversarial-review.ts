import type { CreativeBrief, GeneratedMediaAsset, MediaQualityReview } from "../types";

export function runAdversarialMediaReview(input: {
  asset: GeneratedMediaAsset;
  brief: CreativeBrief;
  primaryReview: MediaQualityReview;
  reviewerProvider: string;
}): MediaQualityReview {
  const findings = [...input.primaryReview.findings];

  if (input.asset.provider === input.reviewerProvider) {
    findings.push({
      gate: "PROMPT_ALIGNMENT",
      severity: "LOW",
      description: "Independent review skipped — same provider as generator",
    });
    return { ...input.primaryReview, findings };
  }

  if ((input.asset.fileSizeBytes ?? 0) < 32) {
    findings.push({
      gate: "ARTIFACT_DETECTION",
      severity: "HIGH",
      description: "Adversarial review: suspiciously small output file",
    });
  }

  if (input.brief.prohibitedElements.some((p) => input.asset.prompt?.toLowerCase().includes(p.toLowerCase()))) {
    findings.push({
      gate: "MISLEADING_CONTENT_RISK",
      severity: "CRITICAL",
      description: "Adversarial review: prohibited element detected in prompt lineage",
    });
  }

  const hasCritical = findings.some((f) => f.severity === "CRITICAL");
  const hasHigh = findings.some((f) => f.severity === "HIGH");
  const outcome = hasCritical ? "BLOCKED" : hasHigh ? "REPAIR_REQUIRED" : input.primaryReview.outcome;

  return {
    ...input.primaryReview,
    outcome,
    findings,
  };
}
