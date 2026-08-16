export class OrganicGrowthEngineError extends Error {
  readonly classification: string;

  constructor(message: string, classification: string) {
    super(message);
    this.name = "OrganicGrowthEngineError";
    this.classification = classification;
  }
}

export function classifyOrganicGrowthFailure(error: unknown): string {
  if (error instanceof OrganicGrowthEngineError) return error.classification;
  if (error instanceof Error) {
    if (/disabled/i.test(error.message)) return "policy_blocked";
    if (/budget|cost|limit/i.test(error.message)) return "cost_blocked";
    if (/validation|schema|invalid/i.test(error.message)) return "validation_failed";
    if (/supabase|database|persist/i.test(error.message)) return "persistence_failed";
  }
  return "unknown";
}
