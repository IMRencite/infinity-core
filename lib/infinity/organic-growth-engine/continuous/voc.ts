import { normalizeTopicKey } from "../decisions/cannibalization-engine";
import type { AnswerMatchState, OrganicContentType } from "./contract";
import type { ContentDemandSignal, OrganicAsset, VoiceOfCustomerQuestion } from "./types";

export function normalizeQuestionIntent(question: string): string {
  let text = normalizeTopicKey(question);
  for (let i = 0; i < 3; i += 1) {
    const next = text
      .replace(/^(can you explain|please explain|tell me|what is|what are|how does|how is|how do|how are|why is|why do|how|what|why)\s+/, "")
      .replace(/\s+(work|works|working|calculated|calculate|mean|means)$/, "")
      .trim();
    if (next === text) break;
    text = next;
  }
  return text.replace(/\s+/g, " ").trim();
}

export function ingestVoiceOfCustomerQuestion(input: {
  question: string;
  source_channel: string;
  venture_id: string;
  topic?: string;
  now: string;
  objections?: string[];
  prospect_count?: number;
  existing?: VoiceOfCustomerQuestion[];
}): VoiceOfCustomerQuestion {
  const normalized = normalizeQuestionIntent(input.question);
  const prior = input.existing?.find((row) => row.normalized_intent === normalized);
  return {
    question: input.question.trim(),
    normalized_intent: normalized,
    source_channel: input.source_channel,
    venture_id: input.venture_id,
    topic: input.topic ?? inferTopic(normalized),
    frequency: (prior?.frequency ?? 0) + 1,
    first_seen: prior?.first_seen ?? input.now,
    last_seen: input.now,
    related_objections: [...new Set([...(prior?.related_objections ?? []), ...(input.objections ?? [])])],
    related_prospect_count: Math.max(prior?.related_prospect_count ?? 0, input.prospect_count ?? 1),
    existing_content_match: prior?.existing_content_match ?? null,
    answer_state: prior?.answer_state ?? "UNANSWERED",
    content_gap_score: prior ? Math.min(1, prior.content_gap_score + 0.15) : 0.7,
    commercial_relevance: /cap rate|noi|lease|occupancy|cost|price/.test(normalized) ? 0.85 : 0.4,
    sales_relevance: 0.8,
  };
}

function inferTopic(intent: string): string {
  if (/cap rate/.test(intent)) return "Cap Rates";
  if (/\bnoi\b|net operating/.test(intent)) return "NOI";
  if (/triple net|nnn/.test(intent)) return "Triple Net";
  return "Valuation";
}

export function intentsOverlap(a: string, b: string): boolean {
  const left = normalizeQuestionIntent(a);
  const right = normalizeQuestionIntent(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const setA = new Set(left.split(" ").filter((token) => token.length > 2));
  const setB = new Set(right.split(" ").filter((token) => token.length > 2));
  if (!setA.size || !setB.size) return false;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection += 1;
  return intersection / Math.max(setA.size, setB.size) >= 0.6;
}

export function matchExistingAnswer(input: {
  intent: string;
  assets: OrganicAsset[];
}): { state: AnswerMatchState; url: string | null } {
  const hits = input.assets.filter((asset) =>
    intentsOverlap(input.intent, `${asset.intent} ${asset.question_answered} ${asset.topic} ${asset.title}`),
  );
  const strong = hits.find((asset) => asset.status === "PUBLISHED" && asset.quality_score >= 80);
  if (strong) return { state: "ANSWERED_WELL", url: strong.url };
  const weak = hits.find((asset) => asset.status === "PUBLISHED");
  if (weak) return { state: "ANSWERED_WEAKLY", url: weak.url };
  return { state: "UNANSWERED", url: null };
}

export function routeContentOpportunity(state: AnswerMatchState): OrganicContentType | "EXPAND_EXISTING" | "CONTENT_REFRESH" {
  if (state === "ANSWERED_WELL") return "CONTENT_REFRESH";
  if (state === "ANSWERED_WEAKLY") return "EXPAND_EXISTING";
  return "EVERGREEN_QUESTION";
}

export function emitContentDemandSignal(input: {
  venture_id: string;
  question: VoiceOfCustomerQuestion;
  now: string;
}): ContentDemandSignal | null {
  if (input.question.answer_state === "ANSWERED_WELL") return null;
  return {
    signal_id: `demand:${input.venture_id}:${input.question.normalized_intent}`,
    venture_id: input.venture_id,
    normalized_intent: input.question.normalized_intent,
    question: input.question.question,
    topic: input.question.topic,
    reason: input.question.answer_state === "ANSWERED_WEAKLY" ? "ANSWERED_WEAKLY" : input.question.source_channel.startsWith("sales") ? "SALES_GAP" : "UNANSWERED",
    at: input.now,
  };
}
