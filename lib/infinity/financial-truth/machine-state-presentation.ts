import { hqSettlementStatusLabel } from "./settlement-destination";

export const RAW_RECONCILIATION_MACHINE_STATE = "PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED" as const;

export function isInfinityMissionSafeCardText(display: string | null | undefined): boolean {
  return !visibleCardTextIncludesRawMachineState(display);
}

export function visibleCardTextIncludesRawMachineState(display: string | null | undefined): boolean {
  return Boolean(display && display.includes(RAW_RECONCILIATION_MACHINE_STATE));
}

export function hqReconciliationDisplay(stripeToLedger: string, settlementStatus: string): string {
  if (settlementStatus === RAW_RECONCILIATION_MACHINE_STATE) {
    return `${stripeToLedger}\nProcessor confirmed —\ndestination not connected`;
  }
  return `${stripeToLedger}\n${hqSettlementStatusLabel(settlementStatus)}`;
}

export function hqFinancialSyncDisplay(iso: string | null | undefined): string {
  if (!iso) return "UNKNOWN";
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return iso;
  const stamp = new Date(parsed);
  const date = stamp.toISOString().slice(0, 10);
  const time = stamp.toISOString().slice(11, 19);
  return `${date}\n${time} UTC`;
}

export function evaluateTimestampPresentationGate(input: {
  display: string;
  canonical: string;
}): { gate: "TimestampPresentationGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  const lines = input.display.split("\n");
  const reasons: string[] = [];
  if (input.display === input.canonical) reasons.push("RAW_ISO_SHOWN_AS_DISPLAY");
  if (lines.length < 2) reasons.push("TIMESTAMP_NOT_INTENTIONALLY_WRAPPED");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lines[0] ?? "")) reasons.push("DATE_LINE_INVALID");
  if (!/^\d{2}:\d{2}:\d{2} UTC$/.test(lines[1] ?? "")) reasons.push("TIME_LINE_INVALID");
  if (!input.canonical) reasons.push("CANONICAL_TIMESTAMP_MISSING");
  return {
    gate: "TimestampPresentationGate",
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: reasons.length ? reasons : ["INTENTIONAL_UTC_TIMESTAMP"],
  };
}

export function evaluateCurrentFinancialReconciliationDisplayGate(input: {
  display: string;
  canonical: string;
}): { gate: "CurrentFinancialReconciliationDisplayGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (visibleCardTextIncludesRawMachineState(input.display)) {
    reasons.push("RAW_MACHINE_STATE_ON_CARD");
  }
  if (!input.canonical) reasons.push("CANONICAL_STATE_MISSING");
  if (input.display.includes(" / ")) reasons.push("SLASH_CONCATENATED_MACHINE_STATE");
  return {
    gate: "CurrentFinancialReconciliationDisplayGate",
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: reasons.length ? reasons : ["HUMANIZED_RECONCILIATION_DISPLAY"],
  };
}
