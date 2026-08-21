import { SYSTEM_FAMILIES, type SystemFamily } from "./constants";

export const PROVIDER_NEUTRAL_FAMILIES: readonly SystemFamily[] = SYSTEM_FAMILIES;

export function isSystemFamily(value: string): value is SystemFamily {
  return (SYSTEM_FAMILIES as readonly string[]).includes(value);
}

export function familyPriorityRank(family: SystemFamily): number {
  const rank: Record<SystemFamily, number> = {
    IDENTITY_AND_ACCOUNTS: 0,
    AUTHORIZATION_AND_ROLES: 1,
    SECURITY_AND_RISK: 2,
    LEGAL_AND_COMPLIANCE: 3,
    PAYMENTS: 4,
    ENTITLEMENTS: 5,
    COMMERCE_AND_FULFILLMENT: 6,
    LEAD_CAPTURE: 7,
    CRM: 8,
    SCHEDULING: 9,
    TRANSACTIONAL_EMAIL: 10,
    SMS: 11,
    MARKETING_EMAIL: 12,
    ANALYTICS: 13,
    ATTRIBUTION: 14,
    CUSTOMER_SUPPORT: 15,
    CUSTOMER_SUCCESS: 16,
    REPUTATION_AND_REVIEWS: 17,
    LIFECYCLE_AUTOMATION: 18,
    CONTENT_AND_DISTRIBUTION: 19,
    SEO: 20,
    CUSTOMER_ACQUISITION: 21,
    SOCIAL_DISTRIBUTION: 22,
    OPERATIONS: 23,
    EXPERIMENTATION: 24,
    AFFILIATE_AND_PARTNERS: 25,
    LOCALIZATION: 26,
    HUMAN_OPERATIONS: 27,
  };
  return rank[family];
}
