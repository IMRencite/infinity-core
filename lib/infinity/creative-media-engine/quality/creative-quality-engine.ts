import { randomUUID } from "node:crypto";
import type { QualityGateType, ReviewSeverity } from "../constants";
import type { CreativeBrief, GeneratedMediaAsset, MediaQualityReview } from "../types";

const APPLICABLE_GATES: Partial<Record<GeneratedMediaAsset["mediaType"], QualityGateType[]>> = {
  image: [
    "TECHNICAL_VALIDITY",
    "PROMPT_ALIGNMENT",
    "VISUAL_COHERENCE",
    "BRAND_ALIGNMENT",
    "TEXT_LEGIBILITY",
    "ARTIFACT_DETECTION",
    "AI_SLOP_RISK",
    "MISLEADING_CONTENT_RISK",
  ],
  video: [
    "TECHNICAL_VALIDITY",
    "PROMPT_ALIGNMENT",
    "TEMPORAL_COHERENCE",
    "MOTION_QUALITY",
    "THUMBNAIL_TRUTHFULNESS",
    "AI_SLOP_RISK",
  ],
  thumbnail: ["PROMPT_ALIGNMENT", "TEXT_LEGIBILITY", "COMPOSITION", "THUMBNAIL_TRUTHFULNESS"],
};

export function reviewGeneratedMediaAsset(input: {
  asset: GeneratedMediaAsset;
  brief: CreativeBrief;
}): MediaQualityReview {
  const gates = APPLICABLE_GATES[input.asset.mediaType] ?? ["TECHNICAL_VALIDITY", "PROMPT_ALIGNMENT"];
  const findings: MediaQualityReview["findings"] = [];
  const gateScores: MediaQualityReview["gateScores"] = {};

  for (const gate of gates) {
    const score = scoreGate(gate, input.asset, input.brief);
    gateScores[gate] = score;
    if (score < input.brief.qualityThreshold) {
      findings.push({
        gate,
        severity: score < 0.4 ? "CRITICAL" : score < 0.55 ? "HIGH" : "MEDIUM",
        description: `${gate} below threshold (${score.toFixed(2)} < ${input.brief.qualityThreshold})`,
        score,
      });
    }
  }

  if (!input.asset.filePath || (input.asset.fileSizeBytes ?? 0) <= 0) {
    findings.push({
      gate: "TECHNICAL_VALIDITY",
      severity: "CRITICAL",
      description: "Generated asset missing valid file output",
    });
  }

  if (input.asset.prompt && /fake review|rated \d|our customers say/i.test(input.asset.prompt)) {
    findings.push({
      gate: "MISLEADING_CONTENT_RISK",
      severity: "CRITICAL",
      description: "Prompt or metadata suggests fabricated social proof",
    });
  }

  const hasCritical = findings.some((f) => f.severity === "CRITICAL");
  const hasHigh = findings.some((f) => f.severity === "HIGH");
  const outcome = hasCritical ? "BLOCKED" : hasHigh || findings.length > 0 ? "REPAIR_REQUIRED" : "PASS";

  return {
    reviewId: randomUUID(),
    assetId: input.asset.assetId,
    outcome,
    findings,
    gateScores,
  };
}

function scoreGate(
  gate: QualityGateType,
  asset: GeneratedMediaAsset,
  brief: CreativeBrief,
): number {
  switch (gate) {
    case "TECHNICAL_VALIDITY":
      return asset.filePath && (asset.fileSizeBytes ?? 0) > 0 ? 0.95 : 0.1;
    case "PROMPT_ALIGNMENT":
      return asset.prompt && brief.message && asset.prompt.includes(brief.message.slice(0, 12)) ? 0.88 : 0.7;
    case "TEXT_LEGIBILITY":
      return brief.textRequirements?.some((t) => /avoid embedded text/i.test(t)) ? 0.85 : 0.75;
    case "AI_SLOP_RISK":
      return asset.provider === "mock_media" ? 0.65 : 0.8;
    case "BRAND_ALIGNMENT":
      return brief.brandProfile?.visualStyle ? 0.78 : 0.72;
    default:
      return 0.8;
  }
}

export function countUnresolvedBySeverity(
  review: MediaQualityReview,
  severity: ReviewSeverity,
): number {
  return review.findings.filter((f) => f.severity === severity).length;
}

export function productionStatusFromReview(review: MediaQualityReview): GeneratedMediaAsset["productionStatus"] {
  if (review.outcome === "PASS") return "READY";
  if (review.outcome === "REPAIR_REQUIRED") return "REPAIR_REQUIRED";
  return "BLOCKED";
}
