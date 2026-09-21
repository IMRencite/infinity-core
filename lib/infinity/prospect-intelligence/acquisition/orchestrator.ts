import type { ProspectIntelligenceService } from "../service";
import type { ProspectAccessRequest, SourceRecord } from "../types";
import { ingestDiscoveredRecord, detectChangedFields } from "./ingest";
import { updateSourceQualityFromOutcomes } from "./performance";
import { policyAllowsAcquisition, policyAllowsRefresh, policyIsUnknown } from "./policy";
import {
  acquisitionKillSwitchEnabled,
  defaultAcquisitionRegistry,
  liveSecEdgarEnabled,
  type RegisteredSource,
} from "./registry";
import { emptySourceHealth, type ProspectAcquisitionPlan, type SourceHealthStatus } from "./types";

const ACCESS: ProspectAccessRequest = { consumer: "prospect_intelligence" };

const RATE_WINDOWS = new Map<string, number[]>();

export type AcquisitionTickResult = {
  did_work: boolean;
  activity: "IDLE" | "MONITORING" | "ACTIVE";
  stage: "DISCOVER" | "INGEST" | "RESOLVE" | "ENRICH" | "CLASSIFY" | "MATCH" | "PUBLISH" | "REFRESH";
  plans: ProspectAcquisitionPlan[];
  records_seen: number;
  source_failures: number;
  generic_activity: string;
};

function rateLimited(sourceId: string, perMinute: number, nowMs: number): boolean {
  const window = RATE_WINDOWS.get(sourceId) ?? [];
  const fresh = window.filter((at) => nowMs - at < 60_000);
  RATE_WINDOWS.set(sourceId, fresh);
  return fresh.length >= perMinute;
}

function markRate(sourceId: string, nowMs: number) {
  const window = RATE_WINDOWS.get(sourceId) ?? [];
  window.push(nowMs);
  RATE_WINDOWS.set(sourceId, window);
}

function demandPriority(service: ProspectIntelligenceService): { boost: number; replenish: boolean; backpressure: boolean; ventures: string[] } {
  const inventories = [...service.graph.inventory.values()];
  if (!inventories.length) return { boost: 0, replenish: false, backpressure: false, ventures: [] };
  let boost = 0;
  let replenish = false;
  let backpressure = false;
  const ventures: string[] = [];
  for (const row of inventories) {
    if (row.current_ready_inventory < row.minimum_ready_inventory) {
      boost += 40;
      replenish = true;
      ventures.push(row.venture_id);
    } else if (row.coverage_days > 0 && row.coverage_days < 7) {
      boost += 20;
      ventures.push(row.venture_id);
    }
    if (row.current_ready_inventory > row.target_ready_inventory * 3) backpressure = true;
  }
  return { boost, replenish, backpressure, ventures };
}

function setHealth(source: SourceRecord, status: SourceHealthStatus, now: string, failure?: string) {
  source.health = status === "RATE_LIMITED" || status === "AUTH_REQUIRED" || status === "BLOCKED" || status === "DISABLED"
    ? status
    : status === "DEGRADED"
      ? "DEGRADED"
      : status === "HEALTHY"
        ? "HEALTHY"
        : "UNKNOWN";
  if (failure) source.last_failure = now;
  else source.last_success = now;
}

export function ensureRegisteredSources(service: ProspectIntelligenceService, registry: RegisteredSource[]) {
  for (const row of registry) {
    if (!service.graph.sources.has(row.source.source_id)) {
      service.registerSource(ACCESS, row.source);
    }
    if (!service.graph.acquisition.health[row.source.source_id]) {
      service.graph.acquisition.health[row.source.source_id] = emptySourceHealth(row.source.source_id);
    }
  }
}

export async function executeProspectAcquisitionTick(input: {
  service: ProspectIntelligenceService;
  now?: string;
  registry?: RegisteredSource[];
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<AcquisitionTickResult> {
  const now = input.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  const env = input.env ?? process.env;
  const state = input.service.graph.acquisition;
  if (acquisitionKillSwitchEnabled(env)) {
    return {
      did_work: false,
      activity: "IDLE",
      stage: "DISCOVER",
      plans: [],
      records_seen: 0,
      source_failures: 0,
      generic_activity: "Acquisition disabled by kill switch.",
    };
  }

  const registry = input.registry ?? defaultAcquisitionRegistry({
    fetchImpl: input.fetchImpl ?? fetch,
    liveSec: liveSecEdgarEnabled(env),
  });
  ensureRegisteredSources(input.service, registry);
  if (!input.service.graph.rules.has("occupancynpv")) {
    input.service.setVentureRule(ACCESS, {
      rule_id: "rule:occupancynpv:acquisition-default",
      venture_id: "occupancynpv",
      icp: {
        industries: ["property", "real estate"],
        roles: ["owner", "broker"],
        geographies: ["florida", "fl", "us-fl"],
        disqualifiers: [],
      },
      updated_at: now,
    });
  }
  const demand = demandPriority(input.service);
  if (demand.replenish) {
    input.service.graph.events.push("prospect.inventory.replenishment_requested");
  }

  const observationBacklog = input.service.graph.observations.length;
  const pauseDiscovery = observationBacklog > 2000;
  const plans: ProspectAcquisitionPlan[] = [];
  let recordsSeen = 0;
  let failures = 0;
  let didWork = false;
  let stage: AcquisitionTickResult["stage"] = "DISCOVER";

  const enabled = registry.filter((row) => row.config.enabled && row.source.enabled);
  const healthyEnough = enabled.filter((row) => {
    const health = state.health[row.source.source_id];
    return !health || health.consecutive_failures < 5 || nowMs - Date.parse(health.last_failure_at ?? "0") > 15 * 60 * 1000;
  });

  for (const registered of healthyEnough) {
    if (!policyAllowsAcquisition(registered.policy) || (policyIsUnknown(registered.policy) && registered.connector.id !== "internal_infinity")) {
      continue;
    }
    const cursorKey = `${registered.source.source_id}:discovery`;
    const cursor = state.cursors[cursorKey];
    const due = !cursor?.last_completed_at
      || Date.parse(cursor.last_completed_at) + registered.config.discovery_cadence_ms <= nowMs
      || demand.replenish;
    if (!due || pauseDiscovery) continue;
    if (rateLimited(registered.source.source_id, registered.config.rate_limit.requests_per_minute, nowMs)) {
      const health = state.health[registered.source.source_id] ?? emptySourceHealth(registered.source.source_id);
      health.health_status = "RATE_LIMITED";
      state.health[registered.source.source_id] = health;
      setHealth(registered.source, "RATE_LIMITED", now, "RATE_LIMITED");
      input.service.graph.events.push("prospect.source.degraded");
      continue;
    }

    const batch = demand.backpressure ? 1 : Math.min(registered.config.batch_size + (demand.boost ? 5 : 0), registered.config.rate_limit.batch_limit);
    const plan: ProspectAcquisitionPlan = {
      id: `plan:${registered.source.source_id}:${now}`,
      sourceIds: [registered.source.source_id],
      geography: registered.config.geography,
      industries: registered.config.industry_scope,
      ventureDemandSignals: demand.ventures,
      mode: "DISCOVERY",
      priority: registered.config.priority + demand.boost,
      targetBatchSize: batch,
      scheduledAt: now,
    };
    plans.push(plan);
    state.plans = [...state.plans.slice(-20), plan];
    input.service.graph.events.push("prospect.discovery.requested");
    input.service.graph.events.push("prospect.discovery.started");
    const started = Date.now();
    const health = state.health[registered.source.source_id] ?? emptySourceHealth(registered.source.source_id);
    health.last_attempt_at = now;
    try {
      markRate(registered.source.source_id, nowMs);
      const result = await registered.connector.discover({
        now,
        batch_size: batch,
        cursor: cursor?.cursor ?? null,
        geography: registered.config.geography,
        industries: registered.config.industry_scope,
      });
      if (result.schema_changed) {
        health.health_status = "DEGRADED";
        health.last_error = "SOURCE_SCHEMA_CHANGED";
        health.consecutive_failures += 1;
        health.last_failure_at = now;
        failures += 1;
        state.metrics.source_failures += 1;
        setHealth(registered.source, "DEGRADED", now, "SOURCE_SCHEMA_CHANGED");
        input.service.graph.events.push("prospect.source.degraded");
        continue;
      }
      for (const record of result.records) {
        const ingested = ingestDiscoveredRecord({
          service: input.service,
          source_id: registered.source.source_id,
          now,
          record,
          policy: registered.policy,
          state,
        });
        recordsSeen += 1;
        health.records_seen += 1;
        if (ingested.created) health.records_created += 1;
        if (ingested.updated) health.records_updated += 1;
        if (ingested.duplicate) health.duplicates_resolved += 1;
        if (ingested.ambiguous) health.ambiguous_records += 1;
        if (ingested.created && ingested.entity_id) {
          state.enrichment_queue.push({
            job_id: `enrich:${ingested.entity_id}:${now}`,
            entity_id: ingested.entity_id,
            reason: "new_entity_incomplete",
            priority: demand.boost,
            requested_at: now,
            completed_at: null,
          });
          input.service.requestEnrichment(ACCESS, ingested.entity_id);
        }
      }
      state.cursors[cursorKey] = {
        source_id: registered.source.source_id,
        scope: "discovery",
        cursor: result.next_cursor,
        last_completed_at: now,
        last_record_seen: result.records.at(-1)?.source_record_id ?? cursor?.last_record_seen ?? null,
        next_due_at: new Date(nowMs + registered.config.discovery_cadence_ms).toISOString(),
        status: result.exhausted ? "COMPLETE" : "DUE",
      };
      health.consecutive_failures = 0;
      health.last_success_at = now;
      health.last_error = null;
      health.latency_ms = Date.now() - started;
      health.duplicate_rate = health.records_seen ? Number((health.duplicates_resolved / health.records_seen).toFixed(3)) : 0;
      health.health_status = "HEALTHY";
      setHealth(registered.source, "HEALTHY", now);
      input.service.graph.events.push("prospect.source.healthy");
      input.service.graph.events.push("prospect.discovery.completed");
      didWork = result.records.length > 0 || didWork;
      stage = "INGEST";
    } catch (error) {
      const message = error instanceof Error ? error.message : "SOURCE_FAILURE";
      health.consecutive_failures += 1;
      health.last_failure_at = now;
      health.last_error = message;
      health.latency_ms = Date.now() - started;
      health.error_rate = Number((health.consecutive_failures / Math.max(1, health.records_seen + health.consecutive_failures)).toFixed(3));
      const status: SourceHealthStatus = message === "RATE_LIMITED" ? "RATE_LIMITED" : message.includes("401") || message.includes("403") ? "AUTH_REQUIRED" : "DEGRADED";
      health.health_status = status;
      setHealth(registered.source, status, now, message);
      state.metrics.source_failures += 1;
      failures += 1;
      input.service.graph.events.push("prospect.source.degraded");
      state.cursors[cursorKey] = {
        source_id: registered.source.source_id,
        scope: "discovery",
        cursor: cursor?.cursor ?? null,
        last_completed_at: cursor?.last_completed_at ?? null,
        last_record_seen: cursor?.last_record_seen ?? null,
        next_due_at: new Date(nowMs + Math.min(15 * 60 * 1000 * Math.max(1, health.consecutive_failures), 60 * 60 * 1000)).toISOString(),
        status: "BACKOFF",
      };
    }
    state.health[registered.source.source_id] = health;
  }

  const stale = [...input.service.graph.entities.values()].filter((row) =>
    row.freshness.refresh_after && row.freshness.refresh_after < now,
  ).slice(0, demand.backpressure ? 1 : 3);
  for (const entity of stale) {
    const sourceId = entity.freshness.source_id;
    const registered = registry.find((row) => row.source.source_id === sourceId);
    if (!registered || !policyAllowsRefresh(registered.policy)) continue;
    const sourceRecordId = entity.identifiers.find((row) => row.scheme === "source_record")?.value.split(":").slice(1).join(":")
      ?? entity.identifiers.find((row) => row.scheme === "cik")?.value
      ?? null;
    input.service.graph.events.push("prospect.refresh.requested");
    state.refresh_queue.push({
      job_id: `refresh:${entity.entity_id}:${now}`,
      entity_id: entity.entity_id,
      source_id: sourceId,
      source_record_id: sourceRecordId,
      priority: 10,
      requested_at: now,
      completed_at: now,
    });
    if (sourceRecordId) {
      try {
        const refreshed = await registered.connector.refresh({ now, source_record_id: sourceRecordId });
        if (refreshed.record) {
          const previous = input.service.graph.observations.filter((row) => row.entity_hint === entity.entity_id).at(-1)?.raw_value;
          const changed = detectChangedFields(
            previous && typeof previous === "object" ? (previous as { raw_fields?: Record<string, unknown> }).raw_fields ?? null : null,
            refreshed.record.raw_fields,
          );
          ingestDiscoveredRecord({
            service: input.service,
            source_id: sourceId,
            now,
            record: refreshed.record,
            policy: registered.policy,
            state,
          });
          if (changed.length) input.service.graph.events.push("prospect.entity.updated");
        }
      } catch {
        failures += 1;
      }
    }
    input.service.requestRefresh(ACCESS, entity.entity_id, now);
    didWork = true;
    stage = "REFRESH";
  }

  for (const job of state.enrichment_queue.filter((row) => !row.completed_at).slice(0, 5)) {
    const entity = input.service.graph.entities.get(job.entity_id);
    if (entity) {
      const evidence = input.service.graph.observations
        .filter((row) => row.entity_hint === job.entity_id || JSON.stringify(row.raw_value).includes(job.entity_id) || row.observation_id.includes(entity.freshness.source_id))
        .slice(0, 3)
        .map((row) => row.observation_id);
      if (evidence.length) {
        input.service.deriveAttribute(ACCESS, {
          attribute_id: `attr:${job.entity_id}:completeness`,
          entity_id: job.entity_id,
          name: "completeness",
          value: entity.identifiers.length,
          inference: true,
          evidence_ids: evidence,
          confidence: 0.6,
          freshness: entity.freshness,
        });
      }
    }
    job.completed_at = now;
    input.service.graph.events.push("prospect.enrichment.completed");
    didWork = true;
    stage = "ENRICH";
  }

  for (const [ventureId, rule] of input.service.graph.rules) {
    for (const person of input.service.graph.people.values()) {
      const relatedOrgId = input.service.graph.relationships.find((row) => row.from_entity_id === person.entity_id && (row.type === "WORKS_AT" || row.type === "HAS_ROLE"))?.to_entity_id;
      const org = [...input.service.graph.organizations.values()].find((row) => row.entity_id === relatedOrgId)
        ?? [...input.service.graph.organizations.values()].find((row) => (row.industry ?? "").toLowerCase().includes("property") || (row.industry ?? "").toLowerCase().includes("real estate"))
        ?? null;
      const role = [...input.service.graph.observations]
        .map((row) => row.normalized_value && typeof row.normalized_value === "object" ? (row.normalized_value as { role?: string | null }).role : null)
        .find((row) => Boolean(row)) ?? (person.display_name ? "owner" : null);
      input.service.matchVenture(ACCESS, {
        entity_id: person.entity_id,
        venture_id: ventureId,
        person,
        organization: org,
        role,
        geography: rule.icp.geographies[0] ?? null,
        now,
        evidence_ids: input.service.graph.observations.filter((row) => row.entity_hint === person.entity_id || row.entity_hint === org?.entity_id).map((row) => row.observation_id),
      });
    }
    for (const organization of input.service.graph.organizations.values()) {
      if ([...input.service.graph.people.values()].some((row) => row.entity_id === organization.entity_id)) continue;
      input.service.matchVenture(ACCESS, {
        entity_id: organization.entity_id,
        venture_id: ventureId,
        organization,
        now,
        evidence_ids: input.service.graph.observations.filter((row) => row.entity_hint === organization.entity_id).map((row) => row.observation_id),
      });
    }
    const inventory = input.service.publishReadyInventory(ACCESS, ventureId);
    state.metrics.records_published_to_sales = inventory.current_ready_inventory;
    if (inventory.current_ready_inventory >= inventory.minimum_ready_inventory && demand.replenish) {
      input.service.graph.events.push("prospect.inventory.replenished");
    }
    stage = "PUBLISH";
  }

  updateSourceQualityFromOutcomes(input.service.graph);
  state.last_tick_at = now;
  state.next_due_at = new Date(nowMs + (demand.replenish ? 5 * 60 * 1000 : 60 * 60 * 1000)).toISOString();
  const watching = enabled.length > 0;
  const activity = didWork ? "ACTIVE" : watching ? "MONITORING" : "IDLE";
  const generic = activity === "ACTIVE"
    ? (stage === "REFRESH" ? "Refreshing market intelligence" : stage === "ENRICH" ? "Resolving organizations" : "Discovering commercial entities")
    : activity === "MONITORING"
      ? "Refreshing market intelligence"
      : "Maintaining commercial entity coverage";
  return {
    did_work: didWork,
    activity,
    stage,
    plans,
    records_seen: recordsSeen,
    source_failures: failures,
    generic_activity: generic,
  };
}

export function resetAcquisitionRateWindows() {
  RATE_WINDOWS.clear();
}
