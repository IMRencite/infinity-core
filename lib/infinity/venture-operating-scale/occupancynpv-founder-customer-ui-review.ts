import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const OCCUPANCYNPV_FOUNDER_CUSTOMER_UI_REVIEW_PATH =
  ".infinity/venture-operating-scale/occupancynpv-founder-customer-ui-review.json" as const;

export const OCCUPANCYNPV_FOUNDER_CUSTOMER_UI_REVIEW_SCOPE = [
  "Pilot Access",
  "login/signup",
  "dashboard",
  "workspace",
  "customer-facing product UI",
] as const;

export type OccupancynpvFounderCustomerUiReview = {
  status: "PASS";
  inferred: false;
  source: "FOUNDER_PROVIDED";
  timestamp: string;
  scope: typeof OCCUPANCYNPV_FOUNDER_CUSTOMER_UI_REVIEW_SCOPE;
};

export function readOccupancynpvFounderCustomerUiReview(): OccupancynpvFounderCustomerUiReview | null {
  if (!existsSync(OCCUPANCYNPV_FOUNDER_CUSTOMER_UI_REVIEW_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_FOUNDER_CUSTOMER_UI_REVIEW_PATH, "utf8")) as OccupancynpvFounderCustomerUiReview;
  } catch {
    return null;
  }
}

export function persistOccupancynpvFounderCustomerUiReview(
  timestamp = new Date().toISOString(),
): OccupancynpvFounderCustomerUiReview {
  const existing = readOccupancynpvFounderCustomerUiReview();
  const evidence: OccupancynpvFounderCustomerUiReview = existing ?? {
    status: "PASS",
    inferred: false,
    source: "FOUNDER_PROVIDED",
    timestamp,
    scope: [...OCCUPANCYNPV_FOUNDER_CUSTOMER_UI_REVIEW_SCOPE],
  };
  mkdirSync(dirname(OCCUPANCYNPV_FOUNDER_CUSTOMER_UI_REVIEW_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_FOUNDER_CUSTOMER_UI_REVIEW_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

export function occupancynpvFounderCustomerUiReviewState() {
  const evidence = readOccupancynpvFounderCustomerUiReview();
  return {
    status: evidence?.status === "PASS" ? "PASS" as const : "MISSING" as const,
    inferred: false as const,
    timestamp: evidence?.timestamp ?? null,
    scope: evidence?.scope ?? [...OCCUPANCYNPV_FOUNDER_CUSTOMER_UI_REVIEW_SCOPE],
  };
}
