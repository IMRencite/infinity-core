import type { VentureOrigin } from "./constants";

export type OriginPerformanceRecord = {
  origin: VentureOrigin;
  ventureId?: string | null;
  buildSuccess: boolean | null;
  launchSuccess: boolean | null;
  revenue: "NOT YET MEASURED";
  profit: "NOT YET MEASURED";
  roi: "NOT YET MEASURED";
  timeToRevenue: "NOT YET MEASURED";
};

export type OriginPerformanceSegment = {
  origin: VentureOrigin;
  count: number;
  records: OriginPerformanceRecord[];
};

/**
 * Founder-origin ventures remain distinguishable for future calibration.
 * Do not train naively from outcomes (a founder override that later earns
 * revenue is not proof that founder ideas should be favored).
 */
export function segmentPerformanceByOrigin(records: OriginPerformanceRecord[]): OriginPerformanceSegment[] {
  return (["AUTONOMOUS_DISCOVERY", "FOUNDER_SUBMITTED", "FOUNDER_OVERRIDE"] as const).map((origin) => ({
    origin,
    count: records.filter((row) => row.origin === origin).length,
    records: records.filter((row) => row.origin === origin),
  }));
}

export function performanceRecordForOrigin(
  origin: VentureOrigin,
  ventureId?: string | null,
): OriginPerformanceRecord {
  return {
    origin,
    ventureId: ventureId ?? null,
    buildSuccess: null,
    launchSuccess: null,
    revenue: "NOT YET MEASURED",
    profit: "NOT YET MEASURED",
    roi: "NOT YET MEASURED",
    timeToRevenue: "NOT YET MEASURED",
  };
}
