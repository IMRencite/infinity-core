export const VENTURE_BRAND_IDENTITY_CONTRACT = "VentureBrandIdentityContract" as const;
export const VENTURE_LOGO_GATE = "VentureLogoGate" as const;
export const VENTURE_BRAND_CONSISTENCY_GATE = "VentureBrandConsistencyGate" as const;
export const VENTURE_BRAND_COMPLETENESS_GATE = "VentureBrandCompletenessGate" as const;
export const BRAND_IDENTITY_DISCOVERABILITY_GATE = "BrandIdentityDiscoverabilityGate" as const;
export const APPLICATION_METADATA_IDENTITY_GATE = "ApplicationMetadataIdentityGate" as const;

export const VENTURE_BRAND_IDENTITY_PRINCIPLE =
  "EVERY PUBLIC VENTURE MUST HAVE A COMPLETE, VENTURE-SPECIFIC VISUAL IDENTITY BEFORE FINAL PRODUCTION-QUALITY PASS. THIS INCLUDES A VENTURE NAME, A LOGO OR VISUAL BRAND MARK, A BROWSER-TAB FAVICON, CONSISTENT COLOR/TYPOGRAPHY TREATMENT, AND METADATA THAT USES THE VENTURE IDENTITY. FAVICON != LOGO. LOGO != FAVICON. A FRAMEWORK DEFAULT ICON IS NOT ACCEPTABLE. PLAIN TEXT ALONE DOES NOT AUTOMATICALLY COUNT AS A COMPLETE LOGO SYSTEM. SOURCE ASSET EXISTS != RENDERED BRAND IDENTITY WORKS. A VENTURE CANNOT RECEIVE FINAL PRODUCTION-QUALITY PASS IF ITS BRAND IDENTITY IS MISSING, GENERIC, BROKEN, OR INCONSISTENT." as const;

export const VENTURE_LOGO_TYPES = [
  "WORDMARK_ONLY",
  "MARK_PLUS_WORDMARK",
  "SYMBOL_MARK",
  "MONOGRAM",
  "COMBINATION_MARK",
] as const;
export type VentureLogoType = (typeof VENTURE_LOGO_TYPES)[number];

export const VENTURE_BRAND_STATUSES = ["COMPLETE", "PARTIAL", "MISSING", "GENERIC", "BROKEN"] as const;
export type VentureBrandStatus = (typeof VENTURE_BRAND_STATUSES)[number];

export const VENTURE_BRAND_VERIFICATION_STATUSES = ["UNVERIFIED", "SOURCE_PASS", "LIVE_PASS", "FOUNDER_CONTRADICTION"] as const;
export type VentureBrandVerificationStatus = (typeof VENTURE_BRAND_VERIFICATION_STATUSES)[number];

export const VENTURE_BRAND_ARCHETYPES = [
  "saas",
  "ecommerce",
  "merch",
  "creator_media",
  "youtube_channel",
  "newsletter",
  "marketplace",
  "lead_gen",
  "service",
  "utility",
  "digital_product",
] as const;
export type VentureBrandArchetype = (typeof VENTURE_BRAND_ARCHETYPES)[number];

export type VentureBrandIdentityContract = {
  contract: typeof VENTURE_BRAND_IDENTITY_CONTRACT;
  venture_id: string;
  venture_name: string;
  brand_name: string;
  logo_type: VentureLogoType;
  logo_asset: string;
  logo_mark_asset: string;
  wordmark_asset: string;
  favicon_asset: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  light_variant: string;
  dark_variant: string;
  metadata_title: string;
  metadata_description: string;
  brand_status: VentureBrandStatus;
  verification_status: VentureBrandVerificationStatus;
  archetype?: VentureBrandArchetype;
};

export type NamedBrandGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export function factoryRequiresVentureBrandIdentityContract(): true {
  return true;
}

export function factoryMissingLogoAllowsProductionPass(): false {
  return false;
}

export function factoryMissingFaviconAllowsProductionPass(): false {
  return false;
}

export function factoryTextOnlyPlaceholderCountsAsCompleteLogo(): false {
  return false;
}

export function factoryFrameworkDefaultBrandingAllowed(): false {
  return false;
}

export function factoryForcesOneLogoStyleAcrossArchetypes(): false {
  return false;
}

export function futureVenturesInheritBrandQc(): true {
  return true;
}
