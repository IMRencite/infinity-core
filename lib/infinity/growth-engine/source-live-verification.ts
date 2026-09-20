import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const OCCUPANCYNPV_PROSPECT_SOURCE_LIVE_VERIFICATION_PATH =
  ".infinity/growth-engine/prospect-source-live-verification.json" as const;

export type ProspectSourceLiveVerification = {
  source_id: string;
  provider: string;
  capability: "web.search";
  query: string;
  observed_at: string;
  http_status: number;
  result_count: number;
  has_result_markup: boolean;
  fabricated: false;
  live_verification_state: "LIVE_VERIFIED" | "FAIL" | "UNVERIFIED";
};

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_GROWTH_EXPERIMENT_PERSIST !== "1") return false;
  return true;
}

export function readProspectSourceLiveVerification(): ProspectSourceLiveVerification | null {
  if (process.env.VITEST && process.env.INFINITY_GROWTH_EXPERIMENT_PERSIST !== "1") return null;
  if (!existsSync(OCCUPANCYNPV_PROSPECT_SOURCE_LIVE_VERIFICATION_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_PROSPECT_SOURCE_LIVE_VERIFICATION_PATH, "utf8")) as ProspectSourceLiveVerification;
  } catch {
    return null;
  }
}

export function persistProspectSourceLiveVerification(
  record: ProspectSourceLiveVerification,
): ProspectSourceLiveVerification {
  if (persistEnabled()) {
    mkdirSync(dirname(OCCUPANCYNPV_PROSPECT_SOURCE_LIVE_VERIFICATION_PATH), { recursive: true });
    writeFileSync(OCCUPANCYNPV_PROSPECT_SOURCE_LIVE_VERIFICATION_PATH, `${JSON.stringify(record, null, 2)}\n`);
  }
  return record;
}
