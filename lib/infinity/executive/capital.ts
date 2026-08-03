import type { CapitalSnapshot } from "./types";
import type { ExecutivePolicy } from "./types";

export function buildCapitalSnapshot(input: {
  totalCapacity: number;
  reservedCapacity: number;
  consumedCapacity: number;
  requestedAmount: number;
}): CapitalSnapshot {
  const availableCapacity = Math.max(
    0,
    input.totalCapacity - input.reservedCapacity - input.consumedCapacity,
  );

  return {
    totalCapacity: input.totalCapacity,
    reservedCapacity: input.reservedCapacity,
    consumedCapacity: input.consumedCapacity,
    availableCapacity,
    requestedAmount: input.requestedAmount,
  };
}

export function assessCapital(
  capital: CapitalSnapshot,
  policy: ExecutivePolicy,
): { sufficient: boolean; rationale: string[] } {
  const rationale: string[] = [];

  if (capital.availableCapacity < policy.minAvailableCapital) {
    rationale.push(
      `Available capital ${capital.availableCapacity} is below minimum ${policy.minAvailableCapital}.`,
    );
  }

  if (capital.requestedAmount > capital.availableCapacity) {
    rationale.push(
      `Requested allocation ${capital.requestedAmount} exceeds available ${capital.availableCapacity}.`,
    );
  }

  const sufficient =
    capital.availableCapacity >= policy.minAvailableCapital &&
    capital.requestedAmount <= capital.availableCapacity;

  if (sufficient) {
    rationale.push("Capital checks passed for requested build allocation.");
  }

  return { sufficient, rationale };
}
