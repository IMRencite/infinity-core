import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { executeAutonomousSalesCycle } from "@/lib/infinity/autonomous-sales-execution/cycle";
import { consumeEligibleProspect, nextEligibleSalesCandidates, replenishIfExhausted } from "../sales-bridge";
import { createProspectIntelligenceService } from "../service";
import { createProspectGraph } from "../store";
import { MemoryProspectGraphRepository } from "../persist-memory";
import { PostgresProspectGraphRepository } from "../persist-postgres";
import { prospectOutcomeToPerformanceObservation } from "../performance";
import type { Entity, Observation, PersonRecord, SourceRecord } from "../types";

function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator);
    let value = trimmed.slice(separator + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadEnvLocal();

const NOW = "2026-09-16T04:10:00.000Z";
const ACCESS = { consumer: "prospect_intelligence" as const };
const SALES = { consumer: "sales_outbound_runtime" as const };
const LIVE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const PREFIX = `pi-verify-${Date.now()}-`;

function freshness() {
  return {
    first_seen_at: NOW,
    last_seen_at: NOW,
    last_verified_at: NOW,
    refresh_after: "2026-09-23T04:10:00.000Z",
    source_id: `${PREFIX}src`,
    confidence: 0.91,
    status: "CURRENT" as const,
  };
}

function source(): SourceRecord {
  return {
    source_id: `${PREFIX}src`,
    source_type: "public_directory",
    name: "Activation verification directory",
    jurisdiction: "US-FL",
    base_url: "https://example.invalid",
    acquisition_method: "licensed_api",
    usage_policy: "restricted",
    licensing_notes: "activation fixture only",
    data_categories: ["organization"],
    refresh_cadence: "weekly",
    reliability: 0.8,
    enabled: true,
    last_success: NOW,
    last_failure: null,
    health: "HEALTHY",
  };
}

function entity(id: string, kind: Entity["kind"], identifiers: Entity["identifiers"]): Entity {
  return {
    entity_id: id,
    kind,
    canonical: true,
    identifiers,
    freshness: freshness(),
    merge_history: [],
  };
}

function person(id: string, entityId: string, name: string): PersonRecord {
  return {
    person_id: id,
    entity_id: entityId,
    display_name: name,
    given_name: name.split(" ")[0] ?? null,
    family_name: name.split(" ")[1] ?? null,
    freshness: freshness(),
  };
}

function observation(id: string, field: string, value: unknown): Observation {
  return {
    observation_id: id,
    source_id: `${PREFIX}src`,
    observed_at: NOW,
    entity_hint: `${PREFIX}person-ent`,
    field,
    raw_value: value,
    normalized_value: value,
    usage_restricted: true,
    superseded_by: null,
  };
}

function seedEligibleGraph() {
  const graph = createProspectGraph();
  const service = createProspectIntelligenceService(graph);
  const personEnt = `${PREFIX}person-ent`;
  const orgEnt = `${PREFIX}org-ent`;
  service.registerSource(ACCESS, source());
  service.storeObservation(ACCESS, observation(`${PREFIX}obs-a`, "employee_count", 14));
  service.storeObservation(ACCESS, observation(`${PREFIX}obs-b`, "employee_count", 21));
  service.upsertPerson(ACCESS, {
    person: person(`${PREFIX}person`, personEnt, "Activation Fixture"),
    entity: entity(personEnt, "PERSON", [
      { identifier_id: `${PREFIX}email`, entity_id: personEnt, scheme: "email", value: `${PREFIX}broker@example.invalid`, source_id: `${PREFIX}src` },
    ]),
    now: NOW,
  });
  service.upsertOrganization(ACCESS, {
    organization_id: `${PREFIX}org`,
    entity_id: orgEnt,
    legal_name: "Activation Realty",
    trade_name: null,
    industry: "commercial real estate",
    employee_range: "20-25",
    freshness: freshness(),
  }, entity(orgEnt, "ORGANIZATION", [
    { identifier_id: `${PREFIX}domain`, entity_id: orgEnt, scheme: "domain", value: `${PREFIX}activation.invalid`, source_id: `${PREFIX}src` },
  ]));
  service.relate(ACCESS, {
    relationship_id: `${PREFIX}rel`,
    from_entity_id: personEnt,
    to_entity_id: orgEnt,
    type: "WORKS_AT",
    evidence_ids: [`${PREFIX}obs-a`],
    freshness: freshness(),
  });
  service.setVentureRule(ACCESS, {
    rule_id: `${PREFIX}rule`,
    venture_id: `${PREFIX}venture`,
    icp: { industries: ["real estate"], roles: ["broker"], geographies: ["florida"], disqualifiers: [] },
    updated_at: NOW,
  });
  service.matchVenture(ACCESS, {
    entity_id: personEnt,
    venture_id: `${PREFIX}venture`,
    person: person(`${PREFIX}person`, personEnt, "Activation Fixture"),
    organization: [...graph.organizations.values()][0],
    role: "tenant rep broker",
    geography: "florida",
    now: NOW,
    evidence_ids: [`${PREFIX}obs-a`],
  });
  service.setEligibility(ACCESS, {
    eligibility_id: `${PREFIX}elig`,
    entity_id: personEnt,
    channel: "EMAIL",
    status: "email_allowed",
    reason: "published business email",
    updated_at: NOW,
  });
  return { graph, service };
}

async function assertReload(repo: MemoryProspectGraphRepository | PostgresProspectGraphRepository) {
  const { graph, service } = seedEligibleGraph();
  expect("venture_id" in ([...graph.people.values()][0] ?? {})).toBe(false);
  expect("venture_id" in ([...graph.organizations.values()][0] ?? {})).toBe(false);
  expect(graph.matches[0]?.venture_id).toBe(`${PREFIX}venture`);
  service.suppress(ACCESS, {
    suppression_id: `${PREFIX}sup-keep`,
    entity_id: `${PREFIX}person-ent`,
    reason: "fixture keep",
    kind: "temporarily_unavailable",
    recycle_after: "2026-10-01T00:00:00.000Z",
    created_at: NOW,
  });
  service.recordOutcome(ACCESS, {
    outcome_id: `${PREFIX}out`,
    entity_id: `${PREFIX}person-ent`,
    venture_id: `${PREFIX}venture`,
    kind: "meeting_booked",
    at: NOW,
    evidence: "sandbox meeting",
  });
  await repo.save(graph);
  const reloaded = await repo.loadByPrefix(PREFIX);
  expect(reloaded.sources.get(`${PREFIX}src`)?.name).toBe("Activation verification directory");
  expect(reloaded.observations).toHaveLength(2);
  expect(reloaded.observations[0]?.raw_value).toBe(14);
  expect(reloaded.observations[1]?.raw_value).toBe(21);
  expect(reloaded.people.get(`${PREFIX}person`)?.display_name).toBe("Activation Fixture");
  expect("venture_id" in (reloaded.people.get(`${PREFIX}person`) ?? {})).toBe(false);
  expect("venture_id" in (reloaded.organizations.get(`${PREFIX}org`) ?? {})).toBe(false);
  expect(reloaded.matches[0]?.venture_id).toBe(`${PREFIX}venture`);
  expect(reloaded.matches[0]?.prospect_entity_id).toBe(`${PREFIX}person-ent`);
  expect(reloaded.eligibility[0]?.status).toBe("email_allowed");
  expect(reloaded.suppressions[0]?.kind).toBe("temporarily_unavailable");
  expect(reloaded.outcomes[0]?.kind).toBe("meeting_booked");
  expect(reloaded.entities.get(`${PREFIX}person-ent`)?.freshness.source_id).toBe(`${PREFIX}src`);
  expect(reloaded.entities.get(`${PREFIX}person-ent`)?.freshness.status).toBe("CURRENT");
  await repo.deleteByPrefix(PREFIX);
}

describe("Prospect Intelligence persistence V1", () => {
  const liveRepo = LIVE ? new PostgresProspectGraphRepository() : null;

  afterAll(async () => {
    if (liveRepo) await liveRepo.deleteByPrefix(PREFIX);
  });

  it("reloads a complete graph through the memory repository", async () => {
    await assertReload(new MemoryProspectGraphRepository());
  });

  it.runIf(LIVE)("reloads isolated records through the applied Postgres schema", async () => {
    await assertReload(liveRepo!);
    const leftover = await liveRepo!.loadByPrefix(PREFIX);
    expect(leftover.people.size).toBe(0);
    expect(leftover.observations).toHaveLength(0);
  });

  it("sales consumes the shared queue without injected candidates", () => {
    const graph = createProspectGraph();
    const service = createProspectIntelligenceService(graph);
    const personEnt = `${PREFIX}queue-person`;
    service.registerSource(ACCESS, { ...source(), source_id: `${PREFIX}queue-src` });
    service.upsertPerson(ACCESS, {
      person: person(`${PREFIX}queue-p`, personEnt, "Queue Fixture"),
      entity: entity(personEnt, "PERSON", [
        { identifier_id: `${PREFIX}queue-email`, entity_id: personEnt, scheme: "email", value: `${PREFIX}queue@example.invalid`, source_id: `${PREFIX}queue-src` },
      ]),
      now: NOW,
    });
    service.upsertOrganization(ACCESS, {
      organization_id: `${PREFIX}queue-org`,
      entity_id: `${PREFIX}queue-org-ent`,
      legal_name: "Queue Realty",
      trade_name: null,
      industry: "commercial real estate",
      employee_range: null,
      freshness: freshness(),
    }, entity(`${PREFIX}queue-org-ent`, "ORGANIZATION", []));
    service.setVentureRule(ACCESS, {
      rule_id: `${PREFIX}queue-rule`,
      venture_id: "occupancynpv",
      icp: { industries: ["real estate"], roles: ["broker"], geographies: [], disqualifiers: [] },
      updated_at: NOW,
    });
    service.matchVenture(ACCESS, {
      entity_id: personEnt,
      venture_id: "occupancynpv",
      organization: [...graph.organizations.values()][0],
      role: "broker",
      now: NOW,
      evidence_ids: [`${PREFIX}obs-a`],
    });
    service.setEligibility(ACCESS, {
      eligibility_id: `${PREFIX}queue-elig`,
      entity_id: personEnt,
      channel: "EMAIL",
      status: "email_allowed",
      reason: "published business email",
      updated_at: NOW,
    });
    const fromService = nextEligibleSalesCandidates({
      service,
      venture_id: "occupancynpv",
      campaign_id: "camp-verify",
      capacity: 3,
      now: NOW,
    });
    expect(fromService).toHaveLength(1);
    expect(fromService[0]?.source_provider).toBe("prospect_intelligence");
    const cycle = executeAutonomousSalesCycle({
      now: NOW,
      executeSend: false,
      isolated_runtime: true,
      candidates: [],
      graph,
    });
    expect(cycle.qualified_prospects).toBeGreaterThan(0);
    expect(cycle.send_attempted).toBe(0);
    const sent = consumeEligibleProspect({
      service,
      entity_id: personEnt,
      venture_id: "occupancynpv",
      now: NOW,
      outbound_capacity: true,
    });
    expect(sent.consumed).toBe(true);
    expect(graph.people.has(`${PREFIX}queue-p`)).toBe(true);
    expect(graph.outcomes.some((row) => row.kind === "sent")).toBe(true);
  });

  it("suppression blocks outbound and stays on the graph", () => {
    const { graph, service } = seedEligibleGraph();
    service.setEligibility(ACCESS, {
      eligibility_id: `${PREFIX}elig`,
      entity_id: `${PREFIX}person-ent`,
      channel: "EMAIL",
      status: "suppressed",
      reason: "do not contact",
      updated_at: NOW,
    });
    service.suppress(ACCESS, {
      suppression_id: `${PREFIX}sup-block`,
      entity_id: `${PREFIX}person-ent`,
      reason: "do not contact",
      kind: "do_not_contact",
      recycle_after: null,
      created_at: NOW,
    });
    const blocked = consumeEligibleProspect({
      service,
      entity_id: `${PREFIX}person-ent`,
      venture_id: `${PREFIX}venture`,
      now: NOW,
      outbound_capacity: true,
    });
    expect(blocked.consumed).toBe(false);
    expect(blocked.reason).toBe("SUPPRESSED");
    expect(graph.outcomes.some((row) => row.kind === "sent")).toBe(false);
    expect(graph.suppressions.some((row) => row.kind === "do_not_contact")).toBe(true);
    expect(nextEligibleSalesCandidates({
      service,
      venture_id: `${PREFIX}venture`,
      campaign_id: "camp-verify",
      capacity: 3,
      now: NOW,
    })).toHaveLength(0);
  });

  it("emits replenishment when ready inventory falls below the minimum", () => {
    const { service } = seedEligibleGraph();
    const inventory = service.publishReadyInventory(SALES, `${PREFIX}venture`);
    inventory.minimum_ready_inventory = 10;
    inventory.current_ready_inventory = 1;
    const replenish = replenishIfExhausted({ service, venture_id: `${PREFIX}venture` });
    expect(replenish.replenish).toBe(true);
  });

  it("records outcomes onto the Performance Intelligence observation contract", () => {
    const { service } = seedEligibleGraph();
    const outcome = service.recordOutcome(SALES, {
      outcome_id: `${PREFIX}perf`,
      entity_id: `${PREFIX}person-ent`,
      venture_id: `${PREFIX}venture`,
      kind: "positive_reply",
      at: NOW,
      evidence: "sandbox reply",
    });
    const observation = prospectOutcomeToPerformanceObservation(outcome);
    expect(observation.sourceId).toBe("internal_infinity");
    expect(observation.rawMetric).toBe("positive_reply");
    expect(observation.synthetic).toBe(false);
    expect(observation.provenance.engine).toBe("prospect_intelligence_foundation_v1");
  });
});
