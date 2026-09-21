import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  VENTURE_SYSTEM_IDS,
  VENTURE_SYSTEM_INVENTORY_CONTRACT,
  type VentureArchetype,
  type VentureSystemId,
  type VentureSystemInventory,
  type VentureSystemInventoryEntry,
} from "./contract";

export type VentureCapabilityProfile = {
  venture_id: string;
  archetypes: VentureArchetype[];
  public_site: boolean;
  customer_facing: boolean;
  paid: boolean;
  subscription: boolean;
  auth: boolean;
  stores_customer_work: boolean;
  analytical_results: boolean;
  exports: boolean;
  email_support: boolean;
  growth_active: boolean;
  notifications: boolean;
  server_actions: boolean;
  seo_public: boolean;
  hq_projection: boolean;
  production_paused: boolean;
};

export function occupancyNpvCapabilityProfile(): VentureCapabilityProfile {
  return {
    venture_id: CRE_VENTURE_ID,
    archetypes: ["calculator", "saas"],
    public_site: true,
    customer_facing: true,
    paid: true,
    subscription: true,
    auth: true,
    stores_customer_work: true,
    analytical_results: true,
    exports: false,
    email_support: true,
    growth_active: true,
    notifications: false,
    server_actions: false,
    seo_public: true,
    hq_projection: true,
    production_paused: false,
  };
}

export function askReviewCapabilityProfile(): VentureCapabilityProfile {
  return {
    venture_id: ASKREVIEW_VENTURE_ID,
    archetypes: ["saas"],
    public_site: false,
    customer_facing: false,
    paid: false,
    subscription: false,
    auth: true,
    stores_customer_work: false,
    analytical_results: false,
    exports: false,
    email_support: false,
    growth_active: false,
    notifications: false,
    server_actions: false,
    seo_public: false,
    hq_projection: true,
    production_paused: true,
  };
}

export function hqCapabilityProfile(ventureId = "infinity:hq"): VentureCapabilityProfile {
  return {
    venture_id: ventureId,
    archetypes: ["founder_hq"],
    public_site: false,
    customer_facing: false,
    paid: false,
    subscription: false,
    auth: false,
    stores_customer_work: false,
    analytical_results: false,
    exports: false,
    email_support: false,
    growth_active: false,
    notifications: false,
    server_actions: false,
    seo_public: false,
    hq_projection: true,
    production_paused: false,
  };
}

export function capabilityProfileForVenture(ventureId: string): VentureCapabilityProfile {
  if (ventureId === CRE_VENTURE_ID) return occupancyNpvCapabilityProfile();
  if (ventureId === ASKREVIEW_VENTURE_ID) return askReviewCapabilityProfile();
  if (ventureId === "infinity:hq") return hqCapabilityProfile();
  return {
    venture_id: ventureId,
    archetypes: ["saas"],
    public_site: true,
    customer_facing: true,
    paid: true,
    subscription: true,
    auth: true,
    stores_customer_work: true,
    analytical_results: false,
    exports: false,
    email_support: true,
    growth_active: false,
    notifications: false,
    server_actions: true,
    seo_public: true,
    hq_projection: true,
    production_paused: false,
  };
}

function applicable(
  profile: VentureCapabilityProfile,
  systemId: VentureSystemId,
): { applicability: "APPLICABLE" | "NOT_APPLICABLE"; material: boolean; na_reason?: string } {
  if (profile.production_paused && systemId !== "ADMIN_HQ_PROJECTION") {
    return { applicability: "NOT_APPLICABLE", material: false, na_reason: "PRODUCTION_PAUSED" };
  }
  switch (systemId) {
    case "PUBLIC_SITE":
    case "NAVIGATION":
    case "SEO":
    case "LEGAL":
    case "PRIVACY":
    case "DOMAIN":
    case "DNS":
    case "SSL":
    case "PRODUCTION_DEPLOYMENT":
    case "DESIGN_QUALITY":
      return profile.public_site || profile.customer_facing
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: profile.archetypes.includes("founder_hq") ? "NOT_APPLICABLE" : "APPLICABLE", material: profile.customer_facing, na_reason: profile.archetypes.includes("founder_hq") ? "FOUNDER_HQ_NOT_PUBLIC_SITE" : undefined };
    case "PRODUCT_WORKFLOW":
      return { applicability: "APPLICABLE", material: true };
    case "AUTH":
    case "ACCOUNT":
      return profile.auth
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NO_CUSTOMER_AUTH" };
    case "PAYMENT":
    case "CHECKOUT":
    case "FULFILLMENT":
      return profile.paid
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NOT_PAID_VENTURE" };
    case "SUBSCRIPTION":
      return profile.subscription
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NO_SUBSCRIPTION_OFFER" };
    case "COMMERCIAL_OFFER":
      return profile.paid
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NOT_PAID_VENTURE" };
    case "EMAIL":
    case "CUSTOMER_SUPPORT":
      return profile.email_support
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NO_CUSTOMER_EMAIL_SUPPORT" };
    case "IMPROVEMENT_INTAKE":
      return profile.customer_facing
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NOT_CUSTOMER_FACING" };
    case "ANALYTICS":
    case "PERFORMANCE":
      return { applicability: "APPLICABLE", material: true };
    case "GROWTH":
    case "GROWTH_GMAIL":
    case "GROWTH_GEMINI":
    case "GROWTH_DURABLE_QUEUE":
    case "GROWTH_REPLY_HANDLING":
      return profile.growth_active
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "GROWTH_NOT_ACTIVE" };
    case "ACCESSIBILITY":
    case "MOBILE":
    case "RESPONSIVE":
    case "ERROR_HANDLING":
    case "NETWORK":
    case "CONSOLE":
    case "API":
      return { applicability: "APPLICABLE", material: true };
    case "SERVER_ACTIONS":
      return profile.server_actions
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NO_MATERIAL_SERVER_ACTIONS_API_ROUTES_ONLY" };
    case "DATA_PERSISTENCE":
    case "CUSTOMER_HISTORY":
      return profile.stores_customer_work
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NO_CUSTOMER_WORK_STORE" };
    case "RESULTS":
      return profile.analytical_results
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NOT_ANALYTICAL_PRODUCT" };
    case "EXPORTS":
      return profile.exports
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NO_EXPORT_CAPABILITY" };
    case "NOTIFICATIONS":
      return profile.notifications
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NO_CUSTOMER_NOTIFICATIONS" };
    case "CUSTOMER_PAGE_DEPTH":
      return profile.customer_facing
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NOT_CUSTOMER_FACING" };
    case "ADMIN_HQ_PROJECTION":
      return profile.hq_projection
        ? { applicability: "APPLICABLE", material: true }
        : { applicability: "NOT_APPLICABLE", material: false, na_reason: "NO_HQ_PROJECTION" };
    default:
      return { applicability: "APPLICABLE", material: true };
  }
}

const SURFACES: Record<VentureSystemId, string[]> = {
  PUBLIC_SITE: ["homepage", "public_nav"],
  NAVIGATION: ["header", "footer", "account", "cta"],
  PRODUCT_WORKFLOW: ["primary_product"],
  AUTH: ["login", "logout", "session"],
  ACCOUNT: ["account_home", "protected_route"],
  PAYMENT: ["checkout_session", "provider_path"],
  CHECKOUT: ["pricing_cta", "checkout_entry", "return_url"],
  SUBSCRIPTION: ["professional_offer"],
  COMMERCIAL_OFFER: ["primary_offer_surface", "offer_cta", "offer_disclosure", "offer_journey"],
  FULFILLMENT: ["entitlement", "delivery", "recovery"],
  EMAIL: ["inbound", "reply"],
  CUSTOMER_SUPPORT: ["support_path"],
  IMPROVEMENT_INTAKE: ["suggest_an_improvement", "intake_form"],
  ANALYTICS: ["performance_events"],
  GROWTH: ["campaign", "prospects", "queue"],
  GROWTH_GMAIL: ["gmail_provider"],
  GROWTH_GEMINI: ["gemini_provider"],
  GROWTH_DURABLE_QUEUE: ["durable_outreach_queue"],
  GROWTH_REPLY_HANDLING: ["reply_ingest"],
  SEO: ["title", "description", "canonical", "robots", "sitemap"],
  LEGAL: ["privacy", "terms", "sitemap", "infinity_os", "imr"],
  PRIVACY: ["privacy_policy"],
  ACCESSIBILITY: ["keyboard", "labels", "headings", "focus"],
  MOBILE: ["mobile_viewport"],
  RESPONSIVE: ["desktop", "mobile"],
  PERFORMANCE: ["page_load", "api_latency"],
  ERROR_HANDLING: ["controlled_failure"],
  NETWORK: ["critical_requests"],
  CONSOLE: ["browser_console"],
  API: ["product_api"],
  SERVER_ACTIONS: ["server_actions"],
  DATA_PERSISTENCE: ["create", "save", "retrieve", "update"],
  CUSTOMER_HISTORY: ["return_later", "account_isolation"],
  RESULTS: ["structured_result"],
  EXPORTS: ["export_action"],
  NOTIFICATIONS: ["customer_notification"],
  ADMIN_HQ_PROJECTION: ["hq_venture_detail"],
  DOMAIN: ["canonical_domain"],
  DNS: ["domain_resolves"],
  SSL: ["https_certificate"],
  PRODUCTION_DEPLOYMENT: ["live_alias"],
  DESIGN_QUALITY: ["hierarchy", "spacing", "brand"],
  CUSTOMER_PAGE_DEPTH: ["question_coverage", "decision_support", "product_understanding", "information_gain"],
};

const WORKFLOWS: Record<VentureSystemId, string[]> = {
  PUBLIC_SITE: ["visitor_lands"],
  NAVIGATION: ["follow_every_visible_control"],
  PRODUCT_WORKFLOW: ["complete_primary_job"],
  AUTH: ["signup_login_logout_session"],
  ACCOUNT: ["return_to_protected_work"],
  PAYMENT: ["live_money_path"],
  CHECKOUT: ["pricing_to_checkout"],
  SUBSCRIPTION: ["professional_subscribe"],
  COMMERCIAL_OFFER: ["offer_to_conversion", "offer_measurement"],
  FULFILLMENT: ["paid_to_entitlement"],
  EMAIL: ["inbound_to_persistence"],
  CUSTOMER_SUPPORT: ["customer_reaches_support"],
  IMPROVEMENT_INTAKE: ["suggest_submit_ingest_hq"],
  ANALYTICS: ["ingest_real_events"],
  GROWTH: ["source_qualify_send_follow_up"],
  GROWTH_GMAIL: ["authorized_send"],
  GROWTH_GEMINI: ["qualification_or_draft"],
  GROWTH_DURABLE_QUEUE: ["queue_survives_restart"],
  GROWTH_REPLY_HANDLING: ["reply_classifies"],
  SEO: ["public_indexability"],
  LEGAL: ["footer_trust"],
  PRIVACY: ["privacy_reachable"],
  ACCESSIBILITY: ["keyboard_complete_material_flow"],
  MOBILE: ["primary_cta_reachable"],
  RESPONSIVE: ["no_clip_overflow"],
  PERFORMANCE: ["material_latency"],
  ERROR_HANDLING: ["no_raw_stack"],
  NETWORK: ["required_requests_succeed"],
  CONSOLE: ["no_material_runtime_error"],
  API: ["product_api_responds"],
  SERVER_ACTIONS: ["actions_succeed"],
  DATA_PERSISTENCE: ["create_save_retrieve_update"],
  CUSTOMER_HISTORY: ["historical_work_returns"],
  RESULTS: ["interpretable_actionable"],
  EXPORTS: ["export_produces_artifact"],
  NOTIFICATIONS: ["customer_notified"],
  ADMIN_HQ_PROJECTION: ["hq_shows_current_state"],
  DOMAIN: ["canonical_host"],
  DNS: ["resolves"],
  SSL: ["valid_https"],
  PRODUCTION_DEPLOYMENT: ["live_serves_canonical_artifact"],
  DESIGN_QUALITY: ["production_presentation"],
  CUSTOMER_PAGE_DEPTH: ["page_depth_against_user_intent"],
};

export function buildVentureSystemInventory(profile: VentureCapabilityProfile): VentureSystemInventory {
  const entries: VentureSystemInventoryEntry[] = VENTURE_SYSTEM_IDS.map((system_id) => {
    const row = applicable(profile, system_id);
    return {
      system_id,
      venture_id: profile.venture_id,
      applicability: row.applicability,
      material: row.material && row.applicability === "APPLICABLE",
      required_surfaces: row.applicability === "APPLICABLE" ? [...SURFACES[system_id]] : [],
      required_workflows: row.applicability === "APPLICABLE" ? [...WORKFLOWS[system_id]] : [],
      na_reason: row.na_reason,
    };
  });
  return {
    contract: VENTURE_SYSTEM_INVENTORY_CONTRACT,
    venture_id: profile.venture_id,
    archetype: profile.archetypes,
    entries,
  };
}

export function templatesAreArchetypesNotFixedLayouts(): true {
  return true;
}
