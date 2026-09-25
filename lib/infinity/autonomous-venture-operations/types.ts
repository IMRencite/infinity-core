export type DomainAcquisitionPath = "ALREADY_OWNED" | "AUTO_PURCHASE" | "FOUNDER_AUTH_REQUIRED" | "BLOCK";
export type ProspectingMode =
  | "B2B_PROSPECTING"
  | "PARTNERSHIP_PROSPECTING"
  | "CREATOR_PROSPECTING"
  | "DEALER_PROSPECTING"
  | "LOCAL_BUSINESS_PROSPECTING"
  | "B2C_AUDIENCE_ACQUISITION"
  | "NONE";
export type SenderAuthorization = "UNAUTHORIZED" | "PROVIDER_AUTHORIZED";

export type VentureDomainProfile = {
  venture_id: string;
  canonical_host: string;
  www_policy: "PERMANENT_REDIRECT_TO_APEX" | "APEX_REDIRECT_TO_WWW" | "EXISTING_POLICY";
  acquisition_path: DomainAcquisitionPath;
  registrar: "CLOUDFLARE";
  purchase_another_domain: boolean;
};

export type CommunicationProfile = {
  venture_id: string;
  enabled: boolean;
  provider: "CANONICAL_COMMUNICATION";
  sender_mode: "UNAUTHORIZED_SENDER" | "PROVIDER_AUTHORIZED";
  sender_name: string;
  authorized_sender_identity: string | null;
  sender_authorization: SenderAuthorization;
  reply_to: string | null;
  support_identity: string | null;
  transactional_identity: string | null;
  brand_voice: string;
  offer_context: string;
  pricing_context: string;
  sales_policy: string;
  support_policy: string;
  prospecting_policy: string;
  commerce_notification_policy: string;
  suppression_policy: string;
  modes: {
    b2b_prospecting: boolean;
    sales: boolean;
    support: boolean;
    transactional: boolean;
    commerce_notifications: boolean;
  };
  engine: "CANONICAL_COMMUNICATION";
};

export type ProspectingMandate = {
  venture_id: string;
  mode: ProspectingMode;
  minimum_eligible_inventory: number;
  desired_inventory: number;
  replenishment_threshold: number;
  source_policy: string;
};

export type PhysicalCommerceProfile = {
  venture_id: string;
  venture_type: "LIFESTYLE_POD_COMMERCE" | "NONE";
  commerce_enabled: boolean;
  operating_mode: "LAUNCH" | "STEADY" | "NONE";
  model: "PRINT_ON_DEMAND" | "NONE";
  primary_provider: "GELATO" | "NONE";
  secondary_provider: "GOOTEN" | "NONE";
  storefront: "INFINITY_FIRST_PARTY" | "NONE";
  social_posting: "NOT_IN_SCOPE";
  live_paid_orders: false;
};

export type PageQualityContract = {
  route_exists_is_not_complete: true;
  thin_shell_blocks_live: true;
  customer_copy_only: true;
  rendered_qc_required: true;
};

export type OrganicProfile = {
  venture_id: string;
  enabled: boolean;
  brand_truth_required: true;
  daily_blog_target: number;
  continuous_publishing: "ACTIVE" | "BLOCKED";
  content_quality_framework: "content-quality-framework-v2";
  coverage_plan_required: true;
  comments_community: "NOT_IN_SCOPE";
  blog_required: true;
  empty_blog_can_launch: false;
  live_production_verification_required: true;
  carousel_geometry_gate: true;
  wide_desktop_render_gate: true;
  content_surface_public_label?: "Blog" | "Journal" | "Insights" | "Stories" | "Resources" | "Guides";
};

export type VentureOperatingBundle = {
  venture_id: string;
  public_name: string;
  venture_type: "LIFESTYLE_POD_COMMERCE" | "B2B_SAAS";
  relationship: string;
  brand: string;
  brand_system?: "BrandProfile";
  domain: VentureDomainProfile;
  communication: CommunicationProfile;
  prospecting: ProspectingMandate;
  commerce: PhysicalCommerceProfile;
  page_quality: PageQualityContract;
  organic: OrganicProfile;
};
