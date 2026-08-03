import { VentureFactoryError } from "../errors";
import type { ApprovedOpportunityInput } from "../types/opportunity-input";

const APPROVED_STATUSES = new Set(["approved", "recommended"]);
const APPROVED_DECISIONS = new Set(["build"]);

export function assertOpportunityApprovedForBlueprint(
  opportunity: ApprovedOpportunityInput,
): void {
  if (!opportunity.id?.trim()) {
    throw new VentureFactoryError("Opportunity id is required.", "invalid_opportunity");
  }

  if (!opportunity.organizationId?.trim()) {
    throw new VentureFactoryError("Organization id is required.", "invalid_opportunity");
  }

  if (opportunity.status === "rejected") {
    throw new VentureFactoryError("Rejected opportunities cannot generate blueprints.", "invalid_opportunity");
  }

  const approved =
    APPROVED_STATUSES.has(opportunity.status) || APPROVED_DECISIONS.has(opportunity.decision);

  if (!approved) {
    throw new VentureFactoryError(
      "Opportunity must be approved (status approved/recommended or decision build).",
      "opportunity_not_approved",
    );
  }

  if (!opportunity.name?.trim()) {
    throw new VentureFactoryError("Opportunity name is required.", "invalid_opportunity");
  }
}

export function mapOpportunityRow(row: Record<string, unknown>): ApprovedOpportunityInput {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name ?? ""),
    summary: (row.summary as string | null) ?? null,
    problem: (row.problem as string | null) ?? null,
    targetCustomer: (row.target_customer as string | null) ?? null,
    industry: (row.industry as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    businessModel: (row.business_model as string | null) ?? null,
    recommendedBuilder: (row.recommended_builder as string | null) ?? null,
    status: String(row.status ?? ""),
    decision: String(row.decision ?? ""),
    overallScore: row.overall_score != null ? Number(row.overall_score) : null,
    confidenceScore: row.confidence_score != null ? Number(row.confidence_score) : null,
  };
}
