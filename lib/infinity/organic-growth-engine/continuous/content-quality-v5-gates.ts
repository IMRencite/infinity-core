import type { OrganicNamedGate } from "./types";
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";
import { evaluateCustomerFacingLanguageGate } from "@/lib/infinity/venture-isolation/venture-isolation";
import {
  evaluatePageTopicPurityGate,
  evaluateVentureIsolationGate,
} from "@/lib/infinity/venture-isolation/venture-isolation";
import { visibleArticleText } from "./content-normalization";

export const CONTENT_QUALITY_V5 = "content-quality-framework-v5" as const;

const PUBLIC_PROCESS_LEAK =
  /section-depth gate|founder live review|content-normalization|compose pass|preview pass|live pass|live verification|publication authorization|publication hold|cadence target|content quality|content-quality-framework|generator prompt|repair prompt|gate pass|gate fail|\bQC state\b|internal product readiness|candidate state|deployment status|waiting on approved art|store id|store ID|provider readiness|pending founder|approved-art|provider spec|provider-backed|Gelato fabric|source QC|rendered QC|Content V4|STALE_QC|PublicationAuthorization V4|infinity os|Infinity OS/i;

const EVALUATOR_LEAK =
  /learning check|learning test|teaching sample|reader test|teaching pass|redo the example|before you publish|page failed actionability|the page worked|the article failed|add the exception|heading stack|coverage test|actionability gate|learning gate|reader challenge|READER_CAN_EXPLAIN|READER_CAN_IDENTIFY|READER_CAN_DO|READER_CAN_COMPARE|READER_CAN_AVOID|READER_NEXT_STEP|section-depth|fail_thin_section|fail_empty_sections|fail_content_normalization|unanswered:/i;

const OPERATIONAL_LEAK =
  /hold stays active|compose pass|preview pass|founder live review|publication hold|publication authorization|provider readiness|internal tooling|backend language|operator console|durable blog|blog-os|organic growth engine|autonomous publish|second qc|artifact qc|exit_condition|hold_id|venture-isolation gate escape/i;

const RECOMMENDATION_FOREIGN =
  /occupancynpv\.com|\/commercial-lease-npv\/|cap rate calculated|compare commercial leases|club throttle featured|\/journal\/apparel\/how-riders/i;

export function customerVisibleText(input: { body?: string; rendered_html?: string }): string {
  if (input.rendered_html) return visibleArticleText(input.rendered_html);
  return `${input.body ?? ""}`.replace(/\s+/g, " ").trim();
}

export function evaluatePublicContentLeakGate(input: { text: string }): OrganicNamedGate {
  const reasons: string[] = [];
  if (PUBLIC_PROCESS_LEAK.test(input.text)) reasons.push("FAIL_PUBLIC_PROCESS_LANGUAGE");
  if (/\bfixture\b/i.test(input.text) && /contamination|escape|known-bad/i.test(input.text)) {
    reasons.push("FAIL_FIXTURE_LANGUAGE");
  }
  return {
    gate: "PublicContentLeakGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["NO_PUBLIC_PROCESS_LANGUAGE"],
  };
}

export function evaluateEvaluatorLeakageGate(input: { text: string }): OrganicNamedGate {
  const reasons: string[] = [];
  if (EVALUATOR_LEAK.test(input.text)) reasons.push("FAIL_EVALUATOR_VOICE");
  return {
    gate: "EvaluatorLeakageGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["NO_EVALUATOR_VOICE"],
  };
}

export function evaluateOperationalStateLeakageGate(input: { text: string }): OrganicNamedGate {
  const reasons: string[] = [];
  if (OPERATIONAL_LEAK.test(input.text)) reasons.push("FAIL_OPERATIONAL_STATE");
  return {
    gate: "OperationalStateLeakageGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["NO_OPERATIONAL_STATE"],
  };
}

export function evaluateTopicPurityGateV2(input: { boundary: PageTopicBoundary; text: string }): OrganicNamedGate {
  const base = evaluatePageTopicPurityGate({ boundary: input.boundary, body: input.text });
  return {
    gate: "TopicPurityGateV2",
    result: base.result,
    reasons: base.reasons.length ? base.reasons : ["TOPIC_BOUNDARY_RESPECTED"],
  };
}

export function evaluateVentureIsolationGateV2(input: { venture_id: string; text: string }): OrganicNamedGate {
  const base = evaluateVentureIsolationGate({ venture_id: input.venture_id, html_or_text: input.text });
  return {
    gate: "VentureIsolationGateV2",
    result: base.result,
    reasons: base.reasons.length ? base.reasons : ["VENTURE_BOUNDARY_RESPECTED"],
  };
}

export function evaluateRecommendationIsolationGate(input: {
  venture_id: string;
  recommendation_hrefs?: string[];
  text: string;
}): OrganicNamedGate {
  const reasons: string[] = [];
  const hrefs = input.recommendation_hrefs ?? [];
  if (input.venture_id === "club-throttle") {
    for (const href of hrefs) {
      if (/occupancynpv|commercial-lease|cap-rate|compare-commercial-leases/i.test(href)) {
        reasons.push("FAIL_CROSS_VENTURE_RECOMMENDATION");
      }
    }
    if (/Featured Reads:[\s\S]*occupancynpv|Related Resources:[\s\S]*commercial-lease-npv/i.test(input.text)) {
      reasons.push("FAIL_CROSS_VENTURE_VISIBLE_MODULE");
    }
  }
  if (input.venture_id === "occupancynpv") {
    for (const href of hrefs) {
      if (/club-throttle|\/journal\//i.test(href)) reasons.push("FAIL_CROSS_VENTURE_RECOMMENDATION");
    }
  }
  if (RECOMMENDATION_FOREIGN.test(input.text) && input.venture_id === "club-throttle" && /occupancynpv|cap rate|commercial lease/i.test(input.text)) {
    reasons.push("FAIL_FOREIGN_RECOMMENDATION_COPY");
  }
  return {
    gate: "RecommendationIsolationGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["RECOMMENDATIONS_VENTURE_SCOPED"],
  };
}

export function evaluateCustomerExperienceGate(input: { text: string }): OrganicNamedGate {
  const reasons: string[] = [];
  if (/as an ai|in today's fast-paced|unlock the power|delve into|it's important to note that/i.test(input.text)) {
    reasons.push("FAIL_AI_TUTOR_VOICE");
  }
  if (/lorem ipsum|placeholder copy|TODO:|FIXME:/i.test(input.text)) reasons.push("FAIL_PLACEHOLDER");
  return {
    gate: "CustomerExperienceGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["CUSTOMER_EXPERIENCE_NATURAL"],
  };
}

export function evaluateRenderedCustomerContentGate(input: {
  rendered_html: string;
  venture_id: string;
  boundary?: PageTopicBoundary;
  recommendation_hrefs?: string[];
}): OrganicNamedGate & { gates: OrganicNamedGate[] } {
  const text = customerVisibleText({ rendered_html: input.rendered_html });
  const gates = [
    evaluatePublicContentLeakGate({ text }),
    evaluateEvaluatorLeakageGate({ text }),
    evaluateOperationalStateLeakageGate({ text }),
    evaluateVentureIsolationGateV2({ venture_id: input.venture_id, text }),
    evaluateCustomerFacingLanguageGate(text),
    evaluateCustomerExperienceGate({ text }),
    evaluateRecommendationIsolationGate({
      venture_id: input.venture_id,
      recommendation_hrefs: input.recommendation_hrefs,
      text,
    }),
  ];
  if (input.boundary) {
    gates.push(evaluateTopicPurityGateV2({ boundary: input.boundary, text }));
  }
  const failed = gates.filter((row) => row.result === "FAIL");
  return {
    gate: "RenderedCustomerContentGate",
    result: failed.length ? "FAIL" : "PASS",
    reasons: failed.length ? failed.flatMap((row) => row.reasons) : ["RENDERED_CUSTOMER_CONTENT_OK"],
    gates,
  };
}
