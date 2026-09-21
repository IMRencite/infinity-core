import { emptyAcquisitionState, type ProspectAcquisitionState } from "./acquisition/types";
import { createProspectGraph, resetProspectGraph, type ProspectGraph } from "./store";
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

export type ProspectGraphSnapshot = {
  sources: SourceRecord[];
  observations: Observation[];
  entities: Entity[];
  people: PersonRecord[];
  organizations: OrganizationRecord[];
  relationships: EntityRelationship[];
  derived: DerivedAttribute[];
  matches: ProspectVentureMatch[];
  rules: VentureMatchRule[];
  eligibility: CommunicationEligibility[];
  suppressions: SuppressionRecord[];
  outcomes: ProspectOutcome[];
  outreach: OutreachHistory[];
  inventory: VentureInventory[];
  events: string[];
  acquisition: ProspectAcquisitionState;
};

export type ProspectGraphRepository = {
  readonly kind: "MEMORY" | "DURABLE_POSTGRES";
  save(graph: ProspectGraph): Promise<void>;
  load(): Promise<ProspectGraph>;
  loadByPrefix(prefix: string): Promise<ProspectGraph>;
  deleteByPrefix(prefix: string): Promise<void>;
};

export function snapshotProspectGraph(graph: ProspectGraph): ProspectGraphSnapshot {
  return {
    sources: [...graph.sources.values()],
    observations: [...graph.observations],
    entities: [...graph.entities.values()],
    people: [...graph.people.values()],
    organizations: [...graph.organizations.values()],
    relationships: [...graph.relationships],
    derived: [...graph.derived],
    matches: [...graph.matches],
    rules: [...graph.rules.values()],
    eligibility: [...graph.eligibility],
    suppressions: [...graph.suppressions],
    outcomes: [...graph.outcomes],
    outreach: [...graph.outreach],
    inventory: [...graph.inventory.values()],
    events: [...graph.events],
    acquisition: graph.acquisition,
  };
}

export function graphFromSnapshot(snapshot: ProspectGraphSnapshot, target: ProspectGraph = createProspectGraph()): ProspectGraph {
  resetProspectGraph(target);
  for (const row of snapshot.sources) target.sources.set(row.source_id, row);
  target.observations.push(...snapshot.observations);
  for (const row of snapshot.entities) {
    if ("venture_id" in row && row.venture_id != null) throw new Error("CANONICAL_ENTITY_MUST_NOT_OWN_VENTURE_ID");
    target.entities.set(row.entity_id, row);
  }
  for (const row of snapshot.people) {
    if ("venture_id" in row && (row as { venture_id?: unknown }).venture_id != null) {
      throw new Error("CANONICAL_ENTITY_MUST_NOT_OWN_VENTURE_ID");
    }
    target.people.set(row.person_id, row);
  }
  for (const row of snapshot.organizations) {
    if ("venture_id" in row && (row as { venture_id?: unknown }).venture_id != null) {
      throw new Error("CANONICAL_ENTITY_MUST_NOT_OWN_VENTURE_ID");
    }
    target.organizations.set(row.organization_id, row);
  }
  target.relationships.push(...snapshot.relationships);
  target.derived.push(...snapshot.derived);
  target.matches.push(...snapshot.matches);
  for (const row of snapshot.rules) target.rules.set(row.venture_id, row);
  target.eligibility.push(...snapshot.eligibility);
  target.suppressions.push(...snapshot.suppressions);
  target.outcomes.push(...snapshot.outcomes);
  target.outreach.push(...snapshot.outreach);
  for (const row of snapshot.inventory) target.inventory.set(row.venture_id, row);
  target.events.push(...snapshot.events);
  target.acquisition = {
    ...emptyAcquisitionState(),
    ...(snapshot.acquisition ?? emptyAcquisitionState()),
    health: snapshot.acquisition?.health ?? {},
    cursors: snapshot.acquisition?.cursors ?? {},
    plans: snapshot.acquisition?.plans ?? [],
    enrichment_queue: snapshot.acquisition?.enrichment_queue ?? [],
    refresh_queue: snapshot.acquisition?.refresh_queue ?? [],
    metrics: { ...emptyAcquisitionState().metrics, ...snapshot.acquisition?.metrics },
    source_quality: snapshot.acquisition?.source_quality ?? {},
  };
  return target;
}

export function cloneProspectGraph(graph: ProspectGraph): ProspectGraph {
  return graphFromSnapshot(JSON.parse(JSON.stringify(snapshotProspectGraph(graph))) as ProspectGraphSnapshot);
}

export function replaceProspectGraph(target: ProspectGraph, source: ProspectGraph): ProspectGraph {
  return graphFromSnapshot(snapshotProspectGraph(source), target);
}

export function filterSnapshotByPrefix(snapshot: ProspectGraphSnapshot, prefix: string): ProspectGraphSnapshot {
  const hit = (value: string | null | undefined) => Boolean(value && value.startsWith(prefix));
  return {
    sources: snapshot.sources.filter((row) => hit(row.source_id)),
    observations: snapshot.observations.filter((row) => hit(row.observation_id) || hit(row.source_id)),
    entities: snapshot.entities.filter((row) => hit(row.entity_id)),
    people: snapshot.people.filter((row) => hit(row.person_id) || hit(row.entity_id)),
    organizations: snapshot.organizations.filter((row) => hit(row.organization_id) || hit(row.entity_id)),
    relationships: snapshot.relationships.filter((row) => hit(row.relationship_id) || hit(row.from_entity_id) || hit(row.to_entity_id)),
    derived: snapshot.derived.filter((row) => hit(row.attribute_id) || hit(row.entity_id)),
    matches: snapshot.matches.filter((row) => hit(row.match_id) || hit(row.prospect_entity_id)),
    rules: snapshot.rules.filter((row) => hit(row.rule_id) || hit(row.venture_id)),
    eligibility: snapshot.eligibility.filter((row) => hit(row.eligibility_id) || hit(row.entity_id)),
    suppressions: snapshot.suppressions.filter((row) => hit(row.suppression_id) || hit(row.entity_id)),
    outcomes: snapshot.outcomes.filter((row) => hit(row.outcome_id) || hit(row.entity_id)),
    outreach: snapshot.outreach.filter((row) => hit(row.outreach_id) || hit(row.entity_id)),
    inventory: snapshot.inventory.filter((row) => hit(row.venture_id)),
    events: snapshot.events,
    acquisition: snapshot.acquisition ?? emptyAcquisitionState(),
  };
}
