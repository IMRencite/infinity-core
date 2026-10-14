export const V44_RUNTIME_PUBLISH_COMPLETION_ROOT_CAUSE =
  "SYNC_TICK_BOUNDARY: manual production probes use MANUAL trigger so scheduled publish policy does not execute; scheduled ticks attempted full OccupancyNPV bundle deploy inside one HTTP handler while bundle+poll routinely exceeds ~17s probe window — not maxDuration termination, but work still coupled to request lifetime without durable continuation." as const;

export type PortfolioTickStageTimings = {
  inventory_ms: number;
  plans_ms: number;
  research_ms: number;
  content_ms: number;
  self_heal_ms: number;
  creative_ms: number;
  bundle_generation_ms: number;
  deployment_ms: number;
  alias_promotion_ms: number;
  production_verification_ms: number;
  persistence_ms: number;
  total_ms: number;
};

export function createPortfolioTickTimer(): {
  mark: (stage: keyof Omit<PortfolioTickStageTimings, "total_ms">) => void;
  finish: () => PortfolioTickStageTimings;
} {
  const start = Date.now();
  let last = start;
  const timings: PortfolioTickStageTimings = {
    inventory_ms: 0,
    plans_ms: 0,
    research_ms: 0,
    content_ms: 0,
    self_heal_ms: 0,
    creative_ms: 0,
    bundle_generation_ms: 0,
    deployment_ms: 0,
    alias_promotion_ms: 0,
    production_verification_ms: 0,
    persistence_ms: 0,
    total_ms: 0,
  };
  return {
    mark(stage) {
      const now = Date.now();
      timings[stage] += now - last;
      last = now;
    },
    finish() {
      timings.total_ms = Date.now() - start;
      return { ...timings };
    },
  };
}
