export const EVIDENCE_STAGES = [
  "PROSPECT",
  "OUTREACH_ATTEMPT",
  "DELIVERED",
  "SITE_VISIT",
  "FORM_SUBMISSION",
  "QUALIFIED_EVIDENCE",
  "STRONG_INTENT",
  "PRICING_INTENT",
  "CONVERSION",
] as const;

export type EvidenceStage = (typeof EVIDENCE_STAGES)[number];

export const QUALIFIED_EVIDENCE_RULE =
  "Non-synthetic production evidence from a relevant commercial professional (broker / tenant-rep / boutique) who has an active lease-comparison workflow. Outreach attempts, delivery receipts, email opens, site visits, Playwright submissions, developer verification, fixtures, and internal Infinity traffic do not qualify.";

export const STRONG_INTENT_RULE =
  "Non-synthetic production evidence of a specific problem acknowledgement, pilot/early-access request, or meaningful professional reply. Email opens and site visits are not strong intent.";

export const PRICING_INTENT_RULE =
  "Non-synthetic production evidence of an explicit pricing reaction or purchase-oriented selection ($290/year or $149/deal). Site visits and pricing-page views alone are not pricing intent.";

export function outreachAttemptIsQualifiedEvidence(): false {
  return false;
}

export function deliveryIsQualifiedEvidence(): false {
  return false;
}

export function emailOpenIsStrongIntent(): false {
  return false;
}

export function siteVisitIsStrongIntent(): false {
  return false;
}

export function siteVisitIsPricingIntent(): false {
  return false;
}

export function internalOrSyntheticIsRealEvidence(): false {
  return false;
}

export function aiMayInventEvidence(): false {
  return false;
}

export function inboundReplyIsStrongIntent(): false {
  return false;
}

export function inboundReplyIsPricingIntent(): false {
  return false;
}

export function automatedReplyIsQualifiedEvidence(): false {
  return false;
}

export function outOfOfficeIsQualifiedEvidence(): false {
  return false;
}
