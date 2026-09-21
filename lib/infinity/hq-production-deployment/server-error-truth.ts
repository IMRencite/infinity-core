import { HQ_PRODUCTION_SERVER_ERROR_TRUTH_GATE, type HqNamedGate } from "./contract";

/** Prior ENOENT family — fixed, no longer the current live crash. */
export const HQ_DASHBOARD_PREVIOUS_PRODUCTION_SERVER_ERROR = {
  browser_reference: "1400196868",
  correlated_server_digest: "4062965126",
  exception: "ENOENT",
  syscall: "mkdir",
  path: ".infinity/opportunity-universe",
  route: "/dashboard",
  component: "lib/infinity/opportunity-universe-hq/persist.ts",
  loader: "loadCanonicalOpportunityUniverse → loadHqCanonicalOperatingProjection → InfinityHqExperienceEnriched",
  classification: "PRODUCTION_SERVER_RENDER_FAIL",
  deterministic: true,
} as const;

/**
 * Current live crash after dpl_HizvEusPYZETPmp1yTpcjVHaSfgF.
 * Vercel production logs: Error: FROZEN_BUNDLE_SNAPSHOT_MISSING, digest 1885360420,
 * GET https://hq.imros.io/dashboard (also digest 983870045, same exception).
 */
export const HQ_DASHBOARD_PRODUCTION_SERVER_ERROR = {
  browser_reference: "1885360420",
  correlated_server_digest: "1885360420",
  related_digest: "983870045",
  exception: "FROZEN_BUNDLE_SNAPSHOT_MISSING",
  syscall: null,
  path: ".infinity frozen semantic-nav snapshot (not in HQ Vercel artifact)",
  route: "/dashboard",
  component: "lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor.ts",
  loader:
    "enrichOperatorSnapshot/attachGlobalHqFloorRooms → projectOperationsRoom → projectVentureSystemQcHqSummary → composeOccupancynpvPaymentReactivationFiles → reconstructOccupancynpvLegalSurfaceSuccessor",
  stage: "occupancynpv_compose",
  classification: "PRODUCTION_SERVER_RENDER_FAIL",
  deterministic: true,
  evidence_source: "vercel_runtime_logs",
  deployment_id: "dpl_HizvEusPYZETPmp1yTpcjVHaSfgF",
} as const;

export function evaluateHQProductionServerErrorTruthGate(input: {
  evidenceSource: "vercel_runtime_logs" | "none";
  exception: string | null;
  path?: string | null;
  route: string | null;
  browserReference?: string | null;
  correlatedDigest?: string | null;
  component?: string | null;
}): HqNamedGate {
  const reasons: string[] = [];
  if (input.evidenceSource !== "vercel_runtime_logs") reasons.push("NO_SERVER_EVIDENCE");
  if (input.exception !== HQ_DASHBOARD_PRODUCTION_SERVER_ERROR.exception) reasons.push("EXCEPTION_UNIDENTIFIED");
  if (input.route !== HQ_DASHBOARD_PRODUCTION_SERVER_ERROR.route) reasons.push("ROUTE_UNIDENTIFIED");
  if (
    input.browserReference
    && input.browserReference !== HQ_DASHBOARD_PRODUCTION_SERVER_ERROR.browser_reference
  ) {
    reasons.push("BROWSER_REFERENCE_MISMATCH");
  }
  if (
    input.correlatedDigest
    && input.correlatedDigest !== HQ_DASHBOARD_PRODUCTION_SERVER_ERROR.correlated_server_digest
    && input.correlatedDigest !== HQ_DASHBOARD_PRODUCTION_SERVER_ERROR.related_digest
  ) {
    reasons.push("DIGEST_MISMATCH");
  }
  return {
    gate: HQ_PRODUCTION_SERVER_ERROR_TRUTH_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["ROOT_CAUSE_IDENTIFIED_FROM_VERCEL_LOGS"],
  };
}
