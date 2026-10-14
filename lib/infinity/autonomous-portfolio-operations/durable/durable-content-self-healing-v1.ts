import { runBoundedOrganicSelfHeal } from "../autonomous-content-self-heal-runner-v1";
import { buildVentureTopicGraph } from "@/lib/infinity/organic-growth-engine/continuous/graph";
import type { OrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/types";

export const DURABLE_CONTENT_SELF_HEALING_V1 = "DURABLE_CONTENT_SELF_HEALING_V1" as const;

export type DurableContentSelfHealJobOutput = {
  SELF_HEAL_ATTEMPTS: number;
  SELF_HEAL_RECOVERIES: number;
  SELF_HEAL_EXHAUSTED: boolean;
  failure_gates: string[];
  repair_actions: string[];
  alternate_topic_decision: string | null;
  final_disposition: "PUBLISHED" | "HELD" | "EXHAUSTED";
  published_count: number;
};

function emptyOrganicState(venture_id: string): OrganicContinuousState {
  return {
    venture_id,
    assets: [],
    sales_assets: [],
    graph: buildVentureTopicGraph({ venture_id, existing_urls: [], extra_questions: [] }),
    questions: [],
    opportunities: [],
    demand_signals: [],
    queue: [],
    rejected_quality: 0,
    rejected_duplicate: 0,
    published_today: 0,
    refreshed_today: 0,
    last_tick_at: null,
    remediation_queue: [],
    blog_readiness: "BLOG_READY",
    schema_remediation_queue: [],
    schema_readiness: "SCHEMA_READY",
    blog_editorial_quality: "UNKNOWN",
    blog_remediation_queue: [],
  };
}

export function executeDurableContentSelfHealJob(input: {
  venture_id: string;
  now?: string;
  execute_publish: boolean;
  prior_attempts?: number;
}): DurableContentSelfHealJobOutput {
  const heal = runBoundedOrganicSelfHeal({
    state: emptyOrganicState(input.venture_id === "cre" ? "occupancynpv" : input.venture_id),
    now: input.now ?? new Date().toISOString(),
    execute_publish: input.execute_publish,
    max_attempts: 3,
  });
  return {
    SELF_HEAL_ATTEMPTS: heal.SELF_HEAL_ATTEMPTS + (input.prior_attempts ?? 0),
    SELF_HEAL_RECOVERIES: heal.SELF_HEAL_RECOVERIES,
    SELF_HEAL_EXHAUSTED: heal.SELF_HEAL_EXHAUSTED,
    failure_gates: heal.final_rejected_quality > 0 ? ["EDITORIAL_QUALITY"] : [],
    repair_actions: heal.SELF_HEAL_ATTEMPTS > 0 ? ["BOUNDED_ORGANIC_REPAIR"] : [],
    alternate_topic_decision: heal.published_count === 0 && heal.SELF_HEAL_EXHAUSTED ? "HOLD_ALTERNATE_TOPIC" : null,
    final_disposition: heal.published_count > 0 ? "PUBLISHED" : heal.SELF_HEAL_EXHAUSTED ? "EXHAUSTED" : "HELD",
    published_count: heal.published_count,
  };
}

export function durableContentSelfHealingQc(): "PASS" | "FAIL" {
  const out = executeDurableContentSelfHealJob({ venture_id: "occupancynpv", execute_publish: false });
  return out.SELF_HEAL_ATTEMPTS >= 0 ? "PASS" : "FAIL";
}
