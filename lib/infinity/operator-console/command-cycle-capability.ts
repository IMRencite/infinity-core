import type { HqFinancialTruthView } from "@/lib/infinity/financial-truth/types";
import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { HQ_SERVED_ARTIFACT_MARKER } from "./served-artifact-identity";

export { HQ_SERVED_ARTIFACT_MARKER };

export const COMMAND_CYCLE_CAPABILITY_PROJECTION = "CommandCycleCapabilityProjection" as const;
export const COMMAND_CYCLE_CAPABILITY_PROJECTION_GATE = "CommandCycleCapabilityProjectionGate" as const;
export const COMMAND_CYCLE_CANONICAL_CONSISTENCY_GATE = "CommandCycleCanonicalConsistencyGate" as const;

export type CommandCycleTreasuryLabel =
  | "CONNECTED / DEGRADED"
  | "CONNECTED / READY"
  | "NOT CONFIGURED";

export type CommandCycleCapabilityProjection = {
  contract: typeof COMMAND_CYCLE_CAPABILITY_PROJECTION;
  served_artifact: typeof HQ_SERVED_ARTIFACT_MARKER;
  treasury: "CONNECTED" | "NOT_CONFIGURED";
  treasury_health: "READY" | "DEGRADED" | "NOT_CONFIGURED";
  mercury: "READ_ONLY" | "NOT_CONFIGURED";
  verification: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  mutation: "GOVERNED / LOCKED" | "NOT_CONFIGURED";
  treasury_display: CommandCycleTreasuryLabel;
  source: "CanonicalTreasuryProjection" | "TreasuryHqReadModel" | "NONE";
  scope: "PARENT_IMR";
};

function numericAmount(value: number | "NOT_SET" | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function treasuryCapabilityExists(input: {
  financialTruth?: HqFinancialTruthView | null;
  treasuryModel?: TreasuryHqReadModel | null;
}): boolean {
  const treasury = input.financialTruth?.treasury_control;
  if (treasury?.contract === "CanonicalTreasuryProjection") return true;
  if (numericAmount(input.financialTruth?.capital.authorized_capital) != null) return true;
  if (numericAmount(input.financialTruth?.capital.allocated_capital) != null) return true;
  if (input.financialTruth?.mercury.connection) return true;
  if (input.treasuryModel?.treasurySource === "CANONICAL FINANCIAL TRUTH") return true;
  if (input.treasuryModel?.bankingProvider === "Mercury") return true;
  return false;
}

export function projectCommandCycleCapability(input: {
  financialTruth?: HqFinancialTruthView | null;
  treasuryModel?: TreasuryHqReadModel | null;
}): CommandCycleCapabilityProjection {
  const exists = treasuryCapabilityExists(input);
  const mercuryConnection = input.financialTruth?.mercury.connection ?? null;
  const completeness = input.financialTruth?.cash.cash_completeness ?? input.financialTruth?.treasury_control.cash_completeness;
  const live = mercuryConnection === "LIVE";
  if (!exists) {
    return {
      contract: COMMAND_CYCLE_CAPABILITY_PROJECTION,
      served_artifact: HQ_SERVED_ARTIFACT_MARKER,
      treasury: "NOT_CONFIGURED",
      treasury_health: "NOT_CONFIGURED",
      mercury: "NOT_CONFIGURED",
      verification: "UNKNOWN",
      mutation: "NOT_CONFIGURED",
      treasury_display: "NOT CONFIGURED",
      source: "NONE",
      scope: "PARENT_IMR",
    };
  }
  const degraded = !live || completeness === "PARTIAL" || completeness === "UNKNOWN";
  return {
    contract: COMMAND_CYCLE_CAPABILITY_PROJECTION,
    served_artifact: HQ_SERVED_ARTIFACT_MARKER,
    treasury: "CONNECTED",
    treasury_health: degraded ? "DEGRADED" : "READY",
    mercury: "READ_ONLY",
    verification: completeness === "COMPLETE" ? "COMPLETE" : completeness === "PARTIAL" ? "PARTIAL" : "UNKNOWN",
    mutation: "GOVERNED / LOCKED",
    treasury_display: degraded ? "CONNECTED / DEGRADED" : "CONNECTED / READY",
    source: input.financialTruth?.treasury_control ? "CanonicalTreasuryProjection" : "TreasuryHqReadModel",
    scope: "PARENT_IMR",
  };
}

export function evaluateCommandCycleCapabilityProjectionGate(
  projection: CommandCycleCapabilityProjection,
): { gate: typeof COMMAND_CYCLE_CAPABILITY_PROJECTION_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (projection.contract !== COMMAND_CYCLE_CAPABILITY_PROJECTION) reasons.push("MISSING_CONTRACT");
  if (projection.treasury === "CONNECTED" && projection.treasury_display === "NOT CONFIGURED") {
    reasons.push("CONNECTED_LABELED_NOT_CONFIGURED");
  }
  if (projection.mercury === "READ_ONLY" && projection.treasury_display === "NOT CONFIGURED") {
    reasons.push("READ_ONLY_LABELED_NOT_CONFIGURED");
  }
  return {
    gate: COMMAND_CYCLE_CAPABILITY_PROJECTION_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["COMMAND_CYCLE_FROM_CANONICAL_CAPABILITY"],
  };
}

export function evaluateCommandCycleCanonicalConsistencyGate(input: {
  projection: CommandCycleCapabilityProjection;
  displayed: string | null | undefined;
  hqShowsLiveCapital: boolean;
}): { gate: typeof COMMAND_CYCLE_CANONICAL_CONSISTENCY_GATE; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (input.displayed !== input.projection.treasury_display) reasons.push("DISPLAY_DIVERGED_FROM_PROJECTION");
  if (input.hqShowsLiveCapital && /not configured/i.test(input.displayed ?? "")) {
    reasons.push("HQ_CAPITAL_CONTRADICTS_NOT_CONFIGURED");
  }
  if (input.projection.treasury === "CONNECTED" && /not configured/i.test(input.displayed ?? "")) {
    reasons.push("CONNECTED_TREASURY_DISPLAYED_UNCONFIGURED");
  }
  return {
    gate: COMMAND_CYCLE_CANONICAL_CONSISTENCY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["COMMAND_CYCLE_MATCHES_CANONICAL_TREASURY"],
  };
}
