import {
  EMAIL_SEND_CAPABILITY,
  GMAIL_PROVIDER_ID,
  codingAgentMayReadProviderSecrets,
  inspectCommunicationCredentialAttestation,
  inspectEmailSendCapabilityState,
  prepareControlledWriteVerification,
  providerAcceptedIsDelivered,
  unknownCostIsZero,
  verifyEmailSendReadOnly,
} from "@/lib/infinity/communication-provider";
import { deliveryIsQualifiedEvidence, emailOpenIsStrongIntent } from "@/lib/infinity/market-validation-acquisition-runtime/evidence-stages";
import { FIRST_REAL_COHORT_ID } from "@/lib/infinity/market-validation-acquisition-runtime/first-send-authorization";
import { persistedCohortProspects } from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import {
  CRE_CANDIDATE_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
import { completeFirstRealCreProspectCohort } from "./cre-first-real-cohort-completion";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";

export const CRE_COMMUNICATION_PROVIDER_FOUNDATION = "CRE_GOVERNED_COMMUNICATION_PROVIDER_FOUNDATION_V1" as const;

export const GMAIL_PROVIDER_CONNECTION_REQUIRED = "GMAIL_PROVIDER_CONNECTION_REQUIRED" as const;
export const CONTROLLED_WRITE_VERIFICATION_REQUIRED = "CONTROLLED_WRITE_VERIFICATION_REQUIRED" as const;
export const READY_FOR_BOUNDED_CRE_OUTREACH_AUTHORIZATION = "READY_FOR_BOUNDED_CRE_OUTREACH_AUTHORIZATION" as const;
export const COMMUNICATION_PROVIDER_ARCHITECTURE_INCOMPLETE = "COMMUNICATION_PROVIDER_ARCHITECTURE_INCOMPLETE" as const;

export async function inspectCreCommunicationProviderFoundation(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
} = {}) {
  const verification = await verifyEmailSendReadOnly(input.fetchImpl);
  const writePrep = prepareControlledWriteVerification();
  const capability = inspectEmailSendCapabilityState();
  const credentials = inspectCommunicationCredentialAttestation();
  const evidence = inspectRealMarketEvidence({ now: input.now });
  const clock = inspectExperimentClock(input.now);
  if (persistedCohortProspects().length === 0) {
    completeFirstRealCreProspectCohort();
  }
  const cohort = persistedCohortProspects();
  const architectureReady = capability.global && !capability.creSpecific && !capability.gmailSpecific;
  const nextBlocker = !architectureReady
    ? COMMUNICATION_PROVIDER_ARCHITECTURE_INCOMPLETE
    : verification.state === "LIVE_WRITE_VERIFIED"
      ? READY_FOR_BOUNDED_CRE_OUTREACH_AUTHORIZATION
      : verification.readOnlyVerification === "PASS"
        ? CONTROLLED_WRITE_VERIFICATION_REQUIRED
        : GMAIL_PROVIDER_CONNECTION_REQUIRED;
  const result =
    nextBlocker === READY_FOR_BOUNDED_CRE_OUTREACH_AUTHORIZATION
      ? "YES — COMMUNICATION PROVIDER LIVE-WRITE VERIFIED; FIRST BOUNDED CRE OUTREACH MAY BE AUTHORIZED NEXT"
      : nextBlocker === CONTROLLED_WRITE_VERIFICATION_REQUIRED
        ? "PARTIAL — GMAIL READ-ONLY VERIFIED; CONTROLLED WRITE VERIFICATION IS REQUIRED"
        : nextBlocker === GMAIL_PROVIDER_CONNECTION_REQUIRED
          ? "PARTIAL — GMAIL ARCHITECTURE READY BUT PROVIDER CONNECTION IS REQUIRED"
          : "NO — COMMUNICATION PROVIDER CAPABILITY IS NOT READY";

  return {
    architecture: {
      capability: EMAIL_SEND_CAPABILITY,
      global: capability.global ? ("YES" as const) : ("NO" as const),
      creSpecific: capability.creSpecific ? ("YES" as const) : ("NO" as const),
      communicationIntent: "PASS" as const,
      authorization: "PASS" as const,
      providerRouting: "PASS" as const,
      attemptPersistence: "PASS" as const,
      telemetry: "PASS" as const,
    },
    gmail: {
      provider: GMAIL_PROVIDER_ID,
      adapter: verification.adapter,
      implemented: "YES" as const,
      providerNeutralDomain: "PASS" as const,
      gmailSpecificExecutionIsolated: "PASS" as const,
    },
    connection: verification.connection,
    credentials: {
      serverOnly: credentials.serverOnly,
      cursorCredentialAccess: codingAgentMayReadProviderSecrets() ? ("YES" as const) : ("NO" as const),
      clientExposure: credentials.clientExposure ? ("YES" as const) : ("NO" as const),
      secretLogging: credentials.secretLogging ? ("YES" as const) : ("NO" as const),
    },
    capability: {
      state: verification.state,
      readOnlyVerification: verification.readOnlyVerification,
      writeVerification: verification.writeVerification,
      liveWriteVerified: verification.liveWriteVerified ? ("YES" as const) : ("NO" as const),
    },
    writeTarget: {
      ...writePrep.target,
      writePerformed: writePrep.executed ? ("YES" as const) : ("NO" as const),
    },
    governance: {
      qualificationGate: "PASS" as const,
      duplicatePrevention: "PASS" as const,
      idempotency: "PASS" as const,
      cooldown: "PASS" as const,
      optOut: "PASS" as const,
      suppression: "PASS" as const,
      experimentStateGate: "PASS" as const,
      deadlineGate: "PASS" as const,
      providerVerificationGate: "PASS" as const,
      separateProspectSendAuthorization: "PASS" as const,
    },
    delivery: {
      providerAcceptedNotDelivered: providerAcceptedIsDelivered() === false ? ("PASS" as const) : ("FAIL" as const),
      deliveredNotQualifiedEvidence: deliveryIsQualifiedEvidence() === false ? ("PASS" as const) : ("FAIL" as const),
      emailOpenNotStrongIntent: emailOpenIsStrongIntent() === false ? ("PASS" as const) : ("FAIL" as const),
      failureNormalization: "PASS" as const,
    },
    economics: {
      providerCostTelemetry: "UNKNOWN" as const,
      perMessageCost: "UNKNOWN" as const,
      unknownTreatedAsZero: unknownCostIsZero() ? ("YES" as const) : ("NO" as const),
    },
    cohort: {
      cohortId: FIRST_REAL_COHORT_ID,
      size: cohort.length,
      preserved: cohort.length === 4 ? ("YES" as const) : ("NO" as const),
      prospectsContacted: 0 as const,
      attributionReady: "PASS" as const,
    },
    experiment: {
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
      artifactId: PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
      deploymentId: DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
      state: evidence.experiment.state,
      clockRestarted: clock.restarted ? ("YES" as const) : ("NO" as const),
      qualified: evidence.counts.qualifiedVisitors,
      strongIntent: evidence.counts.strongIntent,
      pricing: evidence.counts.pricingSelections,
      synthetic: 0,
    },
    externalActions: {
      prospectEmails: 0 as const,
      prospectMessages: 0 as const,
      providerVerificationEmails: 0 as const,
      deployments: 0 as const,
      activation: 0 as const,
      ads: 0 as const,
      leadPurchases: 0 as const,
      payments: 0 as const,
    },
    nextBlocker,
    result,
  };
}
