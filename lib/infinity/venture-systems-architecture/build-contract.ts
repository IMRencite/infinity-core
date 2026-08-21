import type {
  AnalyticsArchitecture,
  CommunicationsArchitecture,
  ContentArchitecture,
  CrmArchitecture,
  IdentityArchitecture,
  OperationsArchitecture,
  ReputationArchitecture,
  SchedulingArchitecture,
  SeoArchitecture,
  SupportArchitecture,
  VentureSystemsBuildContract,
  VentureSystemsEvidence,
} from "./types";
import type { AnalyticsEvent, CommunicationCapability, ComplianceRequirement, ContentCapability, CrmCapability, IdentityModel, LifecycleEvent, ReputationCapability, SchedulingCapability, SecurityRequirement, SeoCapability, SupportCapability, SystemFamily } from "./constants";
import { selectVentureSystems } from "./selector";
import { paymentContractFromVenture } from "./payment-adapter";

function caps<T extends string>(requirements: ReturnType<typeof selectVentureSystems>["requirements"], allowed: readonly T[]): T[] {
  const set = new Set(allowed);
  const found = new Set<T>();
  for (const requirement of requirements) {
    for (const capability of [...requirement.requiredCapabilities, ...requirement.optionalCapabilities]) {
      if (set.has(capability as T)) found.add(capability as T);
    }
  }
  return [...found];
}

function requiredFamily(requirements: ReturnType<typeof selectVentureSystems>["requirements"], family: SystemFamily): boolean {
  return requirements.some((item) => item.family === family && item.required);
}

export function buildVentureSystemsContract(evidence: VentureSystemsEvidence): VentureSystemsBuildContract {
  const selected = selectVentureSystems(evidence);
  const paymentArchitecture = paymentContractFromVenture(evidence);
  const identity: IdentityArchitecture = {
    models: caps(selected.requirements, [
      "CUSTOMER_ACCOUNT",
      "ADMIN_ACCOUNT",
      "TEAM_MEMBER",
      "BUYER",
      "SELLER",
      "SERVICE_PROVIDER",
      "CLIENT_PORTAL",
      "ROLE_BASED_ACCESS",
      "ORGANIZATION_ACCOUNT",
      "MULTI_TENANT_ACCOUNT",
      "ARTIST_IDENTITY",
      "COLLECTOR_IDENTITY",
    ] as const satisfies readonly IdentityModel[]),
    roleBasedAccess: selected.requirements.some((item) => item.requiredCapabilities.includes("ROLE_BASED_ACCESS")),
    multiTenant: selected.requirements.some((item) => item.requiredCapabilities.includes("MULTI_TENANT_ACCOUNT") || item.optionalCapabilities.includes("MULTI_TENANT_ACCOUNT")),
  };
  const crm: CrmArchitecture = {
    required: requiredFamily(selected.requirements, "CRM"),
    capabilities: caps(selected.requirements, [
      "CRM_CONTACTS",
      "CRM_COMPANIES",
      "CRM_PIPELINE",
      "CRM_DEALS",
      "CRM_LIFECYCLE_STAGE",
      "CRM_LEAD_SOURCE",
      "CRM_LEAD_SCORING",
      "CRM_CUSTOM_FIELDS",
      "CRM_FORM_SYNC",
      "CRM_ACTIVITY_HISTORY",
      "CRM_NOTES",
      "CRM_TASKS",
    ] as const satisfies readonly CrmCapability[]),
    pipelineModeled: selected.requirements.some((item) => item.requiredCapabilities.includes("CRM_PIPELINE")),
    leadLifecycleModeled: selected.requirements.some((item) => item.requiredCapabilities.includes("CRM_LIFECYCLE_STAGE")),
  };
  const communications: CommunicationsArchitecture = {
    transactionalEmail: requiredFamily(selected.requirements, "TRANSACTIONAL_EMAIL"),
    marketingEmail: requiredFamily(selected.requirements, "MARKETING_EMAIL"),
    sms: requiredFamily(selected.requirements, "SMS"),
    smsOptional: selected.requirements.some((item) => item.family === "SMS" && !item.required && item.optionalCapabilities.includes("SMS")),
    nurture: selected.requirements.some((item) => item.requiredCapabilities.includes("AUTOMATED_NURTURE")),
    reviewRequests: selected.requirements.some((item) => item.requiredCapabilities.includes("REVIEW_REQUESTS") || item.requiredCapabilities.includes("REVIEW_REQUEST_AUTOMATION")),
    capabilities: caps(selected.requirements, [
      "TRANSACTIONAL_EMAIL",
      "MARKETING_EMAIL",
      "AUTOMATED_NURTURE",
      "REACTIVATION",
      "SMS",
      "APPOINTMENT_REMINDERS",
      "REVIEW_REQUESTS",
      "CUSTOMER_NOTIFICATIONS",
    ] as const satisfies readonly CommunicationCapability[]),
  };
  const analytics: AnalyticsArchitecture = {
    events: caps(selected.requirements, [
      "PAGE_VIEW",
      "LEAD",
      "SIGNUP",
      "CHECKOUT",
      "PURCHASE",
      "SUBSCRIPTION",
      "REVENUE",
      "CAMPAIGN_SOURCE",
      "UTM_ATTRIBUTION",
      "SEO_LANDING_PAGE",
      "CONVERSION_FUNNEL",
      "RETENTION",
      "CHURN",
      "LTV",
      "CAC",
      "GMV",
      "TAKE_RATE",
    ] as const satisfies readonly AnalyticsEvent[]),
    attribution: requiredFamily(selected.requirements, "ATTRIBUTION") || selected.requirements.some((item) => item.requiredCapabilities.includes("UTM_ATTRIBUTION")),
    leads: selected.requirements.some((item) => item.requiredCapabilities.includes("LEAD")),
    revenue: selected.requirements.some((item) => item.requiredCapabilities.includes("REVENUE") || item.requiredCapabilities.includes("PURCHASE") || item.requiredCapabilities.includes("SUBSCRIPTION")),
    retention: selected.requirements.some((item) => item.requiredCapabilities.includes("RETENTION") || item.requiredCapabilities.includes("CHURN")),
    performanceIntelligenceIsCanonical: true,
  };
  const support: SupportArchitecture = {
    capabilities: caps(selected.requirements, [
      "HELP_CENTER",
      "SUPPORT_TICKET",
      "CONTACT_SUPPORT",
      "CHAT_SUPPORT",
      "CUSTOMER_HISTORY",
      "ESCALATION",
      "REFUND_SUPPORT",
      "DISPUTE_SUPPORT",
      "KNOWLEDGE_BASE",
      "ONBOARDING_SUPPORT",
    ] as const satisfies readonly SupportCapability[]),
    complexStackRequired: selected.requirements.some(
      (item) =>
        item.family === "CUSTOMER_SUPPORT" &&
        item.required &&
        item.requiredCapabilities.includes("CHAT_SUPPORT") &&
        item.requiredCapabilities.includes("HELP_CENTER"),
    ),
  };
  const scheduling: SchedulingArchitecture = {
    required: requiredFamily(selected.requirements, "SCHEDULING"),
    capabilities: caps(selected.requirements, [
      "APPOINTMENT_BOOKING",
      "ESTIMATE_SCHEDULING",
      "CONSULTATION_BOOKING",
      "JOB_SCHEDULING",
      "RESOURCE_CALENDAR",
      "REMINDER",
      "CANCELLATION",
      "RESCHEDULING",
    ] as const satisfies readonly SchedulingCapability[]),
  };
  const content: ContentArchitecture = {
    capabilities: caps(selected.requirements, [
      "SEO_CONTENT",
      "PROGRAMMATIC_SEO",
      "BLOG",
      "LOCATION_PAGES",
      "SERVICE_PAGES",
      "EMAIL_NEWSLETTER",
      "SOCIAL_CONTENT",
      "LANDING_PAGES",
      "CONTENT_REFRESH",
      "CONTENT_CALENDAR",
      "CONTENT_PRODUCTION",
    ] as const satisfies readonly ContentCapability[]),
    organicGrowthIsCanonical: true,
  };
  const seo: SeoArchitecture = {
    required: requiredFamily(selected.requirements, "SEO"),
    capabilities: caps(selected.requirements, [
      "URL_STRUCTURE",
      "INTERNAL_LINKING",
      "CONTENT_HUBS",
      "LOCATION_ARCHITECTURE",
      "SERVICE_ARCHITECTURE",
      "SCHEMA",
      "METADATA",
      "SITEMAP",
      "INDEXATION",
      "CONTENT_REFRESH",
      "SEARCH_CONSOLE",
      "RANK_TRACKING",
    ] as const satisfies readonly SeoCapability[]),
    organizationPlanId: evidence.seoStrategy?.organizationPlanId ?? null,
  };
  const reputation: ReputationArchitecture = {
    capabilities: caps(selected.requirements, [
      "CUSTOMER_REVIEWS",
      "SELLER_RATINGS",
      "SERVICE_PROVIDER_RATINGS",
      "TESTIMONIALS",
      "REVIEW_REQUEST_AUTOMATION",
      "MODERATION",
      "FRAUD_SIGNAL",
      "TRUST_BADGES",
      "VERIFICATION_STATE",
    ] as const satisfies readonly ReputationCapability[]),
  };
  const operations: OperationsArchitecture = {
    families: selected.requirements.filter((item) => item.required && (item.family === "OPERATIONS" || item.family === "SCHEDULING" || item.family === "HUMAN_OPERATIONS")).map((item) => item.family),
  };

  return {
    ventureType: selected.operatingModel,
    businessModel: selected.operatingModel,
    paymentArchitecture,
    systemRequirements: selected.requirements,
    identityArchitecture: identity,
    crmArchitecture: crm,
    communicationsArchitecture: communications,
    analyticsArchitecture: analytics,
    supportArchitecture: support,
    schedulingArchitecture: scheduling,
    contentArchitecture: content,
    seoArchitecture: seo,
    reputationArchitecture: reputation,
    operationsArchitecture: operations,
    complianceRequirements: caps(selected.requirements, [
      "PRIVACY_POLICY",
      "TERMS_OF_SERVICE",
      "COOKIE_CONSENT",
      "EMAIL_CONSENT",
      "SMS_CONSENT",
      "DATA_RETENTION_POLICY",
      "REFUND_POLICY",
      "MARKETPLACE_TERMS",
      "SELLER_TERMS",
      "AGE_RESTRICTIONS",
      "INDUSTRY_COMPLIANCE_REVIEW",
      "ACCESSIBILITY_REQUIREMENTS",
    ] as const satisfies readonly ComplianceRequirement[]),
    securityRequirements: caps(selected.requirements, [
      "AUTHENTICATION",
      "AUTHORIZATION",
      "RATE_LIMITING",
      "INPUT_VALIDATION",
      "ABUSE_PREVENTION",
      "FRAUD_DETECTION",
      "AUDIT_LOGGING",
      "SECRET_MANAGEMENT",
      "BACKUP_REQUIREMENTS",
      "INCIDENT_MONITORING",
      "ERROR_MONITORING",
      "DATA_ISOLATION",
    ] as const satisfies readonly SecurityRequirement[]),
    lifecycleAutomations: caps(selected.requirements, [
      "LEAD_CREATED",
      "LEAD_CONTACTED",
      "TRIAL_STARTED",
      "TRIAL_ENDING",
      "SUBSCRIPTION_STARTED",
      "PAYMENT_FAILED",
      "CUSTOMER_INACTIVE",
      "PURCHASE_COMPLETED",
      "JOB_COMPLETED",
      "REVIEW_REQUEST_DUE",
      "RENEWAL_DUE",
      "CHURN_RISK",
      "SELLER_ONBOARDING_INCOMPLETE",
    ] as const satisfies readonly LifecycleEvent[]),
    providerRequirements: selected.providerRequirements,
    providerTenancy: selected.tenancy,
    vendorProcurementRequirements: selected.vendorProcurement,
    unresolvedPolicies: selected.unresolvedPolicies,
    buildDependencies: selected.buildDependencies,
    liveAuthorityRequirements: {
      liveProvisioningAuthority: false,
      livePurchaseAuthority: false,
      cursorChoosesSystemsIndependently: false,
      infinitySuppliesSystemsArchitecture: true,
    },
  };
}
