import { resolveEntities, applyMerge } from "../resolution";
import { assertNoVentureOnCanonical } from "../store";
import type { ProspectIntelligenceService } from "../service";
import type { Entity, EntityIdentifier, Observation, OrganizationRecord, PersonRecord } from "../types";
import { normalizeRawFields } from "./normalize";
import { policyAllowsContactUse, type SourcePolicy } from "./policy";
import type { DiscoveredRecord, ProspectAcquisitionState } from "./types";

const ACCESS = { consumer: "prospect_intelligence" as const };

function freshness(now: string, sourceId: string) {
  return {
    first_seen_at: now,
    last_seen_at: now,
    last_verified_at: now,
    refresh_after: new Date(Date.parse(now) + 7 * 86400000).toISOString(),
    source_id: sourceId,
    confidence: 0.86,
    status: "CURRENT" as const,
  };
}

function identifiersFromNormalized(
  entityId: string,
  sourceId: string,
  sourceRecordId: string,
  fields: ReturnType<typeof normalizeRawFields>,
): EntityIdentifier[] {
  const rows: Array<[string, string | null]> = [
    ["cik", fields.cik],
    ["ticker", fields.ticker],
    ["domain", fields.domain],
    ["email", fields.email],
    ["phone", fields.phone],
    ["license", fields.license_id],
    ["name", fields.legal_name ?? fields.display_name],
    ["source_record", `${sourceId}:${sourceRecordId}`],
  ];
  return rows
    .filter((row): row is [string, string] => Boolean(row[1]))
    .map(([scheme, value], index) => ({
      identifier_id: `${entityId}:${scheme}:${index}`,
      entity_id: entityId,
      scheme,
      value,
      source_id: sourceId,
    }));
}

function findMatch(service: ProspectIntelligenceService, incoming: Entity) {
  for (const existing of service.graph.entities.values()) {
    const decision = resolveEntities(existing, incoming);
    if (decision.decision === "MATCHED" || decision.decision === "AMBIGUOUS" || decision.decision === "LIKELY_MATCH") {
      return { existing, decision };
    }
  }
  return null;
}

export function ingestDiscoveredRecord(input: {
  service: ProspectIntelligenceService;
  source_id: string;
  now: string;
  record: DiscoveredRecord;
  policy: SourcePolicy;
  state: ProspectAcquisitionState;
}): { entity_id: string | null; created: boolean; updated: boolean; duplicate: boolean; ambiguous: boolean } {
  const graph = input.service.graph;
  const fields = normalizeRawFields({
    ...input.record.raw_fields,
    source_url: input.record.source_url,
    cik: input.record.raw_fields.cik ?? input.record.raw_fields.cik_str,
  });
  const hint = fields.cik ?? fields.email ?? fields.domain ?? input.record.source_record_id;
  const observationId = `obs:${input.source_id}:${input.record.source_record_id}:${input.now}`;
  const observation: Observation = {
    observation_id: observationId,
    source_id: input.source_id,
    observed_at: input.now,
    entity_hint: hint,
    field: "source_record",
    raw_value: {
      source_record_id: input.record.source_record_id,
      source_url: input.record.source_url,
      raw_fields: input.record.raw_fields,
      source_policy: input.policy,
    },
    normalized_value: fields,
    usage_restricted: !policyAllowsContactUse(input.policy),
    superseded_by: null,
  };
  if (!graph.observations.some((row) => row.observation_id === observationId)) {
    input.service.storeObservation(ACCESS, observation);
    graph.events.push("prospect.observation.created");
  }
  input.state.metrics.records_ingested += 1;

  const kind = input.record.entity_kind;
  const entityId = `ent:${input.source_id}:${input.record.source_record_id}`;
  const entity: Entity = {
    entity_id: entityId,
    kind,
    canonical: true,
    identifiers: identifiersFromNormalized(entityId, input.source_id, input.record.source_record_id, fields),
    freshness: freshness(input.now, input.source_id),
    merge_history: [],
  };
  assertNoVentureOnCanonical(entity);
  const match = findMatch(input.service, entity);
  if (match?.decision.decision === "AMBIGUOUS" || match?.decision.decision === "LIKELY_MATCH") {
    input.state.metrics.ambiguous_records += 1;
    input.state.metrics.manual_review_required += 1;
    graph.events.push("prospect.entity.ambiguous");
    return { entity_id: match.existing.entity_id, created: false, updated: false, duplicate: false, ambiguous: true };
  }
  if (match?.decision.decision === "MATCHED") {
    const survivor = applyMerge(match.existing, entity);
    graph.entities.set(survivor.entity_id, {
      ...survivor,
      freshness: { ...survivor.freshness, last_seen_at: input.now, last_verified_at: input.now, status: "CURRENT" },
    });
    if (kind === "ORGANIZATION") {
      const org = [...graph.organizations.values()].find((row) => row.entity_id === survivor.entity_id);
      if (org && fields.legal_name) {
        org.legal_name = fields.legal_name;
        org.trade_name = fields.trade_name ?? org.trade_name;
        org.industry = fields.industry ?? org.industry;
        org.freshness = freshness(input.now, input.source_id);
      }
    }
    input.state.metrics.existing_entities_updated += 1;
    input.state.metrics.duplicates_resolved += 1;
    graph.events.push("prospect.entity.updated");
    graph.events.push("prospect.entity.merged");
    return { entity_id: survivor.entity_id, created: false, updated: true, duplicate: true, ambiguous: false };
  }

  if (kind === "ORGANIZATION") {
    const organization: OrganizationRecord = {
      organization_id: `org:${input.record.source_record_id}`,
      entity_id: entityId,
      legal_name: fields.legal_name ?? "Unknown organization",
      trade_name: fields.trade_name,
      industry: fields.industry,
      employee_range: null,
      freshness: freshness(input.now, input.source_id),
    };
    input.service.upsertOrganization(ACCESS, organization, entity);
  } else {
    const person: PersonRecord = {
      person_id: `person:${input.record.source_record_id}`,
      entity_id: entityId,
      display_name: fields.display_name ?? "Unknown person",
      given_name: fields.given_name,
      family_name: fields.family_name,
      freshness: freshness(input.now, input.source_id),
    };
    input.service.upsertPerson(ACCESS, { person, entity, now: input.now });
    const domain = fields.domain ?? fields.email?.split("@")[1] ?? null;
    if (domain) {
      const org = [...graph.organizations.values()].find((row) => {
        const identifiers = graph.entities.get(row.entity_id)?.identifiers ?? [];
        return identifiers.some((item) => item.scheme === "domain" && item.value === domain);
      });
      if (org) {
        input.service.relate(ACCESS, {
          relationship_id: `rel:${entityId}:${org.entity_id}`,
          from_entity_id: entityId,
          to_entity_id: org.entity_id,
          type: "WORKS_AT",
          evidence_ids: [observationId],
          freshness: freshness(input.now, input.source_id),
        });
      }
    }
  }

  if (fields.email && policyAllowsContactUse(input.policy)) {
    input.service.setEligibility(ACCESS, {
      eligibility_id: `elig:${entityId}:email`,
      entity_id: entityId,
      channel: "EMAIL",
      status: "email_allowed",
      reason: "approved_source_contact_policy",
      updated_at: input.now,
    });
  } else if (fields.email) {
    input.service.setEligibility(ACCESS, {
      eligibility_id: `elig:${entityId}:email`,
      entity_id: entityId,
      channel: "EMAIL",
      status: "legal_or_policy_restriction",
      reason: "source_contact_use_not_allowed",
      updated_at: input.now,
    });
  }

  input.state.metrics.new_entities_created += 1;
  return { entity_id: entityId, created: true, updated: false, duplicate: false, ambiguous: false };
}

export function detectChangedFields(
  previous: Record<string, unknown> | null,
  next: Record<string, unknown>,
): string[] {
  if (!previous) return Object.keys(next);
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  return [...keys].filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]));
}
