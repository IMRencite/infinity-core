import {
  HQ_INFORMATION_ARCHITECTURE_GATE,
  HQ_INFORMATION_ARCHITECTURE_PRINCIPLE,
  HQ_OPERATIONS_ROOM_QUALITY_GATE,
  HQ_OPERATIONS_ROUTE,
  HQ_PROGRESSIVE_DISCLOSURE_GATE,
  HQ_RUNTIME_ROUTE,
} from "./contract";

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export function evaluateHQInformationArchitectureGate(input: {
  homeSurfaceOrder: string[];
  largeOperatingPanelAboveCommand: boolean;
  operationsGroupedInRoom: boolean;
  runtimeHref: string;
  operationsHref: string;
  currentWorkDistinctFromRecent: boolean;
  operatingFloorOrder?: string[];
}): NamedGateResult {
  const reasons: string[] = [];
  const welcome = input.homeSurfaceOrder.indexOf("welcome");
  const ask = input.homeSurfaceOrder.indexOf("ask-infinity");
  const compact = input.homeSurfaceOrder.indexOf("compact-operating-summary");
  const pulse = input.homeSurfaceOrder.indexOf("financial-pulse");
  const command = input.homeSurfaceOrder.indexOf("command");
  const floor = input.homeSurfaceOrder.indexOf("operating-floor");
  const truth = input.homeSurfaceOrder.indexOf("financial-truth");
  if (welcome < 0 || ask < 0 || command < 0) reasons.push("PRIMARY_COMMAND_MISSING");
  if (welcome > ask || ask > command) reasons.push("PRIMARY_COMMAND_NOT_PROMINENT");
  if (compact >= 0 && command >= 0 && compact < command) reasons.push("STATUS_BETWEEN_HEADER_AND_COMMAND");
  if (pulse >= 0 && (pulse < ask || pulse > command)) reasons.push("PULSE_NOT_BETWEEN_HEADER_AND_COMMAND");
  if (pulse >= 0 && floor >= 0 && pulse > floor) reasons.push("PULSE_BELOW_ROOMS");
  if (truth >= 0 && floor >= 0 && truth < floor) reasons.push("FULL_TREASURY_ABOVE_ROOMS");
  if (floor >= 0 && floor < command) reasons.push("WORK_ABOVE_COMMAND");
  if (input.largeOperatingPanelAboveCommand) reasons.push("OBSERVABILITY_OUTRANKS_COMMAND");
  if (!input.operationsGroupedInRoom) reasons.push("OPERATIONS_NOT_GROUPED");
  if (input.runtimeHref === input.operationsHref) reasons.push("RUNTIME_OPERATIONS_COLLAPSED");
  if (input.runtimeHref !== HQ_RUNTIME_ROUTE) reasons.push("RUNTIME_HREF_INVALID");
  if (input.operationsHref !== HQ_OPERATIONS_ROUTE) reasons.push("OPERATIONS_HREF_INVALID");
  if (!input.currentWorkDistinctFromRecent) reasons.push("CURRENT_AND_RECENT_INDISTINGUISHABLE");
  if (input.operatingFloorOrder && input.operatingFloorOrder[0] !== "operations") {
    reasons.push("OPERATIONS_NOT_FIRST_ON_FLOOR");
  }
  if (!HQ_INFORMATION_ARCHITECTURE_PRINCIPLE.includes("SUBORDINATE")) reasons.push("PRINCIPLE_MISSING");
  return {
    gate: HQ_INFORMATION_ARCHITECTURE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQOperationsRoomQualityGate(input: {
  hasCurrentWork: boolean;
  hasRecentWork: boolean;
  hasBlockers: boolean;
  hasNextActions: boolean;
  hasSystemState: boolean;
  hasRuntimeSummary: boolean;
  hasVentureStatus: boolean;
  hasOpportunitySummary: boolean;
  hasTraceability: boolean;
  hasDrillDowns: boolean;
}): NamedGateResult {
  const reasons: string[] = [];
  if (!input.hasCurrentWork) reasons.push("CURRENT_WORK_MISSING");
  if (!input.hasRecentWork) reasons.push("RECENT_WORK_MISSING");
  if (!input.hasBlockers) reasons.push("BLOCKERS_MISSING");
  if (!input.hasNextActions) reasons.push("NEXT_ACTIONS_MISSING");
  if (!input.hasSystemState) reasons.push("SYSTEM_STATE_MISSING");
  if (!input.hasRuntimeSummary) reasons.push("RUNTIME_SUMMARY_MISSING");
  if (!input.hasVentureStatus) reasons.push("VENTURE_STATUS_MISSING");
  if (!input.hasOpportunitySummary) reasons.push("OPPORTUNITY_SUMMARY_MISSING");
  if (!input.hasTraceability) reasons.push("TRACEABILITY_MISSING");
  if (!input.hasDrillDowns) reasons.push("DRILLDOWN_MISSING");
  return {
    gate: HQ_OPERATIONS_ROOM_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQProgressiveDisclosureGate(input: {
  homepageHasLargeOperatingDetail: boolean;
  homepageHasCompactSummary: boolean;
  homepageHasOperationsDrillDown: boolean;
  commandPushedBelowMonitoring: boolean;
  operationsRoomHasDetail: boolean;
  homeAndRoomDuplicateFullDetail: boolean;
}): NamedGateResult {
  const reasons: string[] = [];
  if (input.homepageHasLargeOperatingDetail) reasons.push("HOME_HAS_ROOM_DETAIL");
  if (!input.homepageHasCompactSummary) reasons.push("HOME_SUMMARY_MISSING");
  if (input.homepageHasOperationsDrillDown) reasons.push("STATUS_STRIP_DUPLICATES_OPERATIONS_NAV");
  if (input.commandPushedBelowMonitoring) reasons.push("COMMAND_BELOW_MONITORING");
  if (!input.operationsRoomHasDetail) reasons.push("OPERATIONS_DETAIL_MISSING");
  if (input.homeAndRoomDuplicateFullDetail) reasons.push("DUPLICATE_FULL_DETAIL");
  return {
    gate: HQ_PROGRESSIVE_DISCLOSURE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
