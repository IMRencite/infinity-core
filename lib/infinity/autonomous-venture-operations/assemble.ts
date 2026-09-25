import type {
  CommunicationProfile,
  PhysicalCommerceProfile,
  ProspectingMandate,
  ProspectingMode,
  VentureDomainProfile,
  VentureOperatingBundle,
} from "./types";
import { evaluateAutonomousDeployableDependencyCheck } from "@/lib/infinity/organic-growth-engine/continuous/destination-source-pack";

export function evaluateAssemblerDeployableDependencies(cwd = process.cwd()) {
  return evaluateAutonomousDeployableDependencyCheck(cwd);
}

export function classifyDomainAcquisition(input: {
  already_owned: boolean;
  premium?: boolean;
  aftermarket?: boolean;
  trademark_uncertain?: boolean;
  unusual_price?: boolean;
}): VentureDomainProfile["acquisition_path"] {
  if (input.already_owned) return "ALREADY_OWNED";
  if (input.trademark_uncertain) return "BLOCK";
  if (input.premium || input.aftermarket || input.unusual_price) return "FOUNDER_AUTH_REQUIRED";
  return "AUTO_PURCHASE";
}

export function assembleVentureDomainProfile(input: {
  venture_id: string;
  canonical_host: string;
  already_owned: boolean;
  premium?: boolean;
  aftermarket?: boolean;
  trademark_uncertain?: boolean;
  unusual_price?: boolean;
}): VentureDomainProfile {
  const acquisition_path = classifyDomainAcquisition(input);
  return {
    venture_id: input.venture_id,
    canonical_host: input.canonical_host.replace(/^www\./, ""),
    www_policy: "PERMANENT_REDIRECT_TO_APEX",
    acquisition_path,
    registrar: "CLOUDFLARE",
    purchase_another_domain: acquisition_path !== "ALREADY_OWNED",
  };
}

export function assembleCommunicationProfile(input: {
  venture_id: string;
  sender_name: string;
  brand_voice: string;
  offer_context: string;
  pricing_context: string;
  sales_policy: string;
  support_policy: string;
  prospecting_policy: string;
  commerce_notification_policy: string;
  modes: CommunicationProfile["modes"];
  authorized_sender_identity?: string | null;
}): CommunicationProfile {
  const authorized = Boolean(input.authorized_sender_identity);
  return {
    venture_id: input.venture_id,
    enabled: true,
    provider: "CANONICAL_COMMUNICATION",
    sender_mode: authorized ? "PROVIDER_AUTHORIZED" : "UNAUTHORIZED_SENDER",
    sender_name: input.sender_name,
    authorized_sender_identity: input.authorized_sender_identity ?? null,
    sender_authorization: authorized ? "PROVIDER_AUTHORIZED" : "UNAUTHORIZED",
    reply_to: input.authorized_sender_identity ?? null,
    support_identity: input.authorized_sender_identity ?? null,
    transactional_identity: input.authorized_sender_identity ?? null,
    brand_voice: input.brand_voice,
    offer_context: input.offer_context,
    pricing_context: input.pricing_context,
    sales_policy: input.sales_policy,
    support_policy: input.support_policy,
    prospecting_policy: input.prospecting_policy,
    commerce_notification_policy: input.commerce_notification_policy,
    suppression_policy: "no fabricated urgency; honor unsubscribes; no unauthorized sender",
    modes: input.modes,
    engine: "CANONICAL_COMMUNICATION",
  };
}

export function communicationProfileReadiness(profile: CommunicationProfile): {
  profile_ready: boolean;
  sender_authorized: boolean;
  state: "PROFILE_READY" | "PROFILE_INCOMPLETE";
  sender: "SENDER_AUTHORIZED" | "SENDER_UNAUTHORIZED";
} {
  const profile_ready = profile.enabled && profile.engine === "CANONICAL_COMMUNICATION" && Boolean(profile.sender_name);
  const sender_authorized = profile.sender_authorization === "PROVIDER_AUTHORIZED" && Boolean(profile.authorized_sender_identity);
  return {
    profile_ready,
    sender_authorized,
    state: profile_ready ? "PROFILE_READY" : "PROFILE_INCOMPLETE",
    sender: sender_authorized ? "SENDER_AUTHORIZED" : "SENDER_UNAUTHORIZED",
  };
}

export function assembleProspectingMandate(input: {
  venture_id: string;
  mode: ProspectingMode;
  minimum_eligible_inventory?: number;
  desired_inventory?: number;
  replenishment_threshold?: number;
}): ProspectingMandate {
  const outbound = input.mode !== "NONE" && input.mode !== "B2C_AUDIENCE_ACQUISITION";
  return {
    venture_id: input.venture_id,
    mode: input.mode,
    minimum_eligible_inventory: input.minimum_eligible_inventory ?? (outbound ? 10 : 0),
    desired_inventory: input.desired_inventory ?? (outbound ? 25 : 0),
    replenishment_threshold: input.replenishment_threshold ?? (outbound ? 10 : 0),
    source_policy: outbound ? "ALWAYS_ON_REPLENISH_INCLUDING_PERSON_DISCOVERY" : "NONE",
  };
}

export function assemblePhysicalCommerceProfile(input: {
  venture_id: string;
  commerce_enabled: boolean;
}): PhysicalCommerceProfile {
  return {
    venture_id: input.venture_id,
    venture_type: input.commerce_enabled ? "LIFESTYLE_POD_COMMERCE" : "NONE",
    commerce_enabled: input.commerce_enabled,
    operating_mode: input.commerce_enabled ? "LAUNCH" : "NONE",
    model: input.commerce_enabled ? "PRINT_ON_DEMAND" : "NONE",
    primary_provider: input.commerce_enabled ? "GELATO" : "NONE",
    secondary_provider: input.commerce_enabled ? "GOOTEN" : "NONE",
    storefront: input.commerce_enabled ? "INFINITY_FIRST_PARTY" : "NONE",
    social_posting: "NOT_IN_SCOPE",
    live_paid_orders: false,
  };
}

export function assembleOccupancyNpvOperatingBundle(): VentureOperatingBundle {
  return {
    venture_id: "occupancynpv",
    public_name: "OccupancyNPV",
    venture_type: "B2B_SAAS",
    relationship: "An Infinity OS Venture | By IMR",
    brand: "OccupancyNPV",
    domain: assembleVentureDomainProfile({
      venture_id: "occupancynpv",
      canonical_host: "occupancynpv.com",
      already_owned: true,
    }),
    communication: assembleCommunicationProfile({
      venture_id: "occupancynpv",
      sender_name: "OccupancyNPV",
      brand_voice: "consultative_b2b_lease",
      offer_context: "commercial_lease_comparison",
      pricing_context: "software_subscription_not_quoted_in_cold_email",
      sales_policy: "B2B lease comparison; no consumer cold email",
      support_policy: "product and lease-model questions only",
      prospecting_policy: "B2B_PROSPECTING with person discovery after organization acquisition",
      commerce_notification_policy: "none",
      modes: {
        b2b_prospecting: true,
        sales: true,
        support: true,
        transactional: false,
        commerce_notifications: false,
      },
    }),
    prospecting: assembleProspectingMandate({
      venture_id: "occupancynpv",
      mode: "B2B_PROSPECTING",
      minimum_eligible_inventory: 10,
      desired_inventory: 25,
      replenishment_threshold: 10,
    }),
    commerce: assemblePhysicalCommerceProfile({ venture_id: "occupancynpv", commerce_enabled: false }),
    page_quality: {
      route_exists_is_not_complete: true,
      thin_shell_blocks_live: true,
      customer_copy_only: true,
      rendered_qc_required: true,
    },
    organic: {
      venture_id: "occupancynpv",
      enabled: true,
      brand_truth_required: true,
      daily_blog_target: 1,
      continuous_publishing: "BLOCKED",
      content_quality_framework: "content-quality-framework-v2",
      coverage_plan_required: true,
      comments_community: "NOT_IN_SCOPE",
      blog_required: true,
      empty_blog_can_launch: false,
      live_production_verification_required: true,
      carousel_geometry_gate: true,
      wide_desktop_render_gate: true,
      content_surface_public_label: "Blog",
    },
  };
}

export function assembleClubThrottleOperatingBundle(): VentureOperatingBundle {
  return {
    venture_id: "club-throttle",
    public_name: "Club Throttle",
    venture_type: "LIFESTYLE_POD_COMMERCE",
    relationship: "An Infinity OS Venture | By IMR",
    brand: "Club Throttle",
    brand_system: "BrandProfile",
    domain: assembleVentureDomainProfile({
      venture_id: "club-throttle",
      canonical_host: "clubthrottle.com",
      already_owned: true,
    }),
    communication: assembleCommunicationProfile({
      venture_id: "club-throttle",
      sender_name: "Club Throttle",
      brand_voice: "lifestyle_rider",
      offer_context: "print_on_demand_rider_apparel",
      pricing_context: "printed_after_payment_no_invented_ship_dates",
      sales_policy: "no consumer cold email; no unauthorized clubthrottle.com sender",
      support_policy: "product and design questions; no invented mailbox",
      prospecting_policy: "NONE until creator/dealer/partnership evidence exists",
      commerce_notification_policy: "order_shipping_refund_required_before_REAL_PAID_COMMERCE_READY",
      modes: {
        b2b_prospecting: false,
        sales: false,
        support: true,
        transactional: true,
        commerce_notifications: true,
      },
    }),
    prospecting: assembleProspectingMandate({ venture_id: "club-throttle", mode: "NONE" }),
    commerce: assemblePhysicalCommerceProfile({ venture_id: "club-throttle", commerce_enabled: true }),
    page_quality: {
      route_exists_is_not_complete: true,
      thin_shell_blocks_live: true,
      customer_copy_only: true,
      rendered_qc_required: true,
    },
    organic: {
      venture_id: "club-throttle",
      enabled: true,
      brand_truth_required: true,
      daily_blog_target: 1,
      continuous_publishing: "BLOCKED",
      content_quality_framework: "content-quality-framework-v2",
      coverage_plan_required: true,
      comments_community: "NOT_IN_SCOPE",
      blog_required: true,
      empty_blog_can_launch: false,
      live_production_verification_required: true,
      carousel_geometry_gate: true,
      wide_desktop_render_gate: true,
      content_surface_public_label: "Journal",
    },
  };
}
