export class VentureSelectionError extends Error {
  classification: string;
  constructor(message: string, classification: string) {
    super(message);
    this.name = "VentureSelectionError";
    this.classification = classification;
  }
}

export function classifyVentureSelectionFailure(error: unknown): VentureSelectionError {
  if (error instanceof VentureSelectionError) return error;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Unknown venture selection failure.";
  if (/budget|cost limit/i.test(message)) {
    return new VentureSelectionError(message, "budget_exceeded");
  }
  if (/disabled/i.test(message)) {
    return new VentureSelectionError(message, "policy_blocked");
  }
  if (/candidate|monetization/i.test(message)) {
    return new VentureSelectionError(message, "data_load_failure");
  }
  return new VentureSelectionError(message, "selection_failure");
}
