import { WORKFLOW_STAGES, type ProspectWorkflowStage } from "./contract";
import { executeProspectAcquisitionTick } from "./acquisition/orchestrator";
import type { RegisteredSource } from "./acquisition/registry";
import type { ProspectIntelligenceService } from "./service";
import type { ProspectAccessRequest, ProspectCycleSnapshot } from "./types";

const ACCESS: ProspectAccessRequest = { consumer: "prospect_intelligence" };

export function outboundCoverageDays(ready: number, daily: number): number {
  if (daily <= 0) return ready > 0 ? Number.POSITIVE_INFINITY : 0;
  return Number((ready / daily).toFixed(2));
}

export async function executeProspectIntelligenceCycle(input: {
  service: ProspectIntelligenceService;
  now?: string;
  active_processing?: boolean;
  watching?: boolean;
  acquire?: boolean;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  registry?: RegisteredSource[];
}): Promise<ProspectCycleSnapshot> {
  const now = input.now ?? new Date().toISOString();
  const graph = input.service.graph;
  const acquisition = input.acquire
    ? await executeProspectAcquisitionTick({
      service: input.service,
      now,
      fetchImpl: input.fetchImpl,
      env: input.env,
      registry: input.registry,
    })
    : null;
  const inventories = [...graph.inventory.values()];
  const ready = inventories.reduce((sum, row) => sum + row.current_ready_inventory, 0);
  const daily = inventories.reduce((sum, row) => sum + row.average_daily_consumption, 0) || 5;
  const coverage = outboundCoverageDays(ready, daily);
  const stale = [...graph.entities.values()].filter((row) => row.freshness.status === "STALE" || (row.freshness.refresh_after && row.freshness.refresh_after < now));
  if (!acquisition) {
    for (const entity of stale) {
      input.service.requestRefresh(ACCESS, entity.entity_id, now);
    }
    for (const ventureId of graph.rules.keys()) {
      const inventory = input.service.publishReadyInventory(ACCESS, ventureId);
      if (inventory.current_ready_inventory < inventory.minimum_ready_inventory) {
        input.service.requestEnrichment(ACCESS, ventureId);
      }
    }
  }
  const activity = acquisition?.activity
    ?? (input.active_processing ? "ACTIVE" : input.watching || stale.length > 0 ? "MONITORING" : "IDLE");
  const stage: ProspectWorkflowStage = acquisition?.stage
    ?? (activity === "ACTIVE"
      ? (stale.length ? "REFRESH" : graph.matches.length ? "PUBLISH" : "DISCOVER")
      : activity === "MONITORING"
        ? "REFRESH"
        : "DISCOVER");
  const generic = acquisition?.generic_activity
    ?? (activity === "ACTIVE"
      ? "Updating prospect intelligence"
      : activity === "MONITORING"
        ? "Refreshing market intelligence"
        : "Maintaining commercial entity coverage");
  const sources = [...graph.sources.values()];
  return {
    workflow_stage: WORKFLOW_STAGES.includes(stage) ? stage : "DISCOVER",
    activity,
    known_people: graph.people.size,
    known_organizations: graph.organizations.size,
    verified_contact_points: graph.eligibility.filter((row) => row.status.endsWith("_allowed")).length,
    new_entities_today: graph.acquisition.metrics.new_entities_created || graph.entities.size,
    updated_entities_today: graph.acquisition.metrics.existing_entities_updated || stale.length,
    entities_resolved: graph.acquisition.metrics.duplicates_resolved || [...graph.entities.values()].filter((row) => row.merge_history.length > 0).length,
    enrichment_backlog: inventories.reduce((sum, row) => sum + row.enrichment_backlog, 0) + graph.acquisition.enrichment_queue.filter((row) => !row.completed_at).length,
    identity_conflicts: graph.acquisition.metrics.ambiguous_records || graph.events.filter((row) => row.includes("merged")).length,
    freshness_coverage: graph.entities.size ? Number((([...graph.entities.values()].filter((row) => row.freshness.status === "CURRENT").length / graph.entities.size) * 100).toFixed(1)) : 100,
    source_health: sources.some((row) => row.health === "FAILED" || row.health === "BLOCKED")
      ? "FAILED"
      : sources.some((row) => row.health === "DEGRADED" || row.health === "RATE_LIMITED")
        ? "DEGRADED"
        : sources.length
          ? "HEALTHY"
          : "UNKNOWN",
    venture_matches: graph.matches.length,
    ready_prospects: ready,
    outbound_coverage_days: coverage,
    published_to_sales: graph.events.filter((row) => row === "prospect.published_to_sales").length,
    sources_enabled: sources.filter((row) => row.enabled).length,
    sources_healthy: sources.filter((row) => row.health === "HEALTHY").length,
    sources_degraded: sources.filter((row) => row.health === "DEGRADED" || row.health === "RATE_LIMITED").length,
    discovery_jobs: graph.acquisition.plans.filter((row) => row.mode === "DISCOVERY").length,
    refresh_jobs: graph.acquisition.refresh_queue.length,
    enrichment_jobs: graph.acquisition.enrichment_queue.length,
    duplicates_resolved: graph.acquisition.metrics.duplicates_resolved,
    ambiguous_records: graph.acquisition.metrics.ambiguous_records,
    records_seen: Object.values(graph.acquisition.health).reduce((sum, row) => sum + row.records_seen, 0),
    events: graph.events.filter((row) => row.startsWith("prospect.") || row.startsWith("sales.")) as ProspectCycleSnapshot["events"],
    generic_activity: generic,
  };
}
