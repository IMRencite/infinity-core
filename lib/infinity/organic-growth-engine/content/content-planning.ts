import type { FollowUpAssignment, ResourceDepthClassification } from "../constants";
import type {
  ClaimGraph,
  ContentCompletenessScore,
  EvidencePlan,
  InformationGainPlan,
  OrganicContentContract,
  PageOpportunity,
  TopicCoverageMap,
} from "../types";

export function classifyResourceDepth(opportunity: PageOpportunity): ResourceDepthClassification {
  if (opportunity.pageType === "homepage") {
    return "STANDARD_RESOURCE";
  }
  if (opportunity.authorityRelationship.includes("hub") || opportunity.pageType === "guide") {
    return "DEFINITIVE_RESOURCE";
  }
  if (opportunity.pageType === "question" && opportunity.aiAnswerDemandSignal.level > 0.65) {
    return opportunity.contentDepthPotential > 0.7 ? "DEEP_RESOURCE" : "STANDARD_RESOURCE";
  }
  if (opportunity.pageType === "question" && opportunity.contentDepthPotential < 0.4) {
    return "DIRECT_RESPONSE";
  }
  if (opportunity.pageType === "comparison") {
    return "DEEP_RESOURCE";
  }
  if (opportunity.citationPotential > 0.65) return "DEFINITIVE_RESOURCE";
  return "STANDARD_RESOURCE";
}

export function buildTopicCoverageMap(opportunity: PageOpportunity): TopicCoverageMap {
  const followUps = buildFollowUpQuestions(opportunity);
  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    primaryTopic: opportunity.proposedTopic,
    userNeed: opportunity.proposedPurpose,
    relatedQuestions: followUps.map((f) => f.question),
    entitiesToExplain: [opportunity.primaryEntity, ...opportunity.secondaryEntities].filter(Boolean),
    attributesThatMatter: inferAttributes(opportunity),
    terminologyToDefine: inferTerms(opportunity),
    comparisonsNeeded: opportunity.pageType === "comparison" ? [opportunity.proposedTopic] : [],
    decisionsReaderMustMake: inferDecisions(opportunity),
    risksAndMistakes: [`Common mistakes when evaluating ${opportunity.primaryEntity}`],
    implementationInformation: opportunity.pageType === "guide" ? [`How to implement ${opportunity.primaryEntity}`] : [],
    evidenceRequired: opportunity.evidenceAvailability < 0.6 ? ["Primary or official sources required for factual claims"] : [],
    factualClaimsRequiringSources: opportunity.evidenceAvailability < 0.75 ? [`Claims about ${opportunity.primaryEntity}`] : [],
    expertKnowledgeNeeded:
      opportunity.citationPotential > 0.7 ? [`Expert interpretation of ${opportunity.primaryEntity}`] : [],
    followUpQuestions: followUps,
    coverageComplete: opportunity.contentDepthPotential >= 0.45,
  };
}

function buildFollowUpQuestions(
  opportunity: PageOpportunity,
): Array<{ question: string; assignment: FollowUpAssignment }> {
  const questions: Array<{ question: string; assignment: FollowUpAssignment }> = [
    {
      question: `How much does ${opportunity.primaryEntity} cost?`,
      assignment: opportunity.pageType === "comparison" ? "ANSWER_ON_PAGE" : "DEDICATED_SPOKE",
    },
    {
      question: `What are alternatives to ${opportunity.primaryEntity}?`,
      assignment: opportunity.pageType === "comparison" ? "ANSWER_ON_PAGE" : "DEDICATED_SPOKE",
    },
    {
      question: `Is ${opportunity.primaryEntity} right for me?`,
      assignment: "ANSWER_ON_PAGE",
    },
  ];

  if (opportunity.pageType === "question") {
    questions.push({
      question: `What are the next steps after understanding ${opportunity.proposedTopic}?`,
      assignment: "FAQ",
    });
  }

  if (opportunity.geographicContext?.neighborhood) {
    questions.push({
      question: `How does ${opportunity.geographicContext.neighborhood} differ from other ${opportunity.geographicContext.city} neighborhoods?`,
      assignment: "ANSWER_ON_PAGE",
    });
  }

  return questions;
}

function inferAttributes(opportunity: PageOpportunity): string[] {
  if (opportunity.pageType === "product") return ["Specifications", "Use cases", "Limitations", "Pricing if verified"];
  if (opportunity.pageType === "city" || opportunity.pageType === "neighborhood") {
    return ["Service relevance", "Access/logistics", "Local entities", "Customer considerations"];
  }
  return ["Definition", "Benefits", "Constraints", "Decision criteria"];
}

function inferTerms(opportunity: PageOpportunity): string[] {
  return opportunity.secondaryEntities.slice(0, 4);
}

function inferDecisions(opportunity: PageOpportunity): string[] {
  if (/commercial|transactional|comparison/.test(opportunity.primaryIntent)) {
    return [`Whether to choose ${opportunity.primaryEntity}`, "Budget and timing considerations"];
  }
  return [`Whether ${opportunity.primaryEntity} applies to the reader's situation`];
}

export function buildInformationGainPlan(
  opportunity: PageOpportunity,
  allApprovedTopics: string[],
): InformationGainPlan {
  const similar = allApprovedTopics.filter(
    (t) => t !== opportunity.proposedTopic && tokenOverlap(t, opportunity.proposedTopic) > 0.6,
  );
  const gainTypes: string[] = [];
  if (opportunity.uniquenessPotential > 0.6) gainTypes.push("deeper explanation");
  if (opportunity.pageType === "comparison") gainTypes.push("structured comparisons");
  if (opportunity.geographicContext?.neighborhood) gainTypes.push("verified local facts");
  if (opportunity.citationPotential > 0.65) gainTypes.push("original analysis");
  if (opportunity.pageType === "question") gainTypes.push("decision frameworks");

  const meaningfulGainEstablished =
    gainTypes.length > 0 &&
    opportunity.uniquenessPotential >= 0.35 &&
    !(similar.length > 0 && opportunity.uniquenessPotential < 0.45);

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    informationGainTypes: gainTypes.length ? gainTypes : ["contextual explanation"],
    contributionSummary: meaningfulGainEstablished
      ? `This page contributes ${gainTypes.join(", ")} not adequately covered elsewhere.`
      : "Insufficient distinct information gain versus existing/planned pages.",
    meaningfulGainEstablished,
    mergeTargetPageId: meaningfulGainEstablished ? undefined : similar[0],
  };
}

function tokenOverlap(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter += 1;
  return inter / Math.max(setA.size, setB.size, 1);
}

export function buildEvidencePlan(opportunity: PageOpportunity): EvidencePlan {
  const needsEvidence =
    opportunity.evidenceAvailability < 0.8 ||
    /regulation|compliance|statistic|pricing|specification/i.test(opportunity.proposedPurpose);

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    claimsRequiringEvidence: needsEvidence
      ? [
          {
            claim: `Factual statements about ${opportunity.primaryEntity}`,
            preferredSourceTypes: [
              "primary/official sources",
              "government/regulatory sources",
              "authoritative industry organizations",
            ],
            section: "main content",
          },
        ]
      : [],
    sourceHierarchy: [
      "primary/official sources",
      "government/regulatory sources",
      "academic/research sources",
      "authoritative industry organizations",
      "verified first-party data",
      "reputable secondary sources",
    ],
  };
}

export function buildClaimGraph(opportunity: PageOpportunity, evidencePlan: EvidencePlan): ClaimGraph {
  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    claims: evidencePlan.claimsRequiringEvidence.map((item, index) => ({
      claimId: `${opportunity.pageOpportunityId}:claim:${index + 1}`,
      pageId: opportunity.pageOpportunityId,
      statement: item.claim,
      claimType: "FACT" as const,
      importance: 0.8,
      sourceRequired: true,
      sources: [],
      confidence: opportunity.evidenceAvailability,
      freshness: "review_before_publication",
    })),
  };
}

export function buildOrganicContentContract(
  opportunity: PageOpportunity,
  depth: ResourceDepthClassification,
): OrganicContentContract {
  const directAnswerRequired =
    opportunity.pageType === "question" || opportunity.aiAnswerDemandSignal.level > 0.55;

  return {
    pageOpportunityId: opportunity.pageOpportunityId,
    primaryQueryIntent: opportunity.proposedTopic,
    primaryAnswerIntent: opportunity.proposedPurpose,
    primaryEntity: opportunity.primaryEntity,
    supportingEntities: opportunity.secondaryEntities,
    titleIntent: `${opportunity.proposedTopic} — useful, specific, non-clickbait`,
    h1Intent: opportunity.proposedTopic,
    directAnswerRequired,
    directAnswerTargetLength: directAnswerRequired ? (depth === "DIRECT_RESPONSE" ? 80 : 150) : undefined,
    sections: buildSections(opportunity, depth),
    questionsAnswered: opportunity.pageType === "question" ? [opportunity.proposedTopic] : [],
    evidenceRequirements:
      opportunity.evidenceAvailability < 0.75 ? ["Source-backed factual claims", "No fabricated statistics"] : [],
    authoritySourceRequirements: ["Prefer primary/official sources where applicable"],
    internalLinkRequirements: ["Parent hub", "Related siblings", "Conversion destination when relevant"],
    conversionGoal: opportunity.conversionRelationship,
    schemaRequirements: [],
    freshnessRequirement: depth === "DEFINITIVE_RESOURCE" ? "Review every 90 days or when material facts change" : undefined,
    resourceDepth: depth,
  };
}

function buildSections(
  opportunity: PageOpportunity,
  depth: ResourceDepthClassification,
): Array<{ heading: string; purpose: string }> {
  const sections = [{ heading: "Overview", purpose: "Establish context and primary intent" }];
  if (opportunity.pageType === "question") {
    sections.unshift({ heading: "Direct answer", purpose: "Concise answer-first extraction for humans and answer engines" });
  }
  if (depth === "DEEP_RESOURCE" || depth === "DEFINITIVE_RESOURCE") {
    sections.push(
      { heading: "How it works", purpose: "Detailed explanation" },
      { heading: "Examples", purpose: "Practical examples where useful" },
      { heading: "Risks and mistakes", purpose: "Help reader avoid errors" },
    );
  }
  if (depth === "DEFINITIVE_RESOURCE") {
    sections.push(
      { heading: "Decision framework", purpose: "Help reader choose correctly" },
      { heading: "Sources and methodology", purpose: "Trust and traceability" },
    );
  }
  return sections;
}

export function calculateContentCompleteness(
  opportunity: PageOpportunity,
  coverage: TopicCoverageMap,
  informationGain: InformationGainPlan,
  evidence: EvidencePlan,
): ContentCompletenessScore {
  const factors = [
    coverage.coverageComplete ? 1 : 0.4,
    informationGain.meaningfulGainEstablished ? 1 : 0.2,
    evidence.claimsRequiringEvidence.length === 0 || opportunity.evidenceAvailability >= 0.5 ? 0.9 : 0.3,
    opportunity.contentDepthPotential,
    opportunity.thinContentRisk < 0.4 ? 1 : 0.2,
  ];
  const score = Math.round((factors.reduce((a, b) => a + b, 0) / factors.length) * 100);
  let decision: ContentCompletenessScore["decision"] = "PASS";
  const gaps: string[] = [];
  if (!coverage.coverageComplete) gaps.push("Incomplete topic coverage map");
  if (!informationGain.meaningfulGainEstablished) gaps.push("Insufficient information gain");
  if (evidence.claimsRequiringEvidence.length > 0 && opportunity.evidenceAvailability < 0.5) {
    gaps.push("Evidence plan not satisfiable");
  }
  if (score < 45) decision = "REJECT";
  else if (score < 55) decision = "EXPAND";
  else if (!informationGain.meaningfulGainEstablished) decision = "MERGE";
  return { pageOpportunityId: opportunity.pageOpportunityId, score, decision, gaps };
}
