import { MERCURY_TREASURY_MUTATION_ADAPTER } from "../types";

export const MERCURY_TREASURY_MUTATION_STATUS = "NOT_ACTIVE" as const;

export class MercuryTreasuryMutationAdapter {
  readonly adapter = MERCURY_TREASURY_MUTATION_ADAPTER;
  readonly status = MERCURY_TREASURY_MUTATION_STATUS;
  readonly money_movement = false;
  readonly write_access = false;

  requiredControls(): string[] {
    return [
      "TREASURY_POLICY",
      "EAG_AUTHORIZATION",
      "RECIPIENT_VALIDATION",
      "AMOUNT_LIMITS",
      "VENTURE_ALLOCATION_VALIDATION",
      "CAPITAL_AVAILABILITY",
      "DUPLICATE_PAYMENT_PREVENTION",
      "RISK_CHECKS",
      "AUDIT_RECORD",
      "IDEMPOTENCY",
      "TRANSACTION_CONFIRMATION",
    ];
  }

  async mutate(): Promise<never> {
    throw new Error("MERCURY_MUTATION_NOT_ACTIVE");
  }
}

export function createMercuryTreasuryMutationAdapter(): MercuryTreasuryMutationAdapter {
  return new MercuryTreasuryMutationAdapter();
}
