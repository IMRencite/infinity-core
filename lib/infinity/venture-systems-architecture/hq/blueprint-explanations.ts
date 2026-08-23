import type { ProcurementStatus, SystemFamily, TenancyStrategy } from "../constants";

export const FAMILY_LABELS: Record<SystemFamily, string> = {
  PAYMENTS: "Payments",
  CRM: "CRM",
  LEAD_CAPTURE: "Lead Capture",
  CUSTOMER_ACQUISITION: "Customer Acquisition",
  TRANSACTIONAL_EMAIL: "Transactional Email",
  MARKETING_EMAIL: "Marketing Email",
  SMS: "SMS",
  SCHEDULING: "Scheduling",
  IDENTITY_AND_ACCOUNTS: "Identity",
  AUTHORIZATION_AND_ROLES: "Accounts",
  ENTITLEMENTS: "Entitlements",
  CONTENT_AND_DISTRIBUTION: "Content",
  SEO: "SEO",
  SOCIAL_DISTRIBUTION: "Social",
  ANALYTICS: "Analytics",
  ATTRIBUTION: "Attribution",
  CUSTOMER_SUPPORT: "Support",
  CUSTOMER_SUCCESS: "Customer Success",
  REPUTATION_AND_REVIEWS: "Reviews",
  OPERATIONS: "Operations",
  COMMERCE_AND_FULFILLMENT: "Commerce",
  LEGAL_AND_COMPLIANCE: "Compliance",
  SECURITY_AND_RISK: "Security",
  LIFECYCLE_AUTOMATION: "Lifecycle",
  EXPERIMENTATION: "Experimentation",
  AFFILIATE_AND_PARTNERS: "Partners",
  LOCALIZATION: "Localization",
  HUMAN_OPERATIONS: "Human Ops",
};

export const FAMILY_PURPOSE: Record<SystemFamily, string> = {
  PAYMENTS: "Collects revenue, deposits, or payouts according to the selected payment architecture.",
  CRM: "Tracks a lead from first contact through estimate, sale, or loss.",
  LEAD_CAPTURE: "Captures inbound demand so a person or company can enter the operating stack.",
  CUSTOMER_ACQUISITION: "Models paid or outbound demand generation when that path is part of the business.",
  TRANSACTIONAL_EMAIL: "Sends required messages tied to accounts, orders, bookings, or status changes.",
  MARKETING_EMAIL: "Nurtures and re-engages customers or leads without mixing those sends into transactional mail.",
  SMS: "Delivers time-sensitive messages when the operating model needs text, not just email.",
  SCHEDULING: "Books appointments, jobs, or sessions onto a calendar the operation can actually run.",
  IDENTITY_AND_ACCOUNTS: "Creates the people and account types the product must recognize.",
  AUTHORIZATION_AND_ROLES: "Separates what each account type is allowed to see or do.",
  ENTITLEMENTS: "Connects a successful payment or plan to the product access a customer should receive.",
  CONTENT_AND_DISTRIBUTION: "Publishes and organizes the content the venture uses to attract or retain demand.",
  SEO: "Structures pages and signals so search can become a durable acquisition channel.",
  SOCIAL_DISTRIBUTION: "Places content or offers onto social channels when that distribution is in the model.",
  ANALYTICS: "Records the events needed to understand traffic, conversion, and revenue.",
  ATTRIBUTION: "Connects outcomes back to the campaigns or pages that produced them.",
  CUSTOMER_SUPPORT: "Gives customers a path to ask for help, refunds, or dispute resolution.",
  CUSTOMER_SUCCESS: "Keeps existing customers retained and expanding after the first conversion.",
  REPUTATION_AND_REVIEWS: "Collects and moderates trust signals such as reviews, ratings, or verification.",
  OPERATIONS: "Coordinates delivery work after a sale or booking is won.",
  COMMERCE_AND_FULFILLMENT: "Moves a physical or digital order from purchase through fulfillment.",
  LEGAL_AND_COMPLIANCE: "Captures required legal surfaces such as privacy, terms, and consent — not legal conclusions.",
  SECURITY_AND_RISK: "States baseline authentication, authorization, and runtime-risk requirements.",
  LIFECYCLE_AUTOMATION: "Sequences follow-up work across leads or customers after the first interaction.",
  EXPERIMENTATION: "Supports controlled tests when the growth model depends on comparing variants.",
  AFFILIATE_AND_PARTNERS: "Tracks partner or affiliate contribution when that channel is in the model.",
  LOCALIZATION: "Adapts language or region when evidence says the product must serve more than one locale.",
  HUMAN_OPERATIONS: "Accounts for people who still have to perform delivery, review, or support work.",
};

const CAPABILITY_LABELS: Record<string, string> = {
  CRM_CONTACTS: "Contacts",
  CRM_COMPANIES: "Companies",
  CRM_PIPELINE: "Sales pipeline",
  CRM_DEALS: "Deals",
  CRM_NOTES: "Notes",
  CRM_TASKS: "Tasks",
  CRM_LIFECYCLE_STAGE: "Lifecycle stage",
  CRM_LEAD_SOURCE: "Lead source",
  CRM_LEAD_SCORING: "Lead scoring",
  CRM_CUSTOM_FIELDS: "Custom fields",
  CRM_FORM_SYNC: "Form sync",
  CRM_ACTIVITY_HISTORY: "Activity history",
  TRANSACTIONAL_EMAIL: "Transactional email",
  MARKETING_EMAIL: "Marketing email",
  AUTOMATED_NURTURE: "Automated nurture",
  REACTIVATION: "Reactivation",
  SMS: "SMS",
  APPOINTMENT_REMINDERS: "Appointment reminders",
  REVIEW_REQUESTS: "Review requests",
  CUSTOMER_NOTIFICATIONS: "Customer notifications",
  PRIVACY_POLICY: "Privacy policy",
  TERMS_OF_SERVICE: "Terms of service",
  COOKIE_CONSENT: "Cookie consent",
  MARKETPLACE_TERMS: "Marketplace terms",
  SELLER_TERMS: "Seller terms",
  REFUND_POLICY: "Refund policy",
  AUTHENTICATION: "Authentication",
  AUTHORIZATION: "Authorization",
  RATE_LIMITING: "Rate limiting",
  INPUT_VALIDATION: "Input validation",
  SECRET_MANAGEMENT: "Secret management",
  FRAUD_DETECTION: "Fraud detection",
  ABUSE_PREVENTION: "Abuse prevention",
  DATA_ISOLATION: "Data isolation",
  DEPOSIT_PAYMENT: "Deposit payment",
  FINAL_PAYMENT: "Final payment",
  MARKETPLACE_PAYMENTS: "Marketplace payments",
  SELLER_ONBOARDING: "Seller onboarding",
  CONTACT_SUPPORT: "Contact support",
  SUPPORT_TICKET: "Support tickets",
  REFUND_SUPPORT: "Refund support",
  DISPUTE_SUPPORT: "Dispute support",
  ESCALATION: "Escalation",
  CUSTOMER_HISTORY: "Customer history",
  PAGE_VIEW: "Page view",
  LEAD: "Lead",
  SIGNUP: "Signup",
  CHECKOUT: "Checkout",
  PURCHASE: "Purchase",
  SUBSCRIPTION: "Subscription",
  REVENUE: "Revenue",
  CAMPAIGN_SOURCE: "Campaign source",
  UTM_ATTRIBUTION: "UTM attribution",
  SEO_LANDING_PAGE: "SEO landing page",
  CONVERSION_FUNNEL: "Conversion funnel",
  RETENTION: "Retention",
  CHURN: "Churn",
  LTV: "Lifetime value",
  CAC: "Customer acquisition cost",
  GMV: "GMV",
  TAKE_RATE: "Take rate",
  BUYER: "Buyer identity",
  SELLER: "Seller identity",
  ARTIST_IDENTITY: "Artist identity",
  COLLECTOR_IDENTITY: "Collector identity",
  CUSTOMER_ACCOUNT: "Customer account",
  ROLE_BASED_ACCESS: "Role-based access",
  ORGANIZATION_ACCOUNT: "Organization account",
  SELLER_RATINGS: "Seller ratings",
  MODERATION: "Moderation",
  FRAUD_SIGNAL: "Fraud signal",
  VERIFICATION_STATE: "Verification state",
};

export function titleCaseToken(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function businessModelDisplayLabel(businessModel: string): string {
  if (businessModel === "AMBIGUOUS") return "Model unresolved";
  const labels: Record<string, string> = {
    SAAS: "SaaS",
    MARKETPLACE: "Marketplace",
    LOCAL_SERVICE: "Local Service",
    HOME_CONTRACTOR: "Local Service",
    DIGITAL_PRODUCT: "Digital Product",
    LEAD_GENERATION: "Lead Generation",
    ECOMMERCE: "Ecommerce",
    SERVICE_PLATFORM: "Service Platform",
    CONTENT_BUSINESS: "Content Business",
  };
  return labels[businessModel] ?? titleCaseToken(businessModel);
}

export function monetizationDisplayLabel(input: {
  businessModel: string;
  paymentArchitecture: string;
  monetizationModelType?: string | null;
  hasEntitlements: boolean;
  evidenceInsufficient: boolean;
}): string {
  if (input.evidenceInsufficient || input.businessModel === "AMBIGUOUS") {
    return "Not yet resolved";
  }
  if (input.paymentArchitecture === "NO_DIRECT_PAYMENT") {
    return "No direct payment";
  }
  if (
    input.paymentArchitecture === "USAGE_BASED" ||
    input.paymentArchitecture === "USAGE_BASED_BILLING" ||
    input.paymentArchitecture === "STRIPE_USAGE_BASED_BILLING"
  ) {
    return "Usage-based";
  }
  if (input.businessModel === "SAAS") {
    return "Recurring subscription";
  }
  if (input.businessModel === "MARKETPLACE") {
    return "Marketplace commission";
  }
  if (input.businessModel === "ECOMMERCE") {
    return "One-time purchase";
  }
  if (input.businessModel === "HOME_CONTRACTOR" || input.businessModel === "LOCAL_SERVICE") {
    return "Deposit + final payment";
  }
  if (input.businessModel === "LEAD_GENERATION") {
    return "Lead capture";
  }
  if (input.businessModel === "DIGITAL_PRODUCT") {
    return "One-time purchase";
  }
  if (input.businessModel === "SERVICE_PLATFORM") {
    return "Deposit + final payment";
  }
  const source = input.monetizationModelType ?? input.paymentArchitecture;
  if (!source || source === "UNRESOLVED" || source === "AMBIGUOUS") return "Not yet resolved";
  return titleCaseToken(source.replace(/_/g, " "));
}

export function architectureStatusShort(state: "MODEL_REQUIRED" | "PARTIAL_ARCHITECTURE" | "ARCHITECTURE_MODELED"): string {
  if (state === "MODEL_REQUIRED") return "MODEL REQUIRED";
  if (state === "PARTIAL_ARCHITECTURE") return "PARTIAL";
  return "MODELED";
}

export function architectureDisplayLabel(
  state: "MODEL_REQUIRED" | "PARTIAL_ARCHITECTURE" | "ARCHITECTURE_MODELED",
  evidenceInsufficient: boolean,
): string {
  if (evidenceInsufficient || state === "MODEL_REQUIRED") {
    return "Partial — awaiting business-model resolution";
  }
  if (state === "PARTIAL_ARCHITECTURE") return "Partial";
  return "Modeled";
}

export function humanizeCapability(code: string): string {
  return CAPABILITY_LABELS[code] ?? titleCaseToken(code);
}

export function tenancyDisplayLabel(tenancy: TenancyStrategy | string): string {
  const labels: Record<string, string> = {
    SHARED: "Shared",
    SHARED_WITH_LOGICAL_ISOLATION: "Shared with isolation",
    DEDICATED_PER_VENTURE: "Dedicated per venture",
    DEDICATED_PER_COMPANY: "Dedicated per company",
    DEFERRED: "Deferred",
    REQUIRES_POLICY_DECISION: "Requires policy decision",
  };
  return labels[tenancy] ?? titleCaseToken(tenancy.replace(/_/g, " "));
}

export function procurementDisplayLabel(status: ProcurementStatus | string | null): string {
  if (!status) return "Not required";
  const labels: Record<string, string> = {
    NOT_REQUIRED: "Not required",
    DEFERRED: "Deferred",
    FREE_TIER: "Free tier",
    TRIAL_ELIGIBLE: "Trial eligible",
    BUDGET_REVIEW_REQUIRED: "Budget review",
    TREASURY_ELIGIBLE: "Treasury eligible",
    LIVE_PURCHASE_GATED: "Live gated",
    LIVE_ACTIVE: "Live gated",
  };
  return labels[status] ?? titleCaseToken(status.replace(/_/g, " "));
}
