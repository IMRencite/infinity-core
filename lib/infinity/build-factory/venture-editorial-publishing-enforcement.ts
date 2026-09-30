import type { OrganicDraft } from "@/lib/infinity/organic-growth-engine/continuous/quality";
import {
  evaluateConsumerEditorialPublishStack,
  isConsumerEditorialDraft,
} from "@/lib/infinity/organic-growth-engine/continuous/consumer-editorial-publish-loop";
import {
  VENTURE_EDITORIAL_EXPERIENCE_BY_ID,
  ventureInheritsEditorialQc,
} from "@/lib/infinity/organic-growth-engine/continuous/venture-editorial-experience-contract";

export const VENTURE_EDITORIAL_PUBLISHING_ENFORCEMENT = "VentureEditorialPublishingEnforcement" as const;
export const CONSUMER_EDITORIAL_PUBLISH_STACK_GATE = "ConsumerEditorialPublishStack" as const;

export const EDITORIAL_AUTO_PAUSE_REASON_CODES = [
  "TOO_DRY",
  "TOO_MANUAL",
  "STATEMENT_DENSITY_HIGH",
  "WEAK_HOOK",
  "LOW_READER_MOMENTUM",
  "LOW_CONSEQUENCE",
  "WEAK_SECTION_TRANSITIONS",
  "TEXTBOOK_SECTION_SEQUENCE",
  "REPEAT_GSM_WEIGHT",
  "REPEAT_NOI_CAP",
  "REPEAT_FED_MORTGAGE",
  "REPEAT_DSCR_LEVERAGE",
  "LOW_SCENARIO_GROUNDING",
  "WEAK_ACTIONABILITY",
  "LOW_MEMORABLE_LINES",
  "VENTURE_VOICE",
  "JUDGE_KEEP_READING",
  "JUDGE_PUBLICATION_NOT_MANUAL",
  "HUMAN_EDITORIAL_QC_REQUIRED",
] as const;

export function evaluateVentureEditorialPublishingInfrastructure(input: {
  ventureId: string;
  publicBlogOrJournalCapability: boolean;
}): { gate: typeof VENTURE_EDITORIAL_PUBLISHING_ENFORCEMENT; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.publicBlogOrJournalCapability) {
    return { gate: VENTURE_EDITORIAL_PUBLISHING_ENFORCEMENT, result: "PASS", reasons: ["NO_PUBLIC_CONTENT_SURFACE"] };
  }
  if (!ventureInheritsEditorialQc(input.ventureId)) {
    reasons.push("MISSING_VENTURE_EDITORIAL_EXPERIENCE_CONTRACT");
  } else {
    const row = VENTURE_EDITORIAL_EXPERIENCE_BY_ID[input.ventureId as keyof typeof VENTURE_EDITORIAL_EXPERIENCE_BY_ID];
    if (!row?.publish_requires_human_qc) reasons.push("HUMAN_EDITORIAL_QC_NOT_REQUIRED_ON_CONTRACT");
    if (!row?.required_gates?.length) reasons.push("EDITORIAL_GATE_LIST_EMPTY");
  }
  return {
    gate: VENTURE_EDITORIAL_PUBLISHING_ENFORCEMENT,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["OK"],
  };
}

export function evaluateConsumerEditorialPublishStackGate(draft: OrganicDraft): {
  gate: typeof CONSUMER_EDITORIAL_PUBLISH_STACK_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  if (!isConsumerEditorialDraft(draft)) {
    return { gate: CONSUMER_EDITORIAL_PUBLISH_STACK_GATE, result: "PASS", reasons: ["NOT_CONSUMER_EDITORIAL"] };
  }
  const stack = evaluateConsumerEditorialPublishStack({ draft });
  return {
    gate: CONSUMER_EDITORIAL_PUBLISH_STACK_GATE,
    result: stack.result,
    reasons: stack.reasons.length ? stack.reasons : ["OK"],
  };
}

export function evaluateArticlePublishEditorialAuthorization(input: {
  draft: OrganicDraft;
  factualContentQcPassed: boolean;
}): {
  gate: typeof VENTURE_EDITORIAL_PUBLISHING_ENFORCEMENT;
  publishAllowed: boolean;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!input.factualContentQcPassed) {
    reasons.push("FACTUAL_CONTENT_QC_FAILED");
  }
  const editorial = evaluateConsumerEditorialPublishStackGate(input.draft);
  if (editorial.result === "FAIL") {
    reasons.push(...editorial.reasons.filter((r) => r !== "OK"));
  }
  if (input.factualContentQcPassed && editorial.result === "FAIL") {
    reasons.push("FACTUAL_PASS_HUMAN_EDITORIAL_FAIL");
  }
  const publishAllowed = input.factualContentQcPassed && editorial.result === "PASS";
  return {
    gate: VENTURE_EDITORIAL_PUBLISHING_ENFORCEMENT,
    publishAllowed,
    result: publishAllowed ? "PASS" : "FAIL",
    reasons: publishAllowed ? ["OK"] : reasons,
  };
}

export function shouldPauseAutonomousPublishingForEditorial(failureReasons: string[]): boolean {
  return failureReasons.some((reason) =>
    EDITORIAL_AUTO_PAUSE_REASON_CODES.some((code) => reason.includes(code)),
  );
}

export function editorialBypassAttemptRejected(input: {
  skipHumanEditorialQc?: boolean;
  forcePublish?: boolean;
  directLiveVerified?: boolean;
}): { allowed: false; reasons: string[] } | { allowed: true } {
  const reasons: string[] = [];
  if (input.skipHumanEditorialQc) reasons.push("SKIP_HUMAN_EDITORIAL_QC_FORBIDDEN");
  if (input.forcePublish) reasons.push("FORCE_PUBLISH_FORBIDDEN");
  if (input.directLiveVerified) reasons.push("DIRECT_LIVE_VERIFIED_FORBIDDEN");
  if (reasons.length) return { allowed: false, reasons };
  return { allowed: true };
}
