import { OCCUPANCYNPV_GROWTH_CAMPAIGN_ID, OCCUPANCYNPV_TARGET_SEGMENT } from "./occupancynpv-experiment";
import { CRE_VENTURE_ID } from "./venture-identity";
import { acceptPublishedProfessionalEmail } from "./published-email";
import { isSuppressed } from "./suppression";

export const QUALIFIED_OUTBOUND_PROSPECT_CONTRACT = "QualifiedOutboundProspectContract" as const;
export const OUTBOUND_PROSPECT_QUALIFICATION_GATE = "OutboundProspectQualificationGate" as const;

const IRRELEVANT = /residential|realtor|home sale|mortgage broker|property manager|student|consumer/i;
const TENANT_SIDE = /tenant[-\s]?rep|tenant representation|occupier|lease advisory|commercial lease advisor|tenant-side/i;

export type QualifiedOutboundProspect = {
  contract: typeof QUALIFIED_OUTBOUND_PROSPECT_CONTRACT;
  venture_id: typeof CRE_VENTURE_ID;
  campaign_id: typeof OCCUPANCYNPV_GROWTH_CAMPAIGN_ID;
  prospect_id: string;
  business_name: string;
  person_name: string | null;
  role: string | null;
  business_relevance: boolean;
  segment_match: boolean;
  source_provider: string;
  source_url: string;
  discovery_timestamp: string;
  public_business_context: string;
  business_domain: string | null;
  business_email: string | null;
  geography: string | null;
  timezone: string | null;
  timezone_basis: string | null;
  qualification_confidence: "HIGH" | "MEDIUM" | "LOW";
  reason_for_contact_evidence: string;
  contact_eligible: boolean;
  duplicate: boolean;
  suppressed: boolean;
  fabricated_email: false;
};

export function evaluateOutboundProspectQualificationGate(prospect: QualifiedOutboundProspect): {
  gate: typeof OUTBOUND_PROSPECT_QUALIFICATION_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  const blob = `${prospect.role ?? ""} ${prospect.public_business_context} ${prospect.reason_for_contact_evidence}`;
  if (IRRELEVANT.test(blob) && !TENANT_SIDE.test(blob)) reasons.push("IRRELEVANT_RESIDENTIAL_OR_CONSUMER");
  if (!TENANT_SIDE.test(blob) || !prospect.business_relevance || !prospect.segment_match) {
    reasons.push("SEGMENT_MISMATCH");
  }
  if (!prospect.source_url.startsWith("http")) reasons.push("PROVENANCE_MISSING");
  if (!prospect.reason_for_contact_evidence.trim()) reasons.push("REASON_FOR_CONTACT_MISSING");
  if (prospect.duplicate) reasons.push("DUPLICATE");
  if (prospect.suppressed || isSuppressed({ email: prospect.business_email, ventureId: prospect.venture_id })) {
    reasons.push("SUPPRESSED");
  }
  if (prospect.business_email) {
    const email = acceptPublishedProfessionalEmail({
      email: prospect.business_email,
      sourceUrl: prospect.source_url,
      sourceText: `${prospect.public_business_context} ${prospect.business_email}`,
      name: prospect.person_name ?? prospect.business_name,
    });
    if (!email.accepted) reasons.push("EMAIL_NOT_PUBLISHED_ON_SOURCE");
  } else {
    reasons.push("NO_PUBLISHED_BUSINESS_EMAIL");
  }
  if (!prospect.timezone || !prospect.timezone_basis) reasons.push("TIMEZONE_UNRESOLVED");
  if (prospect.qualification_confidence === "LOW") reasons.push("CONFIDENCE_TOO_LOW");
  if (prospect.fabricated_email) reasons.push("FABRICATED_EMAIL");
  return {
    gate: OUTBOUND_PROSPECT_QUALIFICATION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function occupancynpvSegmentQualificationText(): string {
  return OCCUPANCYNPV_TARGET_SEGMENT.qualification;
}
