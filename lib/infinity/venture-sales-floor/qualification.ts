export function qualifySalesProspect(input: {
  icp_match: boolean;
  role_fit?: boolean;
  company_type_fit?: boolean;
  use_case_fit?: boolean;
  commercial_viability?: boolean;
  suppressed?: boolean;
  previously_disqualified?: boolean;
}): { qualified: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.suppressed) reasons.push("SUPPRESSED");
  if (input.previously_disqualified) reasons.push("PREVIOUSLY_DISQUALIFIED");
  if (!input.icp_match) reasons.push("ICP_MISMATCH");
  if (input.role_fit === false) reasons.push("ROLE_MISMATCH");
  if (input.company_type_fit === false) reasons.push("COMPANY_TYPE_MISMATCH");
  if (input.use_case_fit === false) reasons.push("USE_CASE_MISMATCH");
  if (input.commercial_viability === false) reasons.push("NOT_COMMERCIALLY_VIABLE");
  return { qualified: reasons.length === 0, reasons };
}
