import { evaluateCommercialCreativeQC } from "./commercial-creative-qc";

export const CREATIVE_PROVIDER_ROUTER = "CreativeProviderRouter" as const;

export type CreativeIntent =
  | "APPAREL_VECTOR"
  | "TYPOGRAPHY_GRAPHIC"
  | "ILLUSTRATION"
  | "EDITORIAL_LIFESTYLE"
  | "CAMPAIGN_IMAGE"
  | "IMAGE_EDIT"
  | "PRODUCT_VISUALIZATION"
  | "OCCUPANCY_FEATURED_EDITORIAL"
  | "FEATURED_EDITORIAL"
  | "CLUB_THROTTLE_EDITORIAL"
  | "CLUB_THROTTLE_APPAREL";

export type CreativeProviderId =
  | "XAI_IMAGINE"
  | "RECRAFT"
  | "IDEOGRAM"
  | "OPENAI_IMAGE"
  | "GELATO"
  | "PROGRAMMATIC_SVG"
  | "VISUAL_ASSET_BLOCKED";

export type CreativeProviderPresence = Record<"XAI_IMAGINE" | "RECRAFT" | "IDEOGRAM" | "OPENAI_IMAGE", "PRESENT" | "ABSENT">;

export type CreativeProviderRoute = {
  provider: CreativeProviderId;
  fallback: boolean;
  generic_fallback: "DISABLED" | "ACTIVE";
};

const FEATURED_EDITORIAL_INTENTS = new Set<CreativeIntent>([
  "OCCUPANCY_FEATURED_EDITORIAL",
  "FEATURED_EDITORIAL",
  "CLUB_THROTTLE_EDITORIAL",
  "EDITORIAL_LIFESTYLE",
  "CAMPAIGN_IMAGE",
]);

const NO_SHAPE_FALLBACK_INTENTS = new Set<CreativeIntent>([
  ...FEATURED_EDITORIAL_INTENTS,
  "CLUB_THROTTLE_APPAREL",
  "APPAREL_VECTOR",
  "IMAGE_EDIT",
]);

export function creativeProviderPresence(env: NodeJS.Dict<string> = process.env): CreativeProviderPresence {
  return {
    XAI_IMAGINE: env.XAI_API_KEY?.trim() || env.XAI_IMAGINE_API_KEY?.trim() ? "PRESENT" : "ABSENT",
    RECRAFT: env.RECRAFT_API_KEY?.trim() ? "PRESENT" : "ABSENT",
    IDEOGRAM: env.IDEOGRAM_API_KEY?.trim() ? "PRESENT" : "ABSENT",
    OPENAI_IMAGE: env.OPENAI_API_KEY?.trim() ? "PRESENT" : "ABSENT",
  };
}

export function routeCreativeProvider(input: {
  intent: CreativeIntent;
  configured: CreativeProviderPresence;
}): CreativeProviderRoute {
  if (input.intent === "PRODUCT_VISUALIZATION") {
    return { provider: "GELATO", fallback: false, generic_fallback: "DISABLED" };
  }
  if (FEATURED_EDITORIAL_INTENTS.has(input.intent)) {
    if (input.configured.OPENAI_IMAGE === "PRESENT") {
      return { provider: "OPENAI_IMAGE", fallback: false, generic_fallback: "DISABLED" };
    }
    return { provider: "VISUAL_ASSET_BLOCKED", fallback: false, generic_fallback: "DISABLED" };
  }
  if (input.intent === "CLUB_THROTTLE_APPAREL" || input.intent === "APPAREL_VECTOR" || input.intent === "IMAGE_EDIT") {
    if (input.configured.XAI_IMAGINE === "PRESENT") {
      return { provider: "XAI_IMAGINE", fallback: false, generic_fallback: "DISABLED" };
    }
    if (input.intent !== "IMAGE_EDIT" && input.configured.RECRAFT === "PRESENT") {
      return { provider: "RECRAFT", fallback: true, generic_fallback: "DISABLED" };
    }
    if (input.configured.OPENAI_IMAGE === "PRESENT") {
      return { provider: "OPENAI_IMAGE", fallback: true, generic_fallback: "DISABLED" };
    }
    return { provider: "VISUAL_ASSET_BLOCKED", fallback: false, generic_fallback: "DISABLED" };
  }
  if (input.intent === "TYPOGRAPHY_GRAPHIC" && input.configured.IDEOGRAM === "PRESENT") {
    return { provider: "IDEOGRAM", fallback: false, generic_fallback: "DISABLED" };
  }
  if (input.configured.OPENAI_IMAGE === "PRESENT" && (input.intent === "ILLUSTRATION" || input.intent === "TYPOGRAPHY_GRAPHIC")) {
    return { provider: "OPENAI_IMAGE", fallback: false, generic_fallback: "DISABLED" };
  }
  if (NO_SHAPE_FALLBACK_INTENTS.has(input.intent)) {
    return { provider: "VISUAL_ASSET_BLOCKED", fallback: false, generic_fallback: "DISABLED" };
  }
  return { provider: "PROGRAMMATIC_SVG", fallback: true, generic_fallback: input.intent === "ILLUSTRATION" ? "ACTIVE" : "DISABLED" };
}

export function evaluateRoutedCreative(input: {
  svg?: string;
  title?: string;
  placement: "SMALL_FRONT_LARGE_BACK" | "LARGE_BACK" | "UNKNOWN";
}): ReturnType<typeof evaluateCommercialCreativeQC> {
  return evaluateCommercialCreativeQC({
    ...input,
    brand: "Club Throttle",
    finished_merchandise: true,
  });
}
