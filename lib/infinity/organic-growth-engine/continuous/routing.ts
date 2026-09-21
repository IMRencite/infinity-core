import type { DuplicateIntentOutcome, OrganicContentType } from "./contract";
import type { ContentOpportunity, OrganicAsset, VoiceOfCustomerQuestion } from "./types";
import { intentsOverlap } from "./voc";

export function scoreContentOpportunity(input: {
  question: VoiceOfCustomerQuestion;
  topic_relevance?: number;
  search_demand?: number;
  geo_value?: number;
  conversion_proximity?: number;
  competition_opportunity?: number;
  authority_potential?: number;
  overlap?: number;
  freshness_requirement?: number;
  evidence_availability?: number;
}): ContentOpportunity {
  const q = input.question;
  const factors = {
    topic_relevance: input.topic_relevance ?? 0.85,
    search_demand: input.search_demand ?? 0.55,
    question_frequency: Math.min(1, q.frequency / 4),
    commercial_value: q.commercial_relevance,
    geo_value: input.geo_value ?? 0.6,
    sales_usefulness: q.sales_relevance,
    conversion_proximity: input.conversion_proximity ?? 0.45,
    content_gap_depth: q.content_gap_score,
    competition_opportunity: input.competition_opportunity ?? 0.5,
    authority_potential: input.authority_potential ?? 0.7,
    overlap_penalty: input.overlap ?? 0,
    freshness_requirement: input.freshness_requirement ?? 0.3,
    evidence_availability: input.evidence_availability ?? 0.75,
  };
  const score =
    factors.topic_relevance * 12 +
    factors.search_demand * 8 +
    factors.question_frequency * 12 +
    factors.commercial_value * 10 +
    factors.geo_value * 8 +
    factors.sales_usefulness * 10 +
    factors.conversion_proximity * 6 +
    factors.content_gap_depth * 12 +
    factors.competition_opportunity * 6 +
    factors.authority_potential * 6 +
    factors.freshness_requirement * 4 +
    factors.evidence_availability * 6 -
    factors.overlap_penalty * 20;
  const content_type = routeContentType({
    question: q.question,
    topic: q.topic,
    answer_state: q.answer_state,
    commercial: q.commercial_relevance,
  });
  return {
    opportunity_id: `opp:${q.venture_id}:${q.normalized_intent}`,
    venture_id: q.venture_id,
    content_type,
    topic: q.topic,
    cluster: q.topic,
    pillar: inferPillar(q.topic),
    question: q.question,
    intent: q.normalized_intent,
    score: Math.round(Math.max(0, Math.min(100, score)) * 100) / 100,
    reasons: [
      q.frequency >= 2 ? "recurring_question" : "new_question",
      q.answer_state === "UNANSWERED" ? "content_gap" : q.answer_state.toLowerCase(),
      q.commercial_relevance >= 0.7 ? "commercial_value" : "informational",
    ],
    existing_url: q.existing_content_match,
  };
}

export function routeContentType(input: {
  question: string;
  topic: string;
  answer_state: VoiceOfCustomerQuestion["answer_state"];
  commercial: number;
}): OrganicContentType {
  const text = `${input.question} ${input.topic}`.toLowerCase();
  if (input.answer_state === "ANSWERED_WELL") return "CONTENT_REFRESH";
  if (input.answer_state === "ANSWERED_WEAKLY") return "CONTENT_REFRESH";
  if (/vs\b|versus|compare|comparison/.test(text)) return "COMPARISON";
  if (/what is|define|definition|meaning of/.test(text) && text.split(" ").length <= 8) return "GLOSSARY";
  if (/price|cost|buy|pricing|software|tool for/.test(text) || input.commercial >= 0.9) return "COMMERCIAL_INTENT";
  if (/news|this week|2026|market update/.test(text)) return "TIMELY_EDITORIAL";
  if (/guide|how to|step by step|playbook/.test(text)) return "GUIDE";
  if (/faq|frequently/.test(text)) return "FAQ";
  if (/pillar|overview of commercial real estate/.test(text)) return "PILLAR";
  if (/cluster|hub|category/.test(text)) return "CLUSTER_HUB";
  if (/\?|how |what |why |when |does /.test(text)) return "EVERGREEN_QUESTION";
  return "BLOG";
}

export function evaluateDuplicateIntent(input: {
  intent: string;
  existing: OrganicAsset[];
  meaningfully_distinct?: boolean;
}): { outcome: DuplicateIntentOutcome; existing_url: string | null; reason: string } {
  const match = input.existing.find((asset) =>
    intentsOverlap(input.intent, `${asset.intent} ${asset.question_answered} ${asset.topic}`),
  );
  if (!match) return { outcome: "CREATE_NEW", existing_url: null, reason: "No existing intent page" };
  if (input.meaningfully_distinct) return { outcome: "CREATE_NEW", existing_url: match.url, reason: "Distinct angle justified" };
  if (match.quality_score < 80) return { outcome: "EXPAND_EXISTING", existing_url: match.url, reason: "Same intent — expand existing page" };
  if (match.indexation === "not_indexed" || match.status === "REFRESHED") {
    return { outcome: "REFRESH", existing_url: match.url, reason: "Same intent — refresh existing page" };
  }
  return { outcome: "EXPAND_EXISTING", existing_url: match.url, reason: "Wording variation of existing intent" };
}

function inferPillar(topic: string): string {
  if (/lease|nnn|cam|rent/.test(topic.toLowerCase())) return "Leasing";
  if (/financ|debt|equity/.test(topic.toLowerCase())) return "Financing";
  if (/invest|return/.test(topic.toLowerCase())) return "Investment";
  return "Valuation";
}
