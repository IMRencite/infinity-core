import { CUSTOMER_FACING_NAVIGATION_QC_GATE, type NamedGate, type NavigationObservation } from "./contract";

export function evaluateCustomerFacingNavigationQCGate(routes: readonly NavigationObservation[]): NamedGate {
  const reasons: string[] = [];
  for (const route of routes) {
    if (!route.reached) reasons.push(`ROUTE_NOT_REACHED:${route.route}`);
    if (route.failed_fetch) reasons.push(`FAILED_FETCH_DURING_NAV:${route.route}`);
  }
  return {
    gate: CUSTOMER_FACING_NAVIGATION_QC_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
