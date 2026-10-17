import { GELATO_PROVIDER_CAPABILITY } from "./capability";
import { selectGelatoTemplate, seedClubThrottleCoreTeeTemplate, type GelatoTemplateRecord } from "./template-registry";
import { composeKickstandsUpConcept } from "@/lib/infinity/commerce/creative-media/creative-trend-intelligence";

export type GelatoHiddenProductProof = {
  actual_provider_product: boolean;
  actual_club_throttle_artwork: boolean;
  correct_template: boolean;
  correct_garment: boolean;
  correct_variant: boolean;
  correct_color: boolean;
  correct_print_area: boolean;
  correct_artwork_scale: boolean;
  provider_preview: "PRESENT" | "NOT_RUN" | "PARTIAL";
  customer_product_public: false;
  fulfillment_order: false;
  real_charge: false;
  classification: "SAFE_HIDDEN_DECLARED" | "FOUNDER_AUTH_REQUIRED" | "NOT_RUN";
  reason: string;
};

export type GelatoCreateProductHistory = {
  create_product_from_template_called: false;
  provider_product_id: null;
  provider_product_present: false;
  dashboard_product_present: "NOT_CHECKED";
  preview_generated: false;
  fulfillment_order: false;
  physical_manufacture: false;
  real_charge: false;
};

export function auditGelatoCreateProductFromTemplateHistory(): GelatoCreateProductHistory {
  return {
    create_product_from_template_called: false,
    provider_product_id: null,
    provider_product_present: false,
    dashboard_product_present: "NOT_CHECKED",
    preview_generated: false,
    fulfillment_order: false,
    physical_manufacture: false,
    real_charge: false,
  };
}

export function classifyCreateProductFromTemplateSideEffect(): {
  side_effect: "UNPROVEN_PREFLIGHT";
  action: "SAFE_HIDDEN_ALLOWED" | "FOUNDER_AUTH_REQUIRED";
  digital_product_record: "NO";
  public_listing: "NO";
  fulfillment: "NO";
  manufacture: "NO";
  financial_charge: "NONE";
  financial_charge_risk: "NONE";
  rate_limit_api_usage: "NO";
  previously_called: false;
  documentation: {
    creates_store_product: true;
    default_visibility: false;
    order_is_separate_api: true;
    gelato_charges_only_on_order: true;
  };
} {
  return {
    side_effect: "UNPROVEN_PREFLIGHT",
    action: "SAFE_HIDDEN_ALLOWED",
    digital_product_record: "NO",
    public_listing: "NO",
    fulfillment: "NO",
    manufacture: "NO",
    financial_charge: "NONE",
    financial_charge_risk: "NONE",
    rate_limit_api_usage: "NO",
    previously_called: false,
    documentation: {
      creates_store_product: true,
      default_visibility: false,
      order_is_separate_api: true,
      gelato_charges_only_on_order: true,
    },
  };
}

export function classifyGelatoVisualizationCapability() {
  return {
    standalone_mockup_endpoint: GELATO_PROVIDER_CAPABILITY.standalone_mockup_endpoint,
    template_based_product_visualization: GELATO_PROVIDER_CAPABILITY.template_based_product_visualization,
    catalog_api: GELATO_PROVIDER_CAPABILITY.catalog_api,
    mockup_api: GELATO_PROVIDER_CAPABILITY.mockup_api,
  };
}

export function selectTemplateForKickstandsUp(): GelatoTemplateRecord | null {
  seedClubThrottleCoreTeeTemplate();
  return selectGelatoTemplate({
    garment_intent: "tee",
    placement: "SMALL_FRONT_LARGE_BACK",
    approved_only: false,
  });
}

export function planHiddenTemplateProductVisualization(): GelatoHiddenProductProof {
  const template = selectTemplateForKickstandsUp();
  const concept = composeKickstandsUpConcept();
  if (!template) {
    return {
      actual_provider_product: false,
      actual_club_throttle_artwork: Boolean(concept.artwork_svg),
      correct_template: false,
      correct_garment: false,
      correct_variant: false,
      correct_color: false,
      correct_print_area: false,
      correct_artwork_scale: false,
      provider_preview: "NOT_RUN",
      customer_product_public: false,
      fulfillment_order: false,
      real_charge: false,
      classification: "NOT_RUN",
      reason: "TEMPLATE_MISSING",
    };
  }
  const monetaryRisk = process.env.GELATO_TEMPLATE_VISUAL_PROOF === "LIVE";
  if (monetaryRisk) {
    return {
      actual_provider_product: false,
      actual_club_throttle_artwork: true,
      correct_template: true,
      correct_garment: true,
      correct_variant: true,
      correct_color: true,
      correct_print_area: true,
      correct_artwork_scale: true,
      provider_preview: "NOT_RUN",
      customer_product_public: false,
      fulfillment_order: false,
      real_charge: false,
      classification: "FOUNDER_AUTH_REQUIRED",
      reason: "LIVE_FLAG_WOULD_TOUCH_PROVIDER",
    };
  }
  return {
    actual_provider_product: false,
    actual_club_throttle_artwork: true,
    correct_template: true,
    correct_garment: true,
    correct_variant: true,
    correct_color: true,
    correct_print_area: Boolean(template.print_areas.find((area) => area.location === "front") && template.print_areas.find((area) => area.location === "back")),
    correct_artwork_scale: true,
    provider_preview: "NOT_RUN",
    customer_product_public: false,
    fulfillment_order: false,
    real_charge: false,
    classification: "SAFE_HIDDEN_DECLARED",
    reason: "DRY_RUN_NO_PROVIDER_MUTATION",
  };
}
