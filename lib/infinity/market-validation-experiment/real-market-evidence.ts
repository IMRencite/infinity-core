import {
  getActivePublicValidationArtifactId,
  getActivePublicValidationDigest,
  isValidationGradeSuccessorPublicActive,
} from "./active-public-artifact";
import { CRE_CANDIDATE_ID, LOCKED_CRE_EXPERIMENT_ID, LOCKED_SUCCESS_CRITERIA } from "./constants";
import {
  lastReadyProtectionConfigureRemainsVerified,
  lastReadySourceBundleRemainsVerified,
} from "./live-validation-failure";
import { SOURCE_BUNDLE_CAPABILITY } from "@/lib/infinity/provider-capabilities/source-bundle-capability";
import { countProductionEvidence, ingestExperimentEvents } from "./events";
import type { ExperimentCounts, ExperimentEventRecord } from "./types";
import { inspectExperimentClock } from "./experiment-clock";
import { qualificationContract } from "./qualification-contract";
import { auditLivePublicAcquisitionAttribution } from "./attribution-audit";
import { evaluateOutreachReadiness } from "./acquisition-outreach-gate";
import { inspectMarketValidationAcquisitionMission } from "./acquisition-mission";
import { founderAssistedMissionProvenance, inspectFounderProspectAvailability } from "./founder-assisted-cohort";
import { evaluateDecisionReadiness } from "./decision-readiness";
import {
  analyzeAcquisitionChannels,
  first15Plan,
  nextAcquisitionAction,
  prioritizedChannels,
  rankedCrePersonas,
} from "./acquisition-plan";
import { inspectCollectingHqPresence } from "./collecting-hq";
import { inspectOrganicGrowthRoleForCreValidation } from "./organic-growth-role";
import { creOffer } from "./offer";

export const LIVE_CRE_EXPERIMENT_STATE = "COLLECTING" as const;

export function emptyRealCounts(): ExperimentCounts {
  return {
    qualifiedVisitors: 0,
    strongIntent: 0,
    qualifiedSubmissions: 0,
    pricingSelections: 0,
    pageViews: 0,
  };
}

export function countRealEvidence(events: ExperimentEventRecord[] = []): ExperimentCounts {
  const ingested = ingestExperimentEvents({ events });
  return countProductionEvidence(ingested.productionEvents);
}

export function inspectRealMarketEvidence(input: {
  events?: ExperimentEventRecord[];
  artifactFiles?: Array<{ path: string; content: string }>;
  now?: Date;
} = {}) {
  const counts = countRealEvidence(input.events ?? []);
  const clock = inspectExperimentClock(input.now);
  const decision = evaluateDecisionReadiness({
    counts,
    clock,
    deployedPublic: true,
  });
  const first15 = first15Plan();
  return {
    experiment: {
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      artifactId: getActivePublicValidationArtifactId(),
      digest: getActivePublicValidationDigest(),
      state: LIVE_CRE_EXPERIMENT_STATE,
      offer: creOffer().targetCustomer,
    },
    clock,
    counts,
    thresholds: LOCKED_SUCCESS_CRITERIA,
    qualification: qualificationContract(),
    personas: rankedCrePersonas(),
    channels: analyzeAcquisitionChannels(),
    prioritized: prioritizedChannels(),
    first15,
    expectedNotActual: first15.expectedAreActual === false && first15.altersRealCounts === false,
    attribution: auditLivePublicAcquisitionAttribution(),
    acquisition: (() => {
      const outreach = evaluateOutreachReadiness({
        successorFiles: input.artifactFiles ?? [],
        successorDeployedLive: isValidationGradeSuccessorPublicActive(),
        liveArtifactId: getActivePublicValidationArtifactId(),
      });
      return {
        prospects: inspectFounderProspectAvailability(),
        provenance: founderAssistedMissionProvenance(),
        outreach,
        mission: inspectMarketValidationAcquisitionMission({
          blocker: outreach.blocker,
          messagesBeingPrepared: false,
        }),
      };
    })(),
    decision,
    nextAction: nextAcquisitionAction(),
    organic: inspectOrganicGrowthRoleForCreValidation(),
    hq: inspectCollectingHqPresence({ experimentState: LIVE_CRE_EXPERIMENT_STATE }),
    capabilities: {
      sourceBundle: lastReadySourceBundleRemainsVerified().status,
      sourceBundleCapability: SOURCE_BUNDLE_CAPABILITY,
      protection: lastReadyProtectionConfigureRemainsVerified().status,
      protectionCapability: lastReadyProtectionConfigureRemainsVerified().capability,
    },
    money: {
      providerCost: "UNKNOWN" as const,
      ceilingsAreNotSpend: true,
    },
    unauthorizedActions: {
      paidAds: 0,
      externalOutreach: 0,
      leadPurchases: 0,
      domains: 0,
      dns: 0,
      stripe: 0,
      treasuryMovement: 0,
      providerDeployments: 0,
      protectionMutations: 0,
    },
  };
}
