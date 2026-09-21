import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectRealMarketEvidence } from "@/lib/infinity/market-validation-experiment/real-market-evidence";
import { emitMissionActivity, projectCommandActivity, runInstrumentedStep } from "@/lib/infinity/mission-activity";
import type { ResearchTaskAttempt } from "./research-execution";
import { auditCommunicationCapabilities } from "./communication-capabilities";
import { extractPublishedContactability, isActionableContact, mergeContactability } from "./contactability";
import { LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED, MARKET_VALIDATION_ACQUISITION, MARKET_VALIDATION_ACQUISITION_RUNTIME, READY_FOR_VALIDATION_DECISION, TELEMETRY_PERSISTENCE_NOTE } from "./constants";
import { classifyAuthorization, communicationsAuthorizationGranted, mayAutoExecute, paidAcquisitionAuthorizationGranted } from "./authorization";
import { acquisitionChannelRegistry, isProviderNeutral } from "./channels";
import { evaluateCreativeAcquisitionNeed } from "./creative";
import { calculateEvidenceGap, discoverCollectingExperiments } from "./evidence-gap";
import { buildFounderRequest, buildNextMission, founderCommandRequestText, resolveBlocker } from "./governance";
import { campaignLineage, discoveryStopReason, rankPreparedProspects } from "./outreach-package";
import { discoverBoundedOrganicOpportunities } from "./organic";
import { recordAcquisitionRuntimeObservation } from "./performance";
import { discoverPublicProspects } from "./prospects";
import { rankAcquisitionChannels } from "./ranking";
import { evaluateAcquisitionTrigger } from "./triggers";
import type { AcquisitionRuntimeInput, AcquisitionRuntimeResult } from "./types";

export async function runMarketValidationAcquisitionRuntime(
  input: AcquisitionRuntimeInput = { organizationId: LIVE_ORG },
): Promise<AcquisitionRuntimeResult> {
  const now = input.now ?? new Date();
  const evidence = inspectRealMarketEvidence({ now });
  const organizationId = input.organizationId || LIVE_ORG;
  const candidateId = input.candidateId ?? evidence.experiment.candidateId;
  const experimentId = input.experimentId ?? evidence.experiment.experimentId;
  const gap = calculateEvidenceGap({ now });
  const collecting = discoverCollectingExperiments({ now });
  if (collecting.experiments.length === 0) {
    throw new Error("No active COLLECTING market-validation experiment requires evidence.");
  }

  const trigger = input.trigger ?? "EXPERIMENT_ENTERED_COLLECTING";
  const triggerEval = evaluateAcquisitionTrigger({ trigger, gap });
  const readyForDecision = gap.nextDeterministicState === READY_FOR_VALIDATION_DECISION;
  const missionId = `msn_mva_${experimentId.replace(/^exp_/, "").slice(0, 16)}`;
  const liveDiscovery = input.liveDiscovery === true;

  const emitBase = {
    organizationId,
    ventureId: input.ventureId ?? null,
    candidateId,
    experimentId,
    missionId,
    missionType: MARKET_VALIDATION_ACQUISITION,
    executionClass: "VENTURE_EXECUTION" as const,
    source: "market_validation_acquisition_runtime",
    traceability: {
      missionId,
      experimentId,
      candidateId,
      artifactId: evidence.experiment.artifactId,
    },
  };

  emitMissionActivity({
    ...emitBase,
    engine: "mission_runtime",
    stepType: MARKET_VALIDATION_ACQUISITION,
    eventType: "MISSION_STARTED",
  });

  const channels = acquisitionChannelRegistry();
  if (!isProviderNeutral(channels)) {
    throw new Error("Acquisition channels must remain provider-neutral.");
  }

  await runInstrumentedStep({
    emit: {
      ...emitBase,
      engine: "organic_growth",
      stepType: "ACQUISITION_CHANNEL_ANALYSIS",
    },
    totalKnownSteps: 3,
    completedBefore: 0,
    run: () => rankAcquisitionChannels({ channels, gap, outcomes: input.channelOutcomes }),
  });
  const ranked = rankAcquisitionChannels({ channels, gap, outcomes: input.channelOutcomes });

  const discovery = await runInstrumentedStep({
    emit: {
      ...emitBase,
      engine: "grounded_research",
      stepType: "PROSPECT_DISCOVERY",
      progress: { completedSteps: 1, totalKnownSteps: 4, source: "phase_position" },
    },
    totalKnownSteps: 4,
    completedBefore: 1,
    run: () =>
      discoverPublicProspects({
        liveDiscovery,
        researchFindings: input.researchFindings,
        executeTask: input.executeTask,
        search: input.search,
        fetchImpl: input.fetchImpl,
        onAttempt: (attempt: ResearchTaskAttempt) => {
          if (attempt.classification === "TIMEOUT" || attempt.classification === "RATE_LIMIT") {
            emitMissionActivity({
              ...emitBase,
              engine: "grounded_research",
              stepType: "RESEARCH_TIMEOUT",
              eventType: "MISSION_WAITING",
              status: "WAITING_INTERNAL",
              summary: "Research provider timed out. Infinity is retrying through the permitted research path.",
              technicalDetail: `${attempt.taskId} attempt ${attempt.attempt} ${attempt.classification} provider=${attempt.providerId}`,
            });
            emitMissionActivity({
              ...emitBase,
              engine: "grounded_research",
              stepType: "RESEARCH_RETRY",
              eventType: "STEP_STARTED",
              summary: "Retrying bounded research",
              technicalDetail: `${attempt.taskId} retry after ${attempt.classification}`,
            });
          }
        },
      }),
  });

  await runInstrumentedStep({
    emit: {
      ...emitBase,
      engine: "grounded_research",
      stepType: "PROSPECT_QUALIFICATION",
    },
    totalKnownSteps: 3,
    completedBefore: 2,
    run: () => discovery.result.prospects.filter((prospect) => prospect.qualification.qualified),
  });

  const prospects = discovery.result.prospects.map((prospect) => {
    let contact = prospect.contactability ?? extractPublishedContactability({
      url: prospect.publicProfileUrl,
      text: `${prospect.publicRole} ${prospect.organization}`,
    });
    for (const page of discovery.result.publicWeb?.fetches ?? []) {
      try {
        const sameHost = new URL(page.finalUrl || page.url).hostname === new URL(prospect.publicProfileUrl).hostname;
        if (!sameHost) continue;
        const extra = extractPublishedContactability({ url: page.finalUrl || page.url, html: page.html, text: page.text });
        if (extra.status === "PUBLIC_PROFESSIONAL_PROFILE") {
          const named = new RegExp(prospect.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"), "i").test(
            `${page.text}\n${page.html}\n${page.finalUrl}\n${page.url}`,
          );
          if (!named) continue;
        }
        contact = mergeContactability(contact, extra);
      } catch {
        continue;
      }
    }
    return {
      ...prospect,
      publicContactChannel: contact.channel,
      qualification: { ...prospect.qualification, contactChannelAvailable: isActionableContact(contact) },
      contactability: contact,
    };
  });
  const contacts = new Map(prospects.map((prospect) => [prospect.prospectId, prospect.contactability!]));
  const rankedPrepared = rankPreparedProspects(prospects, contacts);
  const drafts = rankedPrepared.map((item) => item.draft).filter((draft) => draft != null);
  const actionable = rankedPrepared.filter((item) => isActionableContact(item.contactability)).length;
  const organizations = new Set(prospects.map((prospect) => prospect.organization)).size;
  const stopReason = discoveryStopReason({
    highConfidence: prospects.length,
    fetches: discovery.result.publicWeb?.trace.fetchCount ?? 0,
    maxFetches: 12,
    queries: discovery.result.publicWeb?.trace.queryCount ?? 0,
    organizations,
  });
  const commsAudit = auditCommunicationCapabilities();
  const channelSummary = rankedPrepared
    .filter((item) => isActionableContact(item.contactability))
    .map((item) => item.contactability.status)
    .reduce((counts, status) => {
      counts.set(status, (counts.get(status) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
  const channelSummaryText =
    [...channelSummary.entries()].map(([status, count]) => `${count} ${status.toLowerCase().replace(/_/g, " ")}`).join(", ") ||
    "none identified";
  const organic = discoverBoundedOrganicOpportunities();
  const creative = evaluateCreativeAcquisitionNeed({ qualifiedEvidence: gap.qualifiedCurrent });
  const performance = recordAcquisitionRuntimeObservation({
    experimentId,
    candidateId,
    missionId,
    channelType: ranked[0]?.channelType ?? "founder_assisted_introduction",
    stepType: "PROSPECT_QUALIFICATION",
  });

  void mayAutoExecute({
    authorizationClass: "READ_ONLY_RESEARCH",
    capabilityAvailable: discovery.result.capability === "AVAILABLE" || Boolean(input.researchFindings),
    authorizationExists: false,
    scopeBounded: true,
  });
  void communicationsAuthorizationGranted();
  void paidAcquisitionAuthorizationGranted();
  void triggerEval;

  const capabilityMissing = discovery.result.capability === LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED && prospects.length === 0;
  const blocker = readyForDecision
    ? READY_FOR_VALIDATION_DECISION
    : resolveBlocker({
        prospectCount: prospects.length,
        capabilityMissing,
        classification: discovery.result.classification,
        pathsExhausted: discovery.result.pathsExhausted,
        founderChannelRequired: false,
        searchConfigurationMissing: discovery.result.searchConfigurationRequired,
        actionable,
        drafts: drafts.length,
      });
  const nextMission = buildNextMission({
    experimentId,
    prospectCount: prospects.length,
    actionableCount: actionable,
    topChannel: ranked[0]?.channelType ?? "founder_assisted_introduction",
    blocker,
  });
  const request = buildFounderRequest({
    prospects,
    actionable,
    blocker,
    channelSummary: channelSummaryText,
  });

  if (discovery.result.publicWeb) {
    const trace = discovery.result.publicWeb.trace;
    emitMissionActivity({
      ...emitBase,
      engine: "grounded_research",
      stepType: "WEB_SEARCH",
      eventType: "STEP_COMPLETED",
      summary: "Searching for tenant-representation firms",
      technicalDetail: `queries=${trace.queryCount} provider=${trace.searchProvider} results=${trace.resultCount} cost=${trace.costState} traces=${trace.traceIds.join(",")}`,
    });
    emitMissionActivity({
      ...emitBase,
      engine: "grounded_research",
      stepType: "PUBLIC_PAGE_FETCH",
      eventType: "STEP_COMPLETED",
      summary: "Reviewing public firm evidence",
      technicalDetail: `fetches=${trace.fetchCount} ok=${trace.successfulFetchCount} failed=${trace.failedFetchCount}`,
    });
    emitMissionActivity({
      ...emitBase,
      engine: "grounded_research",
      stepType: "EVIDENCE_EXTRACTION",
      eventType: "STEP_COMPLETED",
      summary: "Extracting public role and lease-workflow evidence",
      technicalDetail: `evidence=${trace.evidenceCount} reasoning=${trace.reasoningProvider}`,
    });
  }
  emitMissionActivity({
    ...emitBase,
    engine: "grounded_research",
    stepType: "CONTACTABILITY_RESEARCH",
    eventType: "STEP_COMPLETED",
    summary: "Checking public business contact channels",
    technicalDetail: `actionable=${actionable} qualified=${prospects.length}`,
  });
  emitMissionActivity({
    ...emitBase,
    engine: "organic_growth",
    stepType: "OUTREACH_PREPARATION",
    eventType: "STEP_COMPLETED",
    summary: "Preparing individualized validation drafts",
    technicalDetail: `drafts=${drafts.length} campaign=cre_validation_initial_cohort_v1 messagesSent=0`,
  });
  emitMissionActivity({
    ...emitBase,
    engine: "mission_runtime",
    stepType: "GOVERNANCE_PREPARATION",
    eventType: "STEP_COMPLETED",
    summary: "Assembling the founder communication request",
    technicalDetail: founderCommandRequestText({ actionable, channelSummary: channelSummaryText, blocker }).slice(0, 400),
  });

  emitMissionActivity({
    ...emitBase,
    engine: "mission_runtime",
    stepType: MARKET_VALIDATION_ACQUISITION,
    eventType: "MISSION_BLOCKED",
    blocker,
    technicalDetail: [
      `missionId=${missionId}`,
      `prospectIds=${prospects.map((prospect) => prospect.prospectId).join(",") || "none"}`,
      `queryCount=${discovery.result.publicWeb?.trace.queryCount ?? 0}`,
      `searchProvider=${discovery.result.publicWeb?.trace.searchProvider ?? discovery.result.researchProvider}`,
      `fetchCount=${discovery.result.publicWeb?.trace.fetchCount ?? 0}`,
      `evidence=${discovery.result.publicWeb?.trace.evidenceCount ?? 0}`,
      `actionable=${actionable}`,
      `channels=${channelSummaryText}`,
      `communicationCapability=${commsAudit.filter((row) => row.verified).map((row) => row.capability).join(",") || "none"}`,
      `providerCost=NOT_APPLICABLE`,
      `campaign=cre_validation_initial_cohort_v1`,
      `stop=${stopReason}`,
      `blocker=${blocker}`,
    ].join(" "),
    authorizationRequired: blocker === "FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED" ? blocker : null,
    summary:
      blocker === "FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED"
        ? `Identified ${prospects.length} grounded prospects; communications approval is required before any send.`
        : blocker === "RESEARCH_EXECUTION_RETRY_REQUIRED"
          ? "Research provider timed out. Infinity is retrying through the permitted research path."
          : blocker === "PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED"
            ? "A provider-neutral web.search capability must be configured before live prospect discovery."
            : blocker === "NO_QUALIFIED_PUBLIC_PROSPECTS_FOUND"
              ? "Bounded public research completed without HIGH-confidence prospects."
            : blocker === "COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED"
              ? "Public contact routes exist, but no verified communication capability can send yet."
            : blocker === "ACQUISITION_PREPARATION_INCOMPLETE"
              ? "Qualified prospects exist; public contactability or executable outreach is still incomplete."
          : blocker === LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED
            ? "Live grounded prospect discovery is required; no identities were fabricated."
            : "Autonomous public research has not produced qualified identities yet.",
  });

  const command = projectCommandActivity({
    organizationId,
    ventureId: input.ventureId ?? null,
    knownSteps: [
      "ACQUISITION_CHANNEL_ANALYSIS",
      "WEB_SEARCH",
      "CONTACTABILITY_RESEARCH",
      "OUTREACH_PREPARATION",
      "GOVERNANCE_PREPARATION",
    ],
  });

  return {
    runtime: MARKET_VALIDATION_ACQUISITION_RUNTIME,
    experiment: {
      candidateId,
      experimentId,
      artifactId: evidence.experiment.artifactId,
      state: "COLLECTING",
      clock: evidence.clock,
    },
    counts: evidence.counts,
    gap,
    channels,
    ranked: ranked.map(({ rank, channelId, channelType, reason }) => ({ rank, channelId, channelType, reason })),
    internalWork: {
      channelResearch: true,
      prospectDiscovery: true,
      prospectQualification: true,
      organicOpportunityDiscovery: true,
      outreachPreparation: true,
      creativePreparation: true,
    },
    discovery: {
      executed: discovery.result.executed,
      liveGrounded: discovery.result.liveGrounded,
      researchProvider: discovery.result.researchProvider,
      capability: discovery.result.capability,
      candidatesFound: prospects.length,
      highConfidenceQualified: prospects.filter((prospect) => prospect.qualification.highConfidence).length,
      maxCohortRespected: true,
      fabricatedProspects: false,
      prospects,
      lineage: discovery.result.lineage,
      classification: discovery.result.classification,
      attempts: discovery.result.attempts,
      providersUsed: discovery.result.providersUsed,
      pathsExhausted: discovery.result.pathsExhausted,
      publicWeb: discovery.result.publicWeb ?? null,
      searchConfigurationRequired: Boolean(discovery.result.searchConfigurationRequired),
      outreach: {
        draftsPrepared: drafts.length,
        actionable,
        stopReason,
        campaign: campaignLineage({ experimentId, candidateId, missionId }),
        communicationCapabilities: commsAudit.map((row) => ({
          capability: row.capability,
          verified: row.verified,
          available: row.available,
        })),
      },
    },
    organic: {
      engineReused: true,
      opportunities: organic.opportunities,
      largeSeoBuild: false,
    },
    creative: {
      justified: false,
      assetsGenerated: 0,
    },
    performance: {
      realSyntheticSeparated: performance.realSyntheticSeparated,
      countsAsMarketEvidence: performance.countsAsMarketEvidence,
      channelAttribution: performance.channelAttribution,
      missionLineage: performance.missionLineage,
    },
    nextMission,
    governance: {
      existingAuthorizationSufficient: false,
      blocker,
      request,
      authorizationClass: classifyAuthorization({
        channelType: nextMission.channel,
        sendingMessages: false,
        paid: false,
        providerWrite: false,
      }),
    },
    decision: {
      currentDecision: "VALIDATE",
      buildReady: false,
      readyForValidationDecision: readyForDecision,
    },
    command,
    unauthorizedActions: {
      realOutreach: 0,
      paidAds: 0,
      leadPurchases: 0,
      deployments: 0,
      protectionMutations: 0,
      domains: 0,
      dns: 0,
      stripe: 0,
      treasury: 0,
    },
    telemetryPersistenceNote: TELEMETRY_PERSISTENCE_NOTE,
  };
}
