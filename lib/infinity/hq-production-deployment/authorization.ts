import { HQ_AUTHORIZATION_GATE, type HqAuthRole, type HqNamedGate } from "./contract";

export function resolveHqAuthorizationRole(input: {
  authenticated: boolean;
  organizationMembership: boolean;
  inferredFromEmailText?: boolean;
}): HqAuthRole {
  if (!input.authenticated || !input.organizationMembership) return "UNAUTHORIZED";
  return "AUTHORIZED_OPERATOR";
}

export function evaluateHQAuthorizationGate(input: {
  authenticated: boolean;
  organizationMembership: boolean;
  inferredFromEmailText?: boolean;
  role?: HqAuthRole;
}): HqNamedGate {
  const reasons: string[] = [];
  if (input.inferredFromEmailText) reasons.push("AUTHORIZATION_INFERRED_FROM_EMAIL_TEXT");
  const role = input.role ?? resolveHqAuthorizationRole(input);
  if (input.authenticated && input.organizationMembership && role === "UNAUTHORIZED") {
    reasons.push("AUTHORIZED_OPERATOR_MISCLASSIFIED");
  }
  if ((!input.authenticated || !input.organizationMembership) && role !== "UNAUTHORIZED") {
    reasons.push("UNAUTHORIZED_GRANTED_ACCESS");
  }
  return {
    gate: HQ_AUTHORIZATION_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : [role],
  };
}
