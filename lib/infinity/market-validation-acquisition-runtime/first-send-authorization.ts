import {
  CRE_CANDIDATE_ID,
  DEPLOYED_SEO_GEO_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { getActivePublicValidationArtifactId, getActivePublicValidationUrl } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import type { AcquisitionChannelType } from "./constants";
import {
  FIRST_COHORT_MAX_PROSPECTS,
  FIRST_OUTREACH_COOLDOWN_MS,
} from "./contact-governance";

export const FIRST_REAL_COHORT_ID = "chrt_cre_first_real_v1" as const;
export const FIRST_SEND_AUTHORIZATION_PACKAGE_ID = "authz_cre_first_real_outreach_v1" as const;

export const FIRST_SEND_STOP_CONDITIONS = [
  "provider_failure",
  "bounce",
  "opt_out",
  "complaint",
  "identity_uncertainty",
  "duplicate",
  "cohort_send_ceiling",
  "experiment_deadline",
  "experiment_state_change",
  "target_evidence_thresholds_already_achieved",
  "economic_limit_reached",
] as const;

export type FirstSendAuthorizationPackage = {
  packageId: typeof FIRST_SEND_AUTHORIZATION_PACKAGE_ID;
  prepared: true;
  executed: false;
  experimentId: typeof LOCKED_CRE_EXPERIMENT_ID;
  candidateId: typeof CRE_CANDIDATE_ID;
  artifactId: string;
  cohortId: typeof FIRST_REAL_COHORT_ID;
  prospectIds: string[];
  channel: AcquisitionChannelType;
  communicationProvider: "NONE";
  communicationCapability: "communication.email.send";
  landingUrl: string;
  attribution: {
    experimentId: typeof LOCKED_CRE_EXPERIMENT_ID;
    candidateId: typeof CRE_CANDIDATE_ID;
    artifactId: string;
    cohortId: typeof FIRST_REAL_COHORT_ID;
    campaign: "cre_validation_initial_cohort_v1";
  };
  maxProspects: typeof FIRST_COHORT_MAX_PROSPECTS;
  maxSendAttempts: number;
  maxInitialSends: number;
  maxProviderCostExposure: "UNKNOWN";
  cooldownMs: typeof FIRST_OUTREACH_COOLDOWN_MS;
  stopConditions: typeof FIRST_SEND_STOP_CONDITIONS;
  publicContactPaths: string[];
  authorizedForSend: false;
};

export function prepareFirstSendAuthorizationPackage(input: {
  prospectIds: string[];
  channel: AcquisitionChannelType;
  publicContactPaths?: string[];
}): FirstSendAuthorizationPackage {
  const artifactId = getActivePublicValidationArtifactId();
  return {
    packageId: FIRST_SEND_AUTHORIZATION_PACKAGE_ID,
    prepared: true,
    executed: false,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    candidateId: CRE_CANDIDATE_ID,
    artifactId,
    cohortId: FIRST_REAL_COHORT_ID,
    prospectIds: input.prospectIds,
    channel: input.channel,
    communicationProvider: "NONE",
    communicationCapability: "communication.email.send",
    landingUrl: getActivePublicValidationUrl() ?? DEPLOYED_SEO_GEO_SUCCESSOR_URL,
    attribution: {
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      candidateId: CRE_CANDIDATE_ID,
      artifactId,
      cohortId: FIRST_REAL_COHORT_ID,
      campaign: "cre_validation_initial_cohort_v1",
    },
    maxProspects: FIRST_COHORT_MAX_PROSPECTS,
    maxSendAttempts: input.prospectIds.length,
    maxInitialSends: input.prospectIds.length,
    maxProviderCostExposure: "UNKNOWN",
    cooldownMs: FIRST_OUTREACH_COOLDOWN_MS,
    stopConditions: FIRST_SEND_STOP_CONDITIONS,
    publicContactPaths: input.publicContactPaths ?? [],
    authorizedForSend: false,
  };
}
