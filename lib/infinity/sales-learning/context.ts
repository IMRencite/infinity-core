import { createProspectIntelligenceService } from "@/lib/infinity/prospect-intelligence/service";
import type { ProspectGraph } from "@/lib/infinity/prospect-intelligence/store";
import type { ProspectSalesContext } from "./types";

const ACCESS = { consumer: "sales_outbound_runtime" as const };

export function loadProspectSalesContext(input: {
  graph: ProspectGraph;
  entity_id: string;
  person_id?: string;
}): ProspectSalesContext {
  const service = createProspectIntelligenceService(input.graph);
  const eligibility = service.getCommunicationEligibility(ACCESS, input.entity_id);
  const matches = service.getVentureMatches(ACCESS, input.entity_id);
  const person = input.person_id ? service.getPerson(ACCESS, input.person_id) : null;
  const org = [...input.graph.organizations.values()][0] ?? null;
  const previous = input.graph.outreach.filter((row) => row.entity_id === input.entity_id).map((row) => row.status);
  return {
    identity: person?.identity.display_name ?? null,
    organization: org?.legal_name ?? null,
    role: person?.roles[0] ?? null,
    business_context: org?.industry ?? null,
    known_signals: person?.business_signals ?? [],
    venture_matches: matches.map((row) => `${row.venture_id}:${row.fit_band}`),
    previous_interactions: previous,
    known_objections: [],
    communication_eligibility: eligibility.map((row) => `${row.channel}:${row.status}`),
    suppressed: eligibility.some((row) => ["suppressed", "opted_out", "do_not_contact", "complaint"].includes(row.status)),
  };
}
