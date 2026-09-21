import {
  AUTHORITY_GENERATION_FLOW,
  DEFAULT_AUTHORITY_URL_PATTERN,
  DEFAULT_AVOIDED_SOURCE_CLASSES,
  HARD_PUBLISHABILITY_GATES,
  INFINITY_PUBLIC_AUTHORITY_STANDARD_ID,
  INFINITY_PUBLIC_AUTHORITY_STANDARD_VERSION,
  LOCKED_QUALITY_FLOORS,
  PREFERRED_AUTHORITY_SOURCE_CLASSES,
  VISUAL_EVIDENCE_PRECEDENCE,
} from "./constants";
import type {
  InfinityPublicAuthorityStandard,
  PublicAuthorityPageContract,
  PublicAuthoritySiteProfile,
  PublicPageArchetype,
  SearchIntent,
  SearchQuestionEvidence,
} from "./types";
import { publicPageArchetype } from "./archetypes";

export const INFINITY_PUBLIC_AUTHORITY_STANDARD_PRINCIPLE =
  "All authority-led public ventures inherit the Infinity Public Authority & Digital Real Estate Standard. Venture-specific builds may extend or specialize the standard but may not silently weaken human readability, semantic topic architecture, search-backed question coverage, GEO answer surfaces, contextual internal linking, authoritative sourcing, conversion paths, visual quality, or rendered quality-control requirements.";

export function infinityPublicAuthorityStandard(): InfinityPublicAuthorityStandard {
  return {
    model: "InfinityPublicAuthorityStandard",
    version: "V1",
    principle: INFINITY_PUBLIC_AUTHORITY_STANDARD_PRINCIPLE,
    globalMinimums: LOCKED_QUALITY_FLOORS,
    defaultPolicies: {
      urlPattern: DEFAULT_AUTHORITY_URL_PATTERN,
      sourcePreference: [...PREFERRED_AUTHORITY_SOURCE_CLASSES],
      sourceAvoidance: [...DEFAULT_AVOIDED_SOURCE_CLASSES],
      visualEvidencePrecedence: [...VISUAL_EVIDENCE_PRECEDENCE],
      researchBeforeScale: true,
      boundedGeneration: true,
    },
    requiredProfiles: ["PublicAuthoritySiteProfile", "PublicAuthorityPageContract", "PageVisualPlan"],
    requiredGates: HARD_PUBLISHABILITY_GATES,
    allowedAdaptation: [
      "industry",
      "brand",
      "visual language",
      "topic taxonomy",
      "source policy additions",
      "page types",
      "conversion path wording",
      "legal constraints",
      "search demand",
      "content depth specialization",
      "width profile",
    ],
    overrideRules: {
      adHocBypass: false,
      silentWeakening: false,
      overrideModel: "PublicAuthorityStandardOverride",
    },
    publishabilityRequirements: {
      premiumState: "PREMIUM_AUTHORITY_VALIDATION_READY",
      allApplicableHardGates: true,
    },
    researchRequirements: {
      minValidatedQuestionsPerCoreTopic: 20,
      coverageIsNotPageCount: true,
      unknownVolumeIsNotZero: true,
    },
    renderedValidationRequirements: {
      founderEvidenceOutranksAutomation: true,
    },
    pageTemplatesAreArchetypes: true,
  };
}

export function emptySearchEvidence(retrievedAt: string): SearchQuestionEvidence {
  return {
    model: "SearchQuestionEvidence",
    evidenceClass: "SEARCH_DEMAND_UNKNOWN",
    demandClass: "SEARCH_DEMAND_UNKNOWN",
    monthlyVolume: null,
    rankingDifficulty: null,
    trafficEstimate: null,
    cpc: null,
    trend: null,
    fabricatedSearchVolume: false,
    unknownIsNotZero: true,
    source: "UNKNOWN",
    retrievedAt,
    observedPhrasing: "",
  };
}

function intentPath(intent: SearchIntent): string[] {
  if (intent === "INFORMATIONAL") return ["learn", "worked example", "related concept", "workflow"];
  if (intent === "COMMERCIAL_INVESTIGATION") return ["workflow", "comparison", "product", "pricing/pilot"];
  if (intent === "TRANSACTIONAL") return ["bounded action"];
  return ["orient", "related concept"];
}

export function buildPublicAuthorityPageContract(input: {
  pageArchetype: PublicPageArchetype;
  primaryTopic: string;
  primaryQuestion: string;
  secondaryQuestions?: string[];
  searchIntent?: SearchIntent;
  funnelStage?: PublicAuthorityPageContract["funnelStage"];
  targetPersona: string;
  searchDemandEvidence?: SearchQuestionEvidence | null;
}): PublicAuthorityPageContract {
  const archetype = publicPageArchetype(input.pageArchetype);
  const searchIntent = input.searchIntent ?? archetype.defaultSearchIntent;
  const qualifying =
    input.pageArchetype === "TOPIC_HUB" ||
    input.pageArchetype === "QUESTION_AUTHORITY" ||
    input.pageArchetype === "COMPARISON" ||
    input.pageArchetype === "PRODUCT" ||
    input.pageArchetype === "PRICING" ||
    input.pageArchetype === "PERSONA";
  const deep = input.pageArchetype === "QUESTION_AUTHORITY" || input.pageArchetype === "TOPIC_HUB";
  return {
    model: "PublicAuthorityPageContract",
    pageArchetype: input.pageArchetype,
    primaryTopic: input.primaryTopic,
    primaryQuestion: input.primaryQuestion,
    secondaryQuestions: input.secondaryQuestions ?? [],
    searchIntent,
    funnelStage: input.funnelStage ?? "CONSIDERATION",
    targetPersona: input.targetPersona,
    readabilityProfile: {
      target: "approximately 4th grade",
      activeVoice: true,
      maxParagraphWords: 150,
      jargonMustBeExplained: true,
      keywordStuffingRejected: true,
    },
    questionCoverageProfile: {
      primaryQuestionRequired: true,
      secondarySurfaces: archetype.minAnswerSurfaces,
    },
    semanticCoverageProfile: {
      requiredDimensions: deep
        ? ["definitions", "mechanics", "decision_questions", "limitations"]
        : ["definitions"],
    },
    answerSurfaceProfile: {
      minAnswerChunks: archetype.minAnswerSurfaces,
      variantChunksRejected: true,
    },
    citationReadinessProfile: {
      contextualCitationsRequired: deep || input.pageArchetype === "COMPARISON",
      sourceDumpOnlyRejected: true,
    },
    internalLinkProfile: {
      parentHubRequired: input.pageArchetype === "QUESTION_AUTHORITY",
      bodyContextRequired: deep,
      suggestedContextualRange: deep ? [6, 12] : null,
      countIsNotABlindQuota: true,
    },
    visualPlan: {
      aboveFoldMeaningfulVisual: qualifying,
      cssOnlyRejected: true,
      family: input.primaryTopic,
    },
    conversionPath: {
      searchIntent,
      steps: intentPath(searchIntent),
      transactionalForcedOnInformational: false,
    },
    schemaProfile: archetype.schema,
    responsiveLayoutProfile: {
      viewports: [1280, 1440, 390],
      overflowRejected: true,
    },
    authoritySourcePolicy: {
      preferred: [...PREFERRED_AUTHORITY_SOURCE_CLASSES],
      avoided: [...DEFAULT_AVOIDED_SOURCE_CLASSES],
    },
    publishabilityProfile: {
      premiumRequiresAllHardGates: true,
    },
    searchDemandEvidence: input.searchDemandEvidence ?? null,
    topicGraphRelationships: [],
    commercialPathRelationships: [],
    pageDepthPolicy: {
      minUsefulWords: archetype.contentDepth === "DEEP" ? 2000 : null,
      paddingRejected: true,
    },
    visualCoveragePolicy: {
      qualifyingArchetype: qualifying,
    },
    renderedQualityProfile: {
      composition: true,
      tables: true,
      deadSpace: true,
      textWall: true,
    },
  };
}

export function buildPublicAuthoritySiteProfile(input: {
  ventureId: string;
  industry: string;
  market: string;
  siteClass?: PublicAuthoritySiteProfile["siteClass"];
  audiences: string[];
  topicTaxonomy: string[];
  hubArchitecture: PublicAuthoritySiteProfile["hubArchitecture"];
  visualLanguage: string;
  legalConstraints?: string[];
  industryAuthorities?: string[];
}): PublicAuthoritySiteProfile {
  return {
    model: "PublicAuthoritySiteProfile",
    ventureId: input.ventureId,
    industry: input.industry,
    market: input.market,
    siteClass: input.siteClass ?? "AUTHORITY_LED",
    audiences: input.audiences,
    topicTaxonomy: input.topicTaxonomy,
    hubArchitecture: input.hubArchitecture,
    questionKnowledgeGraph: { model: "QuestionKnowledgeGraph", nodes: [], clusters: [], fabricatedSearchDemand: false },
    minimumValidatedQuestionsPerCoreTopic: 20,
    urlConventions: { authorityPattern: DEFAULT_AUTHORITY_URL_PATTERN, flatQuestionPagesRejected: true },
    internalLinkStrategy: "hub, prerequisite, sibling, cross-topic, comparison, workflow, persona, commercial next step",
    authoritySourcePolicy: {
      preferred: [...PREFERRED_AUTHORITY_SOURCE_CLASSES],
      avoided: [...DEFAULT_AVOIDED_SOURCE_CLASSES],
      industryAuthorities: input.industryAuthorities ?? [],
    },
    schemaPolicy: "schema describes what is on the page; no invented facts",
    readabilityPolicy: { target: "approximately 4th grade" },
    contentDepthPolicy: { standaloneMinUsefulWords: 2000, paddingRejected: true },
    visualLanguage: input.visualLanguage,
    visualAssetStrategy: {
      families: input.topicTaxonomy,
      reuseLimits: "reuse within a family is allowed; identical heroes across unrelated topics are not",
      altTextPolicy: "describe the editorial or diagram purpose; do not claim customer proof",
      performanceRules: "priority image in the first viewport; lazy-load later media",
    },
    ctaStrategy: "match search intent; do not force transactional CTAs onto early informational pages",
    commercialPathway: ["question", "direct answer", "deeper concept", "worked example", "comparison", "workflow", "bounded next step"],
    pageArchetypesEnabled: [
      "TOPIC_HUB",
      "QUESTION_AUTHORITY",
      "COMPARISON",
      "HOW_TO",
      "CALCULATOR_TOOL",
      "PRODUCT",
      "PRICING",
      "PERSONA",
      "LOCATION",
      "RESOURCE_LIBRARY",
      "ABOUT",
      "CONTACT",
      "LEGAL",
      "FAQ_COLLECTION",
    ],
    legalConstraints: input.legalConstraints ?? [],
    citationPolicy: "contextual authority links plus a designed Trusted Sources section",
    searchResearchPolicy: { researchBeforeScale: true, fabricatedVolumeRejected: true },
    topicalCompletenessPolicy: { coverageNotPageCount: true, qualifiedStandaloneTarget: 10 },
    sectionSurfacePolicy: {
      variants: ["DEFAULT", "SUBTLE", "TINTED", "EMPHASIS", "DARK_ACCENT", "EDITORIAL"],
      mechanicalStripingRejected: true,
      allWhiteMonotonyRejected: true,
    },
    publishabilityRequirements: [...HARD_PUBLISHABILITY_GATES],
    standardOverrides: [],
  };
}

export function standardIdentity() {
  return {
    id: INFINITY_PUBLIC_AUTHORITY_STANDARD_ID,
    version: INFINITY_PUBLIC_AUTHORITY_STANDARD_VERSION,
    flow: AUTHORITY_GENERATION_FLOW,
  };
}
