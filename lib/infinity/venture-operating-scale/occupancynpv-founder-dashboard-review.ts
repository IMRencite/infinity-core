import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const OCCUPANCYNPV_FOUNDER_DASHBOARD_REVIEW_PATH =
  ".infinity/venture-operating-scale/occupancynpv-founder-dashboard-review.json" as const;

export const OCCUPANCYNPV_FOUNDER_DASHBOARD_REVIEW_SCOPE = [
  "OccupancyNPV authenticated dashboard",
  "new app-specific navigation",
  "workspace presentation",
  "dashboard information architecture",
] as const;

export type OccupancynpvFounderDashboardReview = {
  status: "PASS";
  inferred: false;
  source: "FOUNDER_PROVIDED";
  timestamp: string;
  scope: typeof OCCUPANCYNPV_FOUNDER_DASHBOARD_REVIEW_SCOPE;
};

export function persistOccupancynpvFounderDashboardReview(
  timestamp = new Date().toISOString(),
): OccupancynpvFounderDashboardReview {
  const evidence: OccupancynpvFounderDashboardReview = {
    status: "PASS",
    inferred: false,
    source: "FOUNDER_PROVIDED",
    timestamp,
    scope: [...OCCUPANCYNPV_FOUNDER_DASHBOARD_REVIEW_SCOPE],
  };
  mkdirSync(dirname(OCCUPANCYNPV_FOUNDER_DASHBOARD_REVIEW_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_FOUNDER_DASHBOARD_REVIEW_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

export function readOccupancynpvFounderDashboardReview(): OccupancynpvFounderDashboardReview | null {
  if (!existsSync(OCCUPANCYNPV_FOUNDER_DASHBOARD_REVIEW_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_FOUNDER_DASHBOARD_REVIEW_PATH, "utf8")) as OccupancynpvFounderDashboardReview;
  } catch {
    return null;
  }
}

export function occupancynpvFounderDashboardReviewState() {
  const evidence = readOccupancynpvFounderDashboardReview();
  return {
    status: evidence?.status === "PASS" ? "PASS" as const : "MISSING" as const,
    inferred: false as const,
    timestamp: evidence?.timestamp ?? null,
    scope: evidence?.scope ?? [...OCCUPANCYNPV_FOUNDER_DASHBOARD_REVIEW_SCOPE],
  };
}
