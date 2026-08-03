import type { VentureBlueprintTemplate } from "../templates/definitions";
import type { VentureBlueprint } from "../types/blueprint";
import type { ApprovedOpportunityInput } from "../types/opportunity-input";
import { buildBlueprintId } from "./select-template";

function clampPriority(score: number | null, confidence: number | null): number {
  const base = (score ?? 50) * 0.6 + (confidence ?? 50) * 0.4;
  return Math.max(1, Math.min(100, Math.round(base)));
}

function formatTimeline(weeks: number, score: number | null): string {
  const adjustment = score != null && score >= 70 ? -1 : score != null && score < 40 ? 2 : 0;
  const total = Math.max(4, weeks + adjustment);
  return `${total} weeks (blueprint estimate; no execution scheduled)`;
}

function formatBudget(baseUsd: number, score: number | null): string {
  const multiplier = score != null && score >= 75 ? 1.1 : score != null && score < 45 ? 0.85 : 1;
  const usd = Math.round(baseUsd * multiplier);
  return `USD ${usd.toLocaleString("en-US")} (planning estimate only)`;
}

function formatRoi(basePercent: number, score: number | null): string {
  const adjusted = basePercent + (score != null ? Math.round((score - 50) / 5) : 0);
  return `${Math.max(10, adjusted)}% (12-month blueprint projection)`;
}

export function generateVentureBlueprint(
  opportunity: ApprovedOpportunityInput,
  template: VentureBlueprintTemplate,
): VentureBlueprint {
  const ventureType = template.key;
  const blueprintId = buildBlueprintId(opportunity.organizationId, opportunity.id, ventureType);
  const name = opportunity.name.trim() || `${template.displayName} Venture Blueprint`;
  const description =
    opportunity.summary?.trim() ||
    opportunity.problem?.trim() ||
    `Blueprint for ${name} using ${template.displayName} template.`;

  const targetAudience =
    opportunity.targetCustomer?.trim() || "Target audience to be refined during validation.";
  const customerPersona = `${targetAudience} — primary persona derived from opportunity record.`;
  const valueProposition =
    opportunity.problem?.trim() ||
    `Deliver measurable value for ${targetAudience} via ${template.displayName}.`;

  return {
    id: blueprintId,
    ventureType,
    businessModel: opportunity.businessModel?.trim() || template.defaultBusinessModel,
    industry: opportunity.industry?.trim() || "general",
    name,
    description,
    targetAudience,
    customerPersona,
    valueProposition,
    revenueModel: template.defaultRevenueModel,
    marketingChannels: [...template.marketingChannels],
    requiredAssets: [...template.requiredAssets],
    requiredWorkers: [...template.requiredWorkers],
    requiredContent: [...template.requiredContent],
    requiredProducts: [...template.requiredProducts],
    requiredServices: [...template.requiredServices],
    estimatedTimeline: formatTimeline(template.baseTimelineWeeks, opportunity.overallScore),
    estimatedBudget: formatBudget(template.baseBudgetUsd, opportunity.overallScore),
    expectedROI: formatRoi(template.baseRoiPercent, opportunity.overallScore),
    priority: clampPriority(opportunity.overallScore, opportunity.confidenceScore),
    status: "validated",
    createdAt: new Date(0).toISOString(),
  };
}

export function stampBlueprintCreatedAt(
  blueprint: VentureBlueprint,
  createdAt: string,
): VentureBlueprint {
  return { ...blueprint, createdAt };
}
