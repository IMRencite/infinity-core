import type { SalesProspectCandidate } from "@/lib/infinity/autonomous-sales-execution/types";
import type { ProspectIntelligenceService } from "./service";
import type { ProspectAccessRequest } from "./types";

const SALES: ProspectAccessRequest = { consumer: "sales_outbound_runtime" };

export function nextEligibleSalesCandidates(input: {
  service: ProspectIntelligenceService;
  venture_id: string;
  campaign_id: string;
  capacity: number;
  now: string;
}): SalesProspectCandidate[] {
  const matches = input.service.findMatchesForVenture(SALES, input.venture_id);
  const out: SalesProspectCandidate[] = [];
  for (const match of matches) {
    if (out.length >= input.capacity) break;
    const eligibility = input.service.getCommunicationEligibility(SALES, match.prospect_entity_id);
    const blocked = eligibility.some((row) =>
      ["suppressed", "opted_out", "do_not_contact", "bounced", "complaint", "legal_or_policy_restriction", "manual_block"].includes(row.status),
    );
    if (blocked || !eligibility.some((row) => row.status === "email_allowed")) continue;
    const already = input.service.graph.outreach.some((row) => row.entity_id === match.prospect_entity_id && row.venture_id === input.venture_id && row.status === "SENT");
    if (already) continue;
    const person = [...input.service.graph.people.values()].find((row) => row.entity_id === match.prospect_entity_id);
    const org = [...input.service.graph.organizations.values()][0];
    const email = eligibility.find((row) => row.channel === "EMAIL" && row.status === "email_allowed");
    out.push({
      prospect_id: match.prospect_entity_id,
      venture_id: input.venture_id,
      campaign_id: input.campaign_id,
      business_name: org?.legal_name ?? "Unknown organization",
      person_name: person?.display_name ?? null,
      role: null,
      industry: org?.industry ?? null,
      geography: null,
      public_context: match.fit_reasons.join(", "),
      source_url: "canonical://prospect-intelligence",
      source_provider: "prospect_intelligence",
      published_email: email ? `${match.prospect_entity_id}@example.invalid` : null,
      timezone: null,
      timezone_basis: null,
    });
  }
  return out;
}

export function consumeEligibleProspect(input: {
  service: ProspectIntelligenceService;
  entity_id: string;
  venture_id: string;
  now: string;
  outbound_capacity: boolean;
}): { consumed: boolean; reason: string; outreach_id?: string } {
  if (!input.outbound_capacity) return { consumed: false, reason: "NO_OUTBOUND_CAPACITY" };
  const eligibility = input.service.getCommunicationEligibility(SALES, input.entity_id);
  if (eligibility.some((row) => ["suppressed", "opted_out", "do_not_contact", "bounced", "complaint"].includes(row.status))) {
    return { consumed: false, reason: "SUPPRESSED" };
  }
  if (!eligibility.some((row) => row.status === "email_allowed")) return { consumed: false, reason: "NOT_ELIGIBLE" };
  const key = `sales:${input.venture_id}:${input.entity_id}:1`;
  const outreach = input.service.recordOutreach(SALES, {
    outreach_id: key,
    entity_id: input.entity_id,
    venture_id: input.venture_id,
    channel: "EMAIL",
    idempotency_key: key,
    scheduled_follow_up_at: new Date(Date.parse(input.now) + 3 * 86400000).toISOString(),
    sent_at: input.now,
    status: "SENT",
  });
  if (outreach.status === "DUPLICATE_BLOCKED") return { consumed: false, reason: "DUPLICATE_CONTACT_PREVENTED" };
  input.service.recordOutcome(SALES, {
    outcome_id: `outcome:${key}`,
    entity_id: input.entity_id,
    venture_id: input.venture_id,
    kind: "sent",
    at: input.now,
    evidence: "always-on sales runtime",
  });
  return { consumed: true, reason: "SENT", outreach_id: outreach.outreach_id };
}

export function attachLiveOutboundContact(input: {
  service: ProspectIntelligenceService;
  candidate: SalesProspectCandidate;
}): SalesProspectCandidate {
  const entity = input.service.graph.entities.get(input.candidate.prospect_id);
  const email = entity?.identifiers.find((row) =>
    row.scheme === "email"
    && row.value.includes("@")
    && !row.value.endsWith(".invalid")
    && !row.value.includes("example.invalid"),
  );
  return {
    ...input.candidate,
    published_email: email?.value ?? null,
  };
}

export function replenishIfExhausted(input: {
  service: ProspectIntelligenceService;
  venture_id: string;
}): { replenish: boolean; coverage_days: number } {
  const inventory = input.service.publishReadyInventory(SALES, input.venture_id);
  return {
    replenish: inventory.current_ready_inventory < inventory.minimum_ready_inventory,
    coverage_days: inventory.coverage_days,
  };
}
