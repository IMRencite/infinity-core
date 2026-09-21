export const PAIN_CATEGORIES = [
  "PRICE",
  "COMPLEXITY",
  "SEO",
  "AEO",
  "CONTENT",
  "CUSTOMIZATION",
  "SUPPORT",
  "SPEED",
  "AUTOMATION",
  "INTEGRATIONS",
  "REPORTING",
  "ONBOARDING",
  "LOCK_IN",
  "QUALITY",
  "SERVICE",
  "OTHER",
] as const;

export type PainCategory = (typeof PAIN_CATEGORIES)[number];

export const DIFFERENTIATOR_TYPES = [
  "TABLE_STAKES",
  "INCREMENTAL_ADVANTAGE",
  "MEANINGFUL_DIFFERENTIATOR",
  "UNPROVEN_IDEA",
] as const;

export type DifferentiatorType = (typeof DIFFERENTIATOR_TYPES)[number];

export const CAPABILITY_STATUSES = [
  "ALREADY_PLANNED",
  "ALREADY_BUILT",
  "PARTIALLY_COVERED",
  "NEW_OPPORTUNITY",
  "UNKNOWN",
] as const;

export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

export const PRODUCT_ADVANTAGE_AUTHORITY = {
  canRecommend: true,
  canSuggest: true,
  canIdentify: true,
  canCompare: true,
  canPrioritizeCanonicalRoadmap: false,
  canAssignWork: false,
  canApproveBuild: false,
  canMutateRequirements: false,
  canLaunchFeatures: false,
} as const;

export type PainObservation = {
  problem: string;
  customerType: string | null;
  competitor: string | null;
  category: PainCategory;
  severity: "high" | "medium" | "low";
  frequencySignal: "repeated" | "single";
  sourceCount: number;
  sourceQuality: "HIGH" | "MEDIUM" | "LOW";
  evidenceText: string;
  sourceRefs: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  provenancePhrase: string;
};

export type PainCluster = {
  id: string;
  problem: string;
  category: PainCategory;
  evidenceCount: number;
  affectedCompetitors: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  severity: "high" | "medium" | "low";
  observations: PainObservation[];
  sourceQuality: "HIGH" | "MEDIUM" | "LOW";
  independenceNote: string;
};

export type ProductResponse = {
  customerProblem: string;
  whyItMatters: string;
  recommendedImprovement: string;
  featureCapability: string;
  prioritySignal: "high" | "medium" | "low";
  expectedCustomerBenefit: string;
  differentiationOpportunity: string;
  validationNeeded: string;
  capabilityStatus: CapabilityStatus;
  evidenceStrength: "Strong" | "Moderate" | "Weak";
  economicLink: string | null;
  readOnlyIntelligence: true;
};

export type CompetitorStrength = {
  strength: string;
  competitor: string | null;
  type: DifferentiatorType;
  evidenceText: string;
  sourceRefs: string[];
};

export type DifferentiatorCard = {
  idea: string;
  type: DifferentiatorType;
  evidenceStrength: "Strong" | "Moderate" | "Weak";
  customerImpact: string;
  competitorCoverage: string;
  validationNeeded: string;
};

export type PriceFeatureInsight = {
  competitor: string;
  price: string;
  includedCapabilities: string;
  customerPain: string;
  missingCapabilities: string;
  betterValueOpportunity: string;
};

export type FounderProductAdvantageView = {
  summary: {
    biggestPains: string[];
    bestOpportunities: string[];
    strongestDifferentiator: string;
    biggestThingToAvoid: string;
    evidenceStrength: "Strong" | "Moderate" | "Weak" | "Not enough evidence";
    whyThisCouldWin: string;
    whatCustomersHate: string;
    whatInfinityShouldDoDifferently: string;
    whatCustomersWouldLikelyPay: string;
    biggestEconomicUncertainty: string;
  };
  painClusters: PainCluster[];
  competitorStrengths: CompetitorStrength[];
  tableStakes: string[];
  recommendedImprovements: ProductResponse[];
  differentiators: DifferentiatorCard[];
  doNotCopy: string[];
  expectedByCustomers: string[];
  validationIdeas: string[];
  priceFeatureInsights: PriceFeatureInsight[];
  buildBetter: Array<{
    problem: string;
    whatCustomersDislike: string;
    infinityOpportunity: string;
    recommendedImprovement: string;
    whyItCouldWin: string;
    evidenceStrength: "Strong" | "Moderate" | "Weak";
  }>;
  authority: typeof PRODUCT_ADVANTAGE_AUTHORITY;
};
