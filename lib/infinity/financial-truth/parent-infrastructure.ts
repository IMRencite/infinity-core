import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import type {
  CanonicalFinancialRule,
  FinancialConcept,
  ParentFinancialInfrastructureMode,
  SharedProcessorAccount,
  SettlementDestinationClassification,
} from "./types";
import {
  CANONICAL_FINANCIAL_RULES,
  FINANCIAL_CONCEPTS,
  FORBIDDEN_FINANCIAL_RULES,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
  PARENT_INFRASTRUCTURE_MODES,
  SHARED_PROCESSOR_ACCOUNT_CONTRACT,
} from "./types";

export { PARENT_INFRASTRUCTURE_MODES };

export const CURRENT_PARENT_FINANCIAL_INFRASTRUCTURE_MODE: ParentFinancialInfrastructureMode =
  "SHARED_PARENT_FINANCIAL_INFRASTRUCTURE";

export const PARENT_OPERATING_ENTITY = "IMR" as const;

export const SEPARATE_VENTURE_BANKING_SUPPORTED = true;
export const MERCURY_TREASURY_SUPPORTED = true;
export const SHARED_STRIPE_SUPPORTED = true;

export function currentParentInfrastructureMode(): ParentFinancialInfrastructureMode {
  return CURRENT_PARENT_FINANCIAL_INFRASTRUCTURE_MODE;
}

export function stripeMustSettleToMercury(): false {
  return false;
}

export function forbiddenFinancialRules(): readonly string[] {
  return FORBIDDEN_FINANCIAL_RULES;
}

export function canonicalFinancialRules(): readonly CanonicalFinancialRule[] {
  return CANONICAL_FINANCIAL_RULES;
}

export function separatedFinancialConcepts(): readonly FinancialConcept[] {
  return FINANCIAL_CONCEPTS;
}

export function conceptsAreCollapsed(values: Record<FinancialConcept, number | null | "NOT_SET">): boolean {
  const distinct = new Set(Object.values(values).map((value) => String(value)));
  return distinct.size === 1 && Object.keys(values).length > 1;
}

export function buildSharedProcessorAccount(input: {
  classification: SettlementDestinationClassification;
  lastVerifiedAt: string | null;
  status: "LIVE" | "FAIL";
  connectedVentures?: string[];
}): SharedProcessorAccount {
  return {
    contract: SHARED_PROCESSOR_ACCOUNT_CONTRACT,
    provider: "STRIPE",
    provider_account_id: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
    legal_owner: "UNKNOWN",
    operating_entity: PARENT_OPERATING_ENTITY,
    shared_across_ventures: true,
    connected_ventures: input.connectedVentures ?? [CRE_VENTURE_ID],
    settlement_destination_classification: input.classification,
    settlement_destination_reference:
      input.classification === "UNKNOWN" ? "stripe dest ****????" : `stripe dest ${input.classification}`,
    last_verified_at: input.lastVerifiedAt,
    status: input.status,
  };
}

export function settlementChangesRevenueAttribution(): false {
  return false;
}

export function cashLocationIsRevenueOwnership(): false {
  return false;
}

export function spendingAuthorityDerivedFromBalance(): false {
  return false;
}
