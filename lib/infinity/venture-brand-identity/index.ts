export {
  VENTURE_BRAND_IDENTITY_CONTRACT,
  APPLICATION_METADATA_IDENTITY_GATE,
  VENTURE_LOGO_GATE,
  VENTURE_BRAND_CONSISTENCY_GATE,
  VENTURE_BRAND_COMPLETENESS_GATE,
  BRAND_IDENTITY_DISCOVERABILITY_GATE,
  VENTURE_BRAND_IDENTITY_PRINCIPLE,
  VENTURE_LOGO_TYPES,
  factoryRequiresVentureBrandIdentityContract,
  factoryMissingLogoAllowsProductionPass,
  factoryMissingFaviconAllowsProductionPass,
  factoryTextOnlyPlaceholderCountsAsCompleteLogo,
  factoryFrameworkDefaultBrandingAllowed,
  factoryForcesOneLogoStyleAcrossArchetypes,
  futureVenturesInheritBrandQc,
} from "./contract";
export type { VentureBrandIdentityContract, VentureLogoType, NamedBrandGate } from "./contract";
export {
  occupancynpvCompactMarkSvg,
  occupancynpvPrimaryLogoSvg,
  OCCUPANCYNPV_COMPACT_MARK_LIGHT,
  OCCUPANCYNPV_COMPACT_MARK_DARK,
  applyOccupancynpvBrandCss,
} from "./logo";
export { occupancynpvBrandIdentityContract, occupancynpvPublicHeaderBrandMarkup, occupancynpvAppHeaderBrandMarkup } from "./occupancynpv";
export {
  evaluateVentureLogoGate,
  evaluateVentureBrandConsistencyGate,
  evaluateVentureBrandCompletenessGate,
  evaluateBrandIdentityDiscoverabilityGate,
  evaluatePublicVentureBrandBundle,
  missingBrandBlocksFullProductionPass,
} from "./gates";
export { applyOccupancynpvBrandIdentityToFiles, applyOccupancynpvLayoutMetadata } from "./apply";
export { evaluateApplicationMetadataIdentityGate } from "./metadata-gate";
export { evaluateOccupancynpvHqBrandInventory } from "./hq";
export { evaluateOccupancynpvBrandIdentityQc, occupancynpvComposedBrandEvidence } from "./evaluate";
export { factoryVentureBrandIdentityPlan, FACTORY_INHERITED_BRAND_QC } from "./factory";
