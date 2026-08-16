import type { HitlNecessityLevel, ResourceDepthClassification } from "../constants";
import type {
  EEATReadiness,
  HumanContributionRequest,
  HumanExpertiseContributionPlan,
  PageOpportunity,
} from "../types";

export function assessEEATReadiness(
  opportunity: PageOpportunity,
  depth: ResourceDepthClassification,
): EEATReadiness {
  const experienceGaps: string[] = [];
  const experienceStrengths: string[] = [];
  if (/first.?party|case study|our experience/i.test(opportunity.proposedPurpose)) {
    experienceGaps.push("First-party experience required but not yet verified");
  } else {
    experienceStrengths.push("No fabricated first-person claims planned");
  }

  const expertiseGaps =
    depth === "DEFINITIVE_RESOURCE" && opportunity.evidenceAvailability < 0.7
      ? ["Qualified expert review may strengthen technical depth"]
      : [];
  const expertiseStrengths = ["Technical terminology aligned to entity and intent"];

  const authorityStrengths = depth === "DEFINITIVE_RESOURCE" ? ["Comprehensive topical coverage planned"] : [];
  const authorityGaps = opportunity.citationPotential > 0.7 ? [] : ["Citation-worthiness could be improved with primary sources"];

  const trustStrengths = ["Claim traceability via evidence plan"];
  const trustGaps =
    opportunity.evidenceAvailability < 0.5 ? ["Some factual claims lack source-backed evidence"] : [];

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    experience: { strengths: experienceStrengths, gaps: experienceGaps },
    expertise: { strengths: expertiseStrengths, gaps: expertiseGaps },
    authoritativeness: { strengths: authorityStrengths, gaps: authorityGaps },
    trust: { strengths: trustStrengths, gaps: trustGaps },
  };
}

export function classifyHitlNecessity(
  opportunity: PageOpportunity,
  depth: ResourceDepthClassification,
  pageClass?: string,
): HumanExpertiseContributionPlan {
  const regulated =
    pageClass === "regulated" ||
    /medical|legal|financial|regulated|compliance/i.test(opportunity.proposedPurpose);
  const caseStudyWithoutData = pageClass === "case_study_no_data";
  const definitive = depth === "DEFINITIVE_RESOURCE";

  let necessityLevel: HitlNecessityLevel = "NOT_NEEDED";
  const contributionTypes: string[] = [];
  let reason = "Automated quality gates sufficient";
  let publicationBlocking = false;

  if (caseStudyWithoutData) {
    necessityLevel = "REQUIRED_FOR_PUBLICATION";
    contributionTypes.push("FIRST_PARTY_EXPERIENCE", "CASE_STUDY_INPUT");
    reason = "Case study resource requires verified first-party evidence";
    publicationBlocking = true;
  } else if (regulated) {
    necessityLevel = "REQUIRED_FOR_PUBLICATION";
    contributionTypes.push("LEGAL_COMPLIANCE_REVIEW", "FACT_CHECK");
    reason = "Regulated/high-risk content requires professional verification";
    publicationBlocking = true;
  } else if (definitive && opportunity.citationPotential > 0.7) {
    necessityLevel = "RECOMMENDED";
    contributionTypes.push("SUBJECT_MATTER_EXPERT_REVIEW");
    reason = "Strategic definitive resource may benefit from SME review";
  } else if (opportunity.geographicContext?.neighborhood && opportunity.evidenceAvailability < 0.55) {
    necessityLevel = "OPTIONAL_ENRICHMENT";
    contributionTypes.push("LOCAL_EXPERTISE");
    reason = "Local expertise may strengthen neighborhood differentiation";
  }

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    necessityLevel,
    contributionTypes,
    reason,
    publicationBlocking,
  };
}

export function buildHumanContributionRequests(
  plans: HumanExpertiseContributionPlan[],
  ventureId: string,
): HumanContributionRequest[] {
  return plans
    .filter((p) => p.necessityLevel === "REQUIRED_FOR_PUBLICATION" || p.necessityLevel === "RECOMMENDED")
    .map((plan, index) => ({
      requestId: `hcr-${plan.pageOpportunityId}-${index + 1}`,
      ventureId,
      pageId: plan.pageOpportunityId,
      contributionType: plan.contributionTypes[0] ?? "SUBJECT_MATTER_EXPERT_REVIEW",
      reason: plan.reason,
      questions: [`Verify factual accuracy for page ${plan.pageOpportunityId}`],
      requestedEvidence: plan.publicationBlocking ? ["Primary source or firsthand evidence"] : [],
      priority: plan.publicationBlocking ? 1 : 3,
      publicationBlocking: plan.publicationBlocking,
      status: "NOT_REQUESTED" as const,
      createdAt: new Date().toISOString(),
    }));
}

export function assertNoFabricatedExperience(contentSample: string): boolean {
  const banned = [
    /we have seen/i,
    /in our experience/i,
    /our customers typically/i,
    /we recently handled/i,
    /our team has found/i,
  ];
  return !banned.some((pattern) => pattern.test(contentSample));
}
