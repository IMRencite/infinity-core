import {
  EMAIL_SEND_CAPABILITY,
  FOUNDER_GOOGLE_OAUTH_CONFIGURATION_REQUIRED,
  GMAIL_PROVIDER_ID,
  codingAgentMayReadProviderSecrets,
  gmailFounderSetupContract,
  inspectGmailConnectionRecord,
  prepareControlledWriteVerification,
  verifyEmailSendReadOnly,
} from "@/lib/infinity/communication-provider";
import { FIRST_REAL_COHORT_ID } from "@/lib/infinity/market-validation-acquisition-runtime/first-send-authorization";
import { persistedCohortProspects } from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import {
  CRE_CANDIDATE_ID,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
import { completeFirstRealCreProspectCohort } from "./cre-first-real-cohort-completion";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";

export const CRE_GMAIL_CONNECTION_READONLY = "CRE_GMAIL_CONNECTION_READONLY_V1" as const;
export const CONTROLLED_WRITE_TARGET_REQUIRED = "CONTROLLED_WRITE_TARGET_REQUIRED" as const;
export const CONTROLLED_WRITE_VERIFICATION_REQUIRED = "CONTROLLED_WRITE_VERIFICATION_REQUIRED" as const;
export const COMMUNICATION_PROVIDER_CONNECTION_FAILED = "COMMUNICATION_PROVIDER_CONNECTION_FAILED" as const;
export const GMAIL_READ_ONLY_VERIFICATION_FAILED = "GMAIL_READ_ONLY_VERIFICATION_FAILED" as const;

export async function inspectCreGmailConnectionReadonly(input: {
  now?: Date;
  fetchImpl?: typeof fetch;
} = {}) {
  if (persistedCohortProspects().length === 0) {
    completeFirstRealCreProspectCohort();
  }
  const verification = await verifyEmailSendReadOnly(input.fetchImpl);
  const writePrep = prepareControlledWriteVerification();
  const setup = gmailFounderSetupContract();
  const credentials = verification.credentials;
  const configuredNames = [
    credentials.clientIdPresent ? "GMAIL_OAUTH_CLIENT_ID" : null,
    credentials.clientSecretPresent ? "GMAIL_OAUTH_CLIENT_SECRET" : null,
    credentials.refreshTokenPresent ? "GMAIL_OAUTH_REFRESH_TOKEN" : null,
    credentials.senderEmailDeclared ? "GMAIL_SENDER_EMAIL" : null,
    credentials.writeVerificationMailboxDeclared ? "INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX" : null,
    credentials.writeVerificationAuthorized ? "INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED" : null,
  ].filter((name): name is string => Boolean(name));
  const required = [...setup.requiredEnvNames];
  const missing = required.filter((name) => !configuredNames.includes(name));
  const evidence = inspectRealMarketEvidence({ now: input.now });
  const clock = inspectExperimentClock(input.now);
  const cohort = persistedCohortProspects();
  const nextBlocker =
    verification.connection.failure === "GOOGLE_OAUTH_NOT_CONFIGURED" || missing.length > 0
      ? FOUNDER_GOOGLE_OAUTH_CONFIGURATION_REQUIRED
      : verification.state === "READ_ONLY_VERIFIED" && writePrep.target.safeForProviderVerification === "YES"
        ? CONTROLLED_WRITE_VERIFICATION_REQUIRED
        : verification.state === "READ_ONLY_VERIFIED"
          ? CONTROLLED_WRITE_TARGET_REQUIRED
          : verification.state === "FAILED_VERIFICATION" || verification.connection.failure
            ? GMAIL_READ_ONLY_VERIFICATION_FAILED
            : FOUNDER_GOOGLE_OAUTH_CONFIGURATION_REQUIRED;
  const result =
    nextBlocker === CONTROLLED_WRITE_VERIFICATION_REQUIRED
      ? "YES — GMAIL CONNECTION READ-ONLY VERIFIED; CONTROLLED WRITE VERIFICATION IS NEXT"
      : nextBlocker === CONTROLLED_WRITE_TARGET_REQUIRED
        ? "PARTIAL — GMAIL READ-ONLY VERIFIED BUT CONTROLLED WRITE TARGET IS REQUIRED"
        : nextBlocker === FOUNDER_GOOGLE_OAUTH_CONFIGURATION_REQUIRED
          ? "PARTIAL — GMAIL PROVIDER READY FOR CONFIGURATION; FOUNDER GOOGLE OAUTH SETUP REQUIRED"
          : "NO — GMAIL READ-ONLY CONNECTION VERIFICATION FAILED";

  return {
    provider: GMAIL_PROVIDER_ID,
    capabilityName: EMAIL_SEND_CAPABILITY,
    architecture: "PASS" as const,
    authenticationMode: verification.connection.authenticationMode,
    environment: {
      required: required,
      optional: setup.optionalEnvNames,
      configured: configuredNames,
      missing,
      secrets: setup.secretEnvNames,
      secretValuesPrinted: "NO" as const,
    },
    google: {
      gmailApiRequired: "YES" as const,
      oauthClientRequired: "YES" as const,
      oauthApplicationType: setup.oauthApplicationType,
      requiredRedirectUri: setup.requiredRedirectUri,
      requiredScopes: setup.requiredScopes,
      additionalGoogleApis: "NONE" as const,
    },
    connection: verification.connection,
    credentials: {
      serverOnly: credentials.serverOnly,
      cursorCredentialAccess: codingAgentMayReadProviderSecrets() ? ("YES" as const) : ("NO" as const),
      clientExposure: credentials.clientExposure ? ("YES" as const) : ("NO" as const),
      secretLogging: credentials.secretLogging ? ("YES" as const) : ("NO" as const),
      artifactExposure: "NO" as const,
    },
    capability: {
      before: "UNVERIFIED" as const,
      after: verification.state,
      liveWriteVerified: "NO" as const,
      readOnlyVerification: verification.readOnlyVerification,
    },
    writeTarget: {
      target: writePrep.target.target,
      authorized: credentials.writeVerificationAuthorized ? ("YES" as const) : ("NO" as const),
      organizationControlled: writePrep.target.organizationControlled,
      ownership: writePrep.target.ownership,
      safeForNext: writePrep.target.safeForProviderVerification,
      writePerformed: "NO" as const,
    },
    connectionRecord: inspectGmailConnectionRecord(),
    founderSetup: setup,
    emailsSent: 0 as const,
    prospectEmails: 0 as const,
    draftsCreated: 0 as const,
    mailboxMutations: 0 as const,
    cohort: {
      cohortId: FIRST_REAL_COHORT_ID,
      size: cohort.length,
      prospectsContacted: 0 as const,
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
