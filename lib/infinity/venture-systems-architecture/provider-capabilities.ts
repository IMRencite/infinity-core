import type { ProviderCategory, SystemCapability } from "./constants";
import type { CostActuality, ProviderCandidateQuote } from "./types";

export function catalogProviderCandidates(category: ProviderCategory): ProviderCandidateQuote[] {
  switch (category) {
    case "CRM":
      return [
        quote("internal_crm", "Infinity-native CRM", category, ["CRM_CONTACTS", "CRM_PIPELINE", "CRM_LIFECYCLE_STAGE"], 0, "ESTIMATE", true, false),
        quote("hubspot", "HubSpot", category, ["CRM_CONTACTS", "CRM_COMPANIES", "CRM_PIPELINE", "CRM_DEALS"], 500, "ESTIMATE", false, false),
        quote("gohighlevel", "GoHighLevel", category, ["CRM_CONTACTS", "CRM_PIPELINE", "CRM_FORM_SYNC"], 97, "ESTIMATE", false, false),
        quote("salesforce", "Salesforce", category, ["CRM_CONTACTS", "CRM_COMPANIES", "CRM_PIPELINE"], null, "UNKNOWN", false, false),
      ];
    case "EMAIL":
      return [
        quote("internal_email", "Infinity-native transactional email", category, ["TRANSACTIONAL_EMAIL"], 0, "ESTIMATE", true, false),
        quote("resend", "Resend", category, ["TRANSACTIONAL_EMAIL"], 20, "ESTIMATE", true, false),
        quote("postmark", "Postmark", category, ["TRANSACTIONAL_EMAIL"], 15, "ESTIMATE", false, false),
        quote("klaviyo", "Klaviyo", category, ["MARKETING_EMAIL", "AUTOMATED_NURTURE"], 45, "ESTIMATE", true, false),
        quote("brevo", "Brevo", category, ["MARKETING_EMAIL", "TRANSACTIONAL_EMAIL"], 0, "ESTIMATE", true, false),
        quote("mailchimp", "Mailchimp", category, ["MARKETING_EMAIL"], 20, "ESTIMATE", true, false),
      ];
    case "SMS":
      return [
        quote("deferred_sms", "Deferred SMS capability", category, ["SMS"], 0, "ESTIMATE", true, false),
        quote("twilio", "Twilio", category, ["SMS", "APPOINTMENT_REMINDERS"], 50, "ESTIMATE", false, false),
      ];
    case "ANALYTICS":
      return [
        quote("internal_events", "Infinity event adapter", category, ["PAGE_VIEW", "LEAD", "PURCHASE"], 0, "ESTIMATE", true, false),
        quote("posthog", "PostHog", category, ["PAGE_VIEW", "SIGNUP", "RETENTION"], 0, "ESTIMATE", true, false),
        quote("ga4", "GA4", category, ["PAGE_VIEW", "CAMPAIGN_SOURCE"], 0, "ESTIMATE", true, false),
        quote("search_console", "Search Console", category, ["SEO_LANDING_PAGE"], 0, "ESTIMATE", true, false),
      ];
    case "SUPPORT":
      return [
        quote("internal_support", "In-product contact support", category, ["CONTACT_SUPPORT"], 0, "ESTIMATE", true, false),
        quote("generic_helpdesk", "API-capable helpdesk", category, ["SUPPORT_TICKET", "HELP_CENTER"], null, "UNKNOWN", false, false),
      ];
    case "SCHEDULING":
      return [
        quote("internal_scheduling", "In-product scheduling", category, ["ESTIMATE_SCHEDULING", "JOB_SCHEDULING"], 0, "ESTIMATE", true, false),
        quote("generic_scheduler", "API-capable scheduler", category, ["APPOINTMENT_BOOKING", "RESOURCE_CALENDAR"], 30, "ESTIMATE", false, false),
      ];
    case "PAYMENTS":
      return [
        quote("stripe", "Stripe", category, ["ONE_TIME_CHECKOUT", "SUBSCRIPTIONS", "MARKETPLACE_PAYMENTS"], null, "UNKNOWN", true, false),
      ];
    case "SEO":
      return [
        quote("organic_growth_engine", "Infinity Organic Growth Engine", category, ["SEO_CONTENT"], 0, "ESTIMATE", true, false),
      ];
    case "IDENTITY":
      return [
        quote("existing_auth", "Existing Infinity auth infrastructure", category, ["CUSTOMER_ACCOUNT"], 0, "ESTIMATE", true, false),
      ];
  }
}

function quote(
  providerId: string,
  providerName: string,
  category: ProviderCategory,
  requiredCapabilities: SystemCapability[],
  estimatedMonthlyCostUsd: number | null,
  costActuality: CostActuality,
  freeTierAdequate: boolean,
  preferred: boolean,
): ProviderCandidateQuote {
  return {
    providerId,
    providerName,
    category,
    requiredCapabilities,
    estimatedMonthlyCostUsd,
    costActuality,
    freeTierAdequate,
    apiCapable: true,
    preferred,
  };
}

export function mergeQuotes(
  category: ProviderCategory,
  overrides: ProviderCandidateQuote[] | null | undefined,
): ProviderCandidateQuote[] {
  const catalog = catalogProviderCandidates(category);
  if (!overrides?.length) return catalog;
  const extra = overrides.filter((item) => item.category === category);
  const ids = new Set(extra.map((item) => item.providerId));
  return [...extra, ...catalog.filter((item) => !ids.has(item.providerId))];
}

export function cheapestAdequateQuote(quotes: ProviderCandidateQuote[]): ProviderCandidateQuote | null {
  const free = quotes.filter((item) => item.freeTierAdequate && item.estimatedMonthlyCostUsd === 0);
  if (free[0]) return free[0];
  const known = quotes.filter((item) => item.costActuality !== "UNKNOWN" && item.estimatedMonthlyCostUsd != null);
  known.sort((a, b) => (a.estimatedMonthlyCostUsd ?? Infinity) - (b.estimatedMonthlyCostUsd ?? Infinity));
  return known[0] ?? quotes[0] ?? null;
}
