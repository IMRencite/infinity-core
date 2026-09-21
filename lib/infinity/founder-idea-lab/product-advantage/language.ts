import type { CapabilityStatus, DifferentiatorType, PainCategory } from "./types";

export function painCategoryLabel(category: PainCategory): string {
  const labels: Record<PainCategory, string> = {
    PRICE: "Price and packaging",
    COMPLEXITY: "Complexity",
    SEO: "Search visibility",
    AEO: "AI / answer-engine visibility",
    CONTENT: "Content quality",
    CUSTOMIZATION: "Customization",
    SUPPORT: "Support",
    SPEED: "Speed to value",
    AUTOMATION: "Automation",
    INTEGRATIONS: "Integrations",
    REPORTING: "Reporting",
    ONBOARDING: "Onboarding",
    LOCK_IN: "Lock-in",
    QUALITY: "Quality",
    SERVICE: "Service delivery",
    OTHER: "Other friction",
  };
  return labels[category];
}

export function capabilityStatusLabel(status: CapabilityStatus): string {
  if (status === "ALREADY_PLANNED") return "Already in the planned product";
  if (status === "ALREADY_BUILT") return "Already built";
  if (status === "PARTIALLY_COVERED") return "Partly covered by the current plan";
  if (status === "NEW_OPPORTUNITY") return "New opportunity";
  return "Not compared to the current plan yet";
}

export function differentiatorTypeLabel(type: DifferentiatorType): string {
  if (type === "TABLE_STAKES") return "Table stakes — customers already expect this";
  if (type === "INCREMENTAL_ADVANTAGE") return "Incremental advantage";
  if (type === "MEANINGFUL_DIFFERENTIATOR") return "Meaningful differentiator";
  return "Unproven idea";
}
