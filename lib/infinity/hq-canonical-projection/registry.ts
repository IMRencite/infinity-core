import { HQ_PROJECTION_MECHANISM, type FounderWorkVisibilityContractRecord, type HqCanonicalProjectionRegistryEntry } from "./types";

export const HQ_CANONICAL_PROJECTION_REGISTRY: HqCanonicalProjectionRegistryEntry[] = [
  { domain: "opportunities", hqSurface: "/dashboard/opportunities", canonicalSource: "opportunity_candidates", projectionKey: "candidateId", refreshMechanism: "NEXT_HQ_READ", freshnessExpectation: "NEXT_HQ_READ", traceabilityKey: "discovery_run_id", detailRoute: "/dashboard/opportunities/[candidateId]" },
  { domain: "ventures", hqSurface: "/dashboard/ventures", canonicalSource: "venture_operational_records + venture_assemblies", projectionKey: "ventureId", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "venture_id", detailRoute: "/dashboard/ventures/[ventureId]" },
  { domain: "missions", hqSurface: "/dashboard/missions", canonicalSource: "mission_activity_events", projectionKey: "missionId", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "missionId", detailRoute: "/dashboard/missions/[missionId]" },
  { domain: "builds", hqSurface: "/dashboard/builds", canonicalSource: "product_asset_builder_runs + active_artifact", projectionKey: "buildId", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "artifact_id", detailRoute: "/dashboard/builds/[buildId]" },
  { domain: "deployments", hqSurface: "/dashboard/ventures/[ventureId]", canonicalSource: "venture_operational_records.active_deployment", projectionKey: "deploymentId", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "active_deployment", detailRoute: "/dashboard/ventures/[ventureId]" },
  { domain: "providers", hqSurface: "/dashboard", canonicalSource: "provider capability matrix + external_actions", projectionKey: "provider", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "provider_action", detailRoute: "/dashboard" },
  { domain: "domains", hqSurface: "/dashboard/ventures/[ventureId]", canonicalSource: "venture_operational_records.primary_domain", projectionKey: "domain", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "domain_registration_state", detailRoute: "/dashboard/ventures/[ventureId]" },
  { domain: "payments", hqSurface: "/dashboard/ventures/[ventureId]", canonicalSource: "occupancynpv payment evidence + live payment path verification + live checkout health + venture payment fields", projectionKey: "paymentPathHealth", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "lastLiveVerification", detailRoute: "/dashboard/ventures/[ventureId]" },
  { domain: "fulfillment", hqSurface: "/dashboard/ventures/[ventureId]", canonicalSource: "FulfillmentContract + occupancy fulfillment readiness", projectionKey: "fulfillment_state", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "orphaned_paid_customer_count", detailRoute: "/dashboard/ventures/[ventureId]" },
  { domain: "performance", hqSurface: "/dashboard/intelligence", canonicalSource: "post-launch observation baseline + performance_intelligence", projectionKey: "observations", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "last_cycle_id", detailRoute: "/dashboard/intelligence" },
  { domain: "learning", hqSurface: "/dashboard/intelligence", canonicalSource: "latest_learning_decision", projectionKey: "learningDecision", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "latest_learning_decision", detailRoute: "/dashboard/intelligence" },
  { domain: "outreach", hqSurface: "/dashboard/ventures/[ventureId]", canonicalSource: "venture_operational_records.outreach_strategy", projectionKey: "outreach", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "outreach_strategy", detailRoute: "/dashboard/ventures/[ventureId]" },
  { domain: "organic", hqSurface: "/dashboard/ventures/[ventureId]", canonicalSource: "search_console_binding + acquisition_state", projectionKey: "organic", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "search_console_binding", detailRoute: "/dashboard/ventures/[ventureId]" },
  { domain: "creative", hqSurface: "/dashboard/ventures/[ventureId]", canonicalSource: "creative/media venture fields", projectionKey: "creative", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "creative_media", detailRoute: "/dashboard/ventures/[ventureId]" },
  { domain: "runtime", hqSurface: "/dashboard/runtime", canonicalSource: "daily-venture-operating-runtime.json + cron triggers", projectionKey: "last_cycle_id", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "last_cycle_id", detailRoute: "/dashboard/runtime" },
  { domain: "portfolio", hqSurface: "/dashboard/portfolio", canonicalSource: "venture_assemblies UNION canonical venture records", projectionKey: "activeVentureCount", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "venture_id", detailRoute: "/dashboard/portfolio" },
  { domain: "governance", hqSurface: "/dashboard/governance", canonicalSource: "blocked_actions + founder authorizations", projectionKey: "blocker", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "blocked_actions", detailRoute: "/dashboard/governance" },
  { domain: "incidents", hqSurface: "/dashboard/activity", canonicalSource: "runtime last_error + FAILED missions + occupancynpv-live-checkout-incident.json", projectionKey: "failure", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "last_error", detailRoute: "/dashboard/activity" },
  { domain: "support", hqSurface: "/dashboard/ventures/[ventureId]", canonicalSource: "support_email + recovery queues", projectionKey: "support", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "support_email", detailRoute: "/dashboard/ventures/[ventureId]" },
  { domain: "activity", hqSurface: "/dashboard/activity", canonicalSource: "canonical transitions + mission_activity + runtime", projectionKey: "eventId", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "canonicalId", detailRoute: "/dashboard/activity" },
  { domain: "economics", hqSurface: "/dashboard", canonicalSource: "VentureEconomicsIntelligenceContract + competitor intelligence + Profit Lab artifacts", projectionKey: "profitLabView", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "research_run_id", detailRoute: "/dashboard" },
  { domain: "qc", hqSurface: "/dashboard/ventures/[ventureId]", canonicalSource: "UniversalVentureSystemQC matrix + coverage + freshness + incidents", projectionKey: "overallQc", refreshMechanism: HQ_PROJECTION_MECHANISM, freshnessExpectation: "REQUEST_TIME", traceabilityKey: "last_full_qc", detailRoute: "/dashboard/ventures/[ventureId]" },
];

export function registryEntry(domain: HqCanonicalProjectionRegistryEntry["domain"]): HqCanonicalProjectionRegistryEntry {
  const entry = HQ_CANONICAL_PROJECTION_REGISTRY.find((row) => row.domain === domain);
  if (!entry) throw new Error(`HQ_PROJECTION_DOMAIN_UNREGISTERED:${domain}`);
  return entry;
}

export const FOUNDER_WORK_VISIBILITY_CONTRACTS: FounderWorkVisibilityContractRecord[] = [
  ...HQ_CANONICAL_PROJECTION_REGISTRY.map((entry) => ({
    subsystem: entry.domain,
    founderShouldSee: `${entry.domain} current state, activity, and traceability`,
    hqSurface: entry.hqSurface,
    canonicalSource: entry.canonicalSource,
    activityRepresentation: `${entry.domain} canonical transition`,
    currentStateRepresentation: entry.projectionKey,
    traceability: entry.traceabilityKey,
    productionAutonomy: "READY" as const,
  })),
  {
    subsystem: "operations",
    founderShouldSee: "current work, recent work, blockers, next actions, runtime, venture operating state, opportunity changes",
    hqSurface: "/dashboard/operations",
    canonicalSource: "HQCanonicalOperatingProjection request-time read-through",
    activityRepresentation: "canonical current/recent work",
    currentStateRepresentation: "systemState",
    traceability: "event/mission/runtime ids",
    productionAutonomy: "READY",
  },
];

export function evaluateFounderWorkVisibilityContract(subsystem: string): FounderWorkVisibilityContractRecord {
  const contract = FOUNDER_WORK_VISIBILITY_CONTRACTS.find((row) => row.subsystem === subsystem);
  if (!contract) {
    return {
      subsystem,
      founderShouldSee: "UNKNOWN",
      hqSurface: "UNKNOWN",
      canonicalSource: "UNKNOWN",
      activityRepresentation: "UNKNOWN",
      currentStateRepresentation: "UNKNOWN",
      traceability: "UNKNOWN",
      productionAutonomy: "PRODUCTION_AUTONOMY_NOT_READY",
    };
  }
  return contract;
}
