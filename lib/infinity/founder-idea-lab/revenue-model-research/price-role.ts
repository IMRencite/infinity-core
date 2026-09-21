import type { VentureContext } from "../comparable-economics/qualify";
import type { ExtractedMoneyObservation } from "./types";

export const PRICE_ROLES = [
  "DIRECT_COMPARABLE_CORE_PRICE",
  "ADJACENT_COMPARABLE_CORE_PRICE",
  "CATEGORY_PRICE_BENCHMARK",
  "SETUP_FEE",
  "IMPLEMENTATION_FEE",
  "MANAGED_SERVICE_RETAINER",
  "ADD_ON_PRICE",
  "TOOLING_PRICE",
  "IRRELEVANT_PRICE",
] as const;

export type PriceRole = (typeof PRICE_ROLES)[number];

/** @deprecated Use DIRECT_COMPARABLE_CORE_PRICE. Kept as a type alias for older tests. */
export type LegacyDirectPriceRole = "DIRECT_COMPARABLE_PRICE";

const TOOLING =
  /\b(aeo|answer engine|rank ?track|serp tool|keyword tool|tracking tool|gsc tool|position track|ai seo|geo solutions?|generative engine optimization)\b/i;
const HIBU = /\bhibu\b/i;
const SELF_SERVE_BUILDER = /\bself[- ]serve\b/i;
const DEALER_SPIKE = /\bdealer spike\b|\bdealerspike\b/i;
const SETUP = /\b(setup|onboarding)\b/i;
const IMPLEMENTATION = /\bimplementation\b/i;
const RETAINER = /\b(retainers?|managed (?:seo|marketing|service)|done-for-you marketing|local marketing package)\b/i;
const AGENCY_CONTEXT =
  /\b(local marketing|agency marketing|bundled agency|managed (?:seo|marketing)|done-for-you marketing)\b/i;
const ADD_ON = /\b(add-?on|upsell|premium support|extra seat)\b/i;
const CMS_LIKE = /\b(cms|website builder|website-as-a-service|waas|hosted website|ai website|website packages?|smb website)\b/i;
const WEBSITE_PRODUCT = /\b(website|web\b|cms|waas)\b/i;
const CATEGORY = /\b(saas cms|ai website builders?|website builders?|category|vendors|typical(?:ly)? charge|industry pricing)\b/i;

export function classifyPriceRole(claim: string, context?: VentureContext | null): PriceRole {
  const text = claim.trim();
  if (!text) return "IRRELEVANT_PRICE";
  if (SETUP.test(text) && /\$\s*[\d]/.test(text) && !/\/\s*mo|per month|monthly/i.test(text)) return "SETUP_FEE";
  if (SETUP.test(text) && /one[- ]time|setup fee|onboarding fee/i.test(text)) return "SETUP_FEE";
  if (IMPLEMENTATION.test(text) && /\$\s*[\d]/.test(text) && !SETUP.test(text) && !/\/\s*mo|per month|monthly/i.test(text)) {
    return "IMPLEMENTATION_FEE";
  }
  if (HIBU.test(text) && /\$\s*[\d]/.test(text) && /\b(bundled|marketing|retainer|seo|ads|listing)\b/i.test(text)) {
    return "MANAGED_SERVICE_RETAINER";
  }
  if (
    TOOLING.test(text) &&
    /\$\s*[\d]/.test(text) &&
    !/\b(website packages?|dealer website|cms platform subscription)\b/i.test(text)
  ) {
    return "TOOLING_PRICE";
  }
  if (SELF_SERVE_BUILDER.test(text) && /website builder/i.test(text) && /\$\s*[\d]/.test(text)) {
    return "CATEGORY_PRICE_BENCHMARK";
  }
  if (/\binvest\b/i.test(text) && /\bgeo\b/i.test(text) && /\$\s*[\d]/.test(text)) {
    return "TOOLING_PRICE";
  }
  if (TOOLING.test(text) && !CMS_LIKE.test(text) && !/\b(cms|website builder|website package)\b/i.test(text)) {
    return "TOOLING_PRICE";
  }
  if (AGENCY_CONTEXT.test(text) && RETAINER.test(text) && !CMS_LIKE.test(text)) {
    return "MANAGED_SERVICE_RETAINER";
  }
  if (/\bretainers?\b/i.test(text) && !CMS_LIKE.test(text) && !WEBSITE_PRODUCT.test(text)) {
    return "MANAGED_SERVICE_RETAINER";
  }
  if (CATEGORY.test(text) && !/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/.test(text.replace(CATEGORY, ""))) {
    return "CATEGORY_PRICE_BENCHMARK";
  }
  if (CATEGORY.test(text) && !namedVendor(text)) return "CATEGORY_PRICE_BENCHMARK";
  const ctx = context
    ? `${context.title} ${context.description} ${context.proposedSolution} ${context.businessModelHypothesis}`
    : "";
  const cmsVenture = CMS_LIKE.test(ctx) || /cms|website/i.test(ctx);
  if (DEALER_SPIKE.test(text) && /\$\s*[\d]/.test(text)) {
    if (/bundled|managed (seo|marketing)|retainer/i.test(text) && !/\bwebsite packages?\b/i.test(text)) {
      return "MANAGED_SERVICE_RETAINER";
    }
    return /\b(website packages?|dealer website)\b/i.test(text) ? "DIRECT_COMPARABLE_CORE_PRICE" : "ADJACENT_COMPARABLE_CORE_PRICE";
  }
  if (cmsVenture && CMS_LIKE.test(text) && !/\bbundled\b|\bmanaged services?\b/i.test(text)) {
    return namedVendor(text) ? "DIRECT_COMPARABLE_CORE_PRICE" : "CATEGORY_PRICE_BENCHMARK";
  }
  if (namedVendor(text) && /\$\s*[\d]/.test(text) && /\/\s*mo|per month|monthly|subscription/i.test(text)) {
    return cmsVenture && !CMS_LIKE.test(text) ? "ADJACENT_COMPARABLE_CORE_PRICE" : "DIRECT_COMPARABLE_CORE_PRICE";
  }
  if (ADD_ON.test(text) && !CMS_LIKE.test(text)) return "ADD_ON_PRICE";
  if (CATEGORY.test(text) || /website builders?|cms/i.test(text)) return "CATEGORY_PRICE_BENCHMARK";
  if (namedVendor(text)) return "ADJACENT_COMPARABLE_CORE_PRICE";
  return "IRRELEVANT_PRICE";
}

function namedVendor(claim: string): boolean {
  return /\b[A-Z][A-Za-z0-9]{2,}(?:\s+[A-Z][A-Za-z0-9]+){0,2}\b/.test(claim);
}

export function isCoreMonthlyPriceRole(role: PriceRole): boolean {
  return (
    role === "DIRECT_COMPARABLE_CORE_PRICE" ||
    role === "ADJACENT_COMPARABLE_CORE_PRICE" ||
    role === "CATEGORY_PRICE_BENCHMARK"
  );
}

export function arpuWeightForRole(role: PriceRole): number {
  if (role === "DIRECT_COMPARABLE_CORE_PRICE") return 4;
  if (role === "ADJACENT_COMPARABLE_CORE_PRICE") return 2;
  if (role === "CATEGORY_PRICE_BENCHMARK") return 1;
  return 0;
}

export function observationIsCoreMonthly(
  observation: ExtractedMoneyObservation,
  role: PriceRole,
): boolean {
  if (!isCoreMonthlyPriceRole(role)) return false;
  if (observation.vagueLanguage || observation.kind === "SETUP_FEE" || observation.kind === "CHURN" || observation.kind === "GROSS_MARGIN") {
    return false;
  }
  if (observation.kind === "MONTHLY_PRICE" || observation.kind === "PER_SEAT" || observation.kind === "PER_USER" || observation.kind === "PER_LOCATION") {
    return observation.amountLow != null || observation.amount != null;
  }
  return observation.monthlyRecurringEquivalent != null && observation.cadence === "MONTHLY";
}

export function qualifyPriceFinding(
  claim: string,
  context?: VentureContext | null,
): {
  rawFinding: string;
  role: PriceRole;
  acceptedForCorePrice: boolean;
  acceptedForNumericPricing: boolean;
  reason: string;
} {
  const role = classifyPriceRole(claim, context);
  if (role === "TOOLING_PRICE" || role === "ADD_ON_PRICE") {
    return {
      rawFinding: claim,
      role,
      acceptedForCorePrice: false,
      acceptedForNumericPricing: false,
      reason: "Tooling/add-on pricing cannot drive core CMS subscription price.",
    };
  }
  if (role === "MANAGED_SERVICE_RETAINER") {
    return {
      rawFinding: claim,
      role,
      acceptedForCorePrice: false,
      acceptedForNumericPricing: false,
      reason: "Managed-service retainer is not core CMS subscription pricing.",
    };
  }
  if (role === "SETUP_FEE" || role === "IMPLEMENTATION_FEE") {
    return {
      rawFinding: claim,
      role,
      acceptedForCorePrice: false,
      acceptedForNumericPricing: false,
      reason: "One-time setup/implementation is modeled separately from MRR.",
    };
  }
  if (role === "IRRELEVANT_PRICE") {
    return {
      rawFinding: claim,
      role,
      acceptedForCorePrice: false,
      acceptedForNumericPricing: false,
      reason: "Price finding is not relevant to this venture's core offer.",
    };
  }
  if (role === "CATEGORY_PRICE_BENCHMARK") {
    return {
      rawFinding: claim,
      role,
      acceptedForCorePrice: false,
      acceptedForNumericPricing: true,
      reason: "Category benchmark may inform ARPU bounds with a confidence penalty; it is not a direct comparable.",
    };
  }
  if (role === "ADJACENT_COMPARABLE_CORE_PRICE") {
    return {
      rawFinding: claim,
      role,
      acceptedForCorePrice: true,
      acceptedForNumericPricing: true,
      reason: "Adjacent comparable core price; weighted below direct comparables.",
    };
  }
  return {
    rawFinding: claim,
    role,
    acceptedForCorePrice: true,
    acceptedForNumericPricing: true,
    reason: "Direct comparable core price; highest weight for ARPU/pricing architecture.",
  };
}
