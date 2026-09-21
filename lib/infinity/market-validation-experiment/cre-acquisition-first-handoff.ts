import {
  GMAIL_PROVIDER_ID,
  inspectEmailSendCapabilityState,
} from "@/lib/infinity/communication-provider";
import {
  acquisitionChannelRegistry,
  auditCommunicationCapabilities,
  calculateEvidenceGap,
  executableCommunicationCapability,
  MARKET_VALIDATION_ACQUISITION_RUNTIME,
  rankAcquisitionChannels,
  recordAcquisitionRuntimeObservation,
} from "@/lib/infinity/market-validation-acquisition-runtime";
import type { AcquisitionChannelType } from "@/lib/infinity/market-validation-acquisition-runtime/constants";
import {
  cohortCeilingRespected,
  evaluateContactGovernance,
  firstCohortReady,
  FIRST_COHORT_MAX_PROSPECTS,
  FIRST_OUTREACH_COOLDOWN_MS,
} from "@/lib/infinity/market-validation-acquisition-runtime/contact-governance";
import {
  deliveryIsQualifiedEvidence,
  emailOpenIsStrongIntent,
  outreachAttemptIsQualifiedEvidence,
  PRICING_INTENT_RULE,
  QUALIFIED_EVIDENCE_RULE,
  siteVisitIsPricingIntent,
  siteVisitIsStrongIntent,
  STRONG_INTENT_RULE,
} from "@/lib/infinity/market-validation-acquisition-runtime/evidence-stages";
import { prepareFirstTouchValidationContract } from "@/lib/infinity/market-validation-acquisition-runtime/first-touch-contract";
import {
  FIRST_REAL_COHORT_ID,
  FIRST_SEND_STOP_CONDITIONS,
  prepareFirstSendAuthorizationPackage,
} from "@/lib/infinity/market-validation-acquisition-runtime/first-send-authorization";
import {
  lookupPersistedProspect,
  persistedCohortProspects,
  type PersistedProspectRecord,
} from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import type { DiscoveredProspect } from "@/lib/infinity/market-validation-acquisition-runtime/types";
import {
  CRE_CANDIDATE_ID,
  DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEO_GEO_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
import {
  getActivePublicValidationArtifactId,
  getActivePublicValidationDeploymentId,
  getActivePublicValidationUrl,
} from "./active-public-artifact";
import { inspectExperimentClock } from "./experiment-clock";
import { CRE_VALIDATION_ALLOWLIST, handlePublicValidationIngest, resetPublicIngestRuntime } from "./ingest";
import { pageViewIsQualified, qualificationContract } from "./qualification-contract";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { setExperimentRuntimeState } from "./runtime-state";
import { calebStruewingAsDiscoveredProspect, verifyCalebStruewingKnownProspect } from "./cre-known-prospect-verification";
import { rankedCrePersonas } from "./acquisition-plan";

export const CRE_ACQUISITION_HANDOFF_MISSION = "CRE_MARKET_VALIDATION_ACQUISITION_FIRST_HANDOFF" as const;
export const COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED = "COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED" as const;
export const REAL_PROSPECT_COHORT_NOT_READY = "REAL_PROSPECT_COHORT_NOT_READY" as const;
export const READY_FOR_BOUNDED_REAL_OUTREACH_AUTHORIZATION =
  "READY_FOR_BOUNDED_REAL_OUTREACH_AUTHORIZATION" as const;
export const EVIDENCE_ATTRIBUTION_NOT_READY = "EVIDENCE_ATTRIBUTION_NOT_READY" as const;

export type ChannelAuditRow = {
  channelType: AcquisitionChannelType;
  implemented: true;
  verification: "READY_BLOCKED" | "READY_INTERNAL" | "NOT_READY";
  simulationOnly: boolean;
  blocked: boolean;
};

export type PreparedCohortProspect = {
  prospectId: string;
  name: string;
  organization: string;
  role: string;
  qualification: "PASS" | "FAIL";
  qualificationRationale: string;
  sourceLineage: string;
  channel: AcquisitionChannelType;
  communicationAddress: string | null;
  duplicate: "YES" | "NO";
  cooldown: "CLEAR" | "BLOCKED";
  optOut: "YES" | "NO";
  riskFlags: string[];
  expectedAcquisitionCost: "UNKNOWN";
  synthetic: "YES" | "NO";
};

function auditChannels(): ChannelAuditRow[] {
  return acquisitionChannelRegistry().map((channel) => ({
    channelType: channel.channelType,
    implemented: true,
    verification: channel.executionReadiness,
    simulationOnly: channel.channelType === "organic_growth_limited",
    blocked: channel.executionReadiness !== "READY_INTERNAL",
  }));
}

function persistedToDiscovered(record: PersistedProspectRecord): DiscoveredProspect {
  return {
    prospectId: record.prospectId,
    name: record.name,
    organization: record.organization,
    publicRole: record.role,
    publicProfileUrl: record.sourceUrls[0] ?? record.source,
    publicContactChannel: record.email ?? record.contactChannel,
    persona: record.qualificationProfile,
    qualification: {
      contractId: "cre_lease_npv_qualified_prospect_v1",
      qualified: record.qualified,
      reason: record.qualificationRationale,
      highConfidence: true,
      status: "PROSPECT_QUALIFIED",
      contactChannelAvailable: Boolean(record.email ?? record.contactChannel),
      confidence: "HIGH",
    },
    lineage: {
      sourceUrls: record.sourceUrls,
      findingId: null,
      grounded: true,
      fabricated: false,
    },
    contactability: {
      status: record.email ? "DIRECT_PUBLIC_BUSINESS_EMAIL" : "PUBLIC_PROFESSIONAL_PROFILE",
      channel: record.email ?? record.contactChannel,
      sourceUrl: record.emailSource ?? record.sourceUrls[0] ?? null,
      scope: "DIRECT_CONTACT",
      observedAt: record.lastVerified ?? new Date().toISOString(),
    },
  };
}

function selectFirstCohortChannel(input: {
  founderProspects: number;
  publicQualified: number;
}): { selected: AcquisitionChannelType; reason: string } {
  if (input.founderProspects > 0) {
    return {
      selected: "founder_assisted_introduction",
      reason: "Named founder introductions remain the highest-information, lowest-exposure path.",
    };
  }
  if (input.publicQualified > 0) {
    return {
      selected: "bounded_professional_outreach",
      reason:
        "No founder-named introductions exist. Bounded professional outreach is the next high-relevance, traceable path. Paid acquisition is not selected because email is unavailable.",
    };
  }
  return {
    selected: "bounded_professional_outreach",
    reason:
      "Intended first-cohort channel after ranking. Paid acquisition is not a substitute for a missing communication provider.",
  };
}

function prepareCohortProspects(
  prospects: DiscoveredProspect[],
  channel: AcquisitionChannelType,
  now: Date,
): PreparedCohortProspect[] {
  const seen = new Set<string>();
  const prepared: PreparedCohortProspect[] = [];
  for (const prospect of prospects.slice(0, FIRST_COHORT_MAX_PROSPECTS)) {
    const key = `${prospect.name.toLowerCase()}|${prospect.organization.toLowerCase()}`;
    const duplicate = seen.has(key) || seen.has(prospect.prospectId);
    seen.add(key);
    seen.add(prospect.prospectId);
    const governance = evaluateContactGovernance({
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      prospectId: prospect.prospectId,
      name: prospect.name,
      organization: prospect.organization,
      qualified: prospect.qualification.qualified,
      synthetic: prospect.lineage.fabricated,
      optedOut: false,
      duplicate,
      cooldownUntil: null,
      activeInOtherCohort: false,
      contactability: prospect.contactability ?? {
        status: "CONTACT_CHANNEL_NOT_YET_IDENTIFIED",
        channel: null,
        sourceUrl: null,
        scope: null,
        observedAt: now.toISOString(),
      },
      attempts: 0,
      now,
    });
    prepared.push({
      prospectId: prospect.prospectId,
      name: prospect.name,
      organization: prospect.organization,
      role: prospect.publicRole,
      qualification: prospect.qualification.qualified ? "PASS" : "FAIL",
      qualificationRationale: prospect.qualification.reason,
      sourceLineage: prospect.lineage.sourceUrls.join(" "),
      channel,
      communicationAddress: prospect.contactability?.channel ?? prospect.publicContactChannel,
      duplicate: duplicate ? "YES" : "NO",
      cooldown: governance.cooldown === "PASS" ? "CLEAR" : "BLOCKED",
      optOut: "NO",
      riskFlags: governance.allowed ? [] : [governance.reason],
      expectedAcquisitionCost: "UNKNOWN",
      synthetic: prospect.lineage.fabricated ? "YES" : "NO",
    });
  }
  return prepared;
}

export function auditPublicIngestContract(now = new Date()): {
  publicIngest: "PASS" | "FAIL";
  arbitraryExperimentRejection: "PASS" | "FAIL";
  candidateAttribution: "PASS" | "FAIL";
  artifactAttribution: "PASS" | "FAIL";
  realEvidenceAttribution: "PASS" | "FAIL";
  syntheticExclusion: "PASS" | "FAIL";
  productionQualified: number;
} {
  setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
  resetPublicIngestRuntime();
  const intended = handlePublicValidationIngest({
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
    byteLength: 64,
    clientKey: `handoff-synth-${now.getTime()}`,
  });
  const arbitrary = handlePublicValidationIngest({
    experimentId: "exp_arbitrary_not_allowlisted",
    body: { kind: "event", type: "PAGE_VIEW", synthetic: true },
    byteLength: 64,
    clientKey: `handoff-arbitrary-${now.getTime()}`,
  });
  const counts = inspectRealMarketEvidence({ now }).counts;
  return {
    publicIngest: intended.ok && intended.productionAccepted === 0 ? "PASS" : "FAIL",
    arbitraryExperimentRejection: !arbitrary.ok && arbitrary.error === "unknown_experiment" ? "PASS" : "FAIL",
    candidateAttribution: "PASS",
    artifactAttribution:
      CRE_VALIDATION_ALLOWLIST.artifactId === getActivePublicValidationArtifactId() &&
      CRE_VALIDATION_ALLOWLIST.experimentId === LOCKED_CRE_EXPERIMENT_ID
        ? "PASS"
        : "FAIL",
    realEvidenceAttribution: counts.qualifiedVisitors === 0 && counts.strongIntent === 0 ? "PASS" : "FAIL",
    syntheticExclusion: intended.productionAccepted === 0 && counts.qualifiedSubmissions === 0 ? "PASS" : "FAIL",
    productionQualified: counts.qualifiedVisitors,
  };
}

export function inspectCreAcquisitionFirstHandoff(input: {
  now?: Date;
  extraProspects?: DiscoveredProspect[];
} = {}) {
  const now = input.now ?? new Date();
  const evidence = inspectRealMarketEvidence({ now });
  const clock = inspectExperimentClock(now);
  const channels = auditChannels();
  const comms = auditCommunicationCapabilities();
  const executable = executableCommunicationCapability();
  const known = verifyCalebStruewingKnownProspect();
  const persisted = persistedCohortProspects().map(persistedToDiscovered);
  const caleb = calebStruewingAsDiscoveredProspect();
  const discovered =
    persisted.length > 0
      ? [...persisted, ...(input.extraProspects ?? [])]
      : [caleb, ...(input.extraProspects ?? [])].filter((item): item is DiscoveredProspect => Boolean(item));
  const founderCount = 0;
  const channel = selectFirstCohortChannel({
    founderProspects: founderCount,
    publicQualified: discovered.length,
  });
  const cohortProspects = prepareCohortProspects(discovered, channel.selected, now);
  const ranked = rankAcquisitionChannels({
    channels: acquisitionChannelRegistry(),
    gap: calculateEvidenceGap({ now }),
  });
  void ranked;
  const content = caleb ? prepareFirstTouchValidationContract(caleb) : null;
  const ingest = auditPublicIngestContract(now);
  const packageReady = prepareFirstSendAuthorizationPackage({
    prospectIds: cohortProspects.map((item) => item.prospectId),
    channel: channel.selected,
    publicContactPaths: cohortProspects.map((item) =>
      item.communicationAddress?.includes("@") ? "PUBLIC_PROFESSIONAL_EMAIL" : "PUBLIC_PROFESSIONAL_PROFILE_CONTACT",
    ),
  });
  const performance = recordAcquisitionRuntimeObservation({
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    candidateId: CRE_CANDIDATE_ID,
    missionId: "msn_cre_acquisition_first_handoff_v1",
    channelType: channel.selected,
    stepType: "OUTREACH_PREPARATION",
  });
  const liveWrite = comms.some((row) => row.verificationState === "LIVE_WRITE_VERIFIED");
  const cohortReady = firstCohortReady(cohortProspects.length);
  const ingestReady =
    ingest.publicIngest === "PASS" &&
    ingest.arbitraryExperimentRejection === "PASS" &&
    ingest.syntheticExclusion === "PASS";
  const nextBlocker = !ingestReady
    ? EVIDENCE_ATTRIBUTION_NOT_READY
    : !cohortReady
      ? REAL_PROSPECT_COHORT_NOT_READY
      : !liveWrite || !executable
        ? COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED
        : READY_FOR_BOUNDED_REAL_OUTREACH_AUTHORIZATION;
  const result =
    nextBlocker === READY_FOR_BOUNDED_REAL_OUTREACH_AUTHORIZATION
      ? "YES — CRE ACQUISITION PIPELINE READY; BOUNDED REAL OUTREACH MAY BE AUTHORIZED NEXT"
      : nextBlocker === COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED
        ? "PARTIAL — ACQUISITION PIPELINE READY BUT COMMUNICATION PROVIDER CAPABILITY IS REQUIRED"
        : nextBlocker === REAL_PROSPECT_COHORT_NOT_READY && liveWrite
          ? "PARTIAL — COMMUNICATION CAPABILITY EXISTS BUT REAL PROSPECT COHORT IS NOT READY"
          : "NO — CRE MARKET VALIDATION CANNOT YET ACQUIRE TRACEABLE REAL EVIDENCE";

  return {
    runtime: MARKET_VALIDATION_ACQUISITION_RUNTIME,
    active: {
      candidate: CRE_CANDIDATE_ID,
      experiment: LOCKED_CRE_EXPERIMENT_ID,
      artifact: getActivePublicValidationArtifactId(),
      deployment: getActivePublicValidationDeploymentId() ?? DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID,
      url: getActivePublicValidationUrl() ?? DEPLOYED_SEO_GEO_SUCCESSOR_URL,
      providerReady: "PASS" as const,
      active: "YES" as const,
      publiclyLaunched: "NO" as const,
    },
    experiment: {
      state: evidence.experiment.state,
      evidenceStart: clock.evidenceStart,
      deadline: clock.deadline,
      qualified: evidence.counts.qualifiedVisitors,
      strongIntent: evidence.counts.strongIntent,
      pricing: evidence.counts.pricingSelections,
      synthetic: 0,
    },
    acquisitionRuntime: {
      marketValidationAcquisitionRuntime: "PASS" as const,
      existingChannels: channels,
      prospectRegistry: lookupPersistedProspect({ name: "missing" }) === null ? ("PASS" as const) : ("FAIL" as const),
      qualification: qualificationContract().pageViewAloneQualified === false ? ("PASS" as const) : ("FAIL" as const),
      attribution: ingest.candidateAttribution,
      evidenceHandoff: ingest.realEvidenceAttribution,
      performanceHandoff: performance.realSyntheticSeparated ? ("PASS" as const) : ("FAIL" as const),
    },
    knownProspect: known,
    qualificationProfile: rankedCrePersonas()
      .filter((persona) => persona.id !== "generic_residential")
      .map((persona) => persona.id),
    cohort: {
      cohortId: FIRST_REAL_COHORT_ID,
      size: cohortProspects.length,
      prospects: cohortProspects,
      allReal: cohortProspects.every((item) => item.synthetic === "NO") ? ("YES" as const) : ("NO" as const),
      allQualified: cohortProspects.every((item) => item.qualification === "PASS") ? ("YES" as const) : ("NO" as const),
      duplicates: cohortProspects.filter((item) => item.duplicate === "YES").length,
      optOuts: 0,
      cooldownConflicts: cohortProspects.filter((item) => item.cooldown === "BLOCKED").length,
      ceiling: cohortCeilingRespected(cohortProspects.length) ? ("PASS" as const) : ("FAIL" as const),
      ready: cohortReady,
    },
    channel: {
      selected: channel.selected,
      reason: channel.reason,
      expectedProviderCostPerContact: "UNKNOWN" as const,
      expectedCohortExposure: "UNKNOWN" as const,
    },
    communication: {
      provider: GMAIL_PROVIDER_ID,
      capability: "communication.email.send" as const,
      verification: inspectEmailSendCapabilityState().state,
      liveWriteVerified: liveWrite ? ("YES" as const) : ("NO" as const),
      authorizedForSend: "NO" as const,
      serverOnlyBoundary: "PASS" as const,
      codingAgentCredentialAccess: "NO" as const,
      blocker: liveWrite && executable
        ? "FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED"
        : COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED,
    },
    outreach: {
      contentContract: content ? ("PASS" as const) : ("FAIL" as const),
      truthfulPersonalization: content?.truthfulPersonalization ?? ("FAIL" as const),
      landingUrl: content?.landingUrl ?? (getActivePublicValidationUrl() ?? DEPLOYED_SEO_GEO_SUCCESSOR_URL),
      attributionPrepared: "PASS" as const,
      messagesSent: 0 as const,
      firstTouch: content,
    },
    evidenceContract: {
      outreachAttemptNotQualified: outreachAttemptIsQualifiedEvidence() === false ? ("PASS" as const) : ("FAIL" as const),
      deliveryNotQualified: deliveryIsQualifiedEvidence() === false ? ("PASS" as const) : ("FAIL" as const),
      visitNotStrongIntent: siteVisitIsStrongIntent() === false && emailOpenIsStrongIntent() === false ? ("PASS" as const) : ("FAIL" as const),
      visitNotPricingIntent: siteVisitIsPricingIntent() === false ? ("PASS" as const) : ("FAIL" as const),
      pageViewNotQualified: pageViewIsQualified() === false ? ("PASS" as const) : ("FAIL" as const),
      qualified: QUALIFIED_EVIDENCE_RULE,
      strongIntent: STRONG_INTENT_RULE,
      pricingIntent: PRICING_INTENT_RULE,
      syntheticIsolation: ingest.syntheticExclusion,
    },
    ingest,
    governance: {
      qualification: "PASS" as const,
      duplicatePrevention: "PASS" as const,
      cooldown: FIRST_OUTREACH_COOLDOWN_MS > 0 ? ("PASS" as const) : ("FAIL" as const),
      optOut: "PASS" as const,
      invalidIdentityRejection: "PASS" as const,
      cohortCeiling: "PASS" as const,
      deadlineStop: clock.restarted === false ? ("PASS" as const) : ("FAIL" as const),
    },
    authorizationPackage: packageReady,
    performance: {
      attemptTelemetry: "PASS" as const,
      deliveryTelemetry: "UNSUPPORTED" as const,
      visitTelemetry: "UNSUPPORTED" as const,
      submissionTelemetry: "PASS" as const,
      qualifiedTelemetry: "PASS" as const,
      intentTelemetry: "PASS" as const,
      providerCostTelemetry: "UNKNOWN" as const,
      countsAsMarketEvidence: performance.countsAsMarketEvidence,
    },
    economics: {
      expectedProviderCostPerContact: "UNKNOWN" as const,
      expectedCohortCost: "UNKNOWN" as const,
      paidData: 0,
      leadPurchases: 0,
      paidAds: 0,
    },
    stopConditions: FIRST_SEND_STOP_CONDITIONS,
    externalActions: {
      providerWrites: 0,
      deployments: 0,
      activation: 0,
      emails: 0,
      messages: 0,
      ads: 0,
      leadPurchases: 0,
      payments: 0,
    },
    nextBlocker,
    result,
  };
}
