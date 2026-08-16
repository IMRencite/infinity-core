import { randomUUID } from "node:crypto";
import type { MediaAssetType, MediaOpportunityDecision } from "../constants";
import type { MediaChannel, MediaEconomicsContext, MediaOpportunity, MediaPurpose, MediaVentureContext } from "../types";
import { evaluateMediaEconomics } from "../economics/media-economics";

const PURPOSE_DEFAULTS: Record<
  MediaPurpose,
  { assetType: MediaAssetType; baseValue: number; baseCost: number; capabilities: MediaOpportunity["requiredCapabilities"] }
> = {
  hero_image: {
    assetType: "image",
    baseValue: 1200,
    baseCost: 0.08,
    capabilities: ["IMAGE_GENERATION"],
  },
  thumbnail: {
    assetType: "image",
    baseValue: 800,
    baseCost: 0.05,
    capabilities: ["THUMBNAIL_GENERATION"],
  },
  diagram: {
    assetType: "diagram",
    baseValue: 600,
    baseCost: 0.04,
    capabilities: ["DIAGRAM_GENERATION"],
  },
  product_shot: {
    assetType: "image",
    baseValue: 900,
    baseCost: 0.07,
    capabilities: ["IMAGE_GENERATION", "PRODUCT_CONSISTENCY"],
  },
  explainer_video: {
    assetType: "video",
    baseValue: 2500,
    baseCost: 0.5,
    capabilities: ["TEXT_TO_VIDEO", "SHORT_FORM_VIDEO"],
  },
  short_form_clip: {
    assetType: "video",
    baseValue: 1800,
    baseCost: 0.35,
    capabilities: ["TEXT_TO_VIDEO", "VERTICAL_VIDEO", "SHORT_FORM_VIDEO"],
  },
  long_form_video: {
    assetType: "video",
    baseValue: 5000,
    baseCost: 2.5,
    capabilities: ["TEXT_TO_VIDEO", "LONG_FORM_VIDEO", "VIDEO_ASSEMBLY"],
  },
  social_promo: {
    assetType: "video",
    baseValue: 1400,
    baseCost: 0.25,
    capabilities: ["TEXT_TO_VIDEO", "VERTICAL_VIDEO"],
  },
  b_roll: {
    assetType: "video",
    baseValue: 700,
    baseCost: 0.2,
    capabilities: ["TEXT_TO_VIDEO"],
  },
  tutorial: {
    assetType: "video",
    baseValue: 2200,
    baseCost: 0.45,
    capabilities: ["TEXT_TO_VIDEO", "CAPTION_RENDERING"],
  },
};

export function buildMediaOpportunities(
  context: MediaVentureContext,
  economics: MediaEconomicsContext,
  options?: { existingAssetIds?: string[]; forcePurpose?: MediaPurpose },
): MediaOpportunity[] {
  const requirements =
    options?.forcePurpose != null
      ? [{ purpose: options.forcePurpose, assetType: PURPOSE_DEFAULTS[options.forcePurpose].assetType, priority: 1 }]
      : context.mediaRequirements ??
        [
          { purpose: "hero_image" as const, assetType: "image" as const, priority: 1 },
          { purpose: "thumbnail" as const, assetType: "image" as const, priority: 2 },
        ];

  return requirements.map((req: { purpose: MediaPurpose; assetType: MediaAssetType; priority?: number; channel?: MediaChannel }) => {
    const defaults = PURPOSE_DEFAULTS[req.purpose];
    const expectedValueScore = defaults.baseValue + economics.expectedConversionValue * 0.2;
    const estimatedCost = defaults.baseCost + economics.generationCostEstimate;
    const economicScore = expectedValueScore - estimatedCost * 100;

    let decision: MediaOpportunityDecision = "CREATE_STANDARD";
    const rationale: string[] = [];

    if (options?.existingAssetIds?.length && req.priority != null && req.priority >= 2) {
      decision = "REUSE_EXISTING";
      rationale.push("Existing reusable asset available");
    } else if (req.purpose === "diagram" && economics.expectedAssetValue < 400) {
      decision = "DETERMINISTIC_ONLY";
      rationale.push("Diagram can be rendered deterministically at lower cost");
    } else {
      const econDecision = evaluateMediaEconomics({
        expectedValue: expectedValueScore,
        estimatedCost,
        minMarginalAssetValue: economics.minMarginalAssetValue,
        purpose: req.purpose,
      });
      decision = econDecision.decision;
      rationale.push(...econDecision.reasons);
    }

    return {
      id: randomUUID(),
      ventureId: context.ventureId,
      organicContentContractId: context.organicContentContractId,
      assetType: req.assetType ?? defaults.assetType,
      purpose: req.purpose,
      targetChannel: req.channel,
      expectedValueScore: Math.round(expectedValueScore),
      estimatedCost,
      economicScore: Math.round(economicScore),
      decision,
      rationale,
      requiredCapabilities: defaults.capabilities,
      reuseAssetId: decision === "REUSE_EXISTING" ? options?.existingAssetIds?.[0] ?? null : null,
    };
  });
}

export function filterApprovedOpportunities(opportunities: MediaOpportunity[]): MediaOpportunity[] {
  return opportunities.filter((o) =>
    ["CREATE_PREMIUM", "CREATE_STANDARD", "CREATE_ECONOMY", "DETERMINISTIC_ONLY"].includes(o.decision),
  );
}
