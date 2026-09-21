import { createHash } from "node:crypto";
import type {
  VentureImprovementAssessment,
  VentureImprovementProposal,
  VentureImprovementSuggestion,
} from "./types";
import { ingestCustomerFeedback } from "@/lib/infinity/product-improvement-loop/ingest";

const suggestions: VentureImprovementSuggestion[] = [];

export function resetVentureImprovementIntake(): void {
  suggestions.length = 0;
}

export function submitVentureImprovementSuggestion(input: {
  ventureId: string;
  text: string;
  now?: Date;
}): VentureImprovementSuggestion {
  const createdAt = (input.now ?? new Date()).toISOString();
  const id = `imp_${createHash("sha256").update(`${input.ventureId}|${input.text}|${createdAt}`).digest("hex").slice(0, 16)}`;
  const suggestion: VentureImprovementSuggestion = {
    id,
    ventureId: input.ventureId,
    source: "HUMAN",
    text: input.text,
    createdAt,
  };
  suggestions.push(suggestion);
  ingestCustomerFeedback({
    venture_id: input.ventureId,
    text: input.text,
    contact_identity: "founder",
    channel: "hq_improvement",
    message_id: id,
    provenance: input.text === "Ask Infinity to Review This Venture" ? "REVIEW_REQUEST" : "FOUNDER_SUGGESTION",
    synthetic: false,
  });
  return suggestion;
}

export function assessVentureImprovement(suggestion: VentureImprovementSuggestion): VentureImprovementAssessment {
  const text = suggestion.text.toLowerCase();
  const classification = /domain|dns|ssl|payment|stripe|checkout|price/.test(text)
    ? "COMMERCIALIZATION"
    : /outreach|inbound|experiment|growth/.test(text)
      ? "GROWTH"
      : /legal|risk|govern/.test(text)
        ? "GOVERNANCE"
        : /copy|page|artifact|product/.test(text)
          ? "PRODUCT"
          : "UNKNOWN";
  return {
    suggestionId: suggestion.id,
    classification,
    evidenceInspected: ["venture_operational_record", "experiment_clock", "observer_health"],
    governanceBypass: false,
  };
}

export function proposeVentureImprovement(
  suggestion: VentureImprovementSuggestion,
  assessment: VentureImprovementAssessment,
): VentureImprovementProposal {
  return {
    suggestionId: suggestion.id,
    proposal: `${assessment.classification}: ${suggestion.text.slice(0, 160)}`,
    qualityRiskEconomicEvaluationRequired: true,
    governedMissionRequired: true,
    autoImplemented: false,
  };
}

export function askInfinityToReviewVenture(ventureId: string): VentureImprovementProposal {
  const suggestion = submitVentureImprovementSuggestion({
    ventureId,
    text: "Ask Infinity to Review This Venture",
  });
  return proposeVentureImprovement(suggestion, assessVentureImprovement(suggestion));
}

export function listVentureImprovementSuggestions(): VentureImprovementSuggestion[] {
  return [...suggestions];
}
