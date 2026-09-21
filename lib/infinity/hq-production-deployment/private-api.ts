import { HQ_PRIVATE_API_GATE, HQ_PRIVATE_API_ROUTES, type HqNamedGate } from "./contract";
import { classifyHqPath } from "./surface";
import type { OperatorOrgContext, OperatorOrgContextResult } from "@/lib/infinity/operator-console/auth";

export type HqPrivateApiDenial = {
  ok: false;
  status: 401 | 403 | 503;
  body: { ok: false; reason: string };
};

export type HqPrivateApiAllow = {
  ok: true;
  context: OperatorOrgContext;
};

export function hqPrivateApiDecision(result: OperatorOrgContextResult): HqPrivateApiAllow | HqPrivateApiDenial {
  if (result.status === "error") {
    return { ok: false, status: 503, body: { ok: false, reason: "WORKSPACE_UNAVAILABLE" } };
  }
  if (result.status === "unauthenticated") {
    return { ok: false, status: 401, body: { ok: false, reason: "UNAUTHENTICATED" } };
  }
  if (result.status === "no_membership") {
    return { ok: false, status: 403, body: { ok: false, reason: "UNAUTHORIZED" } };
  }
  return { ok: true, context: result.context };
}

export function evaluateHQPrivateAPIGate(input: {
  routes: Array<{ path: string; unauthenticatedStatus: number; privatePayload: boolean }>;
}): HqNamedGate {
  const reasons: string[] = [];
  const expected = new Set(HQ_PRIVATE_API_ROUTES);
  for (const route of input.routes) {
    const classification = classifyHqPath(route.path);
    if (classification !== "HQ_PRIVATE" && !expected.has(route.path as (typeof HQ_PRIVATE_API_ROUTES)[number])) {
      continue;
    }
    if (route.unauthenticatedStatus !== 401 && route.unauthenticatedStatus !== 403) {
      reasons.push(`UNAUTH_NOT_BLOCKED:${route.path}:${route.unauthenticatedStatus}`);
    }
    if (route.privatePayload) reasons.push(`PRIVATE_PAYLOAD_LEAK:${route.path}`);
  }
  if (!input.routes.length) reasons.push("NO_PRIVATE_ROUTES_AUDITED");
  return {
    gate: HQ_PRIVATE_API_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : [`AUDITED_${input.routes.length}`],
  };
}
