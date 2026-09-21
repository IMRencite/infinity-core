import {
  BRAND_IDENTITY_DISCOVERABILITY_GATE,
  VENTURE_BRAND_ARCHETYPES,
  VENTURE_BRAND_COMPLETENESS_GATE,
  VENTURE_BRAND_CONSISTENCY_GATE,
  VENTURE_BRAND_IDENTITY_CONTRACT,
  VENTURE_LOGO_GATE,
  VENTURE_LOGO_TYPES,
  factoryForcesOneLogoStyleAcrossArchetypes,
  factoryFrameworkDefaultBrandingAllowed,
  factoryMissingFaviconAllowsProductionPass,
  factoryMissingLogoAllowsProductionPass,
  factoryRequiresVentureBrandIdentityContract,
  factoryTextOnlyPlaceholderCountsAsCompleteLogo,
  futureVenturesInheritBrandQc,
  type VentureBrandArchetype,
} from "./contract";

export const FACTORY_INHERITED_BRAND_QC = [
  VENTURE_BRAND_IDENTITY_CONTRACT,
  VENTURE_LOGO_GATE,
  "VentureFaviconGate",
  VENTURE_BRAND_CONSISTENCY_GATE,
  VENTURE_BRAND_COMPLETENESS_GATE,
  BRAND_IDENTITY_DISCOVERABILITY_GATE,
  "ApplicationMetadataIdentityGate",
] as const;

export function factoryVentureBrandIdentityPlan(input: {
  venture_id: string;
  venture_name: string;
  archetype?: VentureBrandArchetype | string;
}): {
  contract: typeof VENTURE_BRAND_IDENTITY_CONTRACT;
  required_before_production_pass: true;
  venture_id: string;
  venture_name: string;
  logo_required: true;
  favicon_required: true;
  metadata_identity_required: true;
  placeholder_branding_allowed: false;
  framework_default_allowed: false;
  text_only_placeholder_counts_as_complete: false;
  missing_logo_allows_full_pass: false;
  missing_favicon_allows_full_pass: false;
  force_one_logo_style: false;
  allowed_logo_types: typeof VENTURE_LOGO_TYPES;
  allowed_archetypes: typeof VENTURE_BRAND_ARCHETYPES;
  inherited_gates: typeof FACTORY_INHERITED_BRAND_QC;
  future_ventures_inherit: true;
  archetype: string;
} {
  return {
    contract: VENTURE_BRAND_IDENTITY_CONTRACT,
    required_before_production_pass: factoryRequiresVentureBrandIdentityContract(),
    venture_id: input.venture_id,
    venture_name: input.venture_name,
    logo_required: true,
    favicon_required: true,
    metadata_identity_required: true,
    placeholder_branding_allowed: factoryTextOnlyPlaceholderCountsAsCompleteLogo(),
    framework_default_allowed: factoryFrameworkDefaultBrandingAllowed(),
    text_only_placeholder_counts_as_complete: factoryTextOnlyPlaceholderCountsAsCompleteLogo(),
    missing_logo_allows_full_pass: factoryMissingLogoAllowsProductionPass(),
    missing_favicon_allows_full_pass: factoryMissingFaviconAllowsProductionPass(),
    force_one_logo_style: factoryForcesOneLogoStyleAcrossArchetypes(),
    allowed_logo_types: VENTURE_LOGO_TYPES,
    allowed_archetypes: VENTURE_BRAND_ARCHETYPES,
    inherited_gates: FACTORY_INHERITED_BRAND_QC,
    future_ventures_inherit: futureVenturesInheritBrandQc(),
    archetype: input.archetype ?? "saas",
  };
}
