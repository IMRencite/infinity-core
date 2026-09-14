export const HQ_CANONICAL_PROJECTION_CONTRACT = "HQCanonicalProjectionContract" as const;
export const HQ_CANONICAL_PROJECTION_REGISTRY_NAME = "HQCanonicalProjectionRegistry" as const;
export const HQ_CANONICAL_RECONCILIATION_CYCLE = "HQCanonicalReconciliationCycle" as const;
export const FOUNDER_WORK_VISIBILITY_CONTRACT = "FounderWorkVisibilityContract" as const;

export const HQ_CANONICAL_PROJECTION_COMPLETENESS_GATE = "HQCanonicalProjectionCompletenessGate" as const;
export const HQ_PROJECTION_FRESHNESS_GATE = "HQProjectionFreshnessGate" as const;
export const HQ_ACTIVITY_COMPLETENESS_GATE = "HQActivityCompletenessGate" as const;
export const HQ_CURRENT_STATE_CONSISTENCY_GATE = "HQCurrentStateConsistencyGate" as const;
export const HQ_TRACEABILITY_GATE = "HQTraceabilityGate" as const;

export const HQ_PROJECTION_MECHANISM = "REQUEST_TIME_CANONICAL_READ_THROUGH" as const;
export const HQ_PROJECTION_FRESHNESS_MODEL =
  "critical/mission/lifecycle/payment/fulfillment: request-time read-through; opportunity/discovery: next HQ read; historical analytics: bounded snapshot lag" as const;

export const HQ_ACTIVITY_PAGE_SIZE = 25 as const;
export const HQ_ACTIVITY_SCALE_FIXTURES = [10, 100, 1000] as const;
export const HQ_MISSION_SCALE_FIXTURES = [10, 100] as const;

export const HQ_PROJECTION_DOMAINS = [
  "opportunities",
  "ventures",
  "missions",
  "builds",
  "deployments",
  "providers",
  "domains",
  "payments",
  "fulfillment",
  "performance",
  "learning",
  "outreach",
  "organic",
  "creative",
  "runtime",
  "portfolio",
  "governance",
  "incidents",
  "support",
  "activity",
  "economics",
  "qc",
] as const;
export type HqProjectionDomain = (typeof HQ_PROJECTION_DOMAINS)[number];

export type HqSystemState =
  | "OPERATING"
  | "WAITING_FOR_EVIDENCE"
  | "BLOCKED"
  | "AUTHORIZATION_REQUIRED"
  | "IDLE";

export type HqCanonicalProjectionContractRecord = {
  sourceType: string;
  canonicalId: string;
  entityType: string;
  ventureRelation: string;
  missionRelation: string;
  status: string;
  timestamp: string | null;
  projectionDestination: string;
  detailRoute: string;
  traceabilityLineage: string;
};

export type HqCanonicalProjectionRegistryEntry = {
  domain: HqProjectionDomain;
  hqSurface: string;
  canonicalSource: string;
  projectionKey: string;
  refreshMechanism: typeof HQ_PROJECTION_MECHANISM | "NEXT_HQ_READ" | "BOUNDED_SNAPSHOT";
  freshnessExpectation: "REQUEST_TIME" | "NEXT_HQ_READ" | "BOUNDED_LAG";
  traceabilityKey: string;
  detailRoute: string;
};

export type FounderWorkVisibilityContractRecord = {
  subsystem: string;
  founderShouldSee: string;
  hqSurface: string;
  canonicalSource: string;
  activityRepresentation: string;
  currentStateRepresentation: string;
  traceability: string;
  productionAutonomy: "READY" | "PRODUCTION_AUTONOMY_NOT_READY";
};

export type HqCanonicalActivityItem = {
  eventId: string;
  timestamp: string;
  summary: string;
  domain: HqProjectionDomain;
  canonicalId: string;
  ventureId: string;
  missionId: string;
  href: string;
  traceability: string;
};

export type HqCanonicalWorkItem = {
  id: string;
  label: string;
  status: string;
  ventureId: string;
  href: string;
  nextAction: string;
};

export type HqCanonicalBlocker = {
  code: string;
  ventureId: string;
  href: string;
  requiredAuthorization: boolean;
};

export type HqCanonicalReconciliationFinding = {
  domain: HqProjectionDomain;
  kind:
    | "MISSING_PROJECTION"
    | "STALE_STATUS"
    | "DUPLICATE_ENTITY"
    | "ORPHAN_PROJECTION"
    | "WRONG_LIFECYCLE"
    | "MISSING_LINKAGE"
    | "STALE_COUNT"
    | "MISSING_ACTIVITY"
    | "MISSING_BLOCKER"
    | "MISSING_CURRENT_ACTION";
  canonicalId: string;
  detail: string;
};

export type NamedGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type HqCanonicalOperatingProjection = {
  mechanism: typeof HQ_PROJECTION_MECHANISM;
  freshnessModel: typeof HQ_PROJECTION_FRESHNESS_MODEL;
  generatedAt: string;
  systemState: HqSystemState;
  interactiveMissionIdle: boolean;
  operationallyIdle: boolean;
  currentWork: HqCanonicalWorkItem[];
  recentWork: HqCanonicalActivityItem[];
  nextActions: HqCanonicalWorkItem[];
  blockers: HqCanonicalBlocker[];
  activity: HqCanonicalActivityItem[];
  opportunityCount: number;
  liveTop10Count: number;
  ventureCount: number;
  operatingVentureCount: number;
  validatingVentureCount: number;
  publiclyLaunchedVentureCount: number;
  /** Operating / publicly launched businesses only. Does not include ventures in validation. */
  activeVentureCount: number;
  builtVentureCount: number;
  missionCount: number;
  activeMissionCount: number;
  blockedMissionCount: number;
  completedMissionCount: number;
  missingMissionCount: number;
  runtime: {
    dailyCycle: string;
    portfolioCycle: string;
    performance: string;
    lastRunAt: string | null;
    lastCycleId: string | null;
    lastOutcome: string | null;
    nextRunAt: string | null;
    consecutiveFailures: number;
    lastError: string | null;
  };
  occupancynpv: {
    hqLifecycle: string;
    canonicalLifecycle: string;
    domain: string;
    deployment: string;
    backend: string;
    payment: string;
    checkoutHealth: string;
    paymentPathHealth: string;
    lastLiveVerification: string | null;
    nextVerification: string | null;
    offersHealthy: string;
    credentialCapability: string;
    webhookHealth: string;
    fulfillmentMapping: string;
    commercialIncident: string | null;
    fulfillment: string;
    runtime: string;
    latestCycle: string | null;
    realObservations: number;
    nextRun: string | null;
  };
  askreview: {
    hqState: string;
    canonicalState: string;
    product: string;
    backend: string;
    fulfillment: string;
    validation: string;
    domain: string;
    payment: string;
    currentBlocker: string;
    nextAction: string;
  };
  findings: HqCanonicalReconciliationFinding[];
  gates: {
    completeness: NamedGateResult;
    freshness: NamedGateResult;
    activity: NamedGateResult;
    consistency: NamedGateResult;
    traceability: NamedGateResult;
  };
};
