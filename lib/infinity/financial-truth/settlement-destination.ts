import type { PayoutDestination, SettlementDestination, SettlementDestinationClassification } from "./types";
import { SETTLEMENT_DESTINATION_CONTRACT } from "./types";

export function classifySettlementDestination(destination: PayoutDestination): SettlementDestinationClassification {
  if (destination === "MERCURY_VERIFIED") return "MERCURY_PARENT";
  if (destination === "OTHER_VERIFIED") return "KNOWN_EXTERNAL_BANK";
  return "UNKNOWN";
}

export function mercuryMatchExpected(classification: SettlementDestinationClassification): boolean {
  return classification === "MERCURY_PARENT" || classification === "MERCURY_VENTURE";
}

export function destinationIsKnownNonMercury(classification: SettlementDestinationClassification): boolean {
  return (
    classification === "KNOWN_EXTERNAL_BANK" ||
    classification === "KNOWN_PARENT_BANK" ||
    classification === "KNOWN_VENTURE_BANK"
  );
}

export function buildSettlementDestination(
  classification: SettlementDestinationClassification,
  safeReference = "known non-Mercury bank",
): SettlementDestination {
  return {
    contract: SETTLEMENT_DESTINATION_CONTRACT,
    classification,
    safe_reference: classification === "UNKNOWN" ? "UNKNOWN" : safeReference,
    connected_to_infinity_treasury: mercuryMatchExpected(classification),
    mercury_required: false,
  };
}

export function hqSettlementDestinationLabel(classification: SettlementDestinationClassification): string {
  if (classification === "MERCURY_PARENT" || classification === "MERCURY_VENTURE") return "Mercury treasury";
  if (classification === "KNOWN_PARENT_BANK") return "Known parent bank";
  if (classification === "KNOWN_VENTURE_BANK") return "Known venture bank";
  if (classification === "KNOWN_EXTERNAL_BANK") return "Known external/parent bank";
  return "UNKNOWN";
}

export function hqSettlementStatusLabel(status: string): string {
  if (status === "PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED") {
    return "Processor confirmed — bank destination not connected";
  }
  if (status === "FULLY_RECONCILED") return "Fully reconciled";
  if (status === "PENDING") return "Pending";
  if (status === "FAILED") return "Failed";
  return "UNKNOWN";
}
