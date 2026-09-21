import { getActivePublicValidationArtifactId } from "@/lib/infinity/market-validation-experiment/active-public-artifact";
import { DEPLOYED_SEO_GEO_SUCCESSOR_URL } from "@/lib/infinity/market-validation-experiment/constants";
import { communicationCapabilityForChannel, executableCommunicationCapability } from "./communication-capabilities";
import type { ContactabilityRecord } from "./contactability";
import { isActionableContact } from "./contactability";
import type { DiscoveredProspect } from "./types";

export const INITIAL_COHORT_CAMPAIGN = "cre_validation_initial_cohort_v1" as const;
export const LIVE_VALIDATION_PAGE = DEPLOYED_SEO_GEO_SUCCESSOR_URL;

export type OutreachDraft = {
  prospectId: string;
  name: string;
  organization: string;
  channelCapability: string | null;
  body: string;
  finishedProductClaim: false;
  fabricatedTraction: false;
  fabricatedFamiliarity: false;
  groundedPersonalization: true;
  messagesSent: 0;
};

export type CampaignLineage = {
  source: "public_professional_outreach";
  medium: "direct_professional_contact";
  campaign: typeof INITIAL_COHORT_CAMPAIGN;
  experimentId: string;
  candidateId: string;
  artifactId: string;
  missionId: string;
  messagesSent: 0;
};

export type RankedPreparedProspect = {
  rank: number;
  prospect: DiscoveredProspect;
  contactability: ContactabilityRecord;
  informationValue: number;
  draft: OutreachDraft | null;
};

export function prepareValidationDraft(prospect: DiscoveredProspect): OutreachDraft {
  const evidence = prospect.publicRole || "tenant representation";
  const body = [
    `Hi ${prospect.name.split(" ")[0]} — I am writing because public materials describe your work in ${evidence} at ${prospect.organization}.`,
    "I am testing an early validation / pilot concept: a focused workflow for comparing commercial lease economics (step-ups, CAM, percentage rent, TI, free rent, NPV, and discount-rate sensitivity). This is not a finished product, and I am not claiming existing customers or traction.",
    `If that problem is familiar, the early-access page is here: ${LIVE_VALIDATION_PAGE}`,
    "Would you take a look and say whether this matches lease-comparison work you already do? No purchase is being collected.",
  ].join("\n\n");
  return {
    prospectId: prospect.prospectId,
    name: prospect.name,
    organization: prospect.organization,
    channelCapability: communicationCapabilityForChannel(prospect.contactability?.status ?? "CONTACT_CHANNEL_NOT_YET_IDENTIFIED"),
    body,
    finishedProductClaim: false,
    fabricatedTraction: false,
    fabricatedFamiliarity: false,
    groundedPersonalization: true,
    messagesSent: 0,
  };
}

export function scoreInformationValue(prospect: DiscoveredProspect, contact: ContactabilityRecord, orgCounts: Map<string, number>): number {
  let score = prospect.qualification.confidence === "HIGH" ? 40 : 10;
  if (/tenant[-\s]?rep|occupier/i.test(prospect.publicRole)) score += 20;
  if (contact.status === "DIRECT_PUBLIC_BUSINESS_EMAIL" && contact.scope === "DIRECT_CONTACT") score += 18;
  else if (contact.status === "DIRECT_PUBLIC_BUSINESS_EMAIL") score += 12;
  else if (contact.status === "PUBLIC_PROFESSIONAL_PROFILE") score += 10;
  else if (contact.status === "ORGANIZATION_CONTACT_FORM") score += 6;
  else if (contact.status === "ORGANIZATION_GENERAL_CONTACT") score += 4;
  if ((orgCounts.get(prospect.organization) ?? 1) === 1) score += 8;
  return score;
}

export function rankPreparedProspects(
  prospects: DiscoveredProspect[],
  contacts: Map<string, ContactabilityRecord>,
): RankedPreparedProspect[] {
  const orgCounts = new Map<string, number>();
  for (const prospect of prospects) {
    orgCounts.set(prospect.organization, (orgCounts.get(prospect.organization) ?? 0) + 1);
  }
  return [...prospects]
    .map((prospect) => {
      const contactability = contacts.get(prospect.prospectId) ?? {
        status: "CONTACT_CHANNEL_NOT_YET_IDENTIFIED" as const,
        channel: null,
        sourceUrl: null,
        scope: null,
        observedAt: new Date().toISOString(),
      };
      const draft = isActionableContact(contactability) ? prepareValidationDraft({ ...prospect, contactability }) : null;
      return {
        rank: 0,
        prospect,
        contactability,
        informationValue: scoreInformationValue(prospect, contactability, orgCounts),
        draft,
      };
    })
    .sort((left, right) => right.informationValue - left.informationValue)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function campaignLineage(input: { experimentId: string; candidateId: string; missionId: string }): CampaignLineage {
  return {
    source: "public_professional_outreach",
    medium: "direct_professional_contact",
    campaign: INITIAL_COHORT_CAMPAIGN,
    experimentId: input.experimentId,
    candidateId: input.candidateId,
    artifactId: getActivePublicValidationArtifactId(),
    missionId: input.missionId,
    messagesSent: 0,
  };
}

export function discoveryStopReason(input: {
  highConfidence: number;
  fetches: number;
  maxFetches: number;
  queries: number;
  organizations: number;
}): string {
  if (input.highConfidence >= 8) return "COHORT_CAP_REACHED";
  if (input.fetches >= input.maxFetches || input.queries >= 6) return "BOUNDED_RESEARCH_BUDGET_EXHAUSTED";
  if (input.highConfidence > 0 && input.organizations >= 3) return "DIMINISHING_MARGINAL_INFORMATION_VALUE";
  return "BOUNDED_RESEARCH_BUDGET_EXHAUSTED";
}

export function resolvePreparationBlocker(input: {
  highConfidence: number;
  actionable: number;
  drafts: number;
  pathsExhausted: boolean;
  searchConfigurationMissing?: boolean;
  capabilityMissing?: boolean;
  classification?: string | null;
}): string {
  if (input.searchConfigurationMissing) return "PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED";
  if (input.capabilityMissing && input.highConfidence === 0) return "LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED";
  if (input.classification === "TIMEOUT" || input.classification === "RATE_LIMIT") return "RESEARCH_EXECUTION_RETRY_REQUIRED";
  if (input.actionable > 0 && input.drafts > 0 && executableCommunicationCapability()) {
    return "FOUNDER_COMMUNICATIONS_AUTHORIZATION_REQUIRED";
  }
  if (input.actionable > 0 && input.drafts > 0) return "COMMUNICATION_PROVIDER_CAPABILITY_REQUIRED";
  if (input.highConfidence > 0) return "ACQUISITION_PREPARATION_INCOMPLETE";
  if (input.pathsExhausted) return "NO_QUALIFIED_PUBLIC_PROSPECTS_FOUND";
  return "ACQUISITION_PREPARATION_INCOMPLETE";
}
