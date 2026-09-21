export { MARKET_VALIDATION_ACQUISITION_RUNTIME, MARKET_VALIDATION_ACQUISITION, LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED, ACQUISITION_TRIGGERS, ACQUISITION_CHANNEL_TYPES, AUTHORIZATION_CLASSES, TELEMETRY_PERSISTENCE_NOTE, SCHEDULE_HOST_REQUIREMENT, MAX_DISCOVERY_COHORT } from "./constants";
export { invokeMarketValidationAcquisitionRuntime, acquisitionRuntimeScheduleHost, acquisitionRuntimeDue } from "./invoke";
export { runMarketValidationAcquisitionRuntime } from "./run";
export { calculateEvidenceGap, discoverCollectingExperiments } from "./evidence-gap";
export { acquisitionChannelRegistry, isProviderNeutral } from "./channels";
export { rankAcquisitionChannels, applyChannelOutcomes } from "./ranking";
export { classifyAuthorization, mayAutoExecute, communicationsAuthorizationGranted, paidAcquisitionAuthorizationGranted } from "./authorization";
export { extractProspectsFromFindings, inspectLiveProspectDiscoveryCapability, qualifyDiscoveredIdentity, discoverPublicProspects } from "./prospects";
export { discoverBoundedOrganicOpportunities } from "./organic";
export { evaluateCreativeAcquisitionNeed } from "./creative";
export { recordAcquisitionRuntimeObservation } from "./performance";
export { evaluateAcquisitionTrigger, isAcquisitionTrigger } from "./triggers";
export { scheduledEvaluationInterface, shouldRunScheduledEvaluation, ACQUISITION_SCHEDULE } from "./schedule";
export {
  PROSPECT_RESEARCH_PLAN,
  classifyProspectResearchFailure,
  runBoundedResearchTask,
  retryBackoffMs,
  mayRetryResearchTask,
  listEligibleGroundedResearchProviders,
  shouldUseResearchFallback,
  chooseResearchFallback,
  resolveResearchBlocker,
} from "./research-execution";
export { auditCommunicationCapabilities, executableCommunicationCapability } from "./communication-capabilities";
export { extractPublishedContactability, isActionableContact } from "./contactability";
export { prepareValidationDraft, rankPreparedProspects, resolvePreparationBlocker, campaignLineage } from "./outreach-package";
export { evaluateContactGovernance, firstCohortReady, cohortCeilingRespected } from "./contact-governance";
export {
  outreachAttemptIsQualifiedEvidence,
  deliveryIsQualifiedEvidence,
  siteVisitIsStrongIntent,
  siteVisitIsPricingIntent,
} from "./evidence-stages";
export { prepareFirstTouchValidationContract, activeValidationLandingUrl } from "./first-touch-contract";
export { prepareFirstSendAuthorizationPackage, FIRST_REAL_COHORT_ID } from "./first-send-authorization";
export { lookupPersistedProspect, persistedAcquisitionProspects, persistVerifiedProspect, resetPersistedAcquisitionProspects, persistedCohortProspects } from "./prospect-registry";
export { acceptPublishedProfessionalEmail, rejectGuessedEmailPermutation } from "./email-verification";
export { founderCommandRequestText } from "./governance";
export { mayTriggerIngestAcquisitionReevaluation, resetIngestAcquisitionGuard, ingestMustDisableLiveResearch } from "./ingest-guard";
export {
  runAutonomousAcquisitionTick,
  claimAcquisitionTick,
  completeAcquisitionTick,
  abandonStaleAcquisitionTick,
  resetAcquisitionTickLocks,
  acquisitionTickKey,
  acquisitionTriggerFromIngest,
  peekAcquisitionTickLock,
  ACQUISITION_RETRY_BACKOFF_MS,
} from "./tick";
export type { AcquisitionRuntimeInput, AcquisitionRuntimeResult, AcquisitionChannelRecord, EvidenceGap, DiscoveredProspect } from "./types";
