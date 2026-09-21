import type { ExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import type { ExperimentCounts } from "@/lib/infinity/market-validation-experiment/types";
import type { CommandActivityView } from "@/lib/infinity/mission-activity";
import type {
  AcquisitionChannelType,
  AcquisitionMissionSubtype,
  AcquisitionTrigger,
  AuthorizationClass,
} from "./constants";

export type EconomicState = "ACTUAL" | "ESTIMATED" | "BENCHMARK" | "UNKNOWN";

export type AcquisitionChannelRecord = {
  channelId: string;
  channelType: AcquisitionChannelType;
  label: string;
  personaSuitability: "HIGH" | "MEDIUM" | "LOW";
  qualificationLikelihood: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  validationInformationValue: "HIGH" | "MEDIUM" | "LOW";
  timeToEvidenceState: "FAST" | "MEDIUM" | "SLOW" | "UNKNOWN";
  costClassification: EconomicState;
  expectedFinancialExposure: number | "UNKNOWN";
  communicationAuthorizationRequired: boolean;
  financialAuthorizationRequired: boolean;
  providerCapabilityRequirement: string;
  executionReadiness: "READY_INTERNAL" | "READY_BLOCKED" | "NOT_READY";
  historicalPerformance: {
    visits: number;
    qualified: number;
    valueAdjustment: number;
  };
  providerId: null;
};

export type EvidenceGap = {
  qualifiedCurrent: number;
  qualifiedRequired: number;
  qualifiedGap: number;
  strongIntentCurrent: number;
  strongIntentRequired: number;
  strongIntentGap: number;
  pricingCurrent: number;
  pricingRequired: number;
  pricingGap: number;
  qualifiedSubmissions: number;
  daysElapsed: number;
  daysRemaining: number;
  windowExpired: boolean;
  evidenceSufficiency: "INSUFFICIENT" | "SUFFICIENT_FOR_REVIEW" | "NEGATIVE";
  nextDeterministicState: string;
};

export type DiscoveredProspect = {
  prospectId: string;
  name: string;
  organization: string;
  publicRole: string;
  publicProfileUrl: string;
  publicContactChannel: string | null;
  persona: "tenant_rep_broker" | "independent_cre_broker" | "small_cre_advisory" | "lease_consultant";
  qualification: {
    contractId: "cre_lease_npv_qualified_prospect_v1";
    qualified: boolean;
    reason: string;
    highConfidence: boolean;
    status: "PROSPECT_QUALIFIED";
    contactChannelAvailable: boolean;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
  lineage: {
    sourceUrls: string[];
    findingId: string | null;
    grounded: true;
    fabricated: false;
  };
  contactability?: {
    status:
      | "DIRECT_PUBLIC_BUSINESS_EMAIL"
      | "DIRECT_PUBLIC_BUSINESS_PHONE"
      | "PUBLIC_PROFESSIONAL_PROFILE"
      | "ORGANIZATION_CONTACT_FORM"
      | "ORGANIZATION_GENERAL_CONTACT"
      | "CONTACT_CHANNEL_NOT_YET_IDENTIFIED";
    channel: string | null;
    sourceUrl: string | null;
    scope: "DIRECT_CONTACT" | "ORGANIZATION_LEVEL_CONTACT" | null;
    observedAt: string;
  };
};

export type ChannelOutcome = {
  channelType: AcquisitionChannelType;
  visits: number;
  qualified: number;
};

export type FounderGovernanceRequest = {
  summary: string;
  recommendedAction: string;
  purpose: string;
  providerSpend: "NOT_APPLICABLE" | "UNKNOWN";
  externalCommunication: "REQUIRES_APPROVAL";
  expectedEvidence: string[];
  approveReject: "Approve / Reject";
  prospectCount: number;
};

export type NextAcquisitionMission = {
  missionId: string;
  missionType: "MARKET_VALIDATION_ACQUISITION";
  subtype: AcquisitionMissionSubtype;
  action: string;
  channel: AcquisitionChannelType;
  expectedValidationPurpose: string;
  externalAction: boolean;
  communicationAuthorizationRequired: boolean;
  financialAuthorizationRequired: boolean;
  expectedProviderSpend: "NOT_APPLICABLE" | "UNKNOWN";
};

export type AcquisitionRuntimeInput = {
  organizationId: string;
  ventureId?: string | null;
  candidateId?: string;
  experimentId?: string;
  now?: Date;
  trigger?: AcquisitionTrigger;
  liveDiscovery?: boolean;
  channelOutcomes?: ChannelOutcome[];
  researchFindings?: Array<{
    findingId: string;
    claim: string;
    grounded: boolean;
    inference?: boolean;
    sourceUrls: string[];
  }>;
  executeTask?: (taskId: string, attempt: number, providerId: string) => Promise<DiscoveredProspect[]>;
  search?: (query: string) => Promise<import("@/lib/infinity/research/public-web/types").PublicSearchResult[]>;
  fetchImpl?: typeof fetch;
};

export type AcquisitionRuntimeResult = {
  runtime: "MarketValidationAcquisitionRuntime";
  experiment: {
    candidateId: string;
    experimentId: string;
    artifactId: string;
    state: "COLLECTING";
    clock: ExperimentClock;
  };
  counts: ExperimentCounts;
  gap: EvidenceGap;
  channels: AcquisitionChannelRecord[];
  ranked: Array<{ rank: number; channelId: string; channelType: AcquisitionChannelType; reason: string }>;
  internalWork: {
    channelResearch: true;
    prospectDiscovery: true;
    prospectQualification: true;
    organicOpportunityDiscovery: true;
    outreachPreparation: true;
    creativePreparation: true;
  };
  discovery: {
    executed: boolean;
    liveGrounded: boolean;
    researchProvider: string | "NONE";
    capability: "AVAILABLE" | "LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED";
    candidatesFound: number;
    highConfidenceQualified: number;
    maxCohortRespected: true;
    fabricatedProspects: false;
    prospects: DiscoveredProspect[];
    lineage: "PASS" | "NOT_AVAILABLE";
    classification: import("./research-execution").ResearchFailureClass | "COMPLETED" | null;
    attempts: number;
    providersUsed: string[];
    pathsExhausted: boolean;
    publicWeb: import("@/lib/infinity/research/public-web/types").PublicWebResearchResult | null;
    searchConfigurationRequired: boolean;
    outreach?: {
      draftsPrepared: number;
      actionable: number;
      stopReason: string;
      campaign: {
        source: string;
        medium: string;
        campaign: string;
      };
      communicationCapabilities: Array<{ capability: string; verified: boolean; available: boolean }>;
    };
  };
  organic: {
    engineReused: true;
    opportunities: Array<{ query: string; routeTo: string }>;
    largeSeoBuild: false;
  };
  creative: {
    justified: false;
    assetsGenerated: 0;
  };
  performance: {
    realSyntheticSeparated: true;
    countsAsMarketEvidence: false;
    channelAttribution: "PARTIAL";
    missionLineage: true;
  };
  nextMission: NextAcquisitionMission;
  governance: {
    existingAuthorizationSufficient: false;
    blocker: string;
    request: FounderGovernanceRequest;
    authorizationClass: AuthorizationClass;
  };
  decision: {
    currentDecision: "VALIDATE";
    buildReady: false;
    readyForValidationDecision: boolean;
  };
  command: CommandActivityView;
  unauthorizedActions: {
    realOutreach: 0;
    paidAds: 0;
    leadPurchases: 0;
    deployments: 0;
    protectionMutations: 0;
    domains: 0;
    dns: 0;
    stripe: 0;
    treasury: 0;
  };
  telemetryPersistenceNote: string;
};
