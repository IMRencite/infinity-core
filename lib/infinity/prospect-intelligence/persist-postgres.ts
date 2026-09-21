import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emptyAcquisitionState } from "./acquisition/types";
import { MemoryProspectGraphRepository } from "./persist-memory";
import {
  filterSnapshotByPrefix,
  graphFromSnapshot,
  snapshotProspectGraph,
  type ProspectGraphRepository,
  type ProspectGraphSnapshot,
} from "./repository";
import type { ProspectGraph } from "./store";
import type { Entity, Freshness } from "./types";

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function freshnessFromEntity(row: {
  first_seen_at: string;
  last_seen_at: string;
  last_verified_at: string | null;
  refresh_after: string | null;
  source_id: string | null;
  confidence: number | string;
  freshness_status: Freshness["status"];
}): Freshness {
  return {
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    last_verified_at: row.last_verified_at,
    refresh_after: row.refresh_after,
    source_id: row.source_id ?? "unknown",
    confidence: Number(row.confidence),
    status: row.freshness_status,
  };
}

export class PostgresProspectGraphRepository implements ProspectGraphRepository {
  readonly kind = "DURABLE_POSTGRES" as const;

  constructor(private readonly client: SupabaseClient | null = adminClient()) {}

  async save(graph: ProspectGraph): Promise<void> {
    if (!this.client) return;
    const snapshot = snapshotProspectGraph(graph);
    if (snapshot.sources.length) {
      const { error } = await this.client.from("prospect_sources").upsert(
        snapshot.sources.map((row) => ({
          source_id: row.source_id,
          source_type: row.source_type,
          name: row.name,
          jurisdiction: row.jurisdiction,
          base_url: row.base_url,
          acquisition_method: row.acquisition_method,
          usage_policy: row.usage_policy,
          licensing_notes: row.licensing_notes,
          data_categories: row.data_categories,
          refresh_cadence: row.refresh_cadence,
          reliability: row.reliability,
          enabled: row.enabled,
          last_success: row.last_success,
          last_failure: row.last_failure,
          health: row.health,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "source_id" },
      );
      if (error) throw new Error(`PROSPECT_SOURCE_PERSIST:${error.message}`);
    }
    if (snapshot.entities.length) {
      const { error } = await this.client.from("prospect_entities").upsert(
        snapshot.entities.map((row) => ({
          entity_id: row.entity_id,
          kind: row.kind,
          first_seen_at: row.freshness.first_seen_at,
          last_seen_at: row.freshness.last_seen_at,
          last_verified_at: row.freshness.last_verified_at,
          refresh_after: row.freshness.refresh_after,
          source_id: row.freshness.source_id,
          confidence: row.freshness.confidence,
          freshness_status: row.freshness.status,
          merge_history: row.merge_history,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "entity_id" },
      );
      if (error) throw new Error(`PROSPECT_ENTITY_PERSIST:${error.message}`);
    }
    const identifiers = snapshot.entities.flatMap((row) => row.identifiers);
    if (identifiers.length) {
      const { error } = await this.client.from("prospect_entity_identifiers").upsert(
        identifiers.map((row) => ({
          identifier_id: row.identifier_id,
          entity_id: row.entity_id,
          scheme: row.scheme,
          value: row.value,
          source_id: row.source_id,
        })),
        { onConflict: "identifier_id" },
      );
      if (error) throw new Error(`PROSPECT_IDENTIFIER_PERSIST:${error.message}`);
    }
    if (snapshot.observations.length) {
      const { error } = await this.client.from("prospect_observations").upsert(
        snapshot.observations.map((row) => ({
          observation_id: row.observation_id,
          source_id: row.source_id,
          observed_at: row.observed_at,
          entity_hint: row.entity_hint,
          field: row.field,
          raw_value: row.raw_value,
          normalized_value: row.normalized_value,
          usage_restricted: row.usage_restricted,
          superseded_by: row.superseded_by,
        })),
        { onConflict: "observation_id" },
      );
      if (error) throw new Error(`PROSPECT_OBSERVATION_PERSIST:${error.message}`);
    }
    if (snapshot.people.length) {
      const { error } = await this.client.from("prospect_people").upsert(
        snapshot.people.map((row) => ({
          person_id: row.person_id,
          entity_id: row.entity_id,
          display_name: row.display_name,
          given_name: row.given_name,
          family_name: row.family_name,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "person_id" },
      );
      if (error) throw new Error(`PROSPECT_PERSON_PERSIST:${error.message}`);
    }
    if (snapshot.organizations.length) {
      const { error } = await this.client.from("prospect_organizations").upsert(
        snapshot.organizations.map((row) => ({
          organization_id: row.organization_id,
          entity_id: row.entity_id,
          legal_name: row.legal_name,
          trade_name: row.trade_name,
          industry: row.industry,
          employee_range: row.employee_range,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "organization_id" },
      );
      if (error) throw new Error(`PROSPECT_ORGANIZATION_PERSIST:${error.message}`);
    }
    if (snapshot.relationships.length) {
      const { error } = await this.client.from("prospect_relationships").upsert(
        snapshot.relationships.map((row) => ({
          relationship_id: row.relationship_id,
          from_entity_id: row.from_entity_id,
          to_entity_id: row.to_entity_id,
          type: row.type,
          evidence_ids: row.evidence_ids,
          first_seen_at: row.freshness.first_seen_at,
          last_seen_at: row.freshness.last_seen_at,
        })),
        { onConflict: "relationship_id" },
      );
      if (error) throw new Error(`PROSPECT_RELATIONSHIP_PERSIST:${error.message}`);
    }
    if (snapshot.derived.length) {
      const { error } = await this.client.from("prospect_derived_attributes").upsert(
        snapshot.derived.map((row) => ({
          attribute_id: row.attribute_id,
          entity_id: row.entity_id,
          name: row.name,
          value: row.value,
          inference: row.inference,
          evidence_ids: row.evidence_ids,
          confidence: row.confidence,
        })),
        { onConflict: "attribute_id" },
      );
      if (error) throw new Error(`PROSPECT_DERIVED_PERSIST:${error.message}`);
    }
    if (snapshot.rules.length) {
      const { error } = await this.client.from("prospect_venture_match_rules").upsert(
        snapshot.rules.map((row) => ({
          rule_id: row.rule_id,
          venture_id: row.venture_id,
          icp: row.icp,
          updated_at: row.updated_at,
        })),
        { onConflict: "rule_id" },
      );
      if (error) throw new Error(`PROSPECT_RULE_PERSIST:${error.message}`);
    }
    if (snapshot.matches.length) {
      const { error } = await this.client.from("prospect_venture_matches").upsert(
        snapshot.matches.map((row) => ({
          match_id: row.match_id,
          prospect_entity_id: row.prospect_entity_id,
          venture_id: row.venture_id,
          fit_score: row.fit_score,
          fit_band: row.fit_band,
          fit_reasons: row.fit_reasons,
          disqualifiers: row.disqualifiers,
          evidence_ids: row.evidence_ids,
          confidence: row.confidence,
          evaluated_at: row.evaluated_at,
          next_evaluation_at: row.next_evaluation_at,
        })),
        { onConflict: "match_id" },
      );
      if (error) throw new Error(`PROSPECT_MATCH_PERSIST:${error.message}`);
    }
    if (snapshot.eligibility.length) {
      const { error } = await this.client.from("prospect_communication_eligibility").upsert(
        snapshot.eligibility.map((row) => ({
          eligibility_id: row.eligibility_id,
          entity_id: row.entity_id,
          channel: row.channel,
          status: row.status,
          reason: row.reason,
          updated_at: row.updated_at,
        })),
        { onConflict: "eligibility_id" },
      );
      if (error) throw new Error(`PROSPECT_ELIGIBILITY_PERSIST:${error.message}`);
    }
    if (snapshot.suppressions.length) {
      const { error } = await this.client.from("prospect_suppressions").upsert(
        snapshot.suppressions.map((row) => ({
          suppression_id: row.suppression_id,
          entity_id: row.entity_id,
          reason: row.reason,
          kind: row.kind,
          recycle_after: row.recycle_after,
          created_at: row.created_at,
        })),
        { onConflict: "suppression_id" },
      );
      if (error) throw new Error(`PROSPECT_SUPPRESSION_PERSIST:${error.message}`);
    }
    if (snapshot.outcomes.length) {
      const { error } = await this.client.from("prospect_outcomes").upsert(
        snapshot.outcomes.map((row) => ({
          outcome_id: row.outcome_id,
          entity_id: row.entity_id,
          venture_id: row.venture_id,
          kind: row.kind,
          at: row.at,
          evidence: row.evidence,
        })),
        { onConflict: "outcome_id" },
      );
      if (error) throw new Error(`PROSPECT_OUTCOME_PERSIST:${error.message}`);
    }
    if (snapshot.outreach.length) {
      const { error } = await this.client.from("prospect_outreach_history").upsert(
        snapshot.outreach.map((row) => ({
          outreach_id: row.outreach_id,
          entity_id: row.entity_id,
          venture_id: row.venture_id,
          channel: row.channel,
          idempotency_key: row.idempotency_key,
          scheduled_follow_up_at: row.scheduled_follow_up_at,
          sent_at: row.sent_at,
          status: row.status,
        })),
        { onConflict: "outreach_id" },
      );
      if (error) throw new Error(`PROSPECT_OUTREACH_PERSIST:${error.message}`);
    }
    if (snapshot.inventory.length) {
      const { error } = await this.client.from("prospect_venture_inventory").upsert(
        snapshot.inventory.map((row) => ({
          venture_id: row.venture_id,
          target_ready_inventory: row.target_ready_inventory,
          minimum_ready_inventory: row.minimum_ready_inventory,
          current_ready_inventory: row.current_ready_inventory,
          average_daily_consumption: row.average_daily_consumption,
          coverage_days: row.coverage_days,
          enrichment_backlog: row.enrichment_backlog,
          refresh_health: row.refresh_health,
          states: row.states,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "venture_id" },
      );
      if (error) throw new Error(`PROSPECT_INVENTORY_PERSIST:${error.message}`);
    }
  }

  async load(): Promise<ProspectGraph> {
    return graphFromSnapshot(await this.readSnapshot());
  }

  async loadByPrefix(prefix: string): Promise<ProspectGraph> {
    return graphFromSnapshot(filterSnapshotByPrefix(await this.readSnapshot(), prefix));
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    if (!this.client || !prefix.startsWith("pi-verify-")) return;
    const tables = [
      "prospect_outreach_history",
      "prospect_outcomes",
      "prospect_suppressions",
      "prospect_communication_eligibility",
      "prospect_venture_matches",
      "prospect_derived_attributes",
      "prospect_relationships",
      "prospect_entity_identifiers",
      "prospect_people",
      "prospect_organizations",
      "prospect_observations",
      "prospect_venture_inventory",
      "prospect_venture_match_rules",
      "prospect_entities",
      "prospect_sources",
    ] as const;
    const columns = [
      "outreach_id",
      "outcome_id",
      "suppression_id",
      "eligibility_id",
      "match_id",
      "attribute_id",
      "relationship_id",
      "identifier_id",
      "person_id",
      "organization_id",
      "observation_id",
      "venture_id",
      "rule_id",
      "entity_id",
      "source_id",
    ] as const;
    for (let i = 0; i < tables.length; i += 1) {
      await this.client.from(tables[i]).delete().like(columns[i], `${prefix}%`);
    }
  }

  private async readSnapshot(): Promise<ProspectGraphSnapshot> {
    if (!this.client) return snapshotProspectGraph(graphFromSnapshot({
      sources: [],
      observations: [],
      entities: [],
      people: [],
      organizations: [],
      relationships: [],
      derived: [],
      matches: [],
      rules: [],
      eligibility: [],
      suppressions: [],
      outcomes: [],
      outreach: [],
      inventory: [],
      events: [],
      acquisition: emptyAcquisitionState(),
    }));
    const [
      sources,
      observations,
      entities,
      identifiers,
      people,
      organizations,
      relationships,
      derived,
      rules,
      matches,
      eligibility,
      suppressions,
      outcomes,
      outreach,
      inventory,
    ] = await Promise.all([
      this.client.from("prospect_sources").select("*"),
      this.client.from("prospect_observations").select("*"),
      this.client.from("prospect_entities").select("*"),
      this.client.from("prospect_entity_identifiers").select("*"),
      this.client.from("prospect_people").select("*"),
      this.client.from("prospect_organizations").select("*"),
      this.client.from("prospect_relationships").select("*"),
      this.client.from("prospect_derived_attributes").select("*"),
      this.client.from("prospect_venture_match_rules").select("*"),
      this.client.from("prospect_venture_matches").select("*"),
      this.client.from("prospect_communication_eligibility").select("*"),
      this.client.from("prospect_suppressions").select("*"),
      this.client.from("prospect_outcomes").select("*"),
      this.client.from("prospect_outreach_history").select("*"),
      this.client.from("prospect_venture_inventory").select("*"),
    ]);
    const firstError = [
      sources, observations, entities, identifiers, people, organizations, relationships, derived, rules, matches, eligibility, suppressions, outcomes, outreach, inventory,
    ].find((row) => row.error);
    if (firstError?.error) throw new Error(`PROSPECT_GRAPH_LOAD:${firstError.error.message}`);
    const identifiersByEntity = new Map<string, Entity["identifiers"]>();
    for (const row of identifiers.data ?? []) {
      const list = identifiersByEntity.get(row.entity_id as string) ?? [];
      list.push({
        identifier_id: row.identifier_id as string,
        entity_id: row.entity_id as string,
        scheme: row.scheme as string,
        value: row.value as string,
        source_id: row.source_id as string,
      });
      identifiersByEntity.set(row.entity_id as string, list);
    }
    const entityFreshness = new Map<string, Freshness>();
    const entityRows = (entities.data ?? []).map((row) => {
      const freshness = freshnessFromEntity(row as Parameters<typeof freshnessFromEntity>[0]);
      entityFreshness.set(row.entity_id as string, freshness);
      return {
        entity_id: row.entity_id as string,
        kind: row.kind,
        canonical: true as const,
        identifiers: identifiersByEntity.get(row.entity_id as string) ?? [],
        freshness,
        merge_history: (row.merge_history as string[]) ?? [],
      } satisfies Entity;
    });
    return {
      sources: (sources.data ?? []).map((row) => ({
        source_id: row.source_id,
        source_type: row.source_type,
        name: row.name,
        jurisdiction: row.jurisdiction,
        base_url: row.base_url,
        acquisition_method: row.acquisition_method,
        usage_policy: row.usage_policy,
        licensing_notes: row.licensing_notes,
        data_categories: row.data_categories ?? [],
        refresh_cadence: row.refresh_cadence,
        reliability: Number(row.reliability),
        enabled: row.enabled,
        last_success: row.last_success,
        last_failure: row.last_failure,
        health: row.health,
      })),
      observations: (observations.data ?? []).map((row) => ({
        observation_id: row.observation_id,
        source_id: row.source_id,
        observed_at: row.observed_at,
        entity_hint: row.entity_hint,
        field: row.field,
        raw_value: row.raw_value,
        normalized_value: row.normalized_value,
        usage_restricted: row.usage_restricted,
        superseded_by: row.superseded_by,
      })),
      entities: entityRows,
      people: (people.data ?? []).map((row) => ({
        person_id: row.person_id,
        entity_id: row.entity_id,
        display_name: row.display_name,
        given_name: row.given_name,
        family_name: row.family_name,
        freshness: entityFreshness.get(row.entity_id as string) ?? freshnessFromEntity({
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          last_verified_at: null,
          refresh_after: null,
          source_id: "unknown",
          confidence: 0.5,
          freshness_status: "UNKNOWN",
        }),
      })),
      organizations: (organizations.data ?? []).map((row) => ({
        organization_id: row.organization_id,
        entity_id: row.entity_id,
        legal_name: row.legal_name,
        trade_name: row.trade_name,
        industry: row.industry,
        employee_range: row.employee_range,
        freshness: entityFreshness.get(row.entity_id as string) ?? freshnessFromEntity({
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          last_verified_at: null,
          refresh_after: null,
          source_id: "unknown",
          confidence: 0.5,
          freshness_status: "UNKNOWN",
        }),
      })),
      relationships: (relationships.data ?? []).map((row) => ({
        relationship_id: row.relationship_id,
        from_entity_id: row.from_entity_id,
        to_entity_id: row.to_entity_id,
        type: row.type,
        evidence_ids: row.evidence_ids ?? [],
        freshness: freshnessFromEntity({
          first_seen_at: row.first_seen_at,
          last_seen_at: row.last_seen_at,
          last_verified_at: row.last_seen_at,
          refresh_after: null,
          source_id: "unknown",
          confidence: 0.8,
          freshness_status: "CURRENT",
        }),
      })),
      derived: (derived.data ?? []).map((row) => ({
        attribute_id: row.attribute_id,
        entity_id: row.entity_id,
        name: row.name,
        value: row.value,
        inference: true as const,
        evidence_ids: row.evidence_ids ?? [],
        confidence: Number(row.confidence),
        freshness: entityFreshness.get(row.entity_id as string) ?? freshnessFromEntity({
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          last_verified_at: null,
          refresh_after: null,
          source_id: "unknown",
          confidence: Number(row.confidence ?? 0.5),
          freshness_status: "CURRENT",
        }),
      })),
      matches: (matches.data ?? []).map((row) => ({
        match_id: row.match_id,
        prospect_entity_id: row.prospect_entity_id,
        venture_id: row.venture_id,
        fit_score: Number(row.fit_score),
        fit_band: row.fit_band,
        fit_reasons: row.fit_reasons ?? [],
        disqualifiers: row.disqualifiers ?? [],
        evidence_ids: row.evidence_ids ?? [],
        confidence: Number(row.confidence),
        evaluated_at: row.evaluated_at,
        next_evaluation_at: row.next_evaluation_at,
      })),
      rules: (rules.data ?? []).map((row) => ({
        rule_id: row.rule_id,
        venture_id: row.venture_id,
        icp: row.icp,
        updated_at: row.updated_at,
      })),
      eligibility: (eligibility.data ?? []).map((row) => ({
        eligibility_id: row.eligibility_id,
        entity_id: row.entity_id,
        channel: row.channel,
        status: row.status,
        reason: row.reason,
        updated_at: row.updated_at,
      })),
      suppressions: (suppressions.data ?? []).map((row) => ({
        suppression_id: row.suppression_id,
        entity_id: row.entity_id,
        reason: row.reason,
        kind: row.kind,
        recycle_after: row.recycle_after,
        created_at: row.created_at,
      })),
      outcomes: (outcomes.data ?? []).map((row) => ({
        outcome_id: row.outcome_id,
        entity_id: row.entity_id,
        venture_id: row.venture_id,
        kind: row.kind,
        at: row.at,
        evidence: row.evidence,
      })),
      outreach: (outreach.data ?? []).map((row) => ({
        outreach_id: row.outreach_id,
        entity_id: row.entity_id,
        venture_id: row.venture_id,
        channel: row.channel,
        idempotency_key: row.idempotency_key,
        scheduled_follow_up_at: row.scheduled_follow_up_at,
        sent_at: row.sent_at,
        status: row.status,
      })),
      inventory: (inventory.data ?? []).map((row) => ({
        venture_id: row.venture_id,
        target_ready_inventory: row.target_ready_inventory,
        minimum_ready_inventory: row.minimum_ready_inventory,
        current_ready_inventory: row.current_ready_inventory,
        average_daily_consumption: Number(row.average_daily_consumption),
        coverage_days: Number(row.coverage_days),
        enrichment_backlog: row.enrichment_backlog,
        refresh_health: row.refresh_health,
        states: row.states ?? {},
      })),
      events: [],
      acquisition: emptyAcquisitionState(),
    };
  }
}

export function createProspectGraphRepository(): ProspectGraphRepository {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new PostgresProspectGraphRepository();
  }
  return new MemoryProspectGraphRepository();
}
