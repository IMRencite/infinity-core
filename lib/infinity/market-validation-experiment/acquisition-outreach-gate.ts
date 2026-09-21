import { auditValidationGrade, evaluatePublicLegalCompleteness } from "@/lib/infinity/public-venture-template";
import { SUCCESSOR_CRE_ARTIFACT_ID } from "./constants";
import { inspectFounderProspectAvailability } from "./founder-assisted-cohort";

export const OUTREACH_BLOCKED_PENDING_CANONICAL_PUBLIC_ARTIFACT_DEPLOYMENT =
  "OUTREACH_BLOCKED_PENDING_CANONICAL_PUBLIC_ARTIFACT_DEPLOYMENT" as const;
export const NEW_FOUNDER_DEPLOYMENT_AUTHORIZATION_REQUIRED =
  "NEW_FOUNDER_DEPLOYMENT_AUTHORIZATION_REQUIRED" as const;

export type OutreachBlocker =
  | "NONE"
  | "PUBLIC_ARTIFACT_DEPLOYMENT_REQUIRED"
  | "FOUNDER_PROSPECT_INPUT_REQUIRED"
  | "FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED"
  | "OTHER";

export function evaluateOutreachReadiness(input: {
  successorFiles: Array<{ path: string; content: string }>;
  successorDeployedLive: boolean;
  liveArtifactId?: string;
}): {
  validationGradeDesign: "PASS" | "FAIL";
  canonicalFooter: "PASS" | "FAIL";
  privacy: "PASS" | "FAIL";
  terms: "PASS" | "FAIL";
  sitemap: "PASS" | "FAIL";
  liveCompliantArtifact: "PASS" | "FAIL";
  blocker: OutreachBlocker;
  reason: string;
  messagesSent: 0;
} {
  const grade = auditValidationGrade(input.successorFiles);
  const legal = evaluatePublicLegalCompleteness(input.successorFiles);
  const liveCompliant: "PASS" | "FAIL" =
    input.successorDeployedLive && input.liveArtifactId !== SUCCESSOR_CRE_ARTIFACT_ID ? "PASS" : "FAIL";
  const gates = {
    validationGradeDesign: grade.validationGradeOverall,
    canonicalFooter: legal.footer,
    privacy: legal.privacy,
    terms: legal.terms,
    sitemap: legal.sitemap,
    liveCompliantArtifact: liveCompliant,
  };
  const prospects = inspectFounderProspectAvailability();
  let blocker: OutreachBlocker = "NONE";
  let reason = "All outreach gates passed.";
  if (liveCompliant === "FAIL") {
    blocker = "PUBLIC_ARTIFACT_DEPLOYMENT_REQUIRED";
    reason = OUTREACH_BLOCKED_PENDING_CANONICAL_PUBLIC_ARTIFACT_DEPLOYMENT;
  } else if (prospects.founderProspectInputRequired) {
    blocker = "FOUNDER_PROSPECT_INPUT_REQUIRED";
    reason = "Infinity has no founder-approved named prospects. Do not fabricate contacts.";
  } else {
    blocker = "FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED";
    reason = "Named prospects exist, but EXPLICIT_FOUNDER_COMMUNICATIONS_AUTHORIZATION has not been granted.";
  }
  return { ...gates, blocker, reason, messagesSent: 0 };
}
