export const ASSET_TYPES = [
  "domain",
  "brand",
  "website",
  "ecommerce_store",
  "saas_application",
  "mobile_application",
  "api",
  "database",
  "dataset",
  "ai_model",
  "ai_worker",
  "automation",
  "content_library",
  "article",
  "video",
  "image_library",
  "newsletter",
  "email_list",
  "social_account",
  "community",
  "marketplace",
  "directory",
  "course",
  "book",
  "intellectual_property",
  "patent",
  "trademark",
  "customer_list",
  "ad_account",
  "analytics_property",
  "crm",
  "codebase",
  "infrastructure",
  "legal_entity",
  "contract",
  "partnership",
  "acquisition",
  "other",
] as const;

export const ASSET_STATUSES = [
  "planned",
  "building",
  "active",
  "paused",
  "under_review",
  "for_sale",
  "sold",
  "archived",
  "retired",
  "failed",
] as const;

export const ASSET_LIFECYCLE_STAGES = [
  "proposed",
  "planned",
  "acquiring",
  "building",
  "testing",
  "launched",
  "operating",
  "optimizing",
  "scaling",
  "harvesting",
  "exiting",
  "archived",
  "retired",
] as const;

export const ASSET_OWNERSHIP_TYPES = [
  "owned",
  "licensed",
  "leased",
  "partnered",
  "managed",
  "acquired",
  "external",
] as const;

export const ASSET_RELATIONSHIP_TYPES = [
  "owns",
  "depends_on",
  "powers",
  "publishes_to",
  "distributes",
  "redirects_to",
  "links_to",
  "shares_audience_with",
  "shares_data_with",
  "supports",
  "bundles_with",
  "derived_from",
  "replaces",
  "licensed_to",
  "monetizes",
  "promotes",
  "deployed_on",
  "managed_by",
  "related_to",
] as const;

export const ASSET_VALUATION_TYPES = [
  "projected",
  "internal",
  "verified",
  "market_comparable",
  "income_based",
  "cost_based",
  "strategic",
  "liquidation",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];
export type AssetStatus = (typeof ASSET_STATUSES)[number];
export type AssetLifecycleStage = (typeof ASSET_LIFECYCLE_STAGES)[number];
export type AssetOwnershipType = (typeof ASSET_OWNERSHIP_TYPES)[number];

export function isAssetType(value: string): value is AssetType {
  return (ASSET_TYPES as readonly string[]).includes(value);
}

export function isAssetStatus(value: string): value is AssetStatus {
  return (ASSET_STATUSES as readonly string[]).includes(value);
}

export function isAssetLifecycleStage(value: string): value is AssetLifecycleStage {
  return (ASSET_LIFECYCLE_STAGES as readonly string[]).includes(value);
}

export function isAssetOwnershipType(value: string): value is AssetOwnershipType {
  return (ASSET_OWNERSHIP_TYPES as readonly string[]).includes(value);
}
