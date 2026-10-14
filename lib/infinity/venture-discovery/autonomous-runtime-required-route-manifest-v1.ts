export const AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_V1 =
  "AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_V1" as const;

/** Mandatory infinity-runtime HTTP routes for autonomous venture operations. */
export const REQUIRED_AUTONOMOUS_RUNTIME_ROUTES = [
  "/api/runtime/opportunity-discovery-tick",
  "/api/runtime/venture-operating-cycle",
  "/api/runtime/tick",
  "/api/runtime/organic-tick",
] as const;

export type RouteManifestCheck = {
  gate_id: typeof AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_V1;
  required: readonly string[];
  present: string[];
  missing: string[];
  AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_QC: "PASS" | "FAIL";
};

export function verifyAutonomousRuntimeRouteManifest(presentRoutes: string[]): RouteManifestCheck {
  const present = [...new Set(presentRoutes)];
  const missing = REQUIRED_AUTONOMOUS_RUNTIME_ROUTES.filter((path) => !present.includes(path));
  return {
    gate_id: AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_V1,
    required: REQUIRED_AUTONOMOUS_RUNTIME_ROUTES,
    present,
    missing,
    AUTONOMOUS_RUNTIME_REQUIRED_ROUTE_MANIFEST_QC: missing.length === 0 ? "PASS" : "FAIL",
  };
}
