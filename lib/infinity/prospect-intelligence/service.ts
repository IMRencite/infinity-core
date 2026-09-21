import { AUTHORIZED_CONSUMERS, type ProspectIntelligenceConsumer } from "./contract";
import { classifyForVenture } from "./matching";
import { applyMerge, resolveEntities } from "./resolution";
import { assertNoVentureOnCanonical, ensureVentureInventory, type ProspectGraph } from "./store";
import type {
  CommunicationEligibility,
  DerivedAttribute,
  Entity,
  Freshness,
  Observation,
  OrganizationRecord,
  OutreachHistory,
  PersonIntelligenceProfile,
  PersonRecord,
  ProspectAccessRequest,
  ProspectIntelligenceBrief,
  ProspectOutcome,
  ProspectVentureMatch,
  SourceRecord,
  SuppressionRecord,
  VentureMatchRule,
} from "./types";

function freshness(now: string, sourceId: string, confidence = 0.8): Freshness {
  return {
    first_seen_at: now,
    last_seen_at: now,
    last_verified_at: now,
    refresh_after: new Date(Date.parse(now) + 7 * 86400000).toISOString(),
    source_id: sourceId,
    confidence,
    status: "CURRENT",
  };
}

function requireConsumer(request: ProspectAccessRequest): ProspectIntelligenceConsumer {
  if (!AUTHORIZED_CONSUMERS.includes(request.consumer)) {
    throw new Error(`UNAUTHORIZED_CONSUMER:${request.consumer}`);
  }
  return request.consumer;
}

export function createProspectIntelligenceService(graph: ProspectGraph) {
  function emit(event: string) {
    graph.events.push(event);
  }

  return {
    registerSource(request: ProspectAccessRequest, source: SourceRecord) {
      requireConsumer(request);
      graph.sources.set(source.source_id, source);
      return source;
    },

    storeObservation(request: ProspectAccessRequest, observation: Observation) {
      requireConsumer(request);
      graph.observations.push(observation);
      emit("prospect.source.observed");
      return observation;
    },

    upsertPerson(request: ProspectAccessRequest, input: {
      person: PersonRecord;
      entity: Entity;
      now: string;
    }) {
      requireConsumer(request);
      assertNoVentureOnCanonical(input.entity);
      assertNoVentureOnCanonical(input.person as { venture_id?: unknown });
      for (const existing of graph.entities.values()) {
        const decision = resolveEntities(existing, input.entity);
        if (decision.decision === "MATCHED" && decision.merged_entity_id) {
          const survivor = graph.entities.get(decision.merged_entity_id);
          if (survivor) {
            graph.entities.set(survivor.entity_id, applyMerge(survivor, input.entity));
            emit("prospect.entity.merged");
            return { entity: graph.entities.get(survivor.entity_id)!, decision };
          }
        }
        if (decision.decision === "AMBIGUOUS") {
          emit("prospect.entity.created");
          return { entity: input.entity, decision };
        }
      }
      graph.entities.set(input.entity.entity_id, { ...input.entity, freshness: input.entity.freshness ?? freshness(input.now, "manual") });
      graph.people.set(input.person.person_id, input.person);
      emit("prospect.entity.created");
      return { entity: input.entity, decision: { decision: "NOT_MATCHED" as const, left_entity_id: input.entity.entity_id, right_entity_id: input.entity.entity_id, confidence: 1, evidence: ["NEW"] } };
    },

    upsertOrganization(request: ProspectAccessRequest, organization: OrganizationRecord, entity: Entity) {
      requireConsumer(request);
      assertNoVentureOnCanonical(entity);
      graph.entities.set(entity.entity_id, entity);
      graph.organizations.set(organization.organization_id, organization);
      emit("prospect.entity.created");
      return organization;
    },

    relate(request: ProspectAccessRequest, relationship: Parameters<ProspectGraph["relationships"]["push"]>[0]) {
      requireConsumer(request);
      graph.relationships.push(relationship);
      emit("prospect.relationship.created");
      return relationship;
    },

    deriveAttribute(request: ProspectAccessRequest, attribute: DerivedAttribute) {
      requireConsumer(request);
      if (!attribute.inference || !attribute.evidence_ids.length) {
        throw new Error("DERIVED_ATTRIBUTE_REQUIRES_EVIDENCE");
      }
      graph.derived.push(attribute);
      return attribute;
    },

    setVentureRule(request: ProspectAccessRequest, rule: VentureMatchRule) {
      requireConsumer(request);
      graph.rules.set(rule.venture_id, rule);
      return rule;
    },

    matchVenture(request: ProspectAccessRequest, input: {
      entity_id: string;
      venture_id: string;
      person?: PersonRecord | null;
      organization?: OrganizationRecord | null;
      role?: string | null;
      geography?: string | null;
      now: string;
      evidence_ids: string[];
    }) {
      requireConsumer(request);
      const rule = graph.rules.get(input.venture_id);
      if (!rule) throw new Error(`VENTURE_RULE_MISSING:${input.venture_id}`);
      const match = classifyForVenture({ ...input, rule });
      const existing = graph.matches.findIndex((row) => row.match_id === match.match_id);
      if (existing >= 0) graph.matches[existing] = match;
      else graph.matches.push(match);
      emit(existing >= 0 ? "prospect.match.changed" : "prospect.match.created");
      return match;
    },

    evaluateExistingGraphForVenture(request: ProspectAccessRequest, ventureId: string, now: string): ProspectVentureMatch[] {
      requireConsumer(request);
      const rule = graph.rules.get(ventureId);
      if (!rule) throw new Error(`VENTURE_RULE_MISSING:${ventureId}`);
      return [...graph.people.values()].map((person) =>
        this.matchVenture(request, {
          entity_id: person.entity_id,
          venture_id: ventureId,
          person,
          organization: [...graph.organizations.values()][0] ?? null,
          now,
          evidence_ids: graph.observations.filter((row) => row.entity_hint === person.entity_id).map((row) => row.observation_id),
        }),
      );
    },

    setEligibility(request: ProspectAccessRequest, eligibility: CommunicationEligibility) {
      requireConsumer(request);
      graph.eligibility = graph.eligibility.filter((row) => !(row.entity_id === eligibility.entity_id && row.channel === eligibility.channel));
      graph.eligibility.push(eligibility);
      return eligibility;
    },

    suppress(request: ProspectAccessRequest, record: SuppressionRecord) {
      requireConsumer(request);
      graph.suppressions.push(record);
      return record;
    },

    recordOutcome(request: ProspectAccessRequest, outcome: ProspectOutcome) {
      requireConsumer(request);
      graph.outcomes.push(outcome);
      emit("sales.outcome.recorded");
      return outcome;
    },

    recordOutreach(request: ProspectAccessRequest, outreach: OutreachHistory) {
      requireConsumer(request);
      if (graph.outreach.some((row) => row.idempotency_key === outreach.idempotency_key)) {
        return { ...outreach, status: "DUPLICATE_BLOCKED" as const };
      }
      graph.outreach.push(outreach);
      emit(outreach.status === "SENT" ? "sales.outreach.sent" : "sales.outreach.created");
      return outreach;
    },

    requestEnrichment(request: ProspectAccessRequest, entityId: string) {
      requireConsumer(request);
      emit("prospect.enrichment.requested");
      return { entity_id: entityId, status: "REQUESTED" as const };
    },

    requestRefresh(request: ProspectAccessRequest, entityId: string, now: string) {
      requireConsumer(request);
      const entity = graph.entities.get(entityId);
      if (entity) {
        entity.freshness = { ...entity.freshness, last_verified_at: now, last_seen_at: now, status: "CURRENT" };
      }
      emit("prospect.refresh.completed");
      return { entity_id: entityId, refreshed_at: now };
    },

    searchProspects(request: ProspectAccessRequest, query = "") {
      requireConsumer(request);
      const q = query.trim().toLowerCase();
      return [...graph.people.values()].filter((row) => !q || row.display_name.toLowerCase().includes(q));
    },

    getPerson(request: ProspectAccessRequest, personId: string): PersonIntelligenceProfile | null {
      requireConsumer(request);
      const person = graph.people.get(personId);
      if (!person) return null;
      return {
        identity: person,
        organizations: [...graph.organizations.values()],
        roles: graph.relationships.filter((row) => row.from_entity_id === person.entity_id && row.type === "HAS_ROLE").map((row) => row.to_entity_id),
        locations: [],
        contact_points: graph.eligibility.filter((row) => row.entity_id === person.entity_id).map((row) => row.channel),
        observed_facts: graph.observations.filter((row) => row.entity_hint === person.entity_id),
        derived_attributes: graph.derived.filter((row) => row.entity_id === person.entity_id),
        business_signals: graph.derived.filter((row) => row.entity_id === person.entity_id).map((row) => String(row.name)),
        need_signals: [],
        venture_matches: graph.matches.filter((row) => row.prospect_entity_id === person.entity_id),
        communication_eligibility: graph.eligibility.filter((row) => row.entity_id === person.entity_id),
        suppression: graph.suppressions.filter((row) => row.entity_id === person.entity_id),
        outcomes: graph.outcomes.filter((row) => row.entity_id === person.entity_id),
        confidence: person.freshness.confidence,
        freshness: person.freshness,
      };
    },

    getOrganization(request: ProspectAccessRequest, organizationId: string) {
      requireConsumer(request);
      return graph.organizations.get(organizationId) ?? null;
    },

    getRelationships(request: ProspectAccessRequest, entityId: string) {
      requireConsumer(request);
      return graph.relationships.filter((row) => row.from_entity_id === entityId || row.to_entity_id === entityId);
    },

    getEvidence(request: ProspectAccessRequest, entityId: string) {
      requireConsumer(request);
      return graph.observations.filter((row) => row.entity_hint === entityId);
    },

    getFreshness(request: ProspectAccessRequest, entityId: string) {
      requireConsumer(request);
      return graph.entities.get(entityId)?.freshness ?? null;
    },

    getVentureMatches(request: ProspectAccessRequest, entityId: string) {
      requireConsumer(request);
      return graph.matches.filter((row) => row.prospect_entity_id === entityId);
    },

    getCommunicationEligibility(request: ProspectAccessRequest, entityId: string) {
      requireConsumer(request);
      return graph.eligibility.filter((row) => row.entity_id === entityId);
    },

    findMatchesForVenture(request: ProspectAccessRequest, ventureId: string) {
      requireConsumer(request);
      return graph.matches.filter((row) => row.venture_id === ventureId && row.fit_band !== "NONE");
    },

    publishReadyInventory(request: ProspectAccessRequest, ventureId: string) {
      requireConsumer(request);
      const inventory = ensureVentureInventory(graph, ventureId);
      const ready = graph.matches.filter((row) => row.venture_id === ventureId && (row.fit_band === "HIGH" || row.fit_band === "MEDIUM")).filter((row) => {
        const suppressed = graph.suppressions.some((item) => item.entity_id === row.prospect_entity_id && !item.recycle_after);
        const eligibility = graph.eligibility.find((item) => item.entity_id === row.prospect_entity_id);
        return !suppressed && eligibility && !["suppressed", "opted_out", "do_not_contact", "bounced", "complaint", "legal_or_policy_restriction", "manual_block"].includes(eligibility.status);
      });
      inventory.current_ready_inventory = ready.length;
      inventory.states.ready = ready.length;
      inventory.coverage_days = inventory.average_daily_consumption > 0
        ? Number((inventory.current_ready_inventory / inventory.average_daily_consumption).toFixed(2))
        : 0;
      inventory.enrichment_backlog = graph.matches.filter((row) => row.venture_id === ventureId && row.fit_band === "LOW").length;
      if (inventory.current_ready_inventory < inventory.minimum_ready_inventory) emit("prospect.inventory.low");
      emit("prospect.published_to_sales");
      return inventory;
    },

    generateBrief(request: ProspectAccessRequest, personId: string): ProspectIntelligenceBrief | null {
      requireConsumer(request);
      const profile = this.getPerson(request, personId);
      if (!profile) return null;
      return {
        identity: profile.identity.display_name,
        organization: profile.organizations[0]?.legal_name ?? null,
        role: profile.roles[0] ?? null,
        location: profile.locations[0] ?? null,
        business_context: "Canonical Prospect Intelligence brief. Internal use only.",
        key_signals: profile.business_signals,
        venture_matches: profile.venture_matches.map((row) => ({
          venture_id: row.venture_id,
          fit_band: row.fit_band,
          reasons: row.fit_reasons,
        })),
        source_backed_reasons: profile.observed_facts.map((row) => `${row.field} via ${row.source_id}`),
        freshness: profile.freshness,
        contact_eligibility: profile.communication_eligibility.map((row) => `${row.channel}:${row.status}`),
        internal_only: true,
      };
    },

    graph,
  };
}

export type ProspectIntelligenceService = ReturnType<typeof createProspectIntelligenceService>;
