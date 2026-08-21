import { ART_MARKETPLACE_FIXTURE } from "@/lib/infinity/payment-architecture";
import type { VentureSystemsEvidence } from "../types";

export const HOME_CONTRACTOR_FIXTURE: VentureSystemsEvidence = {
  ventureId: "home-contractor-v1",
  operatingModel: "HOME_CONTRACTOR",
  productKind: "HOME_CONTRACTOR",
  businessConcept: "Local home contractor taking request-estimate leads",
  primaryConversion: "REQUEST_ESTIMATE",
  hasLocalServiceArea: true,
  seoIsPrimaryAcquisition: true,
  seoStrategy: {
    primaryAcquisitionChannel: true,
    locationArchitecture: true,
    serviceArchitecture: true,
    organizationPlanId: null,
  },
  depositPayment: true,
  finalPayment: true,
  smsRequired: false,
  ventureStage: "MATURE",
  dedicatedIsolationValuable: true,
  expectedScale: "MEDIUM",
};

export const ART_MARKETPLACE_SYSTEMS_FIXTURE: VentureSystemsEvidence = {
  ventureId: "art-marketplace-v1",
  operatingModel: "MARKETPLACE",
  productKind: "ART_MARKETPLACE",
  businessConcept: "Art marketplace connecting collectors and artists",
  hasDistinctBuyers: true,
  hasDistinctSellers: true,
  paymentEvidence: ART_MARKETPLACE_FIXTURE,
  ventureStage: "MATURE",
  dedicatedIsolationValuable: true,
  expectedScale: "LARGE",
};

export const AI_SEO_PLATFORM_FIXTURE: VentureSystemsEvidence = {
  ventureId: "ai-seo-platform-v1",
  operatingModel: "SAAS",
  productKind: "AI_SEO_PLATFORM",
  businessConcept: "AI SEO website platform with pages per month entitlements",
  monetizationModelType: "saas_subscription",
  entitlementUnit: "pages_per_month",
  seoIsPrimaryAcquisition: true,
  ventureStage: "EARLY_REVENUE",
  dedicatedIsolationValuable: true,
};

export const SIMPLE_DIGITAL_PRODUCT_FIXTURE: VentureSystemsEvidence = {
  ventureId: "simple-digital-product-v1",
  operatingModel: "DIGITAL_PRODUCT",
  productKind: "ONE_TIME_DOWNLOAD",
  businessConcept: "One-time downloadable digital product",
  monetizationModelType: "digital_products",
  ventureStage: "PRE_REVENUE",
  expectedScale: "SMALL",
};

export const SAAS_FIXTURE: VentureSystemsEvidence = {
  operatingModel: "SAAS",
  monetizationModelType: "saas_subscription",
  ventureStage: "EARLY_REVENUE",
};

export const ECOMMERCE_FIXTURE: VentureSystemsEvidence = {
  operatingModel: "ECOMMERCE",
  monetizationModelType: "ecommerce",
  hasPhysicalGoods: true,
  ventureStage: "EARLY_REVENUE",
};

export const LEAD_GENERATION_FIXTURE: VentureSystemsEvidence = {
  operatingModel: "LEAD_GENERATION",
  monetizationModelType: "lead_generation",
  seoIsPrimaryAcquisition: true,
};

export const SERVICE_PLATFORM_FIXTURE: VentureSystemsEvidence = {
  operatingModel: "SERVICE_PLATFORM",
  monetizationModelType: "service_product_hybrid",
  hasDistinctBuyers: true,
  hasDistinctSellers: true,
};

export const MARKETPLACE_FIXTURE: VentureSystemsEvidence = {
  operatingModel: "MARKETPLACE",
  monetizationModelType: "two_sided_marketplace",
  hasDistinctBuyers: true,
  hasDistinctSellers: true,
};

export const CONTENT_BUSINESS_FIXTURE: VentureSystemsEvidence = {
  operatingModel: "CONTENT_BUSINESS",
  monetizationModelType: "content_sites",
  seoIsPrimaryAcquisition: true,
};

export const PRE_REVENUE_CRM_COST_FIXTURE: VentureSystemsEvidence = {
  ...HOME_CONTRACTOR_FIXTURE,
  ventureStage: "PRE_REVENUE",
  dedicatedIsolationValuable: false,
  treasuryBudget: { monthlySoftwareBudgetUsd: 50, actuality: "ESTIMATE", currency: "USD" },
  providerQuotes: [
    {
      providerId: "hubspot",
      providerName: "HubSpot",
      category: "CRM",
      requiredCapabilities: ["CRM_CONTACTS", "CRM_PIPELINE"],
      estimatedMonthlyCostUsd: 500,
      costActuality: "ESTIMATE",
      freeTierAdequate: false,
      apiCapable: true,
      preferred: false,
    },
    {
      providerId: "internal_crm",
      providerName: "Infinity-native CRM",
      category: "CRM",
      requiredCapabilities: ["CRM_CONTACTS", "CRM_PIPELINE"],
      estimatedMonthlyCostUsd: 0,
      costActuality: "ESTIMATE",
      freeTierAdequate: true,
      apiCapable: true,
      preferred: false,
    },
  ],
};

export const MATURE_DEDICATED_CRM_FIXTURE: VentureSystemsEvidence = {
  ...HOME_CONTRACTOR_FIXTURE,
  ventureStage: "MATURE",
  dedicatedIsolationValuable: true,
  treasuryBudget: { monthlySoftwareBudgetUsd: 800, actuality: "ESTIMATE", currency: "USD" },
  providerQuotes: [
    {
      providerId: "hubspot",
      providerName: "HubSpot",
      category: "CRM",
      requiredCapabilities: ["CRM_CONTACTS", "CRM_PIPELINE"],
      estimatedMonthlyCostUsd: 500,
      costActuality: "ESTIMATE",
      freeTierAdequate: false,
      apiCapable: true,
      preferred: true,
    },
  ],
};

export const UNKNOWN_COST_FIXTURE: VentureSystemsEvidence = {
  ...SAAS_FIXTURE,
  providerQuotes: [
    {
      providerId: "salesforce",
      providerName: "Salesforce",
      category: "CRM",
      requiredCapabilities: ["CRM_CONTACTS"],
      estimatedMonthlyCostUsd: null,
      costActuality: "UNKNOWN",
      freeTierAdequate: false,
      apiCapable: true,
      preferred: true,
    },
  ],
};
