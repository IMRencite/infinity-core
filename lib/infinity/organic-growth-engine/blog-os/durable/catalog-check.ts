import type { CheckResult } from "./types";
import type { DurableBlogObligation } from "./types";

export function evaluateIndependentCatalogCheck(input: {
  scheduled: boolean;
  last_scheduled_run: string | null;
  live_verified: Array<{ url: string; live_ok: boolean; identity_present: boolean; catalog_present: boolean }>;
  oldest_unmet: DurableBlogObligation | null;
}): CheckResult {
  if (!input.scheduled) {
    return {
      check: "IndependentCatalogCheck",
      result: "FAIL",
      reasons: ["MANUAL_RUN_ONLY", input.oldest_unmet ? `UNMET_${input.oldest_unmet.operating_date}` : "NO_UNMET"],
    };
  }
  const failed = input.live_verified.filter((row) => !row.live_ok || !row.identity_present || !row.catalog_present);
  return {
    check: "IndependentCatalogCheck",
    result: failed.length ? "FAIL" : "PASS",
    reasons: failed.length ? failed.map((row) => row.url) : ["PUBLIC_MATCH", input.last_scheduled_run ?? "NO_RUN"],
  };
}

export function oldestUnmetRequired(rows: DurableBlogObligation[]): DurableBlogObligation | null {
  return rows
    .filter((row) => row.pipeline_state !== "LIVE_VERIFIED" && row.pipeline_state !== "MISSED_RECORDED")
    .sort((a, b) => a.operating_date.localeCompare(b.operating_date))[0] ?? null;
}
