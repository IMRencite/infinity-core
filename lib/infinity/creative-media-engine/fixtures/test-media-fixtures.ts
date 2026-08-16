import type { MediaVentureContext } from "../types";

export const TEST_MEDIA_VENTURE_HIGH_VALUE: MediaVentureContext = {
  ventureId: "test-media-venture-high",
  ventureName: "Acme Analytics Platform",
  ventureType: "b2b_saas",
  businessSummary: "B2B analytics platform for operations teams",
  targetCustomer: "Operations leaders at mid-market companies",
  monetizationModel: "subscription",
  mediaRequirements: [
    { purpose: "hero_image", assetType: "image", channel: "website", priority: 1 },
    { purpose: "short_form_clip", assetType: "video", channel: "youtube_short", priority: 2 },
  ],
};

export const TEST_MEDIA_VENTURE_LOW_VALUE: MediaVentureContext = {
  ventureId: "test-media-venture-low",
  ventureName: "Tiny Niche Blog",
  ventureType: "content_site",
  businessSummary: "Low-traffic informational blog",
  targetCustomer: "General readers",
  mediaRequirements: [{ purpose: "thumbnail", assetType: "image", priority: 3 }],
};

export const TEST_MEDIA_VENTURES = [TEST_MEDIA_VENTURE_HIGH_VALUE, TEST_MEDIA_VENTURE_LOW_VALUE];
