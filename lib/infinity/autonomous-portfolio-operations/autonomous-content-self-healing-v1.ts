export const AUTONOMOUS_CONTENT_SELF_HEALING_V1 = "AUTONOMOUS_CONTENT_SELF_HEALING_V1" as const;

export type ContentSelfHealStage = "DIAGNOSE" | "REPAIR" | "RETRY" | "ALTERNATE_TOPIC" | "ESCALATE";

export function planContentSelfHeal(input: {
  failure_class: string;
  attempt: number;
  alternate_topics_available: boolean;
}): { stage: ContentSelfHealStage; should_continue_daily_loop: boolean } {
  if (/authorization|external_provider|secrets/i.test(input.failure_class)) {
    return { stage: "ESCALATE", should_continue_daily_loop: true };
  }
  if (input.attempt === 0) return { stage: "DIAGNOSE", should_continue_daily_loop: true };
  if (input.attempt === 1) return { stage: "REPAIR", should_continue_daily_loop: true };
  if (input.attempt === 2) return { stage: "RETRY", should_continue_daily_loop: true };
  if (input.alternate_topics_available) {
    return { stage: "ALTERNATE_TOPIC", should_continue_daily_loop: true };
  }
  return { stage: "ESCALATE", should_continue_daily_loop: true };
}

export function autonomousContentSelfHealingQc(): "PASS" | "FAIL" {
  const plan = planContentSelfHeal({
    failure_class: "CONTENT_QC_FAILED",
    attempt: 1,
    alternate_topics_available: true,
  });
  return plan.should_continue_daily_loop && plan.stage === "REPAIR" ? "PASS" : "FAIL";
}
