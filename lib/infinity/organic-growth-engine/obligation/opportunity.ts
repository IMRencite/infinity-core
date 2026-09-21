import { liveOccupancyNpvQuestionAssets } from "../continuous/live-catalog";
import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import type { OrganicContentOpportunity } from "./types";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export const FIRST_LEASE_INPUTS_QUESTION =
  "What numbers do you need to compare two commercial leases?" as const;

export const FIRST_LEASE_INPUTS_ROUTE =
  "/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/" as const;

export function evaluateContentCannibalizationGate(input: {
  question: string;
  existing_questions: string[];
}): NamedOutboundLoopGate {
  const needle = input.question.toLowerCase().replace(/[?]/g, "");
  const overlap = input.existing_questions.some((row) => {
    const value = row.toLowerCase().replace(/[?]/g, "");
    return value === needle || (value.includes("what numbers") && value.includes("compare"));
  });
  if (overlap) return named("ContentCannibalizationGate", "FAIL", ["EXISTING_PAGE_OWNS_INTENT"]);
  return named("ContentCannibalizationGate", "PASS", ["DISTINCT_INTENT"]);
}

export function evaluateOrganicContentDecisionGate(input: {
  decision: string;
  reason: string;
}): NamedOutboundLoopGate {
  if (!input.decision || !input.reason.trim()) return named("OrganicContentDecisionGate", "FAIL", ["DECISION_REASON_REQUIRED"]);
  return named("OrganicContentDecisionGate", "PASS", [input.decision]);
}

export function selectFirstOccupancyNpvOrganicOpportunity(now = new Date().toISOString()): OrganicContentOpportunity {
  const existing = liveOccupancyNpvQuestionAssets().map((row) => row.question_answered);
  const cannibalization = evaluateContentCannibalizationGate({
    question: FIRST_LEASE_INPUTS_QUESTION,
    existing_questions: existing,
  });
  const decision = cannibalization.result === "PASS" ? "NEW_PAGE" : "EXPAND_EXISTING";
  return {
    opportunity_id: "organic-opportunity:lease-inputs-checklist-v1",
    venture_id: "occupancynpv",
    topic: "lease-comparison",
    question: FIRST_LEASE_INPUTS_QUESTION,
    search_intent: "INFORMATIONAL",
    customer_problem: "A qualified occupier already has two leases and does not know which inputs matter before comparing them.",
    source_signals: ["SALES_CONVERSATION", "VOC", "SITE_INVENTORY"],
    voc_signals: [
      "what would you need from me to compare them?",
      "what numbers do I need?",
      "can I use my real leases?",
    ],
    sales_signals: [
      "REQUEST_INPUTS",
      "ACTIVE_EVALUATION",
      "Sounds like it would be a great tool for me to use",
    ],
    search_signals: ["what numbers to compare commercial leases", "lease comparison inputs"],
    existing_page_matches: [
      "/lease-comparison/how-do-you-compare-two-commercial-lease-options/",
      "/compare-commercial-leases",
    ],
    candidate_asset_type: "CHECKLIST",
    business_value: 92,
    search_value: 78,
    geo_value: 86,
    link_value: 74,
    conversion_value: 94,
    freshness_value: 88,
    evidence_availability: 90,
    cannibalization_risk: cannibalization.result === "PASS" ? 18 : 70,
    priority_score: 91,
    decision,
    decision_reason:
      decision === "NEW_PAGE"
        ? "Existing comparison pages explain process. They do not own the input-checklist question from live sales."
        : "An existing page already owns this exact question.",
    created_at: now,
    updated_at: now,
  };
}
