import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { consumeEligibleProspect, nextEligibleSalesCandidates, replenishIfExhausted } from "../sales-bridge";
import { createProspectIntelligenceService } from "../service";
import { createProspectGraph, resetProspectGraph } from "../store";
import { executeProspectIntelligenceCycle, outboundCoverageDays } from "../cycle";
import { resolveEntities } from "../resolution";
import { projectProspectIntelligenceHq } from "../hq";
import { projectPublicProspectIntelligence } from "../public";
import { prospectOutcomeToPerformanceObservation } from "../performance";
import {
  evaluateAlwaysOnSalesContinuityGate,
  evaluateProspectDataLineageGate,
  evaluateProspectIntelligencePublicPrivacyGate,
  evaluateProspectIntelligenceRoomParityGate,
  evaluateProspectInventoryHealthGate,
  evaluateSharedProspectIntelligenceAccessGate,
} from "../gates";
import type { Entity, Observation, PersonRecord, SourceRecord } from "../types";

const ACCESS = { consumer: "prospect_intelligence" as const };
const SALES = { consumer: "sales_outbound_runtime" as const };
const NOW = "2026-09-16T03:00:00.000Z";

function source(id: string): SourceRecord {
  return {
    source_id: id,
    source_type: "public_directory",
    name: "Licensed directory",
    jurisdiction: "US-FL",
    base_url: "https://example.test",
    acquisition_method: "licensed_api",
    usage_policy: "restricted",
    licensing_notes: "licensed use only",
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
    freshness: {
      first_seen_at: NOW,
      last_seen_at: NOW,
      last_verified_at: NOW,
      refresh_after: "2026-09-23T03:00:00.000Z",
      source_id: "src-a",
      confidence: 0.9,
      status: "CURRENT",
    },
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
    freshness: entity(entityId, "PERSON", []).freshness,
  };
}

function observation(id: string, field: string, value: unknown): Observation {
  return {
    observation_id: id,
    source_id: "src-a",
    observed_at: NOW,
    entity_hint: "ent-person-1",
    field,
    raw_value: value,
    normalized_value: value,
    usage_restricted: true,
    superseded_by: null,
  };
}

describe("Prospect Intelligence Foundation V1", () => {
  const graph = createProspectGraph();
  const service = createProspectIntelligenceService(graph);

  beforeEach(() => {
    resetProspectGraph(graph);
  });

  it("registers sources and preserves observation history", () => {
    service.registerSource(ACCESS, source("src-a"));
    service.storeObservation(ACCESS, observation("obs-a", "employee_count", 14));
    service.storeObservation(ACCESS, observation("obs-b", "employee_count", 21));
    expect(graph.sources.get("src-a")?.enabled).toBe(true);
    expect(graph.observations).toHaveLength(2);
    expect(graph.observations[0]?.raw_value).toBe(14);
    expect(graph.observations[1]?.raw_value).toBe(21);
  });

  it("resolves exact, likely, ambiguous, and non-matches without auto-merging ambiguity", () => {
    const left = entity("a", "PERSON", [{ identifier_id: "1", entity_id: "a", scheme: "email", value: "ops@firm.test", source_id: "src-a" }]);
    const right = entity("b", "PERSON", [{ identifier_id: "2", entity_id: "b", scheme: "email", value: "ops@firm.test", source_id: "src-a" }]);
    expect(resolveEntities(left, right).decision).toBe("MATCHED");
    const nameOnly = resolveEntities(
      entity("c", "PERSON", [{ identifier_id: "3", entity_id: "c", scheme: "name", value: "Alex Rivera", source_id: "src-a" }]),
      entity("d", "PERSON", [{ identifier_id: "4", entity_id: "d", scheme: "name", value: "Alex Rivera", source_id: "src-a" }]),
    );
    expect(nameOnly.decision).toBe("AMBIGUOUS");
    expect(nameOnly.merged_entity_id).toBeUndefined();
    const likely = resolveEntities(
      entity("f", "PERSON", [
        { identifier_id: "5", entity_id: "f", scheme: "name", value: "Alex Rivera", source_id: "src-a" },
        { identifier_id: "6", entity_id: "f", scheme: "city", value: "Miami", source_id: "src-a" },
      ]),
      entity("g", "PERSON", [
        { identifier_id: "7", entity_id: "g", scheme: "name", value: "Alex Rivera", source_id: "src-a" },
        { identifier_id: "8", entity_id: "g", scheme: "city", value: "Miami", source_id: "src-a" },
      ]),
    );
    expect(likely.decision).toBe("LIKELY_MATCH");
    expect(resolveEntities(left, entity("e", "ORGANIZATION", [])).decision).toBe("NOT_MATCHED");
  });

  it("prevents duplicate canonical people on exact identifier match", () => {
    const first = entity("ent-person-1", "PERSON", [{ identifier_id: "id-1", entity_id: "ent-person-1", scheme: "email", value: "broker@firm.test", source_id: "src-a" }]);
    service.upsertPerson(ACCESS, { person: person("p1", "ent-person-1", "Alex Rivera"), entity: first, now: NOW });
    const second = entity("ent-person-2", "PERSON", [{ identifier_id: "id-2", entity_id: "ent-person-2", scheme: "email", value: "broker@firm.test", source_id: "src-a" }]);
    const result = service.upsertPerson(ACCESS, { person: person("p2", "ent-person-2", "Alex Rivera"), entity: second, now: NOW });
    expect(result.decision.decision).toBe("MATCHED");
    expect(graph.entities.has("ent-person-1")).toBe(true);
  });

  it("matches one prospect to one, many, or no ventures and evaluates a new venture against the graph", () => {
    service.upsertPerson(ACCESS, {
      person: person("p1", "ent-person-1", "Alex Rivera"),
      entity: entity("ent-person-1", "PERSON", [{ identifier_id: "id-1", entity_id: "ent-person-1", scheme: "name", value: "Alex Rivera", source_id: "src-a" }]),
      now: NOW,
    });
    service.upsertOrganization(ACCESS, {
      organization_id: "org-1",
      entity_id: "ent-org-1",
      legal_name: "Harbor Realty",
      trade_name: null,
      industry: "commercial real estate",
      employee_range: "20-25",
      freshness: entity("ent-org-1", "ORGANIZATION", []).freshness,
    }, entity("ent-org-1", "ORGANIZATION", []));
    service.setVentureRule(ACCESS, {
      rule_id: "rule-occ",
      venture_id: "occupancynpv",
      icp: { industries: ["real estate"], roles: ["broker"], geographies: ["florida"], disqualifiers: ["residential only"] },
      updated_at: NOW,
    });
    service.setVentureRule(ACCESS, {
      rule_id: "rule-b",
      venture_id: "future-venture",
      icp: { industries: ["real estate"], roles: [], geographies: [], disqualifiers: [] },
      updated_at: NOW,
    });
    const occ = service.matchVenture(ACCESS, {
      entity_id: "ent-person-1",
      venture_id: "occupancynpv",
      organization: [...graph.organizations.values()][0],
      role: "tenant rep broker",
      geography: "florida",
      now: NOW,
      evidence_ids: ["obs-a"],
    });
    const future = service.evaluateExistingGraphForVenture(ACCESS, "future-venture", NOW);
    const none = service.matchVenture(ACCESS, {
      entity_id: "ent-person-1",
      venture_id: "occupancynpv",
      organization: { ...[...graph.organizations.values()][0]!, industry: "bakery" },
      role: "chef",
      geography: "ohio",
      now: NOW,
      evidence_ids: ["obs-a"],
    });
    expect(occ.fit_band === "HIGH" || occ.fit_band === "MEDIUM").toBe(true);
    expect(future[0]?.venture_id).toBe("future-venture");
    expect(none.fit_band === "NONE" || none.fit_band === "LOW").toBe(true);
  });

  it("enforces communication eligibility and suppression", () => {
    service.setEligibility(ACCESS, { eligibility_id: "e1", entity_id: "ent-person-1", channel: "EMAIL", status: "email_allowed", reason: "published business email", updated_at: NOW });
    service.setEligibility(ACCESS, { eligibility_id: "e2", entity_id: "ent-person-2", channel: "EMAIL", status: "unknown", reason: "no verified channel", updated_at: NOW });
    service.setEligibility(ACCESS, { eligibility_id: "e3", entity_id: "ent-person-3", channel: "EMAIL", status: "opted_out", reason: "STOP", updated_at: NOW });
    service.setEligibility(ACCESS, { eligibility_id: "e4", entity_id: "ent-person-4", channel: "EMAIL", status: "bounced", reason: "hard bounce", updated_at: NOW });
    service.setEligibility(ACCESS, { eligibility_id: "e5", entity_id: "ent-person-5", channel: "EMAIL", status: "legal_or_policy_restriction", reason: "policy", updated_at: NOW });
    service.suppress(ACCESS, { suppression_id: "s1", entity_id: "ent-person-3", reason: "opt out", kind: "do_not_contact", recycle_after: null, created_at: NOW });
    expect(service.getCommunicationEligibility(ACCESS, "ent-person-1")[0]?.status).toBe("email_allowed");
    expect(service.getCommunicationEligibility(ACCESS, "ent-person-2")[0]?.status).toBe("unknown");
    expect(service.getCommunicationEligibility(ACCESS, "ent-person-3")[0]?.status).toBe("opted_out");
    expect(service.getCommunicationEligibility(ACCESS, "ent-person-4")[0]?.status).toBe("bounced");
    expect(service.getCommunicationEligibility(ACCESS, "ent-person-5")[0]?.status).toBe("legal_or_policy_restriction");
  });

  it("keeps always-on sales consuming eligible inventory with suppression and duplicate protection", () => {
    service.upsertPerson(ACCESS, {
      person: person("p1", "ent-person-1", "Alex Rivera"),
      entity: entity("ent-person-1", "PERSON", [{ identifier_id: "id-1", entity_id: "ent-person-1", scheme: "email", value: "broker@firm.test", source_id: "src-a" }]),
      now: NOW,
    });
    service.setVentureRule(ACCESS, {
      rule_id: "rule-occ",
      venture_id: "occupancynpv",
      icp: { industries: ["real estate"], roles: ["broker"], geographies: [], disqualifiers: [] },
      updated_at: NOW,
    });
    service.matchVenture(ACCESS, {
      entity_id: "ent-person-1",
      venture_id: "occupancynpv",
      organization: { organization_id: "o", entity_id: "eo", legal_name: "Harbor", trade_name: null, industry: "real estate", employee_range: null, freshness: entity("eo", "ORGANIZATION", []).freshness },
      role: "broker",
      now: NOW,
      evidence_ids: ["obs-a"],
    });
    service.setEligibility(ACCESS, { eligibility_id: "e1", entity_id: "ent-person-1", channel: "EMAIL", status: "email_allowed", reason: "published", updated_at: NOW });
    const candidates = nextEligibleSalesCandidates({ service, venture_id: "occupancynpv", campaign_id: "camp-1", capacity: 3, now: NOW });
    expect(candidates).toHaveLength(1);
    const sent = consumeEligibleProspect({ service, entity_id: "ent-person-1", venture_id: "occupancynpv", now: NOW, outbound_capacity: true });
    const duplicate = consumeEligibleProspect({ service, entity_id: "ent-person-1", venture_id: "occupancynpv", now: NOW, outbound_capacity: true });
    service.setEligibility(ACCESS, { eligibility_id: "e1", entity_id: "ent-person-1", channel: "EMAIL", status: "suppressed", reason: "opt out", updated_at: NOW });
    const blocked = consumeEligibleProspect({ service, entity_id: "ent-person-1", venture_id: "occupancynpv", now: NOW, outbound_capacity: true });
    expect(sent.consumed).toBe(true);
    expect(duplicate.reason).toBe("DUPLICATE_CONTACT_PREVENTED");
    expect(blocked.reason).toBe("SUPPRESSED");
    const inventory = service.publishReadyInventory(SALES, "occupancynpv");
    const replenish = replenishIfExhausted({ service, venture_id: "occupancynpv" });
    expect(evaluateAlwaysOnSalesContinuityGate({
      activeVenture: true,
      eligibleInventory: candidates.length > 0,
      outboundCapacity: true,
      workProduced: sent.consumed,
      campaignRequiredToStart: false,
      suppressedContacted: false,
      duplicateSend: false,
      outcomeRecorded: graph.outcomes.some((row) => row.kind === "sent"),
      followUpScheduled: graph.outreach[0]?.scheduled_follow_up_at != null,
      replenishTriggeredOnExhaustion: replenish.replenish || inventory.current_ready_inventory >= inventory.minimum_ready_inventory,
    }).result).toBe("PASS");
  });

  it("blocks unauthorized consumers and venture-owned canonical entities", () => {
    expect(() => service.searchProspects({ consumer: "unknown_silo" as never })).toThrow(/UNAUTHORIZED/);
    expect(evaluateSharedProspectIntelligenceAccessGate({
      service,
      consumer: "sales_outbound_runtime",
      entityHasVentureId: false,
      siloCreated: false,
    }).result).toBe("PASS");
    expect(evaluateSharedProspectIntelligenceAccessGate({
      service,
      consumer: "quadrel_leads",
      siloCreated: true,
    }).result).toBe("FAIL");
  });

  it("keeps facts, inference, and freshness distinct", () => {
    service.storeObservation(ACCESS, observation("obs-a", "employee_count", 14));
    service.deriveAttribute(ACCESS, {
      attribute_id: "d1",
      entity_id: "ent-person-1",
      name: "employee_range",
      value: "20-25",
      inference: true,
      evidence_ids: ["obs-a"],
      confidence: 0.78,
      freshness: entity("ent-person-1", "PERSON", []).freshness,
    });
    expect(() => service.deriveAttribute(ACCESS, {
      attribute_id: "d2",
      entity_id: "ent-person-1",
      name: "guess",
      value: "hot lead",
      inference: true,
      evidence_ids: [],
      confidence: 0.1,
      freshness: entity("ent-person-1", "PERSON", []).freshness,
    })).toThrow(/EVIDENCE/);
    expect(evaluateProspectDataLineageGate({
      observationsPreserved: graph.observations.length === 1,
      derivedHasEvidence: true,
      inferenceStoredAsFact: false,
      sourceLost: false,
      freshnessMissing: false,
      mergeUnexplained: false,
    }).result).toBe("PASS");
  });

  it("computes coverage days and inventory health", () => {
    expect(outboundCoverageDays(8400, 600)).toBe(14);
    const inventory = service.publishReadyInventory(ACCESS, "occupancynpv");
    expect(evaluateProspectInventoryHealthGate({ ...inventory, current_ready_inventory: 12 }).result).toBe("PASS");
    expect(evaluateProspectInventoryHealthGate({ ...inventory, current_ready_inventory: 0 }).result).toBe("FAIL");
  });

  it("projects HQ workflow and sanitized public room without PII", async () => {
    const snapshot = await executeProspectIntelligenceCycle({ service, now: NOW, watching: true });
    const hq = projectProspectIntelligenceHq(snapshot);
    const pub = projectPublicProspectIntelligence(snapshot);
    expect(hq.display_name).toBe("Prospect Intelligence");
    expect(hq.workflow).toEqual(["DISCOVER", "INGEST", "RESOLVE", "ENRICH", "CLASSIFY", "MATCH", "PUBLISH", "REFRESH"]);
    expect(hq.agents).toHaveLength(10);
    expect(pub.department).toBe("PROSPECT_INTELLIGENCE");
    expect(JSON.stringify(pub)).not.toMatch(/@|555-|Jane Doe|suppressed|fit_score/);
    expect(evaluateProspectIntelligencePublicPrivacyGate(JSON.stringify(pub)).result).toBe("PASS");
    expect(evaluateProspectIntelligenceRoomParityGate().result).toBe("PASS");
    expect(snapshot.activity).not.toBe("ACTIVE");
  });

  it("feeds outcomes into a performance observation contract", () => {
    const observation = prospectOutcomeToPerformanceObservation({
      outcome_id: "out-1",
      entity_id: "ent-person-1",
      venture_id: "occupancynpv",
      kind: "positive_reply",
      at: NOW,
      evidence: "reply classified",
    });
    expect(observation.sourceId).toBe("internal_infinity");
    expect(observation.rawMetric).toBe("positive_reply");
  });

  it("uses shared HQ shell and public occupancy architecture", () => {
    const room = readFileSync("components/dashboard/operator-console/department-room.tsx", "utf8");
    const naming = readFileSync("lib/infinity/operator-console/room-naming.ts", "utf8");
    const publicFloor = readFileSync("components/public/operations-room/operations-floor.tsx", "utf8");
    const css = readFileSync("components/public/operations-room/operations-room.module.css", "utf8");
    expect(room).toContain("InfinityRoomShell");
    expect(naming).toContain("prospect_intelligence");
    expect(publicFloor).toContain("PROSPECT_INTELLIGENCE");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("idlePresence");
  });
});
