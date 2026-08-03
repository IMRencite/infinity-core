import type { WorkerCapabilityContract } from "./types";

export function validateStructuredOutput(
  contract: WorkerCapabilityContract,
  output: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const required = contract.outputSchema.required;
  if (Array.isArray(required)) {
    for (const field of required) {
      if (typeof field === "string" && !(field in output)) {
        errors.push(`Missing output field: ${field}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
