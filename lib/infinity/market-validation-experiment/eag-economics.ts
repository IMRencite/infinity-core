import type { CostClassification } from "./types";

export type EagEconomicPolicyInspection = {
  unknownAllowed: false;
  boundedAllowed: true;
  meteredAllowed: true;
  noIncrementalCostAllowed: true;
  treasuryRequiredForKnownCost: true;
  policyChanged: false;
  treasuryMovement: 0;
  newSpendingAuthorityCreated: false;
  unknownCostWithExplicitHumanCeiling: true;
  unknownCostWithExplicitHumanCeilingDoesNotWeakenGlobalUnknown: true;
};

export function inspectEagEconomicPolicy(): EagEconomicPolicyInspection {
  return {
    unknownAllowed: false,
    boundedAllowed: true,
    meteredAllowed: true,
    noIncrementalCostAllowed: true,
    treasuryRequiredForKnownCost: true,
    policyChanged: false,
    treasuryMovement: 0,
    newSpendingAuthorityCreated: false,
    unknownCostWithExplicitHumanCeiling: true,
    unknownCostWithExplicitHumanCeilingDoesNotWeakenGlobalUnknown: true,
  };
}

export function eagAllowsClassification(classification: CostClassification | "METERED"): boolean {
  const policy = inspectEagEconomicPolicy();
  if (classification === "UNKNOWN") return policy.unknownAllowed;
  if (classification === "BOUNDED") return policy.boundedAllowed;
  if (classification === "METERED") return policy.meteredAllowed;
  return policy.noIncrementalCostAllowed;
}

export function eagAllowsUnknownCostWithExplicitHumanCeiling(input: {
  founderAuthorizationRecognized: boolean;
  singleUse: boolean;
  providerCostState: CostClassification | "METERED";
}): boolean {
  const policy = inspectEagEconomicPolicy();
  if (policy.unknownAllowed) return false;
  return (
    policy.unknownCostWithExplicitHumanCeiling &&
    input.founderAuthorizationRecognized &&
    input.singleUse &&
    input.providerCostState === "UNKNOWN"
  );
}
