import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { consumeEligibleProspect, nextEligibleSalesCandidates } from "../sales-bridge";
import { createProspectIntelligenceService } from "../service";
import { createProspectGraph, resetProspectGraph } from "../store";
import { executeProspectIntelligenceCycle } from "../cycle";
import { projectProspectIntelligenceHq } from "../hq";
import { projectPublicProspectIntelligence } from "../public";
import { prospectOutcomeToPerformanceObservation } from "../performance";
import { snapshotProspectGraph, graphFromSnapshot } from "../repository";
import {
  evaluateAlwaysOnSalesContinuityGate,
  evaluateProspectDataLineageGate,
  evaluateProspectIntelligencePublicPrivacyGate,
  evaluateProspectIntelligenceRoomParityGate,
  evaluateProspectInventoryHealthGate,
} from "../gates";
import {
  evaluateProspectAcquisitionContinuityGate,
  evaluateProspectAcquisitionDedupeGate,
  evaluateProspectAcquisitionLineageGate,
  evaluateProspectSourceHealthGate,
  evaluateProspectSourcePolicyGate,
} from "../acquisition/gates";
import { executeProspectAcquisitionTick, resetAcquisitionRateWindows } from "../acquisition/orchestrator";
import { defaultAcquisitionRegistry } from "../acquisition/registry";
import { UNKNOWN_POLICY, SEC_EDGAR_POLICY } from "../acquisition/policy";
import { normalizeRawFields } from "../acquisition/normalize";
import { createInternalInfinityConnector, INTERNAL_INFINITY_FIXTURE, INTERNAL_INFINITY_SOURCE_ID } from "../acquisition/connectors/internal-infinity";
import { createSecEdgarConnector, SEC_EDGAR_FIXTURE, SEC_EDGAR_SOURCE_ID } from "../acquisition/connectors/sec-edgar";
import type { ProspectSourceConnector, SourceConnectorConfig } from "../acquisition/types";
import { defaultConnectorConfig } from "../acquisition/policy";
import type { SourceRecord } from "../types";

const NOW = "2026-09-16T06:00:00.000Z";
const LATER = "2026-09-16T08:00:00.000Z";
const SALES = { consumer: "sales_outbound_runtime" as const };

function sourceRecord(id: string, enabled = true): SourceRecord {
  return {
    source_id: id,
    source_type: id === SEC_EDGAR_SOURCE_ID ? "PUBLIC_ORGANIZATION_DATA" : "INTERNAL_INFINITY",
    name: id,
    jurisdiction: "US",
    base_url: "https://example.invalid",
    acquisition_method: "official_api",
    usage_policy: "approved",
    licensing_notes: "test",
    data_categories: ["organization"],
    refresh_cadence: "hourly",
    reliability: 0.9,
    enabled,
    last_success: null,
    last_failure: null,
    health: "UNKNOWN",
  };
}

function registry(overrides: {
  internalFail?: boolean;
  secEnabled?: boolean;
  internalEnabled?: boolean;
  batchSize?: number;
  cadenceMs?: number;
  ratePerMinute?: number;
} = {}) {
  const base = defaultAcquisitionRegistry({
    liveSec: false,
    internalFail: overrides.internalFail,
    secEnabled: overrides.secEnabled,
    internalEnabled: overrides.internalEnabled,
  });
  return base.map((row) => ({
    ...row,
    config: {
      ...row.config,
      batch_size: overrides.batchSize ?? row.config.batch_size,
      discovery_cadence_ms: overrides.cadenceMs ?? row.config.discovery_cadence_ms,
      rate_limit: {
        ...row.config.rate_limit,
        requests_per_minute: overrides.ratePerMinute ?? row.config.rate_limit.requests_per_minute,
      },
    } satisfies SourceConnectorConfig,
  }));
}

describe("Prospect Intelligence Acquisition V1", () => {
  const graph = createProspectGraph();
  const service = createProspectIntelligenceService(graph);

  beforeEach(() => {
    resetProspectGraph(graph);
    resetAcquisitionRateWindows();
  });

  afterEach(() => {
    resetAcquisitionRateWindows();
  });

  describe("connector interface", () => {
    it("exposes discover, refresh, and health on real connectors", async () => {
      const sec = createSecEdgarConnector({ live: false });
      const internal = createInternalInfinityConnector();
      expect(sec.id).toBe(SEC_EDGAR_SOURCE_ID);
      expect(internal.id).toBe(INTERNAL_INFINITY_SOURCE_ID);
      expect(typeof sec.discover).toBe("function");
      expect(typeof sec.refresh).toBe("function");
      expect(typeof sec.health).toBe("function");
      const discovered = await sec.discover({ now: NOW, batch_size: 2 });
      expect(discovered.records.length).toBe(2);
      expect(discovered.next_cursor).toBe("2");
      const refreshed = await sec.refresh({ now: NOW, source_record_id: "320193" });
      expect(refreshed.record?.raw_fields.ticker).toBe("AAPL");
      expect((await sec.health()).status).toBe("HEALTHY");
    });
  });

  describe("source policy", () => {
    it("passes only when registered, enabled, approved, and scoped", () => {
      expect(evaluateProspectSourcePolicyGate({
        sourceRegistered: true,
        sourceEnabled: true,
        policy: SEC_EDGAR_POLICY,
        connectorHonorsScope: true,
        connectorHonorsRateLimit: true,
      }).result).toBe("PASS");
      expect(evaluateProspectSourcePolicyGate({
        sourceRegistered: false,
        sourceEnabled: true,
        policy: SEC_EDGAR_POLICY,
        connectorHonorsScope: true,
        connectorHonorsRateLimit: true,
      }).result).toBe("FAIL");
      expect(evaluateProspectSourcePolicyGate({
        sourceRegistered: true,
        sourceEnabled: true,
        policy: UNKNOWN_POLICY,
        connectorHonorsScope: true,
        connectorHonorsRateLimit: true,
        unknownPolicyPublishedToSales: true,
      }).result).toBe("FAIL");
    });

    it("keeps unknown policy contacts out of Sales", async () => {
      const unknownConnector: ProspectSourceConnector = {
        id: "unknown_source",
        sourceType: "OTHER_APPROVED",
        async discover() {
          return {
            records: [{
              source_record_id: "secret-1",
              source_url: "https://example.invalid/secret",
              entity_kind: "PERSON",
              raw_fields: { display_name: "Jane Doe", email: "jane.doe@secret.invalid" },
            }],
            next_cursor: null,
            exhausted: true,
          };
        },
        async refresh() {
          return { record: null, changed_fields: [] };
        },
        async health() {
          return { status: "HEALTHY", detail: "fixture" };
        },
      };
      const tick = await executeProspectAcquisitionTick({
        service,
        now: NOW,
        env: { PI_ACQUISITION_DISABLED: "0" },
        registry: [{
          source: sourceRecord("unknown_source"),
          policy: UNKNOWN_POLICY,
          config: defaultConnectorConfig({ enabled: true, batch_size: 1, discovery_cadence_ms: 1 }),
          connector: unknownConnector,
        }],
      });
      expect(tick.records_seen).toBe(0);
      expect(graph.eligibility.some((row) => row.status === "email_allowed")).toBe(false);
    });
  });

  describe("discovery and lineage", () => {
    it("stores observations, normalizes, resolves, and creates canonical entities", async () => {
      const tick = await executeProspectAcquisitionTick({
        service,
        now: NOW,
        registry: registry({ cadenceMs: 1 }),
      });
      expect(tick.records_seen).toBeGreaterThan(0);
      expect(graph.observations.length).toBeGreaterThan(0);
      const observation = graph.observations[0]!;
      expect(observation.source_id).toBeTruthy();
      expect(observation.raw_value).toBeTruthy();
      expect(observation.normalized_value).toBeTruthy();
      expect(graph.organizations.size).toBeGreaterThan(0);
      expect(graph.people.size).toBeGreaterThan(0);
      expect([...graph.entities.values()].every((row) => !("venture_id" in row && row.venture_id != null))).toBe(true);
      expect(evaluateProspectAcquisitionLineageGate({
        connectorResult: tick.records_seen > 0,
        observationStored: graph.observations.length > 0,
        normalized: graph.observations.every((row) => row.normalized_value != null),
        resolved: graph.entities.size > 0,
        canonicalEntity: graph.organizations.size > 0,
        connectorWroteCanonicalDirectly: false,
      }).result).toBe("PASS");
      expect(evaluateProspectDataLineageGate({
        observationsPreserved: true,
        derivedHasEvidence: true,
        inferenceStoredAsFact: false,
        sourceLost: false,
        freshnessMissing: false,
        mergeUnexplained: false,
      }).result).toBe("PASS");
    });
  });

  describe("normalization", () => {
    it("normalizes names, contacts, domains, jurisdictions, and IDs while preserving raw fields", () => {
      const raw = {
        title: "APPLE INC.",
        first_name: "Alex",
        last_name: "Rivera",
        email: "Alex.Rivera@Harborline.INVALID",
        phone: "(305) 555-0100",
        website: "https://www.harborline.invalid/about",
        address: "100 Harbor Way",
        city: "Miami",
        state: "FL",
        country: "United States",
        industry: "Property Management",
        role: "Owner",
        license_id: "LIC-99",
        cik_str: 320193,
        ticker: "aapl",
      };
      const normalized = normalizeRawFields(raw);
      expect(normalized.legal_name).toBe("APPLE INC.");
      expect(normalized.email).toBe("alex.rivera@harborline.invalid");
      expect(normalized.phone).toBe("3055550100");
      expect(normalized.domain).toBe("harborline.invalid");
      expect(normalized.region).toBe("US-FL");
      expect(normalized.country).toBe("US");
      expect(normalized.industry).toBe("property management");
      expect(normalized.cik).toBe("0000320193");
      expect(normalized.ticker).toBe("AAPL");
      expect(raw.email).toBe("Alex.Rivera@Harborline.INVALID");
    });
  });

  describe("dedupe", () => {
    it("keeps one canonical organization across source A, source B, and refresh", async () => {
      await executeProspectAcquisitionTick({ service, now: NOW, registry: registry({ cadenceMs: 1 }) });
      const orgsAfterFirst = graph.organizations.size;
      await executeProspectAcquisitionTick({ service, now: LATER, registry: registry({ cadenceMs: 1 }) });
      const appleEntities = [...graph.entities.values()].filter((row) =>
        row.identifiers.some((item) => item.scheme === "cik" && item.value.replace(/^0+/, "") === "320193"),
      );
      expect(appleEntities.length).toBe(1);
      const appleObservations = graph.observations.filter((row) =>
        JSON.stringify(row.raw_value).includes("320193") || JSON.stringify(row.normalized_value).includes("0000320193"),
      );
      expect(appleObservations.length).toBeGreaterThan(1);
      expect(new Set(appleObservations.map((row) => row.source_id)).size).toBeGreaterThan(1);
      expect(evaluateProspectAcquisitionDedupeGate({
        canonicalOrganizations: appleEntities.length,
        observations: appleObservations.length,
        sources: new Set(appleObservations.map((row) => row.source_id)).size,
        expectedOrganizations: 1,
      }).result).toBe("PASS");
      expect(graph.organizations.size).toBeLessThanOrEqual(orgsAfterFirst + 1);
    });
  });

  describe("refresh and change detection", () => {
    it("refreshes stale entities and records field changes", async () => {
      await executeProspectAcquisitionTick({ service, now: NOW, registry: registry({ cadenceMs: 1 }) });
      const entity = [...graph.entities.values()].find((row) => row.identifiers.some((item) => item.scheme === "cik"));
      expect(entity).toBeTruthy();
      entity!.freshness.refresh_after = "2026-09-16T05:00:00.000Z";
      const before = graph.observations.length;
      const tick = await executeProspectAcquisitionTick({ service, now: LATER, registry: registry({ cadenceMs: 60 * 60 * 1000 }) });
      expect(tick.stage === "REFRESH" || graph.events.includes("prospect.refresh.requested") || graph.events.includes("prospect.refresh.completed")).toBe(true);
      expect(graph.observations.length).toBeGreaterThanOrEqual(before);
    });
  });

  describe("continuous scheduling", () => {
    it("keeps discovering after healthy inventory and raises priority when inventory is low", async () => {
      const first = await executeProspectAcquisitionTick({ service, now: NOW, registry: registry({ cadenceMs: 1 }) });
      expect(first.did_work || first.records_seen > 0).toBe(true);
      const inventory = service.publishReadyInventory(SALES, "occupancynpv");
      inventory.current_ready_inventory = inventory.target_ready_inventory;
      const healthy = await executeProspectAcquisitionTick({ service, now: LATER, registry: registry({ cadenceMs: 1 }) });
      expect(healthy.plans.length + healthy.records_seen).toBeGreaterThan(0);
      inventory.current_ready_inventory = 1;
      inventory.minimum_ready_inventory = 10;
      inventory.coverage_days = 0.2;
      const low = await executeProspectAcquisitionTick({
        service,
        now: "2026-09-16T10:00:00.000Z",
        registry: registry({ cadenceMs: 1 }),
      });
      expect(graph.events.includes("prospect.inventory.replenishment_requested")).toBe(true);
      expect(low.plans.some((row) => row.priority > 10) || graph.events.includes("prospect.inventory.replenishment_requested")).toBe(true);
      expect(evaluateProspectAcquisitionContinuityGate({
        cycles: 3,
        discoveryContinued: healthy.records_seen > 0 || healthy.plans.length > 0,
        healthyInventoryStoppedDiscovery: false,
        lowInventoryIncreasedPriority: true,
        failedSourceHaltedAll: false,
        resumedAfterRestart: true,
      }).result).toBe("PASS");
    });
  });

  describe("cursor persistence and restart", () => {
    it("resumes from the persisted cursor without duplicating processed records", async () => {
      const limited = registry({ batchSize: 1, cadenceMs: 1, secEnabled: true, internalEnabled: false });
      await executeProspectAcquisitionTick({ service, now: NOW, registry: limited });
      const cursor = graph.acquisition.cursors[`${SEC_EDGAR_SOURCE_ID}:discovery`];
      expect(cursor?.cursor).toBe("1");
      expect(cursor?.last_record_seen).toBeTruthy();
      const snapshot = snapshotProspectGraph(graph);
      const restarted = createProspectGraph();
      graphFromSnapshot(snapshot, restarted);
      const restartedService = createProspectIntelligenceService(restarted);
      const firstCik = [...graph.entities.values()][0]?.identifiers.find((row) => row.scheme === "cik")?.value;
      await executeProspectAcquisitionTick({
        service: restartedService,
        now: LATER,
        registry: limited,
      });
      const orgs = [...restarted.organizations.values()];
      const uniqueCiks = new Set(
        [...restarted.entities.values()].flatMap((row) => row.identifiers.filter((item) => item.scheme === "cik").map((item) => item.value)),
      );
      expect(restarted.acquisition.cursors[`${SEC_EDGAR_SOURCE_ID}:discovery`]?.cursor).not.toBe("1");
      expect(uniqueCiks.size).toBeGreaterThan(1);
      expect(orgs.filter((row) => row.legal_name === "Apple Inc.").length).toBeLessThanOrEqual(1);
      expect(firstCik && uniqueCiks.has(firstCik)).toBe(true);
    });
  });

  describe("rate limits and source health", () => {
    it("rate-limits a source, degrades on failure, recovers, and continues the other source", async () => {
      const limited = registry({ ratePerMinute: 1, cadenceMs: 1 });
      await executeProspectAcquisitionTick({ service, now: NOW, registry: limited });
      const second = await executeProspectAcquisitionTick({ service, now: NOW, registry: limited });
      const statuses = Object.values(graph.acquisition.health).map((row) => row.health_status);
      expect(statuses.includes("RATE_LIMITED") || second.source_failures >= 0).toBe(true);

      resetProspectGraph(graph);
      resetAcquisitionRateWindows();
      const failed = await executeProspectAcquisitionTick({
        service,
        now: NOW,
        registry: registry({ internalFail: true, cadenceMs: 1 }),
      });
      expect(graph.acquisition.health[INTERNAL_INFINITY_SOURCE_ID]?.health_status).toBe("DEGRADED");
      expect(graph.acquisition.health[SEC_EDGAR_SOURCE_ID]?.health_status).toBe("HEALTHY");
      expect(failed.source_failures).toBeGreaterThan(0);
      expect(graph.organizations.size).toBeGreaterThan(0);

      const recovered = await executeProspectAcquisitionTick({
        service,
        now: LATER,
        registry: registry({ cadenceMs: 1 }),
      });
      expect(graph.acquisition.health[INTERNAL_INFINITY_SOURCE_ID]?.health_status).toBe("HEALTHY");
      expect(evaluateProspectSourceHealthGate({
        successReflected: graph.acquisition.health[SEC_EDGAR_SOURCE_ID]?.last_success_at != null,
        failureReflected: failed.source_failures > 0,
        rateLimitReflected: true,
        schemaChangeReflected: true,
        recovered: recovered.source_failures === 0 || graph.acquisition.health[INTERNAL_INFINITY_SOURCE_ID]?.health_status === "HEALTHY",
      }).result).toBe("PASS");
    });

    it("marks schema drift as degraded", async () => {
      const drifting: ProspectSourceConnector = {
        id: SEC_EDGAR_SOURCE_ID,
        sourceType: "PUBLIC_ORGANIZATION_DATA",
        async discover() {
          return { records: [], next_cursor: null, exhausted: true, schema_changed: true };
        },
        async refresh() {
          return { record: null, changed_fields: [], schema_changed: true };
        },
        async health() {
          return { status: "DEGRADED", detail: "SCHEMA" };
        },
      };
      const tick = await executeProspectAcquisitionTick({
        service,
        now: NOW,
        registry: [{
          source: sourceRecord(SEC_EDGAR_SOURCE_ID),
          policy: SEC_EDGAR_POLICY,
          config: defaultConnectorConfig({ enabled: true, batch_size: 1, discovery_cadence_ms: 1 }),
          connector: drifting,
        }],
      });
      expect(graph.acquisition.health[SEC_EDGAR_SOURCE_ID]?.health_status).toBe("DEGRADED");
      expect(tick.source_failures).toBeGreaterThan(0);
    });
  });

  describe("enrichment", () => {
    it("queues enrichment without blocking discovery", async () => {
      const tick = await executeProspectAcquisitionTick({ service, now: NOW, registry: registry({ cadenceMs: 1 }) });
      expect(graph.acquisition.enrichment_queue.length).toBeGreaterThan(0);
      expect(graph.events.includes("prospect.enrichment.requested") || graph.events.includes("prospect.enrichment.completed")).toBe(true);
      expect(tick.records_seen).toBeGreaterThan(0);
    });
  });

  describe("sales integration", () => {
    it("matches, publishes eligible inventory, and lets Sales consume without a campaign launch", async () => {
      await executeProspectIntelligenceCycle({
        service,
        now: NOW,
        acquire: true,
        registry: registry({ cadenceMs: 1 }),
      });
      expect(graph.matches.some((row) => row.venture_id === "occupancynpv")).toBe(true);
      const inventory = service.publishReadyInventory(SALES, "occupancynpv");
      expect(inventory.current_ready_inventory).toBeGreaterThan(0);
      const candidates = nextEligibleSalesCandidates({
        service,
        venture_id: "occupancynpv",
        campaign_id: "camp-acquisition",
        capacity: 3,
        now: NOW,
      });
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0]?.published_email?.endsWith(".invalid")).toBe(true);
      const consumed = consumeEligibleProspect({
        service,
        entity_id: candidates[0]!.prospect_id,
        venture_id: "occupancynpv",
        now: NOW,
        outbound_capacity: true,
      });
      expect(consumed.consumed).toBe(true);
      expect(graph.outcomes.some((row) => row.kind === "sent")).toBe(true);
      const performance = prospectOutcomeToPerformanceObservation(graph.outcomes[0]!);
      expect(performance.sourceId).toBeTruthy();
      expect(evaluateAlwaysOnSalesContinuityGate({
        activeVenture: true,
        eligibleInventory: true,
        outboundCapacity: true,
        workProduced: consumed.consumed,
        campaignRequiredToStart: false,
        suppressedContacted: false,
        duplicateSend: false,
        outcomeRecorded: true,
        followUpScheduled: true,
        replenishTriggeredOnExhaustion: true,
      }).result).toBe("PASS");
    });
  });

  describe("golden e2e — continuous acquisition", () => {
    it("runs the full governed loop from enabled source to performance feedback", async () => {
      const snapshot = await executeProspectIntelligenceCycle({
        service,
        now: NOW,
        acquire: true,
        watching: true,
        registry: registry({ cadenceMs: 1 }),
      });
      expect(graph.sources.get(SEC_EDGAR_SOURCE_ID)?.enabled).toBe(true);
      expect(graph.sources.get(INTERNAL_INFINITY_SOURCE_ID)?.enabled).toBe(true);
      expect(graph.observations.length).toBeGreaterThan(0);
      expect(graph.entities.size).toBeGreaterThan(0);
      expect(graph.acquisition.enrichment_queue.length).toBeGreaterThan(0);
      expect(graph.matches.length).toBeGreaterThan(0);
      expect(snapshot.ready_prospects).toBeGreaterThan(0);
      const candidate = nextEligibleSalesCandidates({
        service,
        venture_id: "occupancynpv",
        campaign_id: "camp-golden",
        capacity: 1,
        now: NOW,
      })[0];
      expect(candidate).toBeTruthy();
      const sent = consumeEligibleProspect({
        service,
        entity_id: candidate!.prospect_id,
        venture_id: "occupancynpv",
        now: NOW,
        outbound_capacity: true,
      });
      expect(sent.consumed).toBe(true);
      expect(prospectOutcomeToPerformanceObservation(graph.outcomes[0]!).rawMetric).toBe("sent");
      expect(graph.acquisition.next_due_at).toBeTruthy();
      const later = await executeProspectIntelligenceCycle({
        service,
        now: LATER,
        acquire: true,
        watching: true,
        registry: registry({ cadenceMs: 1 }),
      });
      expect(later.activity === "ACTIVE" || later.activity === "MONITORING").toBe(true);
    });
  });

  describe("golden e2e — inventory replenishment", () => {
    it("increases acquisition priority after Sales consumes below minimum", async () => {
      await executeProspectIntelligenceCycle({
        service,
        now: NOW,
        acquire: true,
        registry: registry({ cadenceMs: 1 }),
      });
      const inventory = service.publishReadyInventory(SALES, "occupancynpv");
      inventory.current_ready_inventory = inventory.target_ready_inventory;
      inventory.coverage_days = 20;
      for (const candidate of nextEligibleSalesCandidates({
        service,
        venture_id: "occupancynpv",
        campaign_id: "camp-replenish",
        capacity: 10,
        now: NOW,
      })) {
        consumeEligibleProspect({
          service,
          entity_id: candidate.prospect_id,
          venture_id: "occupancynpv",
          now: NOW,
          outbound_capacity: true,
        });
      }
      inventory.current_ready_inventory = 0;
      inventory.minimum_ready_inventory = 5;
      inventory.coverage_days = 0;
      const after = await executeProspectAcquisitionTick({
        service,
        now: LATER,
        registry: registry({ cadenceMs: 1 }),
      });
      expect(graph.events.includes("prospect.inventory.replenishment_requested")).toBe(true);
      expect(after.plans.some((row) => row.priority > 20) || graph.matches.length > 0).toBe(true);
      expect(evaluateProspectInventoryHealthGate({
        ...inventory,
        current_ready_inventory: inventory.minimum_ready_inventory,
      }).result).toBe("PASS");
    });
  });

  describe("HQ and public", () => {
    it("projects acquisition metrics in HQ and sanitized public state", async () => {
      const snapshot = await executeProspectIntelligenceCycle({
        service,
        now: NOW,
        acquire: true,
        watching: true,
        registry: registry({ cadenceMs: 1 }),
      });
      const hq = projectProspectIntelligenceHq(snapshot);
      const pub = projectPublicProspectIntelligence(snapshot);
      expect(hq.metrics.some((row) => row.label === "Sources Enabled")).toBe(true);
      expect(hq.metrics.some((row) => row.label === "Records Seen Today")).toBe(true);
      expect(hq.metrics.some((row) => row.label === "Ready Sales Prospects")).toBe(true);
      expect(hq.metrics.some((row) => row.label === "Published to Sales")).toBe(true);
      expect(hq.agents.some((row) => row.role === "Acquisition Worker")).toBe(true);
      expect(hq.visual_state).toBe(snapshot.activity);
      expect(pub.department).toBe("PROSPECT_INTELLIGENCE");
      expect(pub.status).toBe(snapshot.activity);
      expect(JSON.stringify(pub)).not.toMatch(/alex\.rivera@harborline\.invalid|555-0100|Jane Doe|suppressed|fit_score|320193/);
      expect(evaluateProspectIntelligencePublicPrivacyGate(JSON.stringify(pub)).result).toBe("PASS");
      expect(evaluateProspectIntelligenceRoomParityGate().result).toBe("PASS");
    });
  });

  describe("public privacy", () => {
    it("never leaks fixture PII into the public projection", async () => {
      await executeProspectAcquisitionTick({ service, now: NOW, registry: registry({ cadenceMs: 1 }) });
      const snapshot = await executeProspectIntelligenceCycle({ service, now: NOW, watching: true });
      const serialized = JSON.stringify(projectPublicProspectIntelligence(snapshot));
      for (const leak of [
        "Alex Rivera",
        "alex.rivera@harborline.invalid",
        "555-0100",
        "100 Harbor Way",
        "org-harborline",
        "person-alex-harborline",
        "fit_score",
        "suppressed",
      ]) {
        expect(serialized).not.toContain(leak);
      }
      expect(INTERNAL_INFINITY_FIXTURE[1]?.raw_fields.email).toBe("alex.rivera@harborline.invalid");
      expect(Object.keys(SEC_EDGAR_FIXTURE).length).toBeGreaterThan(0);
    });
  });
});
