import { createHash } from "node:crypto";
import type { WebsitePageDefinition } from "@/lib/infinity/website-builder/types";
import { AI_WEBSITE_TRANSLATION_SCHEMA_VERSION } from "./constants";
import type { TranslatedWebsiteModel, WebsiteGenerationPlanPayload } from "./types";

export function translateApprovedPlanToWebsiteModel(input: {
  planId: string;
  contextHash: string;
  outputHash: string;
  payload: WebsiteGenerationPlanPayload;
}): TranslatedWebsiteModel {
  const pageDefinitions: WebsitePageDefinition[] = input.payload.pagePlans.map((page) => ({
    slug: page.slug,
    pageType: page.pageType as WebsitePageDefinition["pageType"],
    title: page.titleRecommendation,
    description: page.metadataRecommendation?.description ?? page.missingContentMarkers[0] ?? "[CONTENT REQUIRED]",
    purpose: page.purpose,
    sections: page.sectionPlan.map((s) => s.sectionKey),
    primaryCTA: page.primaryCTA,
    secondaryCTA: page.secondaryCTA,
    metadata: page.metadataRecommendation,
    schemaTypes: page.schemaTypes,
    internalLinks: page.internalLinkTargets,
    contentStatus: "placeholder",
    validationRequirements: page.validationRequirements,
  }));

  const translationHash = createHash("sha256")
    .update(
      JSON.stringify({
        schema: AI_WEBSITE_TRANSLATION_SCHEMA_VERSION,
        planId: input.planId,
        contextHash: input.contextHash,
        outputHash: input.outputHash,
        pageDefinitions,
        contentPlan: input.payload.contentPlan,
      }),
    )
    .digest("hex");

  const evidenceReferenceIds = input.payload.contentPlan.flatMap((c) => c.evidenceReferenceIds);

  return {
    schemaVersion: AI_WEBSITE_TRANSLATION_SCHEMA_VERSION,
    planId: input.planId,
    contextHash: input.contextHash,
    outputHash: input.outputHash,
    translationHash,
    pageDefinitions,
    contentRecords: input.payload.contentPlan,
    navigation: input.payload.navigationPlan,
    provenance: {
      evidenceReferenceIds: [...new Set(evidenceReferenceIds)],
      planId: input.planId,
    },
  };
}
