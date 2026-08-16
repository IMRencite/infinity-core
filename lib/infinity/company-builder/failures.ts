export class CompanyBuilderError extends Error {
  constructor(
    message: string,
    readonly classification: string,
  ) {
    super(message);
    this.name = "CompanyBuilderError";
  }
}

export function classifyCompanyBuilderFailure(error: unknown): {
  classification: string;
  message: string;
} {
  if (error instanceof CompanyBuilderError) {
    return { classification: error.classification, message: error.message };
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  if (/disabled/i.test(message)) return { classification: "disabled", message };
  if (/OPENAI|API key|provider/i.test(message)) return { classification: "provider_error", message };
  if (/numeric field overflow|duplicate key|violates foreign key|Supabase|Postgres/i.test(message)) {
    return { classification: "persistence_error", message };
  }
  if (/no handoff|no candidate|simulation not allowed/i.test(message)) {
    return { classification: "input_error", message };
  }
  return { classification: "unknown_error", message };
}
