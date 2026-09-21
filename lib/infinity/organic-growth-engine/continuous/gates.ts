import {
  ORGANIC_CONTENT_QUALITY_GATE,
  ORGANIC_CONTENT_VELOCITY_GATE,
  ORGANIC_DUPLICATE_INTENT_GATE,
  ORGANIC_EVIDENCE_GATE,
  ORGANIC_GROWTH_PERFORMANCE_FEEDBACK_GATE,
  ORGANIC_INDEXATION_GATE,
  ORGANIC_INTERNAL_LINK_GATE,
  ORGANIC_PUBLISHING_AUTHORIZATION_GATE,
  ORGANIC_PUBLISHING_CADENCE_GATE,
  ORGANIC_SALES_CONTENT_BRIDGE_GATE,
  ORGANIC_SITE_ARCHITECTURE_GATE,
  ORGANIC_TECHNICAL_SEO_GATE,
  ORGANIC_URL_HIERARCHY_GATE,
  ORGANIC_VOICE_OF_CUSTOMER_GATE,
  ORGANIC_SCHEMA_STACK_GATE,
  ORGANIC_BREADCRUMB_SCHEMA_GATE,
  ORGANIC_SPEAKABLE_GATE,
  ORGANIC_FAQ_SCHEMA_GATE,
  ORGANIC_CANONICAL_SCHEMA_GATE,
  VENTURE_SCHEMA_READINESS_GATE,
} from "./contract";
import { evaluateOrganicContentVelocityGate, evaluateOrganicPublishingCadenceGate } from "./cadence";
import { evaluateOrganicInternalLinkGate, evaluateOrganicSiteArchitectureGate } from "./links";
import { evaluateOrganicGrowthPerformanceFeedbackGate, evaluateOrganicIndexationGate } from "./performance";
import { authorizeOrganicPublish } from "./publish";
import { evaluateOrganicContentQualityGate, evaluateOrganicEvidenceGate, evaluateOrganicTechnicalSeoGate } from "./quality";
import { evaluateDuplicateIntent } from "./routing";
import { evaluateOrganicUrlHierarchyGate } from "./urls";
import type { OrganicNamedGate } from "./types";

export function evaluateOrganicDuplicateIntentGate(
  outcome: ReturnType<typeof evaluateDuplicateIntent>,
): OrganicNamedGate {
  const fail = outcome.outcome === "REJECT";
  return {
    gate: ORGANIC_DUPLICATE_INTENT_GATE,
    result: fail ? "FAIL" : "PASS",
    reasons: [outcome.reason, outcome.outcome],
  };
}

export function evaluateOrganicVoiceOfCustomerGate(input: {
  question: string;
  normalized_intent: string;
  source_channel: string;
  provenance: boolean;
}): OrganicNamedGate {
  const reasons: string[] = [];
  if (!input.question.trim()) reasons.push("missing_question");
  if (!input.normalized_intent.trim()) reasons.push("missing_normalized_intent");
  if (!input.source_channel.trim()) reasons.push("missing_source");
  if (!input.provenance) reasons.push("missing_provenance");
  return { gate: ORGANIC_VOICE_OF_CUSTOMER_GATE, result: reasons.length ? "FAIL" : "PASS", reasons };
}

export function evaluateOrganicSalesContentBridgeGate(input: {
  found: boolean;
  demand: boolean;
}): OrganicNamedGate {
  const ok = input.found || input.demand;
  return {
    gate: ORGANIC_SALES_CONTENT_BRIDGE_GATE,
    result: ok ? "PASS" : "FAIL",
    reasons: input.found ? ["asset_recommended"] : input.demand ? ["demand_signal_emitted"] : ["no_lookup_result"],
  };
}

export const ORGANIC_CONTINUOUS_GATES = [
  ORGANIC_CONTENT_QUALITY_GATE,
  ORGANIC_DUPLICATE_INTENT_GATE,
  ORGANIC_URL_HIERARCHY_GATE,
  ORGANIC_INTERNAL_LINK_GATE,
  ORGANIC_EVIDENCE_GATE,
  ORGANIC_PUBLISHING_CADENCE_GATE,
  ORGANIC_CONTENT_VELOCITY_GATE,
  ORGANIC_VOICE_OF_CUSTOMER_GATE,
  ORGANIC_SALES_CONTENT_BRIDGE_GATE,
  ORGANIC_GROWTH_PERFORMANCE_FEEDBACK_GATE,
  ORGANIC_INDEXATION_GATE,
  ORGANIC_SITE_ARCHITECTURE_GATE,
  ORGANIC_TECHNICAL_SEO_GATE,
  ORGANIC_SCHEMA_STACK_GATE,
  ORGANIC_BREADCRUMB_SCHEMA_GATE,
  ORGANIC_SPEAKABLE_GATE,
  ORGANIC_FAQ_SCHEMA_GATE,
  ORGANIC_CANONICAL_SCHEMA_GATE,
  VENTURE_SCHEMA_READINESS_GATE,
  ORGANIC_PUBLISHING_AUTHORIZATION_GATE,
] as const;

export {
  authorizeOrganicPublish,
  evaluateOrganicContentQualityGate,
  evaluateOrganicContentVelocityGate,
  evaluateOrganicEvidenceGate,
  evaluateOrganicGrowthPerformanceFeedbackGate,
  evaluateOrganicIndexationGate,
  evaluateOrganicInternalLinkGate,
  evaluateOrganicPublishingCadenceGate,
  evaluateOrganicSiteArchitectureGate,
  evaluateOrganicTechnicalSeoGate,
  evaluateOrganicUrlHierarchyGate,
};
