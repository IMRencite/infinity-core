import { planContentSelfHeal } from "./autonomous-content-self-healing-v1.ts";
import { executeOrganicContinuousTick } from "@/lib/infinity/organic-growth-engine/continuous/cycle";
import type { OrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/types";
import { createMemoryPublisher } from "@/lib/infinity/organic-growth-engine/continuous/publish";

export type SelfHealRunResult = {
  SELF_HEAL_ATTEMPTS: number;
  SELF_HEAL_RECOVERIES: number;
  SELF_HEAL_EXHAUSTED: boolean;
  published_count: number;
  final_rejected_quality: number;
};

const ALTERNATE_QUESTIONS = [
  "How do you compare two commercial lease options on occupancy cost?",
  "What is occupancy cost versus rent for a commercial tenant?",
  "What numbers do you need to compare two leases?",
];

export function runBoundedOrganicSelfHeal(input: {
  state: OrganicContinuousState;
  now: string;
  execute_publish: boolean;
  max_attempts?: number;
}): SelfHealRunResult {
  const max = input.max_attempts ?? 3;
  let attempts = 0;
  let recoveries = 0;
  let published = 0;
  let state = input.state;
  let lastRejected = state.rejected_quality;

  while (attempts < max) {
    attempts += 1;
    const question = ALTERNATE_QUESTIONS[(attempts - 1) % ALTERNATE_QUESTIONS.length]!;
    const tick = executeOrganicContinuousTick({
      state,
      now: input.now,
      questions: [{ question, source_channel: "portfolio_self_heal" }],
      execute_publish: input.execute_publish,
      website_approved: true,
      publishing_enabled: input.execute_publish,
      venture_active: true,
      publisher: createMemoryPublisher(),
    });
    state = tick.state;
    published += tick.published.length;
    if (tick.published.length > 0) {
      recoveries += 1;
      break;
    }
    const plan = planContentSelfHeal({
      failure_class: tick.state.rejected_quality > lastRejected ? "CONTENT_QC_FAILED" : "NO_PUBLISH",
      attempt: attempts - 1,
      alternate_topics_available: attempts < max,
    });
    lastRejected = tick.state.rejected_quality;
    if (plan.stage === "ESCALATE" && attempts >= max) break;
  }

  return {
    SELF_HEAL_ATTEMPTS: attempts,
    SELF_HEAL_RECOVERIES: recoveries,
    SELF_HEAL_EXHAUSTED: attempts >= max && published === 0 && lastRejected > 0,
    published_count: published,
    final_rejected_quality: lastRejected,
  };
}
