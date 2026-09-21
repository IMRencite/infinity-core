import {
  EMAIL_SEND_CAPABILITY,
  GMAIL_PROVIDER_ID,
  codingAgentMayReadProviderSecrets,
  executeControlledGmailWriteVerification,
  inspectEmailSendCapabilityState,
  inspectGmailWriteVerificationRecord,
  inspectWriteVerificationAuthorizationConsumed,
  providerAcceptedIsDelivered,
  unknownCostIsZero,
} from "@/lib/infinity/communication-provider";
import { FIRST_REAL_COHORT_ID } from "@/lib/infinity/market-validation-acquisition-runtime/first-send-authorization";
import { persistedCohortProspects } from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
import { completeFirstRealCreProspectCohort } from "./cre-first-real-cohort-completion";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";

export const CRE_GMAIL_CONTROLLED_WRITE = "CRE_GMAIL_CONTROLLED_WRITE_VERIFICATION_V1" as const;
export const READY_FOR_BOUNDED_CRE_OUTREACH_AUTHORIZATION =
  "READY_FOR_BOUNDED_CRE_OUTREACH_AUTHORIZATION" as const;
export const CONTROLLED_WRITE_VERIFICATION_FAILED = "CONTROLLED_WRITE_VERIFICATION_FAILED" as const;
export const CONTROLLED_WRITE_TARGET_REQUIRED = "CONTROLLED_WRITE_TARGET_REQUIRED" as const;

export async function executeCreGmailControlledWrite(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
  durable?: boolean;
  skipIdentityProbe?: boolean;
} = {}) {
  if (persistedCohortProspects().length === 0) {
    completeFirstRealCreProspectCohort();
  }
  const executed = await executeControlledGmailWriteVerification({
    organizationId: LIVE_ORG,
    now: input.now,
    fetchImpl: input.fetchImpl,
    durable: input.durable,
    skipIdentityProbe: input.skipIdentityProbe,
  });
  const evidence = inspectRealMarketEvidence({ now: input.now });
  const clock = inspectExperimentClock(input.now);
  const cohort = persistedCohortProspects();
  const nextBlocker =
    executed.blocked &&
    (executed.blockedReason === "CONTROLLED_WRITE_TARGET_MISSING" ||
      executed.blockedReason === "WRITE_VERIFICATION_NOT_AUTHORIZED" ||
      executed.blockedReason === "PROSPECT_CANNOT_BE_PROVIDER_VERIFICATION_RECIPIENT") &&
    executed.sendAttempts === 0
      ? CONTROLLED_WRITE_TARGET_REQUIRED
      : executed.liveWriteVerified && executed.canonicalReadback === "LIVE_WRITE_VERIFIED"
        ? READY_FOR_BOUNDED_CRE_OUTREACH_AUTHORIZATION
        : CONTROLLED_WRITE_VERIFICATION_FAILED;
  const result =
    nextBlocker === READY_FOR_BOUNDED_CRE_OUTREACH_AUTHORIZATION
      ? "YES — GMAIL LIVE-WRITE VERIFIED; FIRST BOUNDED CRE OUTREACH MAY BE AUTHORIZED NEXT"
      : nextBlocker === CONTROLLED_WRITE_TARGET_REQUIRED
        ? "BLOCKED — CONTROLLED WRITE TARGET OR AUTHORIZATION INVALID; NO EMAIL SENT"
        : "NO — CONTROLLED GMAIL WRITE VERIFICATION FAILED; AUTHORIZATION CONSUMED; NO RETRY AUTHORIZED";

  return {
    provider: GMAIL_PROVIDER_ID,
    capability: EMAIL_SEND_CAPABILITY,
    purpose: executed.purpose,
    verification: executed,
    capabilityName: EMAIL_SEND_CAPABILITY,
    capabilityBefore: executed.capabilityBefore,
    capabilityAfter: executed.capabilityAfter,
    canonicalReadback: inspectEmailSendCapabilityState().state,
    liveWriteVerified: executed.liveWriteVerified ? ("YES" as const) : ("NO" as const),
    connectionRecord: inspectGmailWriteVerificationRecord(),
    authorizationConsumed: inspectWriteVerificationAuthorizationConsumed() ? ("YES" as const) : ("NO" as const),
    providerAcceptedNotDelivered: providerAcceptedIsDelivered() === false ? ("PASS" as const) : ("FAIL" as const),
    unknownCostTreatedAsZero: unknownCostIsZero() ? ("YES" as const) : ("NO" as const),
    codingAgentCredentialAccess: codingAgentMayReadProviderSecrets() ? ("YES" as const) : ("NO" as const),
    prospectEmails: 0 as const,
    prospectMessages: 0 as const,
    outreachAttempts: 0 as const,
    providerVerificationEmails: executed.emailsSubmitted,
    deployments: 0 as const,
    activation: 0 as const,
    cohort: {
      cohortId: FIRST_REAL_COHORT_ID,
      size: cohort.length,
    },
    experiment: {
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
      artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
      state: evidence.experiment.state,
      clockRestarted: clock.restarted ? ("YES" as const) : ("NO" as const),
      qualified: evidence.counts.qualifiedVisitors,
      strongIntent: evidence.counts.strongIntent,
      pricing: evidence.counts.pricingSelections,
      synthetic: 0,
    },
    nextBlocker,
    result,
  };
}
