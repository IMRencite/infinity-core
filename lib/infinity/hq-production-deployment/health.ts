import type { HqHealthState } from "./contract";

export type HqProductionHealthSurface = {
  hq_app: HqHealthState;
  runtime: HqHealthState;
  database: HqHealthState;
  public_projection: HqHealthState;
  organic_growth: HqHealthState;
  prospect_intelligence: HqHealthState;
  sales: HqHealthState;
  outbound: HqHealthState;
  treasury: HqHealthState;
  daily_reports: HqHealthState;
};

export function assembleHqProductionHealth(input: Partial<HqProductionHealthSurface>): HqProductionHealthSurface {
  return {
    hq_app: input.hq_app ?? "UNKNOWN",
    runtime: input.runtime ?? "UNKNOWN",
    database: input.database ?? "UNKNOWN",
    public_projection: input.public_projection ?? "UNKNOWN",
    organic_growth: input.organic_growth ?? "UNKNOWN",
    prospect_intelligence: input.prospect_intelligence ?? "UNKNOWN",
    sales: input.sales ?? "UNKNOWN",
    outbound: input.outbound ?? "UNKNOWN",
    treasury: input.treasury ?? "UNKNOWN",
    daily_reports: input.daily_reports ?? "UNKNOWN",
  };
}

export function healthFromBoolean(ok: boolean | null | undefined, degraded = false): HqHealthState {
  if (ok == null) return "UNKNOWN";
  if (!ok) return "UNAVAILABLE";
  return degraded ? "DEGRADED" : "HEALTHY";
}
