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
  "lease_document",
  "password",
  "card_number",
] as const;

export type PilotFormInput = {
  name: string;
  workEmail: string;
  role: string;
  company: string;
  teamSize: string;
  dealFrequency: string;
  preferredPricing: string;
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

export function asBoolean(value: unknown): boolean {
  return value === true || value === "on" || value === "true";
}
