export const AUTONOMOUS_EXISTING_VENTURE_DEPLOY_AUTHORITY_V1 =
  "AUTONOMOUS_EXISTING_VENTURE_DEPLOY_AUTHORITY_V1" as const;

export function autonomousExistingVentureDeployAuthorityQc(input?: {
  new_vendor?: boolean;
  new_domain_purchase?: boolean;
  incremental_capital?: boolean;
  venture_live?: boolean;
}): "PASS" | "FAIL" {
  if (input?.new_vendor) return "FAIL";
  if (input?.new_domain_purchase) return "FAIL";
  if (input?.incremental_capital) return "FAIL";
  if (input?.venture_live === false) return "FAIL";
  return "PASS";
}
