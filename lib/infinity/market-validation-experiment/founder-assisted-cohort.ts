import { getActivePublicValidationUrl } from "./active-public-artifact";
import { CRE_CANDIDATE_ID, DEPLOYED_SEO_GEO_SUCCESSOR_URL, LOCKED_CRE_EXPERIMENT_ID } from "./constants";

export const FOUNDER_ASSISTED_FIRST_COHORT_MAX = 8 as const;
export const FOUNDER_ASSISTED_CAMPAIGN = "cre_validation_first_8_v1" as const;
export const FOUNDER_PROSPECT_INPUT_REQUIRED = "FOUNDER_PROSPECT_INPUT_REQUIRED" as const;
export const EXPLICIT_FOUNDER_COMMUNICATIONS_AUTHORIZATION =
  "EXPLICIT_FOUNDER_COMMUNICATIONS_AUTHORIZATION" as const;

export type FounderApprovedProspect = {
  id: string;
  name: string;
  role: string;
  source: "founder_known" | "founder_provided" | "founder_approved_named" | "first_degree_introduction";
};

const FOUNDER_APPROVED_PROSPECTS: FounderApprovedProspect[] = [];

export function founderApprovedProspects(): FounderApprovedProspect[] {
  return [...FOUNDER_APPROVED_PROSPECTS];
}

export function inspectFounderProspectAvailability(): {
  count: number;
  founderProspectInputRequired: boolean;
  fabricatedProspects: false;
  scrapedProspects: false;
  purchasedLeads: false;
  status: typeof FOUNDER_PROSPECT_INPUT_REQUIRED | "AVAILABLE";
} {
  const count = FOUNDER_APPROVED_PROSPECTS.length;
  return {
    count,
    founderProspectInputRequired: count === 0,
    fabricatedProspects: false,
    scrapedProspects: false,
    purchasedLeads: false,
    status: count === 0 ? FOUNDER_PROSPECT_INPUT_REQUIRED : "AVAILABLE",
  };
}

export function founderAssistedOutreachTemplate(input: { compliantArtifactLive: boolean }): {
  template: string;
  finishedProductClaim: false;
  fabricatedTraction: false;
  earlyValidationDisclosure: "PASS";
  includesLiveUrl: boolean;
} {
  const urlLine = input.compliantArtifactLive
    ? `If useful, the early-access page is here: ${getActivePublicValidationUrl() ?? DEPLOYED_SEO_GEO_SUCCESSOR_URL}`
    : "I will send the public page only after the compliant validation page is live — I am not asking you to visit the current draft.";
  const template = [
    "Hi — I am reaching out because you already do tenant-rep / independent CRE lease comparison work, and I wanted a candid read from someone who actually rebuilds these models.",
    "I am testing an early validation / pilot concept: a focused workflow for comparing commercial lease economics (step-ups, CAM, percentage rent, TI, free rent, NPV, and discount-rate sensitivity) and sharing a client summary — not a finished product, and not something people already rely on.",
    urlLine,
    "Would that workflow be useful in your current deals? If so, I would also value which pricing shape feels more honest: a $290/year professional seat or $149 per deal. No purchase is being collected; this is interest and pilot feedback only.",
  ].join("\n\n");
  return {
    template,
    finishedProductClaim: false,
    fabricatedTraction: false,
    earlyValidationDisclosure: "PASS",
    includesLiveUrl: input.compliantArtifactLive,
  };
}

export function founderAssistedMissionProvenance() {
  return {
    source: "founder_assisted_introduction" as const,
    medium: "direct_introduction" as const,
    campaign: FOUNDER_ASSISTED_CAMPAIGN,
    experiment: LOCKED_CRE_EXPERIMENT_ID,
    candidate: CRE_CANDIDATE_ID,
    messagesSent: 0,
    followUps: 0,
    providerFinancialSpend: "NOT_APPLICABLE" as const,
    economicCost: "UNKNOWN" as const,
    founderTime: "UNKNOWN" as const,
    communicationsAuthorizationRequired: EXPLICIT_FOUNDER_COMMUNICATIONS_AUTHORIZATION,
  };
}
