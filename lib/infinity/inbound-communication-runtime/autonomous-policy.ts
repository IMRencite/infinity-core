import type { AutonomousCommunicationDecision, IntentClassification, PolicyOutcome } from "./types";

export function evaluateAutonomousCommunicationPolicy(input: {
  classification: IntentClassification;
  identityCertain: boolean;
  trackedThread: boolean;
  securitySensitive?: boolean;
  unsupportedFactualClaim?: boolean;
  regulated?: boolean;
  authorityConflict?: boolean;
  legalCommitment?: boolean;
  fraudSuspicion?: boolean;
  providerAnomaly?: boolean;
  policyConflict?: boolean;
}): AutonomousCommunicationDecision {
  if (!input.identityCertain || !input.trackedThread) {
    return decision("PAUSE_EXCEPTION", "IDENTITY_OR_THREAD_UNCERTAIN", null, "IDENTITY_UNCERTAINTY");
  }
  if (input.securitySensitive) return decision("PAUSE_EXCEPTION", "SECURITY_SENSITIVE_REQUEST", null, "SECURITY_SENSITIVE");
  if (input.unsupportedFactualClaim) return decision("PAUSE_EXCEPTION", "UNSUPPORTED_FACTUAL_CLAIM", null, "UNSUPPORTED_CLAIM");
  if (input.regulated) return decision("PAUSE_EXCEPTION", "REGULATED_HIGH_RISK", null, "REGULATED");
  if (input.authorityConflict) return decision("PAUSE_EXCEPTION", "AUTHORITY_CONFLICT", null, "AUTHORITY_CONFLICT");
  if (input.legalCommitment) return decision("PAUSE_EXCEPTION", "AMBIGUOUS_LEGAL_COMMITMENT", null, "LEGAL_COMMITMENT");
  if (input.fraudSuspicion) return decision("PAUSE_EXCEPTION", "FRAUD_SUSPICION", null, "FRAUD");
  if (input.providerAnomaly) return decision("PAUSE_EXCEPTION", "PROVIDER_ANOMALY", null, "PROVIDER_ANOMALY");
  if (input.policyConflict) return decision("PAUSE_EXCEPTION", "POLICY_CONFLICT", null, "POLICY_CONFLICT");

  switch (input.classification.intent) {
    case "MEETING_REQUEST":
      return decision("ROUTE_TO_GOVERNED_SYSTEM", "MEETING_REQUEST", "scheduling_calendar", null);
    case "REFERRAL_TO_OTHER_PERSON":
      return decision("ROUTE_TO_GOVERNED_SYSTEM", "REFERRAL_TO_OTHER_PERSON", "acquisition_prospect_qualification", null);
    case "PRICING_QUESTION":
      return decision("AUTO_EXECUTE", "AUTHORIZED_PRICING_ANSWER", "venture_pricing", null);
    case "OPT_OUT":
    case "NOT_INTERESTED":
    case "WRONG_PERSON":
    case "OUT_OF_OFFICE":
    case "AUTOMATED_REPLY":
    case "BOUNCE":
    case "POSITIVE_INTEREST":
    case "REQUEST_MORE_INFORMATION":
    case "OBJECTION":
    case "OTHER":
      return decision("AUTO_EXECUTE", input.classification.intent, null, null);
  }
}

export function routineEmailRequiresFounderApproval(): false {
  return false;
}

export function blanketDraftForReviewGate(): false {
  return false;
}

function decision(
  outcome: PolicyOutcome,
  reason: string,
  routedSystem: string | null,
  pauseCode: string | null,
): AutonomousCommunicationDecision {
  return {
    outcome,
    reason,
    routedSystem,
    founderApprovalRequired: false,
    liveReplyAuthorized: false,
    pauseCode,
  };
}
