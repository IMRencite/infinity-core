import type { OrganizationRecord, PersonRecord, ProspectVentureMatch, VentureMatchRule } from "./types";

export function classifyForVenture(input: {
  entity_id: string;
  person?: PersonRecord | null;
  organization?: OrganizationRecord | null;
  role?: string | null;
  geography?: string | null;
  rule: VentureMatchRule;
  now: string;
  evidence_ids: string[];
}): ProspectVentureMatch {
  const reasons: string[] = [];
  const disqualifiers: string[] = [];
  const industry = input.organization?.industry ?? "";
  const role = input.role ?? "";
  const geography = input.geography ?? "";
  if (input.rule.icp.industries.length && input.rule.icp.industries.some((row) => industry.toLowerCase().includes(row.toLowerCase()))) {
    reasons.push("INDUSTRY_FIT");
  }
  if (input.rule.icp.roles.length && input.rule.icp.roles.some((row) => role.toLowerCase().includes(row.toLowerCase()))) {
    reasons.push("ROLE_FIT");
  }
  if (input.rule.icp.geographies.length && input.rule.icp.geographies.some((row) => geography.toLowerCase().includes(row.toLowerCase()))) {
    reasons.push("GEOGRAPHY_FIT");
  }
  for (const disqualifier of input.rule.icp.disqualifiers) {
    const hay = `${industry} ${role} ${input.organization?.legal_name ?? ""}`.toLowerCase();
    if (hay.includes(disqualifier.toLowerCase())) disqualifiers.push(disqualifier);
  }
  const score = Math.max(0, reasons.length * 0.34 - disqualifiers.length * 0.5);
  const fit_band = disqualifiers.length ? "NONE" : score >= 0.9 ? "HIGH" : score >= 0.6 ? "MEDIUM" : score > 0 ? "LOW" : "NONE";
  return {
    match_id: `match:${input.entity_id}:${input.rule.venture_id}`,
    prospect_entity_id: input.entity_id,
    venture_id: input.rule.venture_id,
    fit_score: Number(score.toFixed(2)),
    fit_band,
    fit_reasons: reasons,
    disqualifiers,
    evidence_ids: input.evidence_ids,
    confidence: reasons.length ? 0.8 : 0.3,
    evaluated_at: input.now,
    next_evaluation_at: null,
  };
}

export function evaluateNewVentureAgainstGraph(input: {
  rule: VentureMatchRule;
  people: PersonRecord[];
  organizations: OrganizationRecord[];
  now: string;
}): ProspectVentureMatch[] {
  return input.people.map((person) =>
    classifyForVenture({
      entity_id: person.entity_id,
      person,
      organization: input.organizations[0] ?? null,
      role: null,
      geography: null,
      rule: input.rule,
      now: input.now,
      evidence_ids: [],
    }),
  );
}
