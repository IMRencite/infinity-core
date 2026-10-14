export const VENTURE_GROWTH_LEARNING_LOOP_V1 = "VENTURE_GROWTH_LEARNING_LOOP_V1" as const;

export type VentureGrowthLearningSnapshot = {
  version: typeof VENTURE_GROWTH_LEARNING_LOOP_V1;
  recorded_at: string;
  venture_id: string;
  content_signals: string[];
  traffic_signals: string[];
  conversion_signals: string[];
  next_best_actions: string[];
};

export function recordVentureGrowthLearning(input: {
  venture_id: string;
  cycle_outcome: string;
  assets_published: number;
  assets_failed: number;
}): VentureGrowthLearningSnapshot {
  const next: string[] = [];
  if (input.assets_failed > 0) next.push("SELF_HEAL_CONTENT_PIPELINE");
  if (input.assets_published > 0) next.push("MEASURE_INDEXATION_AND_ENGAGEMENT");
  if (input.assets_published === 0 && input.cycle_outcome === "NO_QUALIFIED_OPPORTUNITY") {
    next.push("EXPAND_VOC_AND_TOPIC_RESEARCH");
  }
  return {
    version: VENTURE_GROWTH_LEARNING_LOOP_V1,
    recorded_at: new Date().toISOString(),
    venture_id: input.venture_id,
    content_signals: [`published:${input.assets_published}`, `failed:${input.assets_failed}`],
    traffic_signals: [],
    conversion_signals: [],
    next_best_actions: next.length ? next : ["CONTINUE_SCHEDULED_PORTFOLIO_CYCLE"],
  };
}

export function ventureGrowthLearningLoopQc(snapshot: VentureGrowthLearningSnapshot | null): "PASS" | "FAIL" {
  if (!snapshot || snapshot.version !== VENTURE_GROWTH_LEARNING_LOOP_V1) return "FAIL";
  return snapshot.next_best_actions.length > 0 ? "PASS" : "FAIL";
}
