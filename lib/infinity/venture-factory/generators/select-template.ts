import { createHash } from "node:crypto";
import type { VentureTemplateType } from "../constants";
import { isSupportedVentureTemplateType } from "../registry/template-registry";
import type { ApprovedOpportunityInput } from "../types/opportunity-input";

const BUILDER_TO_TEMPLATE: Record<string, VentureTemplateType> = {
  saas: "saas",
  ecommerce: "ecommerce",
  marketplace: "marketplace",
  affiliate: "affiliate_site",
  media: "media_brand",
  directory: "content_website",
  course: "digital_product",
  community: "media_brand",
  newsletter: "content_website",
  mobile_app: "saas",
  ai_tool: "saas",
  browser_extension: "digital_product",
  local_service: "local_service_business",
  custom: "content_website",
};

const CATEGORY_TO_TEMPLATE: Record<string, VentureTemplateType> = {
  lead_gen: "lead_generation_website",
  lead_generation: "lead_generation_website",
  agency: "agency",
  services: "agency",
  product_demand: "saas",
  market_signal: "content_website",
};

export function selectVentureBlueprintTemplate(
  opportunity: ApprovedOpportunityInput,
  override?: string | null,
): VentureTemplateType {
  if (override && isSupportedVentureTemplateType(override)) {
    return override;
  }

  const model = opportunity.businessModel?.trim().toLowerCase();
  if (model === "affiliate") return "affiliate_site";
  if (model === "subscription" || model === "saas") return "saas";
  if (model === "ecommerce") return "ecommerce";
  if (model === "marketplace") return "marketplace";
  if (model === "services" || model === "agency") return "agency";
  if (model === "lead_gen") return "lead_generation_website";

  const category = opportunity.category?.trim().toLowerCase();
  if (category && CATEGORY_TO_TEMPLATE[category]) {
    return CATEGORY_TO_TEMPLATE[category];
  }

  const builder = opportunity.recommendedBuilder?.trim().toLowerCase();
  if (builder && builder !== "custom" && BUILDER_TO_TEMPLATE[builder]) {
    return BUILDER_TO_TEMPLATE[builder];
  }

  const industry = opportunity.industry?.trim().toLowerCase();
  if (industry?.includes("local")) return "local_service_business";

  if (builder === "custom") {
    return "content_website";
  }

  return deterministicFallbackTemplate(opportunity);
}

function deterministicFallbackTemplate(opportunity: ApprovedOpportunityInput): VentureTemplateType {
  const hash = createHash("sha256")
    .update(`${opportunity.organizationId}:${opportunity.id}:${opportunity.name}`)
    .digest("hex");
  const index = parseInt(hash.slice(0, 8), 16) % 10;
  const fallbacks: VentureTemplateType[] = [
    "content_website",
    "saas",
    "lead_generation_website",
    "digital_product",
    "affiliate_site",
    "media_brand",
    "ecommerce",
    "agency",
    "local_service_business",
    "marketplace",
  ];
  return fallbacks[index] ?? "content_website";
}

export function buildBlueprintId(
  organizationId: string,
  opportunityId: string,
  ventureType: VentureTemplateType,
): string {
  return createHash("sha256")
    .update(`${organizationId}:${opportunityId}:${ventureType}:venture_blueprint_v1`)
    .digest("hex")
    .slice(0, 32);
}

export function buildBlueprintIdempotencyKey(opportunityId: string): string {
  return `venture-blueprint:${opportunityId}:venture_blueprint_v1`;
}
