import type { MercuryTreasuryRole, MercuryTreasuryStructure } from "./types";
import { MERCURY_TREASURY_STRUCTURE } from "./types";

export function buildMercuryTreasuryStructure(input: {
  role?: MercuryTreasuryRole;
  safeAccountReference: string;
}): MercuryTreasuryStructure {
  return {
    contract: MERCURY_TREASURY_STRUCTURE,
    role: input.role ?? "PARENT_TREASURY",
    safe_account_reference: input.safeAccountReference,
    provider_capabilities_verified: false,
    subaccounts_assumed: false,
  };
}
