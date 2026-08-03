/**
 * Minimal approved-opportunity shape for deterministic blueprint generation.
 */
export type ApprovedOpportunityInput = {
  id: string;
  organizationId: string;
  name: string;
  summary: string | null;
  problem: string | null;
  targetCustomer: string | null;
  industry: string | null;
  category: string | null;
  businessModel: string | null;
  recommendedBuilder: string | null;
  status: string;
  decision: string;
  overallScore: number | null;
  confidenceScore: number | null;
};
