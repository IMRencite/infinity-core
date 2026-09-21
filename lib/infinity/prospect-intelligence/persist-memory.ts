import { emptyAcquisitionState } from "./acquisition/types";
import { cloneProspectGraph, filterSnapshotByPrefix, graphFromSnapshot, snapshotProspectGraph, type ProspectGraphRepository, type ProspectGraphSnapshot } from "./repository";
import { createProspectGraph, type ProspectGraph } from "./store";

function dropPrefixed(snapshot: ProspectGraphSnapshot, prefix: string): ProspectGraphSnapshot {
  const drop = (value: string | null | undefined) => Boolean(value && value.startsWith(prefix));
  return {
    sources: snapshot.sources.filter((row) => !drop(row.source_id)),
    observations: snapshot.observations.filter((row) => !drop(row.observation_id) && !drop(row.source_id)),
    entities: snapshot.entities.filter((row) => !drop(row.entity_id)),
    people: snapshot.people.filter((row) => !drop(row.person_id) && !drop(row.entity_id)),
    organizations: snapshot.organizations.filter((row) => !drop(row.organization_id) && !drop(row.entity_id)),
    relationships: snapshot.relationships.filter((row) => !drop(row.relationship_id) && !drop(row.from_entity_id) && !drop(row.to_entity_id)),
    derived: snapshot.derived.filter((row) => !drop(row.attribute_id) && !drop(row.entity_id)),
    matches: snapshot.matches.filter((row) => !drop(row.match_id) && !drop(row.prospect_entity_id)),
    rules: snapshot.rules.filter((row) => !drop(row.rule_id) && !drop(row.venture_id)),
    eligibility: snapshot.eligibility.filter((row) => !drop(row.eligibility_id) && !drop(row.entity_id)),
    suppressions: snapshot.suppressions.filter((row) => !drop(row.suppression_id) && !drop(row.entity_id)),
    outcomes: snapshot.outcomes.filter((row) => !drop(row.outcome_id) && !drop(row.entity_id)),
    outreach: snapshot.outreach.filter((row) => !drop(row.outreach_id) && !drop(row.entity_id)),
    inventory: snapshot.inventory.filter((row) => !drop(row.venture_id)),
    events: snapshot.events,
    acquisition: snapshot.acquisition ?? emptyAcquisitionState(),
  };
}

export class MemoryProspectGraphRepository implements ProspectGraphRepository {
  readonly kind = "MEMORY" as const;
  private snapshot = snapshotProspectGraph(createProspectGraph());

  async save(graph: ProspectGraph): Promise<void> {
    this.snapshot = snapshotProspectGraph(cloneProspectGraph(graph));
  }

  async load(): Promise<ProspectGraph> {
    return graphFromSnapshot(this.snapshot);
  }

  async loadByPrefix(prefix: string): Promise<ProspectGraph> {
    return graphFromSnapshot(filterSnapshotByPrefix(this.snapshot, prefix));
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    this.snapshot = dropPrefixed(this.snapshot, prefix);
  }
}
