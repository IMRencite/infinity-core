export const PILOT_FORM_FIELDS = [
  "name",
  "workEmail",
  "role",
  "company",
  "teamSize",
  "dealFrequency",
  "preferredPricing",
  "pilotInterest",
] as const;

export const SENSITIVE_FIELDS_FORBIDDEN = [
  "ssn",
  "bank",
  "routing",
  "card_number",
  "lease_document",
  "password",
] as const;

export type PilotFormInput = {
  name: string;
  workEmail: string;
  role: string;
  company: string;
  teamSize: string;
  dealFrequency: string;
  preferredPricing: string;
  leaseWorkflow: boolean;
  pilotInterest: boolean;
};

export function validatePilotForm(input: PilotFormInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.workEmail)) errors.push("workEmail");
  if (!input.role.trim()) errors.push("role");
  if (!input.company.trim()) errors.push("company");
  if (!input.teamSize.trim()) errors.push("teamSize");
  if (!input.dealFrequency.trim()) errors.push("dealFrequency");
  if (!input.preferredPricing.trim()) errors.push("preferredPricing");
  if (!input.pilotInterest) errors.push("pilotInterest");
  return { ok: errors.length === 0, errors };
}

export function submissionDedupeKey(email: string): string {
  return email.trim().toLowerCase();
}

export function qualifyProspect(input: Pick<PilotFormInput, "role" | "dealFrequency" | "leaseWorkflow">): {
  qualified: boolean;
  reason: string;
} {
  const roleOk = /broker|tenant\s*rep|boutique/i.test(input.role);
  const activityOk = /weekly|monthly|quarterly|active|current/i.test(input.dealFrequency);
  if (!roleOk) return { qualified: false, reason: "Role is outside the target CRE audience." };
  if (!input.leaseWorkflow) return { qualified: false, reason: "No commercial lease workflow." };
  if (!activityOk) return { qualified: false, reason: "No recent or current deal activity." };
  return { qualified: true, reason: "Qualified CRE prospect." };
}

export function containsSensitiveField(payload: Record<string, unknown>): boolean {
  const keys = Object.keys(payload).join(" ").toLowerCase();
  return SENSITIVE_FIELDS_FORBIDDEN.some((field) => keys.includes(field));
}
