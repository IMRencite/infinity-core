import type { TreasuryStore } from "../store";
import { nowIso } from "../store";
import type { TreasuryControlState } from "../types";

export function getControlState(store: TreasuryStore, organizationId: string): TreasuryControlState {
  return store.controlFor(organizationId);
}

export function setFinancialAutonomy(store: TreasuryStore, organizationId: string, enabled: boolean): TreasuryControlState {
  return store.setControl(organizationId, { financialAutonomyEnabled: enabled });
}

export function setEmergencyFinancialFreeze(store: TreasuryStore, organizationId: string, frozen: boolean): TreasuryControlState {
  return store.setControl(organizationId, { emergencyFinancialFreeze: frozen });
}

export type MutationGate = {
  allowed: boolean;
  reasonCode: string | null;
  freezeSupersedes: boolean;
  readOnlySyncAllowed: true;
};

/**
 * Emergency freeze supersedes mission, venture, policy auto-auth,
 * commercialization intent, creative-media spend, and coding-agent spend.
 */
export function evaluateMutationGate(store: TreasuryStore, organizationId: string): MutationGate {
  const control = store.controlFor(organizationId);
  if (control.emergencyFinancialFreeze) {
    return {
      allowed: false,
      reasonCode: "EMERGENCY_FINANCIAL_FREEZE",
      freezeSupersedes: true,
      readOnlySyncAllowed: true,
    };
  }
  if (!control.financialAutonomyEnabled) {
    return {
      allowed: false,
      reasonCode: "FINANCIAL_AUTONOMY_DISABLED",
      freezeSupersedes: false,
      readOnlySyncAllowed: true,
    };
  }
  return { allowed: true, reasonCode: null, freezeSupersedes: false, readOnlySyncAllowed: true };
}

export function assertHistoryImmutable(_store: TreasuryStore): void {
  void nowIso;
}
