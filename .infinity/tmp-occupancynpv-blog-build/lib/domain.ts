export const QUALIFIED_ROLES = ["CRE broker","Tenant representative","Boutique brokerage"] as const;

export type PilotRole = (typeof QUALIFIED_ROLES)[number] | "Other";

export function qualifyProspect(input: {
  role: string;
  dealFrequency: string;
  leaseWorkflow: boolean;
}): { qualified: boolean; reason: string } {
  const roleOk = QUALIFIED_ROLES.some((item) => item.toLowerCase() === input.role.toLowerCase());
  const activityOk = /weekly|monthly|quarterly|active|current/i.test(input.dealFrequency);
  if (!roleOk) return { qualified: false, reason: "Role is outside the CRE broker / tenant-rep audience." };
  if (!input.leaseWorkflow) return { qualified: false, reason: "No commercial lease workflow." };
  if (!activityOk) return { qualified: false, reason: "No recent or current deal activity." };
  return { qualified: true, reason: "Qualified CRE prospect." };
}

export const mvpFeatures = ["Side-by-side lease cash-flow comparison", "NPV and discount-rate sensitivity", "Shareable deal summary for clients"] as const;
export const leaveOuts = ["Full brokerage CRM", "Enterprise lease administration", "Large property-management suite"] as const;
