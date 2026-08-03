export const VENTURE_FACTORY_ENGINE_NAME = "venture_factory";

export const VENTURE_BLUEPRINT_SCHEMA_VERSION = "venture_blueprint_v1";

export const VENTURE_BLUEPRINT_TEMPLATE_VERSION = "1.0.0";

export const VENTURE_BLUEPRINT_STATUSES = ["draft", "validated", "archived"] as const;

export type VentureBlueprintStatus = (typeof VENTURE_BLUEPRINT_STATUSES)[number];

export const VENTURE_TEMPLATE_TYPES = [
  "saas",
  "affiliate_site",
  "media_brand",
  "content_website",
  "lead_generation_website",
  "local_service_business",
  "ecommerce",
  "digital_product",
  "agency",
  "marketplace",
] as const;

export type VentureTemplateType = (typeof VENTURE_TEMPLATE_TYPES)[number];
