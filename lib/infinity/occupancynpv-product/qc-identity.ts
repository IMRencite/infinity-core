export const OCCUPANCYNPV_QC_ALPHA_EMAIL = "occupancynpv-qc-alpha@example.com" as const;
export const OCCUPANCYNPV_QC_BETA_EMAIL = "occupancynpv-qc-beta@example.com" as const;

export const OCCUPANCYNPV_QC_IDENTITIES = [
  { email: OCCUPANCYNPV_QC_ALPHA_EMAIL, label: "alpha", synthetic: true },
  { email: OCCUPANCYNPV_QC_BETA_EMAIL, label: "beta", synthetic: true },
] as const;

export function isOccupancynpvGovernedQcEmail(email: string): boolean {
  const cleaned = email.trim().toLowerCase();
  return OCCUPANCYNPV_QC_IDENTITIES.some((row) => row.email === cleaned);
}
