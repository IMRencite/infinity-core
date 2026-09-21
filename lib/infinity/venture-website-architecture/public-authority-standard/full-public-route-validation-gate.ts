import type { Gate } from "../types";
import { FULL_PUBLIC_ROUTE_VALIDATION_GATE } from "../constants";
import { canAdmitPage, type PageAdmissionRecord } from "./page-build-state";

export type FullPublicRouteValidationGateResult = {
  gate: typeof FULL_PUBLIC_ROUTE_VALIDATION_GATE;
  overall: Gate;
  expected: number;
  rendered: number;
  validated: number;
  admitted: number;
  missingEvidence: number;
  failed: number;
  routesWithoutEvidence: string[];
};

export function evaluateFullPublicRouteValidationGate(input: {
  expectedRoutes: string[];
  records: PageAdmissionRecord[];
}): FullPublicRouteValidationGateResult {
  const byRoute = new Map(input.records.map((record) => [record.route, record]));
  const routesWithoutEvidence: string[] = [];
  let rendered = 0;
  let validated = 0;
  let admitted = 0;
  let missingEvidence = 0;
  let failed = 0;
  for (const route of input.expectedRoutes) {
    const record = byRoute.get(route);
    if (!record || !record.renderEvidence || record.viewportEvidence.length === 0 || !record.gateResults || Object.keys(record.gateResults).length === 0) {
      routesWithoutEvidence.push(route);
      failed += 1;
      continue;
    }
    rendered += record.renderEvidence ? 1 : 0;
    validated += record.state === "VALIDATED" || record.state === "READY_FOR_ARTIFACT" || record.finalState === "READY_FOR_ARTIFACT" ? 1 : 0;
    missingEvidence += record.missingEvidence;
    if (canAdmitPage(record.finalState)) admitted += 1;
    else failed += 1;
  }
  return {
    gate: FULL_PUBLIC_ROUTE_VALIDATION_GATE,
    overall: routesWithoutEvidence.length === 0 && failed === 0 && admitted === input.expectedRoutes.length ? "PASS" : "FAIL",
    expected: input.expectedRoutes.length,
    rendered,
    validated,
    admitted,
    missingEvidence,
    failed,
    routesWithoutEvidence,
  };
}
