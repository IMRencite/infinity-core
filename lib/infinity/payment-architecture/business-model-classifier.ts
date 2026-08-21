import type { MonetizationArchetypeType } from "@/lib/infinity/monetization-engine/constants";
import { PAYMENT_BUSINESS_MODELS, type PaymentBusinessModel } from "./constants";
import type { PaymentArchitectureEvidence } from "./types";

const MARKETPLACE_ARCHETYPES = new Set<string>([
  "marketplace_commissions",
  "transaction_fees",
  "creator_marketplace",
  "two_sided_marketplace",
  "b2b_marketplace",
  "consumer_marketplace",
]);

const SAAS_ARCHETYPES = new Set<string>([
  "saas_subscription",
  "freemium_saas",
  "paid_membership",
  "subscription_commerce",
]);

const USAGE_ARCHETYPES = new Set<string>(["usage_based_saas", "api_access"]);

const DIRECT_ARCHETYPES = new Set<string>(["ecommerce", "print_on_demand"]);

const DIGITAL_ARCHETYPES = new Set<string>([
  "digital_products",
  "templates",
  "courses_education",
  "data_products",
  "research_products",
  "reports",
  "licensing",
]);

const LEAD_ARCHETYPES = new Set<string>([
  "lead_generation",
  "lead_resale",
  "directories",
  "paid_listings",
  "job_boards",
]);

const SERVICE_ARCHETYPES = new Set<string>(["service_product_hybrid", "software_plus_service"]);

const NO_PAYMENT_ARCHETYPES = new Set<string>([
  "affiliate_commissions",
  "display_advertising",
  "sponsorships",
  "content_sites",
  "newsletter_monetization",
  "other",
]);

function isBusinessModel(value: string): value is PaymentBusinessModel {
  return (PAYMENT_BUSINESS_MODELS as readonly string[]).includes(value);
}

function fromArchetype(value: string | null | undefined): PaymentBusinessModel | null {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/\s+/g, "_") as MonetizationArchetypeType | string;
  if (MARKETPLACE_ARCHETYPES.has(key)) return "MARKETPLACE";
  if (SAAS_ARCHETYPES.has(key)) return "SAAS_SUBSCRIPTION";
  if (USAGE_ARCHETYPES.has(key)) return "USAGE_BASED";
  if (DIRECT_ARCHETYPES.has(key)) return "DIRECT_COMMERCE";
  if (DIGITAL_ARCHETYPES.has(key)) return "DIGITAL_PRODUCT";
  if (LEAD_ARCHETYPES.has(key)) return "LEAD_GENERATION";
  if (SERVICE_ARCHETYPES.has(key)) return "SERVICE_PLATFORM";
  if (NO_PAYMENT_ARCHETYPES.has(key)) return "NO_DIRECT_PAYMENT";
  return null;
}

function fromCandidates(candidates: string[] | undefined): PaymentBusinessModel | null {
  if (!candidates?.length) return null;
  const joined = candidates.join(" ").toLowerCase();
  if (/\bmarketplace|two[- ]sided|multi[- ]sided\b/.test(joined)) return "MARKETPLACE";
  if (/\bsaas|subscription\b/.test(joined)) return "SAAS_SUBSCRIPTION";
  if (/\busage[- ]based|metered\b/.test(joined)) return "USAGE_BASED";
  if (/\becommerce|e-commerce|direct commerce\b/.test(joined)) return "DIRECT_COMMERCE";
  if (/\blead[- ]gen|lead generation\b/.test(joined)) return "LEAD_GENERATION";
  if (/\bservice platform|services marketplace\b/.test(joined)) return "SERVICE_PLATFORM";
  if (/\bdigital product|download|course\b/.test(joined)) return "DIGITAL_PRODUCT";
  return null;
}

export function classifyPaymentBusinessModel(evidence: PaymentArchitectureEvidence): PaymentBusinessModel {
  if (evidence.businessModel && isBusinessModel(evidence.businessModel)) {
    return evidence.businessModel;
  }

  const fromCanonical = fromArchetype(evidence.monetizationModelType);
  if (fromCanonical) return fromCanonical;

  const fromList = fromCandidates(evidence.businessModelCandidates);
  if (fromList) return fromList;

  const mechanism = `${evidence.revenueMechanism ?? ""} ${evidence.pricingModel ?? ""}`.toLowerCase();
  if (/\bmarketplace|commission|take[- ]rate\b/.test(mechanism)) return "MARKETPLACE";
  if (/\bsubscription|saas\b/.test(mechanism)) return "SAAS_SUBSCRIPTION";
  if (/\busage|metered\b/.test(mechanism)) return "USAGE_BASED";
  if (/\blead\b/.test(mechanism)) return "LEAD_GENERATION";
  if (/\becommerce|one[- ]time sale|checkout\b/.test(mechanism)) return "DIRECT_COMMERCE";

  if (evidence.hasDistinctSellers && evidence.hasDistinctBuyers) return "MARKETPLACE";
  if (evidence.sellersReceivePlatformPayouts) return "SERVICE_PLATFORM";

  return "NO_DIRECT_PAYMENT";
}
