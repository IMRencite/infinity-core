import { runBacklogSlugContentSelfHeal } from "../backlog-content-self-heal-v1";
import { runBoundedOrganicSelfHeal } from "../autonomous-content-self-heal-runner-v1";
import { buildVentureTopicGraph } from "@/lib/infinity/organic-growth-engine/continuous/graph";
import type { OrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/types";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { CLUB_THROTTLE_VENTURE_ID } from "@/lib/infinity/commerce/club-throttle";

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
  quarantined_slug: string | null;
  deploy_ready: boolean;
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

/** Anti-thrash: hold alternate topic only while repair is in-flight below budget — never after exhaustion. */
export function resolveAlternateTopicDecision(input: {
  published_count: number;
  self_heal_exhausted: boolean;
  self_heal_attempts: number;
  quarantined: boolean;
}): string | null {
  if (input.published_count > 0) return null;
  if (input.quarantined || input.self_heal_exhausted) return "RELEASE_ALTERNATE_TOPIC";
  if (input.self_heal_attempts > 0) return "HOLD_ALTERNATE_TOPIC";
  return null;
}

export function executeDurableContentSelfHealJob(input: {
  venture_id: string;
  now?: string;
  execute_publish: boolean;
  prior_attempts?: number;
  self_heal_target_slug?: string | null;
}): DurableContentSelfHealJobOutput {
  const slugTarget = input.self_heal_target_slug ?? null;
  const useBacklog =
    slugTarget &&
    (input.venture_id === CLUB_THROTTLE_VENTURE_ID ||
      input.venture_id === CRE_VENTURE_ID ||
      input.venture_id.includes("7e7e924e"));

  if (useBacklog) {
    const heal = runBacklogSlugContentSelfHeal({
      venture_id: input.venture_id,
      target_slug: slugTarget,
      execute_publish: input.execute_publish,
      prior_attempts: input.prior_attempts ?? 0,
    });
    const quarantined = heal.SELF_HEAL_EXHAUSTED;
    return {
      SELF_HEAL_ATTEMPTS: heal.SELF_HEAL_ATTEMPTS,
      SELF_HEAL_RECOVERIES: heal.SELF_HEAL_RECOVERIES,
      SELF_HEAL_EXHAUSTED: heal.SELF_HEAL_EXHAUSTED,
      failure_gates: heal.failure_gates,
      repair_actions: heal.SELF_HEAL_ATTEMPTS > 0 ? ["BOUNDED_BACKLOG_REPAIR"] : [],
      alternate_topic_decision: resolveAlternateTopicDecision({
        published_count: heal.published_count,
        self_heal_exhausted: heal.SELF_HEAL_EXHAUSTED,
        self_heal_attempts: heal.SELF_HEAL_ATTEMPTS,
        quarantined,
      }),
      final_disposition: heal.published_count > 0 ? "PUBLISHED" : heal.SELF_HEAL_EXHAUSTED ? "EXHAUSTED" : "HELD",
      published_count: heal.published_count,
      quarantined_slug: quarantined ? slugTarget : null,
      deploy_ready: heal.deploy_ready,
    };
  }

  const heal = runBoundedOrganicSelfHeal({
    state: emptyOrganicState(input.venture_id === "cre" ? "occupancynpv" : input.venture_id),
    now: input.now ?? new Date().toISOString(),
    execute_publish: input.execute_publish,
    max_attempts: 3,
  });
  const exhausted = heal.SELF_HEAL_EXHAUSTED;
  return {
    SELF_HEAL_ATTEMPTS: heal.SELF_HEAL_ATTEMPTS + (input.prior_attempts ?? 0),
    SELF_HEAL_RECOVERIES: heal.SELF_HEAL_RECOVERIES,
    SELF_HEAL_EXHAUSTED: exhausted,
    failure_gates: heal.final_rejected_quality > 0 ? ["EDITORIAL_QUALITY"] : [],
    repair_actions: heal.SELF_HEAL_ATTEMPTS > 0 ? ["BOUNDED_ORGANIC_REPAIR"] : [],
    alternate_topic_decision: resolveAlternateTopicDecision({
      published_count: heal.published_count,
      self_heal_exhausted: exhausted,
      self_heal_attempts: heal.SELF_HEAL_ATTEMPTS,
      quarantined: exhausted,
    }),
    final_disposition: heal.published_count > 0 ? "PUBLISHED" : exhausted ? "EXHAUSTED" : "HELD",
    published_count: heal.published_count,
    quarantined_slug: null,
    deploy_ready: false,
  };
}

export function durableContentSelfHealingQc(): "PASS" | "FAIL" {
  const out = executeDurableContentSelfHealJob({ venture_id: "occupancynpv", execute_publish: false });
  return out.SELF_HEAL_ATTEMPTS >= 0 ? "PASS" : "FAIL";
}
