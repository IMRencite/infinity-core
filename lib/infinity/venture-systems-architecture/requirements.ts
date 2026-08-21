import type { SystemCapability, SystemFamily, SystemPriority } from "./constants";
import { classifyVentureOperatingModel } from "./classifier";
import type { UnresolvedSystemPolicy, VentureSystemRequirement, VentureSystemsEvidence } from "./types";

type FamilySpec = {
  family: SystemFamily;
  required: boolean;
  priority: SystemPriority;
  reason: string;
  requiredCapabilities: SystemCapability[];
  optionalCapabilities?: SystemCapability[];
  dependencies?: SystemFamily[];
  providerNeeded: boolean;
};

const BASE_LEGAL: FamilySpec = {
  family: "LEGAL_AND_COMPLIANCE",
  required: true,
  priority: "FOUNDATION",
  reason: "Customer-facing ventures need privacy and terms requirements, not legal conclusions.",
  requiredCapabilities: ["PRIVACY_POLICY", "TERMS_OF_SERVICE", "COOKIE_CONSENT"],
  providerNeeded: false,
};

const BASE_SECURITY: FamilySpec = {
  family: "SECURITY_AND_RISK",
  required: true,
  priority: "FOUNDATION",
  reason: "Any implemented product needs baseline security requirements for existing auth/runtime to consume.",
  requiredCapabilities: ["AUTHENTICATION", "AUTHORIZATION", "RATE_LIMITING", "INPUT_VALIDATION", "SECRET_MANAGEMENT"],
  providerNeeded: false,
};

function specToRequirement(
  spec: FamilySpec,
  tenancy: VentureSystemRequirement["tenancyRequirement"],
  extraPolicies: VentureSystemRequirement["unresolvedPolicies"] = [],
): VentureSystemRequirement {
  return {
    family: spec.family,
    required: spec.required,
    priority: spec.priority,
    reason: spec.reason,
    requiredCapabilities: spec.requiredCapabilities,
    optionalCapabilities: spec.optionalCapabilities ?? [],
    dependencies: spec.dependencies ?? [],
    providerNeeded: spec.providerNeeded,
    tenancyRequirement: tenancy,
    liveExecutionRequired: false,
    unresolvedPolicies: extraPolicies,
  };
}

function homeContractor(evidence: VentureSystemsEvidence): FamilySpec[] {
  const paymentsRequired = evidence.depositPayment === true || evidence.finalPayment === true;
  const seoPrimary = evidence.seoIsPrimaryAcquisition !== false;
  const paymentCaps: SystemCapability[] = [];
  if (evidence.depositPayment) paymentCaps.push("DEPOSIT_PAYMENT");
  if (evidence.finalPayment) paymentCaps.push("FINAL_PAYMENT");
  return [
    BASE_LEGAL,
    BASE_SECURITY,
    {
      family: "LEAD_CAPTURE",
      required: true,
      priority: "REVENUE_PATH",
      reason: "Primary conversion is request-estimate, so the venture must capture inbound demand.",
      requiredCapabilities: ["CRM_FORM_SYNC", "LEAD"],
      dependencies: ["CRM"],
      providerNeeded: true,
    },
    {
      family: "CRM",
      required: true,
      priority: "OPERATIONS",
      reason: "Estimate requests need contacts, a pipeline, and lead lifecycle tracking.",
      requiredCapabilities: [
        "CRM_CONTACTS",
        "CRM_PIPELINE",
        "CRM_DEALS",
        "CRM_LIFECYCLE_STAGE",
        "CRM_LEAD_SOURCE",
        "CRM_ACTIVITY_HISTORY",
      ],
      optionalCapabilities: ["CRM_LEAD_SCORING", "CRM_CUSTOM_FIELDS", "CRM_TASKS", "CRM_NOTES"],
      providerNeeded: true,
    },
    {
      family: "SCHEDULING",
      required: true,
      priority: "OPERATIONS",
      reason: "Local contracting work requires estimate and job scheduling.",
      requiredCapabilities: ["ESTIMATE_SCHEDULING", "JOB_SCHEDULING", "REMINDER", "CANCELLATION", "RESCHEDULING"],
      optionalCapabilities: ["RESOURCE_CALENDAR", "APPOINTMENT_BOOKING"],
      dependencies: ["CRM"],
      providerNeeded: true,
    },
    {
      family: "TRANSACTIONAL_EMAIL",
      required: true,
      priority: "OPERATIONS",
      reason: "Estimate confirmations and job updates require transactional email.",
      requiredCapabilities: ["TRANSACTIONAL_EMAIL", "CUSTOMER_NOTIFICATIONS", "APPOINTMENT_REMINDERS"],
      dependencies: ["LEAD_CAPTURE"],
      providerNeeded: true,
    },
    {
      family: "SMS",
      required: evidence.smsRequired === true,
      priority: evidence.smsRequired === true ? "OPERATIONS" : "OPTIONAL",
      reason: "SMS reminders are optional unless the venture explicitly requires them.",
      requiredCapabilities: evidence.smsRequired === true ? ["SMS", "APPOINTMENT_REMINDERS"] : [],
      optionalCapabilities: ["SMS", "APPOINTMENT_REMINDERS"],
      providerNeeded: true,
    },
    {
      family: "REPUTATION_AND_REVIEWS",
      required: true,
      priority: "GROWTH",
      reason: "Contractors convert from reviews; review-request automation is required.",
      requiredCapabilities: ["CUSTOMER_REVIEWS", "REVIEW_REQUEST_AUTOMATION", "TESTIMONIALS"],
      dependencies: ["SCHEDULING", "TRANSACTIONAL_EMAIL"],
      providerNeeded: true,
    },
    {
      family: "SEO",
      required: seoPrimary,
      priority: "GROWTH",
      reason: "Local demand acquisition is SEO-led unless evidence says otherwise.",
      requiredCapabilities: ["LOCATION_ARCHITECTURE", "SERVICE_ARCHITECTURE", "SCHEMA", "METADATA", "SITEMAP", "INDEXATION"],
      optionalCapabilities: ["SEARCH_CONSOLE", "RANK_TRACKING"],
      providerNeeded: false,
    },
    {
      family: "CONTENT_AND_DISTRIBUTION",
      required: seoPrimary,
      priority: "GROWTH",
      reason: "Local service pages are the SEO surface; Organic Growth remains the content engine.",
      requiredCapabilities: ["SERVICE_PAGES", "LOCATION_PAGES", "LANDING_PAGES"],
      optionalCapabilities: ["SEO_CONTENT", "CONTENT_REFRESH"],
      dependencies: ["SEO"],
      providerNeeded: false,
    },
    {
      family: "CUSTOMER_ACQUISITION",
      required: true,
      priority: "GROWTH",
      reason: "The venture must acquire estimate requests through owned channels.",
      requiredCapabilities: ["LANDING_PAGES", "SEO_LANDING_PAGE"],
      providerNeeded: false,
    },
    {
      family: "ATTRIBUTION",
      required: true,
      priority: "MEASUREMENT",
      reason: "Lead source must be attributable without duplicating Performance Intelligence.",
      requiredCapabilities: ["CAMPAIGN_SOURCE", "UTM_ATTRIBUTION", "LEAD", "CAC"],
      dependencies: ["ANALYTICS"],
      providerNeeded: true,
    },
    {
      family: "ANALYTICS",
      required: true,
      priority: "MEASUREMENT",
      reason: "Page views, leads, and revenue events are required inputs for Performance Intelligence.",
      requiredCapabilities: ["PAGE_VIEW", "LEAD", "CONVERSION_FUNNEL", "REVENUE"],
      providerNeeded: true,
    },
    {
      family: "PAYMENTS",
      required: paymentsRequired,
      priority: "REVENUE_PATH",
      reason: paymentsRequired
        ? "Monetization specifies deposit and/or final payment collection."
        : "Payment collection is not assumed unless monetization evidence specifies it.",
      requiredCapabilities: paymentCaps,
      dependencies: ["IDENTITY_AND_ACCOUNTS"],
      providerNeeded: paymentsRequired,
    },
    {
      family: "LIFECYCLE_AUTOMATION",
      required: true,
      priority: "GROWTH",
      reason: "Lead and job states drive reminders and review requests. Architecture only.",
      requiredCapabilities: ["LEAD_CREATED", "LEAD_CONTACTED", "JOB_COMPLETED", "REVIEW_REQUEST_DUE"],
      dependencies: ["CRM", "TRANSACTIONAL_EMAIL"],
      providerNeeded: false,
    },
    {
      family: "OPERATIONS",
      required: true,
      priority: "OPERATIONS",
      reason: "Job completion and crew coordination are operating-system concerns.",
      requiredCapabilities: ["JOB_SCHEDULING"],
      dependencies: ["SCHEDULING"],
      providerNeeded: false,
    },
  ];
}

function saas(evidence: VentureSystemsEvidence): FamilySpec[] {
  const aiSeo = /ai seo|seo platform/.test(`${evidence.productKind ?? ""} ${evidence.businessConcept ?? ""}`.toLowerCase());
  return [
    BASE_LEGAL,
    {
      ...BASE_SECURITY,
      requiredCapabilities: [...BASE_SECURITY.requiredCapabilities, "ERROR_MONITORING", "AUDIT_LOGGING", "DATA_ISOLATION"],
    },
    {
      family: "IDENTITY_AND_ACCOUNTS",
      required: true,
      priority: "FOUNDATION",
      reason: "SaaS requires customer and admin accounts.",
      requiredCapabilities: ["CUSTOMER_ACCOUNT", "ADMIN_ACCOUNT", "ORGANIZATION_ACCOUNT"],
      optionalCapabilities: ["TEAM_MEMBER", "MULTI_TENANT_ACCOUNT"],
      providerNeeded: false,
    },
    {
      family: "AUTHORIZATION_AND_ROLES",
      required: true,
      priority: "FOUNDATION",
      reason: "SaaS access control is role-based.",
      requiredCapabilities: ["ROLE_BASED_ACCESS", "AUTHORIZATION"],
      dependencies: ["IDENTITY_AND_ACCOUNTS"],
      providerNeeded: false,
    },
    {
      family: "ENTITLEMENTS",
      required: true,
      priority: "REVENUE_PATH",
      reason: "Subscription access must be gated by plan entitlements.",
      requiredCapabilities: evidence.entitlementUnit === "pages_per_month" ? ["PAGES_PER_MONTH_ENTITLEMENT"] : ["SUBSCRIPTIONS"],
      dependencies: ["PAYMENTS", "IDENTITY_AND_ACCOUNTS"],
      providerNeeded: false,
    },
    {
      family: "PAYMENTS",
      required: true,
      priority: "REVENUE_PATH",
      reason: "SaaS collects recurring subscription payments via Payment Architecture.",
      requiredCapabilities: ["SUBSCRIPTIONS"],
      providerNeeded: true,
    },
    {
      family: "TRANSACTIONAL_EMAIL",
      required: true,
      priority: "OPERATIONS",
      reason: "Signup, billing, and lifecycle notices require transactional email.",
      requiredCapabilities: ["TRANSACTIONAL_EMAIL", "CUSTOMER_NOTIFICATIONS"],
      providerNeeded: true,
    },
    {
      family: "MARKETING_EMAIL",
      required: true,
      priority: "GROWTH",
      reason: "SaaS lifecycle includes nurture and reactivation.",
      requiredCapabilities: ["MARKETING_EMAIL", "AUTOMATED_NURTURE"],
      optionalCapabilities: ["REACTIVATION"],
      providerNeeded: true,
    },
    {
      family: "CRM",
      required: true,
      priority: "OPERATIONS",
      reason: "SaaS sales and onboarding need a CRM, not a specific vendor.",
      requiredCapabilities: ["CRM_CONTACTS", "CRM_PIPELINE", "CRM_LIFECYCLE_STAGE", "CRM_LEAD_SOURCE"],
      providerNeeded: true,
    },
    {
      family: "CUSTOMER_SUPPORT",
      required: true,
      priority: "OPERATIONS",
      reason: "Subscribers need support and a knowledge base.",
      requiredCapabilities: aiSeo
        ? ["CONTACT_SUPPORT", "SUPPORT_TICKET", "KNOWLEDGE_BASE", "ONBOARDING_SUPPORT", "HELP_CENTER"]
        : ["CONTACT_SUPPORT", "SUPPORT_TICKET", "KNOWLEDGE_BASE", "ONBOARDING_SUPPORT"],
      optionalCapabilities: ["HELP_CENTER", "CHAT_SUPPORT"],
      providerNeeded: true,
    },
    {
      family: "ANALYTICS",
      required: true,
      priority: "MEASUREMENT",
      reason: "Signup, subscription, retention, and churn events feed Performance Intelligence.",
      requiredCapabilities: ["PAGE_VIEW", "SIGNUP", "SUBSCRIPTION", "REVENUE", "RETENTION", "CHURN", "LTV"],
      providerNeeded: true,
    },
    {
      family: "ATTRIBUTION",
      required: true,
      priority: "MEASUREMENT",
      reason: "Acquisition source and CAC must be modeled.",
      requiredCapabilities: ["CAMPAIGN_SOURCE", "UTM_ATTRIBUTION", "CAC", "CONVERSION_FUNNEL"],
      dependencies: ["ANALYTICS"],
      providerNeeded: true,
    },
    {
      family: "LIFECYCLE_AUTOMATION",
      required: true,
      priority: "GROWTH",
      reason: "Trial, payment failure, and churn-risk states are architecture, not message sends.",
      requiredCapabilities: ["TRIAL_STARTED", "TRIAL_ENDING", "SUBSCRIPTION_STARTED", "PAYMENT_FAILED", "CHURN_RISK", "RENEWAL_DUE"],
      dependencies: ["PAYMENTS", "TRANSACTIONAL_EMAIL"],
      providerNeeded: false,
    },
    ...(aiSeo
      ? ([
          {
            family: "CONTENT_AND_DISTRIBUTION",
            required: true,
            priority: "REVENUE_PATH",
            reason: "An AI SEO platform produces content as the product surface.",
            requiredCapabilities: ["CONTENT_PRODUCTION", "SEO_CONTENT", "CONTENT_CALENDAR"],
            providerNeeded: false,
          },
          {
            family: "SEO",
            required: true,
            priority: "REVENUE_PATH",
            reason: "SEO architecture is the product, not an IMR-specific rule set.",
            requiredCapabilities: ["URL_STRUCTURE", "INTERNAL_LINKING", "CONTENT_HUBS", "METADATA", "SITEMAP", "INDEXATION", "RANK_TRACKING"],
            providerNeeded: false,
          },
        ] satisfies FamilySpec[])
      : []),
  ];
}

function marketplace(): FamilySpec[] {
  return [
    {
      ...BASE_LEGAL,
      requiredCapabilities: ["PRIVACY_POLICY", "TERMS_OF_SERVICE", "COOKIE_CONSENT", "MARKETPLACE_TERMS", "SELLER_TERMS", "REFUND_POLICY"],
    },
    {
      ...BASE_SECURITY,
      requiredCapabilities: [...BASE_SECURITY.requiredCapabilities, "FRAUD_DETECTION", "ABUSE_PREVENTION", "DATA_ISOLATION"],
    },
    {
      family: "IDENTITY_AND_ACCOUNTS",
      required: true,
      priority: "FOUNDATION",
      reason: "Marketplaces need distinct buyer and seller identities.",
      requiredCapabilities: ["BUYER", "SELLER", "ARTIST_IDENTITY", "COLLECTOR_IDENTITY", "CUSTOMER_ACCOUNT"],
      optionalCapabilities: ["ROLE_BASED_ACCESS", "ORGANIZATION_ACCOUNT"],
      providerNeeded: false,
    },
    {
      family: "AUTHORIZATION_AND_ROLES",
      required: true,
      priority: "FOUNDATION",
      reason: "Buyer, seller, and operator permissions must be distinct.",
      requiredCapabilities: ["ROLE_BASED_ACCESS"],
      dependencies: ["IDENTITY_AND_ACCOUNTS"],
      providerNeeded: false,
    },
    {
      family: "PAYMENTS",
      required: true,
      priority: "REVENUE_PATH",
      reason: "Marketplace payments and seller onboarding come from Payment Architecture.",
      requiredCapabilities: ["MARKETPLACE_PAYMENTS", "SELLER_ONBOARDING"],
      providerNeeded: true,
    },
    {
      family: "REPUTATION_AND_REVIEWS",
      required: true,
      priority: "OPERATIONS",
      reason: "Trust requires seller ratings and moderation.",
      requiredCapabilities: ["SELLER_RATINGS", "MODERATION", "FRAUD_SIGNAL", "VERIFICATION_STATE"],
      providerNeeded: false,
    },
    {
      family: "CUSTOMER_SUPPORT",
      required: true,
      priority: "OPERATIONS",
      reason: "Buyers and sellers need support, refund, and dispute paths.",
      requiredCapabilities: ["CONTACT_SUPPORT", "SUPPORT_TICKET", "REFUND_SUPPORT", "DISPUTE_SUPPORT", "ESCALATION", "CUSTOMER_HISTORY"],
      providerNeeded: true,
    },
    {
      family: "MARKETING_EMAIL",
      required: true,
      priority: "GROWTH",
      reason: "Collector and artist lifecycle uses marketing email.",
      requiredCapabilities: ["MARKETING_EMAIL"],
      providerNeeded: true,
    },
    {
      family: "TRANSACTIONAL_EMAIL",
      required: true,
      priority: "OPERATIONS",
      reason: "Purchases, payouts, and onboarding need transactional email.",
      requiredCapabilities: ["TRANSACTIONAL_EMAIL", "CUSTOMER_NOTIFICATIONS"],
      providerNeeded: true,
    },
    {
      family: "ANALYTICS",
      required: true,
      priority: "MEASUREMENT",
      reason: "GMV, take rate, and purchases are distinct from platform revenue.",
      requiredCapabilities: ["PAGE_VIEW", "PURCHASE", "REVENUE", "GMV", "TAKE_RATE"],
      providerNeeded: true,
    },
    {
      family: "ATTRIBUTION",
      required: true,
      priority: "MEASUREMENT",
      reason: "Campaign and listing attribution are required measurement inputs.",
      requiredCapabilities: ["CAMPAIGN_SOURCE", "UTM_ATTRIBUTION"],
      dependencies: ["ANALYTICS"],
      providerNeeded: true,
    },
    {
      family: "LIFECYCLE_AUTOMATION",
      required: true,
      priority: "GROWTH",
      reason: "Seller onboarding and purchase states are architecture only.",
      requiredCapabilities: ["SELLER_ONBOARDING_INCOMPLETE", "PURCHASE_COMPLETED"],
      dependencies: ["PAYMENTS", "IDENTITY_AND_ACCOUNTS"],
      providerNeeded: false,
    },
  ];
}

function ecommerce(evidence: VentureSystemsEvidence): FamilySpec[] {
  const physical = evidence.hasPhysicalGoods === true;
  return [
    BASE_LEGAL,
    BASE_SECURITY,
    {
      family: "COMMERCE_AND_FULFILLMENT",
      required: true,
      priority: "REVENUE_PATH",
      reason: "Ecommerce needs catalog checkout and fulfillment.",
      requiredCapabilities: physical ? ["INVENTORY", "PHYSICAL_FULFILLMENT"] : ["DIGITAL_DELIVERY"],
      providerNeeded: physical,
    },
    {
      family: "PAYMENTS",
      required: true,
      priority: "REVENUE_PATH",
      reason: "Direct commerce checkout is selected by Payment Architecture.",
      requiredCapabilities: ["ONE_TIME_CHECKOUT"],
      providerNeeded: true,
    },
    {
      family: "TRANSACTIONAL_EMAIL",
      required: true,
      priority: "OPERATIONS",
      reason: "Order receipts and shipping notices require transactional email.",
      requiredCapabilities: ["TRANSACTIONAL_EMAIL", "CUSTOMER_NOTIFICATIONS"],
      providerNeeded: true,
    },
    {
      family: "MARKETING_EMAIL",
      required: true,
      priority: "GROWTH",
      reason: "Ecommerce retention commonly uses marketing email.",
      requiredCapabilities: ["MARKETING_EMAIL"],
      providerNeeded: true,
    },
    {
      family: "ANALYTICS",
      required: true,
      priority: "MEASUREMENT",
      reason: "Checkout, purchase, and revenue events are required.",
      requiredCapabilities: ["PAGE_VIEW", "CHECKOUT", "PURCHASE", "REVENUE"],
      providerNeeded: true,
    },
    {
      family: "CUSTOMER_SUPPORT",
      required: true,
      priority: "OPERATIONS",
      reason: "Orders need contact and refund support, not a specific helpdesk.",
      requiredCapabilities: ["CONTACT_SUPPORT", "REFUND_SUPPORT"],
      optionalCapabilities: ["SUPPORT_TICKET"],
      providerNeeded: true,
    },
    {
      family: "ATTRIBUTION",
      required: true,
      priority: "MEASUREMENT",
      reason: "Campaign attribution is required for paid and organic acquisition.",
      requiredCapabilities: ["CAMPAIGN_SOURCE", "UTM_ATTRIBUTION", "CAC"],
      providerNeeded: true,
    },
  ];
}

function leadGeneration(): FamilySpec[] {
  return [
    BASE_LEGAL,
    BASE_SECURITY,
    {
      family: "LEAD_CAPTURE",
      required: true,
      priority: "REVENUE_PATH",
      reason: "Lead generation exists to capture inbound contacts.",
      requiredCapabilities: ["CRM_FORM_SYNC", "LEAD"],
      providerNeeded: true,
    },
    {
      family: "CRM",
      required: true,
      priority: "OPERATIONS",
      reason: "Captured leads must live in a pipeline.",
      requiredCapabilities: ["CRM_CONTACTS", "CRM_PIPELINE", "CRM_LEAD_SOURCE", "CRM_LIFECYCLE_STAGE"],
      providerNeeded: true,
    },
    {
      family: "ATTRIBUTION",
      required: true,
      priority: "MEASUREMENT",
      reason: "Lead source and CAC are the core measurement model.",
      requiredCapabilities: ["CAMPAIGN_SOURCE", "UTM_ATTRIBUTION", "LEAD", "CAC"],
      providerNeeded: true,
    },
    {
      family: "SEO",
      required: true,
      priority: "GROWTH",
      reason: "Acquisition channels include SEO landing pages.",
      requiredCapabilities: ["METADATA", "SITEMAP", "SEO_LANDING_PAGE"],
      providerNeeded: false,
    },
    {
      family: "CUSTOMER_ACQUISITION",
      required: true,
      priority: "GROWTH",
      reason: "Owned acquisition channels must be explicit.",
      requiredCapabilities: ["LANDING_PAGES"],
      providerNeeded: false,
    },
    {
      family: "MARKETING_EMAIL",
      required: true,
      priority: "GROWTH",
      reason: "Lead nurture is appropriate when capturing contacts.",
      requiredCapabilities: ["MARKETING_EMAIL", "AUTOMATED_NURTURE"],
      providerNeeded: true,
    },
    {
      family: "ANALYTICS",
      required: true,
      priority: "MEASUREMENT",
      reason: "Lead and funnel events feed Performance Intelligence.",
      requiredCapabilities: ["PAGE_VIEW", "LEAD", "CONVERSION_FUNNEL"],
      providerNeeded: true,
    },
  ];
}

function digitalProduct(): FamilySpec[] {
  return [
    {
      ...BASE_LEGAL,
      requiredCapabilities: ["PRIVACY_POLICY", "TERMS_OF_SERVICE", "REFUND_POLICY"],
    },
    BASE_SECURITY,
    {
      family: "PAYMENTS",
      required: true,
      priority: "REVENUE_PATH",
      reason: "A one-time digital product needs checkout.",
      requiredCapabilities: ["ONE_TIME_CHECKOUT"],
      providerNeeded: true,
    },
    {
      family: "TRANSACTIONAL_EMAIL",
      required: true,
      priority: "OPERATIONS",
      reason: "Delivery links are sent by transactional email.",
      requiredCapabilities: ["TRANSACTIONAL_EMAIL"],
      providerNeeded: true,
    },
    {
      family: "COMMERCE_AND_FULFILLMENT",
      required: true,
      priority: "REVENUE_PATH",
      reason: "The product must be delivered after payment.",
      requiredCapabilities: ["DIGITAL_DELIVERY"],
      dependencies: ["PAYMENTS"],
      providerNeeded: false,
    },
    {
      family: "ANALYTICS",
      required: true,
      priority: "MEASUREMENT",
      reason: "Basic purchase analytics are sufficient; do not overbuild.",
      requiredCapabilities: ["PAGE_VIEW", "PURCHASE"],
      providerNeeded: true,
    },
  ];
}

function servicePlatform(): FamilySpec[] {
  return [
    BASE_LEGAL,
    BASE_SECURITY,
    {
      family: "IDENTITY_AND_ACCOUNTS",
      required: true,
      priority: "FOUNDATION",
      reason: "Service platforms distinguish clients and providers.",
      requiredCapabilities: ["CUSTOMER_ACCOUNT", "SERVICE_PROVIDER", "CLIENT_PORTAL"],
      providerNeeded: false,
    },
    {
      family: "PAYMENTS",
      required: true,
      priority: "REVENUE_PATH",
      reason: "Payment Architecture selects marketplace vs invoicing.",
      requiredCapabilities: ["MARKETPLACE_PAYMENTS"],
      providerNeeded: true,
    },
    {
      family: "SCHEDULING",
      required: true,
      priority: "OPERATIONS",
      reason: "Service delivery is appointment-shaped.",
      requiredCapabilities: ["APPOINTMENT_BOOKING", "CONSULTATION_BOOKING", "CANCELLATION", "RESCHEDULING"],
      providerNeeded: true,
    },
    {
      family: "REPUTATION_AND_REVIEWS",
      required: true,
      priority: "OPERATIONS",
      reason: "Service providers need ratings.",
      requiredCapabilities: ["SERVICE_PROVIDER_RATINGS", "MODERATION"],
      providerNeeded: false,
    },
    {
      family: "CUSTOMER_SUPPORT",
      required: true,
      priority: "OPERATIONS",
      reason: "Two-sided service disputes need support.",
      requiredCapabilities: ["CONTACT_SUPPORT", "ESCALATION"],
      providerNeeded: true,
    },
    {
      family: "ANALYTICS",
      required: true,
      priority: "MEASUREMENT",
      reason: "Bookings and revenue are required events.",
      requiredCapabilities: ["PAGE_VIEW", "PURCHASE", "REVENUE"],
      providerNeeded: true,
    },
    {
      family: "LIFECYCLE_AUTOMATION",
      required: true,
      priority: "GROWTH",
      reason: "Job completion and review requests are state-based.",
      requiredCapabilities: ["JOB_COMPLETED", "REVIEW_REQUEST_DUE"],
      providerNeeded: false,
    },
  ];
}

function contentBusiness(): FamilySpec[] {
  return [
    BASE_LEGAL,
    BASE_SECURITY,
    {
      family: "CONTENT_AND_DISTRIBUTION",
      required: true,
      priority: "REVENUE_PATH",
      reason: "Content is the product; Organic Growth remains canonical for generation.",
      requiredCapabilities: ["BLOG", "SEO_CONTENT", "CONTENT_CALENDAR", "EMAIL_NEWSLETTER"],
      providerNeeded: false,
    },
    {
      family: "SEO",
      required: true,
      priority: "GROWTH",
      reason: "SEO is the primary acquisition channel for content businesses.",
      requiredCapabilities: ["URL_STRUCTURE", "INTERNAL_LINKING", "CONTENT_HUBS", "METADATA", "SITEMAP", "INDEXATION"],
      providerNeeded: false,
    },
    {
      family: "ANALYTICS",
      required: true,
      priority: "MEASUREMENT",
      reason: "Page views and conversion funnels are required.",
      requiredCapabilities: ["PAGE_VIEW", "CONVERSION_FUNNEL"],
      providerNeeded: true,
    },
    {
      family: "MARKETING_EMAIL",
      required: true,
      priority: "GROWTH",
      reason: "Newsletters are a distribution surface, not a CRM.",
      requiredCapabilities: ["MARKETING_EMAIL", "EMAIL_NEWSLETTER"],
      providerNeeded: true,
    },
    {
      family: "AFFILIATE_AND_PARTNERS",
      required: false,
      priority: "OPTIONAL",
      reason: "Affiliate systems are optional unless monetization evidence requires them.",
      requiredCapabilities: [],
      optionalCapabilities: ["CAMPAIGN_SOURCE"],
      providerNeeded: false,
    },
  ];
}

function ambiguous(): FamilySpec[] {
  return [
    BASE_LEGAL,
    BASE_SECURITY,
  ];
}

export function requirementsForOperatingModel(evidence: VentureSystemsEvidence): VentureSystemRequirement[] {
  const model = classifyVentureOperatingModel(evidence);
  const tenancyDefault: VentureSystemRequirement["tenancyRequirement"] = "DEFERRED";
  const specs =
    model === "HOME_CONTRACTOR" || model === "LOCAL_SERVICE"
      ? homeContractor(evidence)
      : model === "SAAS"
        ? saas(evidence)
        : model === "MARKETPLACE"
          ? marketplace()
          : model === "ECOMMERCE"
            ? ecommerce(evidence)
            : model === "LEAD_GENERATION"
              ? leadGeneration()
              : model === "DIGITAL_PRODUCT"
                ? digitalProduct()
                : model === "SERVICE_PLATFORM"
                  ? servicePlatform()
                  : model === "CONTENT_BUSINESS"
                    ? contentBusiness()
                    : ambiguous();

  const localization: FamilySpec[] = evidence.needsLocalization
    ? [
        {
          family: "LOCALIZATION",
          required: true,
          priority: "OPTIONAL",
          reason: "Evidence explicitly requires localization.",
          requiredCapabilities: [],
          providerNeeded: false,
        },
      ]
    : [];

  return [...specs, ...localization].map((spec) => specToRequirement(spec, tenancyDefault));
}

export function unresolvedPoliciesForEvidence(evidence: VentureSystemsEvidence): UnresolvedSystemPolicy[] {
  const model = classifyVentureOperatingModel(evidence);
  const policies: UnresolvedSystemPolicy[] = [];
  if (model === "AMBIGUOUS") {
    policies.push({
      code: "BUSINESS_MODEL_AMBIGUOUS",
      question: "What operating model should this venture implement?",
      requiredForLiveProvisioning: true,
    });
  }
  if (evidence.regulatedIndustry) {
    policies.push({
      code: "REGULATED_INDUSTRY_COMPLIANCE",
      question: "What regulated-industry obligations apply? Infinity will not auto-resolve this.",
      requiredForLiveProvisioning: true,
    });
  }
  policies.push(
    {
      code: "LEGAL_ENTITY_OBLIGATIONS",
      question: "Which legal entity obligations apply to this venture?",
      requiredForLiveProvisioning: true,
    },
    {
      code: "TAX_LIABILITY",
      question: "Who is responsible for tax collection and remittance?",
      requiredForLiveProvisioning: true,
    },
    {
      code: "MERCHANT_OF_RECORD_LEGAL_STATUS",
      question: "Who is the merchant of record?",
      requiredForLiveProvisioning: true,
    },
  );
  if (model === "HOME_CONTRACTOR" || model === "LOCAL_SERVICE") {
    policies.push({
      code: "PROFESSIONAL_LICENSING",
      question: "What professional licensing is required to operate this service?",
      requiredForLiveProvisioning: true,
    });
  }
  if (requirementsForOperatingModel(evidence).some((item) => item.family === "MARKETING_EMAIL" && item.required)) {
    policies.push({
      code: "EMAIL_CONSENT",
      question: "How is marketing email consent captured and stored?",
      requiredForLiveProvisioning: true,
    });
  }
  if (evidence.smsRequired === true) {
    policies.push({
      code: "SMS_CONSENT",
      question: "How is SMS consent captured before messages are sent?",
      requiredForLiveProvisioning: true,
    });
  }
  return policies;
}
