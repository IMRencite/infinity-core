export const HQ_SECONDARY_STATUS_LAYOUT_GATE = "HQSecondaryStatusLayoutGate" as const;
export const HQ_DUPLICATE_SUMMARY_GATE = "HQDuplicateSummaryGate" as const;
export const RESPONSIVE_CARD_LAYOUT_GATE = "ResponsiveCardLayoutGate" as const;
export const MACHINE_STATE_READABILITY_GATE = "MachineStateReadabilityGate" as const;

export type NamedLayoutGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

function pass(gate: string, reason: string): NamedLayoutGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedLayoutGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateHQSecondaryStatusLayoutGate(input: {
  rowPresent: boolean;
  systemPanelPresent: boolean;
  mailboxPanelPresent: boolean;
  desktopSplit: boolean;
  mobileStacks: boolean;
  afterCommand: boolean;
  beforeRooms: boolean;
}): NamedLayoutGate {
  const reasons: string[] = [];
  if (!input.rowPresent) reasons.push("SECONDARY_ROW_MISSING");
  if (!input.systemPanelPresent) reasons.push("SYSTEM_PANEL_MISSING");
  if (!input.mailboxPanelPresent) reasons.push("MAILBOX_PANEL_MISSING");
  if (!input.desktopSplit) reasons.push("DESKTOP_NOT_50_50");
  if (!input.mobileStacks) reasons.push("MOBILE_DOES_NOT_STACK");
  if (!input.afterCommand) reasons.push("ROW_NOT_AFTER_COMMAND");
  if (!input.beforeRooms) reasons.push("ROW_NOT_BEFORE_ROOMS");
  return reasons.length
    ? fail(HQ_SECONDARY_STATUS_LAYOUT_GATE, reasons)
    : pass(HQ_SECONDARY_STATUS_LAYOUT_GATE, "SYSTEM_AND_MAILBOX_50_50");
}

export function evaluateHQDuplicateSummaryGate(input: {
  legacyProfitGeneratedOnHq: boolean;
  legacyCompaniesBuiltOnHq: boolean;
  legacyOperatingVenturesOnHq: boolean;
  legacyTopVentureOnHq: boolean;
  executivePulsePresent: boolean;
}): NamedLayoutGate {
  const reasons: string[] = [];
  if (input.legacyProfitGeneratedOnHq) reasons.push("LEGACY_PROFIT_GENERATED_REMAINS");
  if (input.legacyCompaniesBuiltOnHq) reasons.push("LEGACY_COMPANIES_BUILT_REMAINS");
  if (input.legacyOperatingVenturesOnHq) reasons.push("LEGACY_OPERATING_VENTURES_REMAINS");
  if (input.legacyTopVentureOnHq) reasons.push("LEGACY_TOP_VENTURE_REMAINS");
  if (!input.executivePulsePresent) reasons.push("EXECUTIVE_PULSE_MISSING");
  return reasons.length
    ? fail(HQ_DUPLICATE_SUMMARY_GATE, reasons)
    : pass(HQ_DUPLICATE_SUMMARY_GATE, "PULSE_IS_SINGLE_COMPACT_SUMMARY");
}

export function evaluateResponsiveCardLayoutGate(input: {
  desktopSplit: boolean;
  mobileStacks: boolean;
  overflowHidden: boolean;
}): NamedLayoutGate {
  const reasons: string[] = [];
  if (!input.desktopSplit) reasons.push("DESKTOP_NOT_SPLIT");
  if (!input.mobileStacks) reasons.push("MOBILE_NOT_STACKED");
  if (!input.overflowHidden) reasons.push("OVERFLOW_NOT_CONTAINED");
  return reasons.length
    ? fail(RESPONSIVE_CARD_LAYOUT_GATE, reasons)
    : pass(RESPONSIVE_CARD_LAYOUT_GATE, "RESPONSIVE_50_50");
}

export function evaluateMachineStateReadabilityGate(input: {
  longValuesContained: boolean;
  noRawErrorDump: boolean;
  noTimestampWrap: boolean;
}): NamedLayoutGate {
  const reasons: string[] = [];
  if (!input.longValuesContained) reasons.push("LONG_VALUES_ESCAPE");
  if (!input.noRawErrorDump) reasons.push("RAW_ERROR_DOMINATES");
  if (!input.noTimestampWrap) reasons.push("TIMESTAMP_WRAP");
  return reasons.length
    ? fail(MACHINE_STATE_READABILITY_GATE, reasons)
    : pass(MACHINE_STATE_READABILITY_GATE, "MACHINE_STATE_CONTAINED");
}
