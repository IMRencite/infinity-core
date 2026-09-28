export const VENTURE_VISUAL_BRAND_PROFILE = "VentureVisualBrandProfile" as const;
export const VISUAL_BRAND_CONSISTENCY_GATE = "VisualBrandConsistencyGate" as const;
export const VISUAL_DRIFT_GATE = "VisualDriftGate" as const;
export const VISUAL_IDENTITY_VERSION = "venture-visual-brand-v1" as const;

export type VisualPurpose =
  | "FEATURED_EDITORIAL_IMAGE"
  | "EXPLANATORY_VISUAL"
  | "APPAREL_ART"
  | "SOCIAL_PREVIEW"
  | "PRODUCT_VISUAL"
  | "CATEGORY_ARCHIVE"
  | "TAG_TOPIC";

export type VisualMedium =
  | "PHOTOGRAPHIC_EDITORIAL"
  | "PHOTOREAL_EDITORIAL"
  | "CINEMATIC_EDITORIAL"
  | "EXPLANATORY_DIAGRAM"
  | "APPAREL_PRINT"
  | "GEOMETRIC_SHAPE_ART"
  | "GENERIC_SAAS_ILLUSTRATION"
  | "UNKNOWN";

export type VentureVisualBrandProfile = {
  venture_id: string;
  visual_identity_version: string;
  primary_visual_medium: VisualMedium;
  secondary_visual_medium: VisualMedium;
  photography_direction: string;
  illustration_direction: string;
  composition_rules: string[];
  lighting: string;
  color_environment: string[];
  subject_environment: string[];
  human_presence_policy: string;
  architecture_environment: string;
  texture: string;
  image_realism: "HIGH" | "MEDIUM" | "STYLIZED";
  editorial_tone: string;
  commercial_tone: string;
  forbidden_styles: string[];
  hero_rules: string;
  article_feature_rules: string;
  supporting_visual_rules: string;
  social_rules: string;
  product_rules: string;
  approved_reference_assets: string[];
  known_bad_reference_assets: string[];
  featured_editorial_intent: "OCCUPANCY_FEATURED_EDITORIAL" | "CLUB_THROTTLE_EDITORIAL" | "FEATURED_EDITORIAL";
  apparel_intent: "CLUB_THROTTLE_APPAREL" | "NONE";
};

export type FeaturedEditorialPrompt = {
  publication: string;
  visual_purpose: "editorial featured image";
  article_question: string;
  subject: string;
  environment: string;
  style: string;
  lighting: string;
  composition: string;
  color: string;
  avoid: string[];
  prompt: string;
};

export type VisualBrandConsistencyVerdict = {
  gate: typeof VISUAL_BRAND_CONSISTENCY_GATE;
  venture_id: string;
  visual_role: VisualPurpose;
  featured_image?: string;
  BRAND_MATCH: "PASS" | "FAIL";
  TOPIC_MATCH: "PASS" | "FAIL";
  MEDIUM_MATCH: "PASS" | "FAIL";
  UNIQUENESS: "PASS" | "FAIL";
  PROFESSIONAL_QUALITY: "PASS" | "FAIL";
  FEATURED_IMAGE_READY: "YES" | "NO";
  result: "PASS" | "FAIL";
  reasons: string[];
  medium: VisualMedium;
};

export const OCCUPANCYNPV_APPROVED_FEATURED_REFERENCES = [
  "/media/hero-building.webp",
  "/media/hero-interior.webp",
  "/media/hero-district.webp",
  "/media/hero-workstation.webp",
] as const;

export const OCCUPANCYNPV_KNOWN_BAD_FEATURED_REFERENCES = [
  "/media/blog/cap-rates.svg",
  "/media/blog/topic-hub.svg",
  "/media/blog/commercial-real-estate.svg",
  "/media/blog/valuation-category.svg",
  "/media/blog/interest-rates.svg",
] as const;

export const OCCUPANCYNPV_EXPLANATORY_VISUALS = [
  "/media/viz-cash-flow.svg",
  "/media/viz-compare.svg",
] as const;

const GEOMETRIC_SOURCE_MARKERS = [
  "val-sky",
  "hub-glow",
  "cap-ground",
  "cre-dusk",
  "rate-sky",
  "occupancynpvUniqueCreativeSvg",
  "generic network-node",
];

export function occupancynpvVisualBrandProfile(): VentureVisualBrandProfile {
  return {
    venture_id: "occupancynpv",
    visual_identity_version: VISUAL_IDENTITY_VERSION,
    primary_visual_medium: "PHOTOGRAPHIC_EDITORIAL",
    secondary_visual_medium: "EXPLANATORY_DIAGRAM",
    photography_direction:
      "Professional editorial photography of commercial buildings, office interiors, conference rooms, lease-review desks, and financially literate business environments.",
    illustration_direction:
      "Designed diagrams only when the article must teach a calculation, comparison, process, or decision tree. Never as the default featured image.",
    composition_rules: [
      "clean editorial photography",
      "strong architectural lines",
      "realistic spaces",
      "usable negative space",
      "natural depth",
      "professional framing",
      "unique subject and camera angle per article",
    ],
    lighting: "Natural window light or professionally controlled interior light.",
    color_environment: ["navy", "warm stone", "glass", "muted gold", "paper", "daylight interior"],
    subject_environment: [
      "commercial buildings",
      "office interiors",
      "conference rooms",
      "lease review environments",
      "property exteriors",
      "business decision environments",
    ],
    human_presence_policy: "Optional. People may appear as unidentifiable professionals; no customer photos, logos, or readable documents.",
    architecture_environment: "Modern commercial real estate: glass towers, conference rooms, lease desks, district exteriors.",
    texture: "Glass, stone, paper, wood grain, fabric chairs — photographic, not flat fill.",
    image_realism: "HIGH",
    editorial_tone: "Credible, calm, financially literate commercial-real-estate publication.",
    commercial_tone: "High-trust B2B. Not SaaS illustration. Not clip-art.",
    forbidden_styles: [
      "flat geometric illustrations",
      "generic vector buildings",
      "simple icon scenes",
      "abstract node/network diagrams",
      "random circles/triangles/lines",
      "clip-art aesthetic",
      "generic corporate infographic aesthetic",
      "low-detail AI shape art",
      "cartoon buildings",
      "generic SaaS illustration style",
    ],
    hero_rules: "Photographic or photoreal editorial. Unique composition. Brand-consistent lighting and subject territory.",
    article_feature_rules:
      "FEATURED_EDITORIAL_IMAGE must match primary_visual_medium. IMAGE_PRESENT is not enough. Geometric SVG cannot pass.",
    supporting_visual_rules:
      "EXPLANATORY_VISUAL may use designed graphics when the content requires a diagram. It must not replace the featured image.",
    social_rules: "Use the canonical featured editorial image. Do not invent a second art style.",
    product_rules: "Product UI screens are not blog featured imagery.",
    approved_reference_assets: [...OCCUPANCYNPV_APPROVED_FEATURED_REFERENCES],
    known_bad_reference_assets: [...OCCUPANCYNPV_KNOWN_BAD_FEATURED_REFERENCES],
    featured_editorial_intent: "OCCUPANCY_FEATURED_EDITORIAL",
    apparel_intent: "NONE",
  };
}

export function clubThrottleVisualBrandProfile(): VentureVisualBrandProfile {
  return {
    venture_id: "club-throttle",
    visual_identity_version: VISUAL_IDENTITY_VERSION,
    primary_visual_medium: "CINEMATIC_EDITORIAL",
    secondary_visual_medium: "APPAREL_PRINT",
    photography_direction:
      "Premium motorcycle editorial photography: cinematic night-riding, garage light, rider environments, road culture.",
    illustration_direction:
      "High-quality illustrated apparel artwork with print constraints. Not blog featured imagery and not cheap geometric SVGs.",
    composition_rules: [
      "cinematic night or garage light",
      "realistic motorcycles",
      "road culture",
      "unique rider environment per story",
      "separate apparel print compositions from journal editorial",
    ],
    lighting: "Night sodium, garage work light, wet asphalt speculars, or late-day rim light.",
    color_environment: ["asphalt", "chrome", "warm paper", "throttle red", "night black"],
    subject_environment: ["night riding", "garage", "bike night", "group ride", "streetwear on the ride home"],
    human_presence_policy: "Riders may appear; no fake outlaw club marks, no manufacturer logos, no readable plates.",
    architecture_environment: "Roads, lots, garages, late city light — not commercial office towers.",
    texture: "Asphalt grain, chrome, cotton, oil, night haze.",
    image_realism: "HIGH",
    editorial_tone: "Confident rider journal. Not cartoon. Not generic motorcycle wallpaper.",
    commercial_tone: "Streetwear campaign quality for apparel; cinematic editorial for Journal.",
    forbidden_styles: [
      "cheap geometric SVGs",
      "generic AI motorcycle wallpapers",
      "random shapes",
      "OccupancyNPV office photography",
      "clip-art bikes",
    ],
    hero_rules: "Cinematic riding or garage editorial. Unique scene. Same visual language, not the same frame.",
    article_feature_rules: "Journal featured images follow cinematic editorial photography, not apparel print art.",
    supporting_visual_rules: "Diagrams only when the story teaches a comparison or checklist that needs a graphic.",
    social_rules: "Canonical journal featured image. Do not swap in shirt-print art.",
    product_rules: "Shirts use purpose-built apparel compositions with print constraints. Different intent. Same brand.",
    approved_reference_assets: [],
    known_bad_reference_assets: [
      "/visual/journal-night-ride.svg",
      "/visual/journal-shirt.svg",
      "/visual/journal-bike-night.svg",
      "/visual/journal-garage.svg",
      "/visual/journal-group-ride.svg",
      "/visual/journal-gear.svg",
    ],
    featured_editorial_intent: "CLUB_THROTTLE_EDITORIAL",
    apparel_intent: "CLUB_THROTTLE_APPAREL",
  };
}

export function ventureVisualBrandProfile(ventureId: string): VentureVisualBrandProfile {
  if (ventureId === "club-throttle") return clubThrottleVisualBrandProfile();
  if (ventureId === "occupancynpv") return occupancynpvVisualBrandProfile();
  throw new Error(`VENTURE_VISUAL_BRAND_PROFILE_MISSING:${ventureId}`);
}

export function classifyFeaturedVisualMedium(input: {
  path?: string;
  source?: string;
  visual_role?: VisualPurpose;
}): VisualMedium {
  const path = (input.path ?? "").replace(/\\/g, "/");
  const source = input.source ?? "";
  if (OCCUPANCYNPV_EXPLANATORY_VISUALS.includes(path as (typeof OCCUPANCYNPV_EXPLANATORY_VISUALS)[number])) {
    return "EXPLANATORY_DIAGRAM";
  }
  if (OCCUPANCYNPV_KNOWN_BAD_FEATURED_REFERENCES.includes(path as (typeof OCCUPANCYNPV_KNOWN_BAD_FEATURED_REFERENCES)[number])) {
    return "GEOMETRIC_SHAPE_ART";
  }
  if (OCCUPANCYNPV_APPROVED_FEATURED_REFERENCES.includes(path as (typeof OCCUPANCYNPV_APPROVED_FEATURED_REFERENCES)[number])) {
    return "PHOTOGRAPHIC_EDITORIAL";
  }
  if (/\.(webp|jpe?g|png|avif)$/i.test(path)) return "PHOTOGRAPHIC_EDITORIAL";
  if (GEOMETRIC_SOURCE_MARKERS.some((marker) => source.includes(marker))) return "GEOMETRIC_SHAPE_ART";
  if (/\.svg$/i.test(path)) {
    if (input.visual_role === "EXPLANATORY_VISUAL") return "EXPLANATORY_DIAGRAM";
    if (/circle|polygon|rect |linearGradient|radialGradient/i.test(source) && /building|clock|hub|node|yield|vector/i.test(`${path} ${source}`)) {
      return "GEOMETRIC_SHAPE_ART";
    }
    return "GEOMETRIC_SHAPE_ART";
  }
  if (/network-node|node diagram|abstract geometry/i.test(`${path} ${source}`)) return "GENERIC_SAAS_ILLUSTRATION";
  return "UNKNOWN";
}

export function compileFeaturedEditorialPrompt(input: {
  profile: VentureVisualBrandProfile;
  article_question: string;
  subject: string;
  coverage_tokens?: string[];
  visual_purpose?: VisualPurpose;
}): FeaturedEditorialPrompt {
  const purpose = input.visual_purpose ?? "FEATURED_EDITORIAL_IMAGE";
  if (purpose !== "FEATURED_EDITORIAL_IMAGE") {
    throw new Error("FEATURED_PROMPT_REQUIRES_FEATURED_EDITORIAL_IMAGE");
  }
  const avoid = [...input.profile.forbidden_styles, "text overlays", "logos", "watermarks"];
  const publication = input.profile.venture_id === "occupancynpv" ? "OccupancyNPV" : input.profile.venture_id === "club-throttle" ? "Club Throttle" : input.profile.venture_id;
  const prompt = [
    `PUBLICATION: ${publication}.`,
    "VISUAL PURPOSE: editorial featured image.",
    `ARTICLE QUESTION: ${input.article_question}.`,
    `SUBJECT: ${input.subject}${input.coverage_tokens?.length ? ` Relevant coverage: ${input.coverage_tokens.join(", ")}.` : ""}`,
    `ENVIRONMENT: ${input.profile.subject_environment.slice(0, 3).join(", ")}.`,
    `STYLE: ${input.profile.photography_direction}`,
    `LIGHTING: ${input.profile.lighting}`,
    `COMPOSITION: ${input.profile.composition_rules.slice(0, 4).join("; ")}.`,
    `COLOR: ${input.profile.color_environment.join(", ")}.`,
    `REALISM: ${input.profile.image_realism}.`,
    `TONE: ${input.profile.editorial_tone}`,
    `AVOID: ${avoid.join("; ")}.`,
    "No readable text, no logos, no watermarks, no stock-looking clip-art.",
  ].join(" ");
  return {
    publication,
    visual_purpose: "editorial featured image",
    article_question: input.article_question,
    subject: input.subject,
    environment: input.profile.subject_environment.join(", "),
    style: input.profile.photography_direction,
    lighting: input.profile.lighting,
    composition: input.profile.composition_rules.join("; "),
    color: input.profile.color_environment.join(", "),
    avoid,
    prompt,
  };
}

export function evaluateVisualBrandConsistency(input: {
  venture_id: string;
  visual_role?: VisualPurpose;
  featured_image?: string;
  featured_source?: string;
  topic_tokens?: string[];
  sibling_featured_images?: string[];
}): VisualBrandConsistencyVerdict {
  const profile = ventureVisualBrandProfile(input.venture_id);
  const role = input.visual_role ?? "FEATURED_EDITORIAL_IMAGE";
  const reasons: string[] = [];
  const medium = classifyFeaturedVisualMedium({
    path: input.featured_image,
    source: input.featured_source,
    visual_role: role,
  });

  if (!input.featured_image) reasons.push("featured_image_missing");

  const mediumOk = role === "EXPLANATORY_VISUAL"
    ? medium === "EXPLANATORY_DIAGRAM" || medium === "PHOTOGRAPHIC_EDITORIAL"
    : role === "APPAREL_ART"
      ? medium === "APPAREL_PRINT" || medium === "PHOTOGRAPHIC_EDITORIAL"
      : medium === profile.primary_visual_medium
        || (profile.primary_visual_medium === "PHOTOGRAPHIC_EDITORIAL" && medium === "PHOTOREAL_EDITORIAL")
        || (profile.primary_visual_medium === "CINEMATIC_EDITORIAL" && (medium === "PHOTOGRAPHIC_EDITORIAL" || medium === "CINEMATIC_EDITORIAL"));

  if (role === "FEATURED_EDITORIAL_IMAGE" && (medium === "GEOMETRIC_SHAPE_ART" || medium === "GENERIC_SAAS_ILLUSTRATION")) {
    reasons.push("FAIL_FEATURED_VISUAL");
    reasons.push("geometric_or_generic_shape_art");
  }
  if (role === "FEATURED_EDITORIAL_IMAGE" && input.featured_image && profile.known_bad_reference_assets.includes(input.featured_image)) {
    reasons.push("known_bad_reference_used_as_featured");
  }
  if (role === "FEATURED_EDITORIAL_IMAGE" && !mediumOk) reasons.push("medium_mismatch");
  if (role === "FEATURED_EDITORIAL_IMAGE" && medium === "EXPLANATORY_DIAGRAM") {
    reasons.push("explanatory_visual_used_as_featured");
  }

  const topicOk = !input.topic_tokens?.length
    || !input.featured_image
    || input.topic_tokens.some((token) => input.featured_image!.toLowerCase().includes(token.toLowerCase()) || (input.featured_source ?? "").toLowerCase().includes(token.toLowerCase()))
    || medium === profile.primary_visual_medium
    || medium === "PHOTOGRAPHIC_EDITORIAL";
  if (input.topic_tokens?.length && !topicOk) reasons.push("topic_mismatch");

  const siblings = (input.sibling_featured_images ?? []).filter((path) => path && path === input.featured_image);
  const uniqueOk = !input.featured_image || siblings.length <= 1;
  if (!uniqueOk) reasons.push("duplicate_featured_composition");

  const professionalOk = medium !== "GEOMETRIC_SHAPE_ART" && medium !== "GENERIC_SAAS_ILLUSTRATION" && medium !== "UNKNOWN";
  if (!professionalOk) reasons.push("professional_quality_fail");

  const brandOk = Boolean(input.featured_image) && mediumOk && !reasons.includes("FAIL_FEATURED_VISUAL") && !reasons.includes("known_bad_reference_used_as_featured");
  if (!brandOk) reasons.push("brand_match_fail");

  const ready = reasons.length === 0 && Boolean(input.featured_image);
  return {
    gate: VISUAL_BRAND_CONSISTENCY_GATE,
    venture_id: input.venture_id,
    visual_role: role,
    featured_image: input.featured_image,
    BRAND_MATCH: brandOk ? "PASS" : "FAIL",
    TOPIC_MATCH: !input.featured_image || (input.topic_tokens?.length && !topicOk) ? "FAIL" : "PASS",
    MEDIUM_MATCH: mediumOk && Boolean(input.featured_image) ? "PASS" : "FAIL",
    UNIQUENESS: uniqueOk ? "PASS" : "FAIL",
    PROFESSIONAL_QUALITY: professionalOk && Boolean(input.featured_image) ? "PASS" : "FAIL",
    FEATURED_IMAGE_READY: ready ? "YES" : "NO",
    result: ready ? "PASS" : "FAIL",
    reasons: [...new Set(reasons)],
    medium,
  };
}

export function evaluateVisualDrift(input: {
  venture_id: string;
  candidate_path?: string;
  candidate_source?: string;
  recent_featured?: string[];
}): { gate: typeof VISUAL_DRIFT_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const profile = ventureVisualBrandProfile(input.venture_id);
  const reasons: string[] = [];
  const medium = classifyFeaturedVisualMedium({ path: input.candidate_path, source: input.candidate_source, visual_role: "FEATURED_EDITORIAL_IMAGE" });
  if (medium === "GEOMETRIC_SHAPE_ART" || medium === "GENERIC_SAAS_ILLUSTRATION") reasons.push("style_drift");
  if (medium !== "UNKNOWN" && medium !== profile.primary_visual_medium && medium !== "PHOTOGRAPHIC_EDITORIAL" && medium !== "PHOTOREAL_EDITORIAL" && medium !== "CINEMATIC_EDITORIAL") {
    reasons.push("medium_drift");
  }
  if (input.candidate_path && (input.recent_featured ?? []).filter((path) => path === input.candidate_path).length > 1) {
    reasons.push("repeated_duplicate_composition");
  }
  if (input.candidate_path && profile.known_bad_reference_assets.includes(input.candidate_path)) reasons.push("generic_fallback");
  return { gate: VISUAL_DRIFT_GATE, result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function occupancynpvKnownBadFeaturedSources(sourceFor: (kind: "valuation" | "topic-hub" | "cap-rates" | "commercial-real-estate") => string): Array<{ path: string; source: string; label: string }> {
  return [
    { path: "/media/blog/valuation-category.svg", source: sourceFor("valuation"), label: "geometric buildings and clock" },
    { path: "/media/blog/topic-hub.svg", source: sourceFor("topic-hub"), label: "generic network-node diagram" },
    { path: "/media/blog/cap-rates.svg", source: sourceFor("cap-rates"), label: "flat yield boxes" },
    { path: "/media/blog/commercial-real-estate.svg", source: sourceFor("commercial-real-estate"), label: "vector district" },
  ];
}

export function evaluateClubThrottleJournalVisualAudit(images: string[]): Array<VisualBrandConsistencyVerdict> {
  return images.map((featured_image) =>
    evaluateVisualBrandConsistency({
      venture_id: "club-throttle",
      visual_role: "FEATURED_EDITORIAL_IMAGE",
      featured_image,
    }),
  );
}
