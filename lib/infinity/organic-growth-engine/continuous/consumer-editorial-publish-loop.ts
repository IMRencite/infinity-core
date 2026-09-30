import type { OrganicDraft } from "./quality";
import type { OrganicNamedGate } from "./types";
import {
  consumerEditorialRevisionHints,
  evaluateBlogConsumerEditorialQualityGate,
  evaluateRenderedEditorialQualityGate,
} from "./blog-consumer-editorial-quality";
import { evaluateHumanFirstEditorialQc } from "./blog-human-flow-gates";
import { resolveVentureEditorialProfile } from "./venture-editorial-profiles";

export const MAX_CONSUMER_EDITORIAL_REPAIR_ATTEMPTS = 2 as const;
export const CONSUMER_EDITORIAL_REPAIR_GATE = "ConsumerEditorialRepairLoop" as const;

export type ConsumerEditorialRepairAttempt = {
  attempt: number;
  failed_gates: string[];
  revision_hints: string[];
  draft_word_count: number;
};

export type ConsumerEditorialRepairResult = {
  gate: typeof CONSUMER_EDITORIAL_REPAIR_GATE;
  publish_allowed: boolean;
  attempts: ConsumerEditorialRepairAttempt[];
  final_draft: OrganicDraft;
  escalation: string | null;
};

export function isConsumerEditorialDraft(draft: OrganicDraft): boolean {
  const canonical = draft.canonical ?? "";
  const origin = draft.origin ?? "";
  return (
    /\/journal\//.test(canonical)
    || /occupancynpv\.com\/blog\//.test(canonical)
    || origin.includes("clubthrottle")
    || origin.includes("occupancynpv")
  ) && resolveVentureEditorialProfile(draft) != null;
}

export function evaluateConsumerEditorialPublishStack(input: {
  draft: OrganicDraft;
  rendered_html?: string;
}): { result: "PASS" | "FAIL"; reasons: string[]; gates: OrganicNamedGate[] } {
  if (!isConsumerEditorialDraft(input.draft)) {
    return { result: "PASS", reasons: ["NOT_CONSUMER_EDITORIAL"], gates: [] };
  }
  const gates: OrganicNamedGate[] = [
    evaluateBlogConsumerEditorialQualityGate(input.draft),
    evaluateHumanFirstEditorialQc(input.draft),
  ];
  const profile = resolveVentureEditorialProfile(input.draft);
  if (input.rendered_html && profile) {
    const venture = profile.venture_id === "club-throttle" ? "club-throttle" : "occupancynpv";
    gates.push(
      evaluateRenderedEditorialQualityGate({
        venture_id: venture,
        rendered_html_or_text: input.rendered_html,
      }),
    );
  }
  const reasons = gates.filter((row) => row.result === "FAIL").flatMap((row) => row.reasons.filter((r) => r !== "OK"));
  return { result: reasons.length ? "FAIL" : "PASS", reasons, gates };
}

export function runBoundedConsumerEditorialRepair(input: {
  draft: OrganicDraft;
  rendered_html?: string;
  max_attempts?: number;
  repair?: (ctx: { hints: string[]; attempt: number; prior: OrganicDraft }) => OrganicDraft | null;
}): ConsumerEditorialRepairResult {
  const max = input.max_attempts ?? MAX_CONSUMER_EDITORIAL_REPAIR_ATTEMPTS;
  let current = input.draft;
  const attempts: ConsumerEditorialRepairAttempt[] = [];

  for (let attempt = 1; attempt <= max; attempt += 1) {
    const stack = evaluateConsumerEditorialPublishStack({ draft: current, rendered_html: input.rendered_html });
    if (stack.result === "PASS") {
      return {
        gate: CONSUMER_EDITORIAL_REPAIR_GATE,
        publish_allowed: true,
        attempts,
        final_draft: current,
        escalation: null,
      };
    }
    const hints = consumerEditorialRevisionHints(current);
    attempts.push({
      attempt,
      failed_gates: stack.reasons,
      revision_hints: hints,
      draft_word_count: current.body.split(/\s+/).length,
    });
    if (!input.repair || attempt >= max) break;
    const next = input.repair({ hints, attempt, prior: current });
    if (!next) break;
    current = next;
  }

  return {
    gate: CONSUMER_EDITORIAL_REPAIR_GATE,
    publish_allowed: false,
    attempts,
    final_draft: current,
    escalation: "CONSUMER_EDITORIAL_REPAIR_EXHAUSTED",
  };
}
