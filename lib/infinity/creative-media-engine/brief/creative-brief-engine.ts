import { randomUUID } from "node:crypto";
import type { CreativeBrief, MediaOpportunity, MediaVentureContext } from "../types";
import { economicsInfluenceQualityTier } from "../economics/media-economics";
import type { MediaEconomicsContext } from "../types";

export function buildCreativeBrief(input: {
  opportunity: MediaOpportunity;
  context: MediaVentureContext;
  economics: MediaEconomicsContext;
}): CreativeBrief {
  const tier = economicsInfluenceQualityTier({
    decision: input.opportunity.decision,
    economics: input.economics,
  });

  const qualityThreshold =
    tier === "premium" ? 0.85 : tier === "standard" ? 0.72 : tier === "economy" ? 0.58 : 0.5;

  return {
    briefId: randomUUID(),
    mediaOpportunityId: input.opportunity.id,
    purpose: input.opportunity.purpose,
    audience: input.context.targetCustomer,
    message: `${input.context.businessSummary} — ${input.opportunity.purpose.replace(/_/g, " ")}`,
    targetChannel: input.opportunity.targetChannel ?? "website",
    assetType: input.opportunity.assetType,
    visualDirection: `Clean, professional visual supporting ${input.context.ventureName}`,
    brandRequirements: input.context.brandProfile?.logoRules ?? ["No unapproved logo modifications"],
    subjectRequirements: input.context.brandProfile?.compositionGuidance
      ? [input.context.brandProfile.compositionGuidance]
      : ["Subject must align with venture context"],
    referenceAssetIds: input.context.brandProfile ? [] : [],
    aspectRatio: input.opportunity.assetType === "video" ? "16:9" : "1:1",
    resolution: tier === "premium" ? "2048x2048" : "1024x1024",
    durationSec: input.opportunity.assetType === "video" ? 5 : undefined,
    composition: "Clear focal subject, readable at thumbnail size",
    cameraGuidance: input.opportunity.assetType === "video" ? "Stable camera, minimal motion" : undefined,
    shotRequirements: input.opportunity.assetType === "video" ? ["Establish context in first second"] : undefined,
    audioRequirements: input.opportunity.assetType === "video" ? ["No misleading audio claims"] : undefined,
    captionRequirements: ["If text appears, must be legible"],
    textRequirements: ["Avoid embedded text when possible; render separately if needed"],
    factualConstraints: ["Do not fabricate statistics, reviews, or credentials"],
    accuracyRequirements: ["Visual must match stated venture purpose"],
    prohibitedElements: [
      "fake reviews",
      "fake ratings",
      "misleading before/after",
      "unverified claims",
      ...(input.context.brandProfile?.prohibitedStyles ?? []),
    ],
    qualityThreshold,
    budgetUsd: input.opportunity.estimatedCost,
    latencyPreference: tier === "premium" ? "quality" : "balanced",
    brandProfile: input.context.brandProfile,
  };
}
