import { emptyAcquisitionState } from "./acquisition/types";
import { DEFAULT_AVERAGE_DAILY_CONSUMPTION, DEFAULT_MINIMUM_READY_INVENTORY, DEFAULT_TARGET_READY_INVENTORY } from "./contract";
import type {
  CommunicationEligibility,
  DerivedAttribute,
  Entity,
  EntityRelationship,
  Observation,
  OrganizationRecord,
  OutreachHistory,
  PersonRecord,
  ProspectOutcome,
  ProspectVentureMatch,
  SourceRecord,
  SuppressionRecord,
  VentureInventory,
  VentureMatchRule,
} from "./types";

export type ProspectGraph = {
  sources: Map<string, SourceRecord>;
  observations: Observation[];
  entities: Map<string, Entity>;
  people: Map<string, PersonRecord>;
  organizations: Map<string, OrganizationRecord>;
  relationships: EntityRelationship[];
  derived: DerivedAttribute[];
  matches: ProspectVentureMatch[];
  rules: Map<string, VentureMatchRule>;
  eligibility: CommunicationEligibility[];
  suppressions: SuppressionRecord[];
  outcomes: ProspectOutcome[];
  outreach: OutreachHistory[];
  inventory: Map<string, VentureInventory>;
  events: string[];
  acquisition: import("./acquisition/types").ProspectAcquisitionState;
};

function emptyInventory(ventureId: string): VentureInventory {
  return {
    venture_id: ventureId,
    target_ready_inventory: DEFAULT_TARGET_READY_INVENTORY,
    minimum_ready_inventory: DEFAULT_MINIMUM_READY_INVENTORY,
    current_ready_inventory: 0,
    average_daily_consumption: DEFAULT_AVERAGE_DAILY_CONSUMPTION,
    coverage_days: 0,
    enrichment_backlog: 0,
    refresh_health: "HEALTHY",
    states: {
      ready: 0,
      needs_enrichment: 0,
      warming: 0,
      recently_contacted: 0,
      recycle_later: 0,
      suppressed: 0,
      exhausted: 0,
      disqualified: 0,
    },
  };
}

export function createProspectGraph(): ProspectGraph {
  return {
    sources: new Map(),
    observations: [],
    entities: new Map(),
    people: new Map(),
    organizations: new Map(),
    relationships: [],
    derived: [],
    matches: [],
    rules: new Map(),
    eligibility: [],
    suppressions: [],
    outcomes: [],
    outreach: [],
    inventory: new Map(),
    events: [],
    acquisition: emptyAcquisitionState(),
  };
}

const defaultGraph = createProspectGraph();

export function getDefaultProspectGraph(): ProspectGraph {
  return defaultGraph;
}

export function resetProspectGraph(graph: ProspectGraph = defaultGraph): void {
  graph.sources.clear();
  graph.observations.length = 0;
  graph.entities.clear();
  graph.people.clear();
  graph.organizations.clear();
  graph.relationships.length = 0;
  graph.derived.length = 0;
  graph.matches.length = 0;
  graph.rules.clear();
  graph.eligibility.length = 0;
  graph.suppressions.length = 0;
  graph.outcomes.length = 0;
  graph.outreach.length = 0;
  graph.inventory.clear();
  graph.events.length = 0;
  graph.acquisition = emptyAcquisitionState();
}

export function ensureVentureInventory(graph: ProspectGraph, ventureId: string): VentureInventory {
  const existing = graph.inventory.get(ventureId);
  if (existing) return existing;
  const created = emptyInventory(ventureId);
  graph.inventory.set(ventureId, created);
  return created;
}

export function assertNoVentureOnCanonical(record: { venture_id?: unknown }): void {
  if ("venture_id" in record && record.venture_id != null) {
    throw new Error("CANONICAL_ENTITY_MUST_NOT_OWN_VENTURE_ID");
  }
}
