import { findCapableProviders, getProviderCapabilityRegistrations } from "@/lib/infinity/creative-media-engine/registry/capability-registry";
import { loadCreativeMediaEngineConfig } from "@/lib/infinity/creative-media-engine/config";
import { CREATIVE_IMAGE_GENERATE_CAPABILITY } from "./constants";
import type { CompositionPlan, CreativeAssetPlan, PublicVentureDesignContext } from "./types";

export function evaluateVisualNecessity(context: PublicVentureDesignContext): {
  visualNecessity: CreativeAssetPlan["visualNecessity"];
  reason: string;
} {
  const software = /software|analytic|saas|workflow|data/.test(`${context.productType} ${context.ventureCategory}`.toLowerCase());
  if (software) {
    return {
      visualNecessity: "USEFUL",
      reason: "Software/data ventures benefit from product UI and information visualization more than lifestyle imagery. External raster images are not required when deterministic UI visualization is available.",
    };
  }
  if (/marketplace|consumer/.test(context.ventureCategory.toLowerCase())) {
    return { visualNecessity: "REQUIRED", reason: "Discovery-oriented consumer products need visual merchandise context." };
  }
  return { visualNecessity: "NOT_REQUIRED", reason: "Offer is text-evaluable and no visual medium improves comprehension." };
}

export function inspectCreativeImageGenerateCapability(): {
  capability: typeof CREATIVE_IMAGE_GENERATE_CAPABILITY;
  available: boolean;
  verified: boolean;
  providers: string[];
} {
  const config = loadCreativeMediaEngineConfig();
  const registered = getProviderCapabilityRegistrations();
  const capable = findCapableProviders(["IMAGE_GENERATION"]);
  const live = config.enableLiveProviders && !config.simulationOnly && capable.length > 0;
  return {
    capability: CREATIVE_IMAGE_GENERATE_CAPABILITY,
    available: live,
    verified: live,
    providers: (live ? capable : registered).map((item) => item.providerId),
  };
}

export function planCreativeAssets(input: {
  context: PublicVentureDesignContext;
  composition: CompositionPlan;
}): CreativeAssetPlan {
  const necessity = evaluateVisualNecessity(input.context);
  const imageCap = inspectCreativeImageGenerateCapability();
  const items: CreativeAssetPlan["items"] = [
    {
      assetType: "product_ui_visualization",
      purpose: "Explain the proposed lease-comparison workflow",
      section: "PRODUCT_PREVIEW",
      generationMethod: "DETERMINISTIC_UI",
      providerCapability: null,
      aspectRatio: "16:10",
      styleDirection: "institutional software frame",
      brandProfile: input.context.brandProfile ? "USED" : "PROVISIONAL",
      reuseCandidate: true,
      required: true,
    },
    {
      assetType: "atmosphere_image",
      purpose: "Optional commercial architecture atmosphere",
      section: "HERO",
      generationMethod: "NO_EXTERNAL_IMAGE_REQUIRED",
      providerCapability: CREATIVE_IMAGE_GENERATE_CAPABILITY,
      aspectRatio: "3:2",
      styleDirection: "subtle architecture only if it explains; product viz preferred",
      brandProfile: input.context.brandProfile ? "USED" : "PROVISIONAL",
      reuseCandidate: true,
      required: false,
    },
  ];
  return {
    visualNecessity: necessity.visualNecessity,
    reason: necessity.reason,
    items,
    creativeMediaInvoked: true,
    assetsGenerated: 0,
    assetIds: [],
    providers: imageCap.verified ? imageCap.providers : [],
    costState: imageCap.verified ? "UNKNOWN" : "NOT_APPLICABLE",
    provenance: "PASS",
    blocker: imageCap.verified ? "NONE" : "CREATIVE_MEDIA_CAPABILITY_REQUIRED",
  };
}
