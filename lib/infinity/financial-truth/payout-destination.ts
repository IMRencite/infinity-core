import type { PayoutDestination } from "./types";
import { classifySettlementDestination } from "./settlement-destination";

export function matchPayoutDestination(input: {
  bankName?: string | null;
  last4?: string | null;
  mercuryLast4?: string | null;
}): PayoutDestination {
  const name = (input.bankName ?? "").toLowerCase();
  const last4 = input.last4 ?? null;
  if (name.includes("mercury") || (last4 && input.mercuryLast4 && last4 === input.mercuryLast4)) {
    return "MERCURY_VERIFIED";
  }
  if (name || last4) return "OTHER_VERIFIED";
  return "UNKNOWN";
}

export { classifySettlementDestination };
