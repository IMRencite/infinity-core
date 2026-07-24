export const OPPORTUNITY_STATUSES = [
  "discovered",
  "researching",
  "scored",
  "validating",
  "recommended",
  "approved",
  "rejected",
  "held",
  "converted",
] as const;

export const OPPORTUNITY_DECISIONS = [
  "pending",
  "reject",
  "hold",
  "research_more",
  "validate",
  "build",
] as const;

export const OPPORTUNITY_BUILDER_TYPES = [
  "saas",
  "ecommerce",
  "marketplace",
  "affiliate",
  "media",
  "directory",
  "course",
  "community",
  "newsletter",
  "mobile_app",
  "ai_tool",
  "browser_extension",
  "local_service",
  "custom",
] as const;

export function isOpportunityStatus(value: string): boolean {
  return (OPPORTUNITY_STATUSES as readonly string[]).includes(value);
}

export function isOpportunityDecision(value: string): boolean {
  return (OPPORTUNITY_DECISIONS as readonly string[]).includes(value);
}
