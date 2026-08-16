import type { OrganicChannelViabilityInput, VentureOrganicContext } from "../types";

export const TEST_VENTURE_A_HIGH_VALUE_B2B: VentureOrganicContext = {
  ventureId: "test-venture-a-b2b",
  ventureName: "Apex Charter Solutions",
  domain: "apex-charter-example.com",
  businessSummary:
    "Premium B2B charter coordination platform for executives requiring complex multi-leg travel with compliance and concierge support.",
  targetCustomer: "Corporate travel managers and UHNW executive assistants",
  problem: "Coordinating premium charter travel is fragmented, opaque, and high-risk for enterprise buyers.",
  solution: "Unified charter coordination with route planning, empty-leg optimization, and compliance documentation",
  primaryMonetizationModel: "high_ticket_brokerage",
  distributionStrategy: "SEO, GEO, enterprise outbound, partner referrals",
  customerLifetimeValue: 85000,
  averageOrderValue: 42000,
  conversionRateEstimate: 0.008,
  ventureType: "b2b_marketplace",
  secondaryVentureTypes: ["services"],
  economicTargets: { expectedTimeToRevenue: 90, targetCAC: 12000 },
  budgetEnvelope: { contentBudget: 150000 },
  acquisitionArchitecture: { primaryChannel: "SEO/GEO", channels: [{ channel: "SEO/GEO", role: "primary" }] },
  contentArchitecture: {
    urlRoot: "charter-coordination",
    useCases: [
      "Executive roadshow routing",
      "Medical evacuation coordination",
      "Sports team travel",
      "Empty leg optimization",
    ],
    routes: [
      "New York to Miami",
      "Los Angeles to Aspen",
      "Chicago to Dallas",
      "San Francisco to Seattle",
    ],
    features: ["Route optimizer", "Compliance vault", "Empty leg alerts", "Concierge desk"],
  },
};

export const TEST_VENTURE_B_NARROW_SAAS: VentureOrganicContext = {
  ventureId: "test-venture-b-saas",
  ventureName: "InvoicePulse",
  domain: "invoicepulse-example.com",
  businessSummary: " Narrow SaaS for freelancers to automate invoice reminders and payment follow-ups.",
  targetCustomer: "Solo freelancers and micro-agencies",
  problem: "Freelancers lose revenue chasing late invoice payments manually.",
  solution: "Automated invoice reminder workflows with payment link tracking",
  primaryMonetizationModel: "saas_subscription",
  distributionStrategy: "Product-led growth, limited SEO",
  customerLifetimeValue: 480,
  averageOrderValue: 19,
  conversionRateEstimate: 0.03,
  ventureType: "saas",
  economicTargets: { expectedTimeToRevenue: 30 },
  acquisitionArchitecture: { primaryChannel: "PLG", channels: [{ channel: "PLG", role: "primary" }] },
  contentArchitecture: {
    urlRoot: "invoice-automation",
    features: ["Reminder sequences", "Payment tracking", "Client portal"],
    useCases: ["Late payment recovery", "Retainer billing"],
  },
};

export const TEST_VENTURE_C_ECOMMERCE: VentureOrganicContext = {
  ventureId: "test-venture-c-ecommerce",
  ventureName: "TrailForge Outfitters",
  domain: "trailforge-example.com",
  businessSummary: "Ecommerce brand selling technical outdoor gear with expert buying guides.",
  targetCustomer: "Serious hikers and mountaineers",
  problem: "Hard to choose technical gear without trustworthy comparisons and fit guidance.",
  solution: "Curated gear catalog with expert guides and comparison tools",
  primaryMonetizationModel: "ecommerce",
  distributionStrategy: "SEO, content marketing, paid social",
  customerLifetimeValue: 620,
  averageOrderValue: 145,
  conversionRateEstimate: 0.025,
  ventureType: "ecommerce",
  secondaryVentureTypes: ["content"],
  acquisitionArchitecture: { primaryChannel: "SEO", channels: [{ channel: "SEO", role: "primary" }] },
  contentArchitecture: {
    urlRoot: "outdoor-gear",
    features: ["Backpacks", "Shell jackets", "Mountaineering boots", "Climbing harnesses"],
    useCases: ["Alpine trekking", "Day hiking", "Winter mountaineering"],
  },
};

export const TEST_VENTURE_D_LOW_VALUE: VentureOrganicContext = {
  ventureId: "test-venture-d-low-value",
  ventureName: "ClickBuzz Widgets",
  domain: "clickbuzz-example.com",
  businessSummary: "Low-margin ad-supported browser widgets with minimal differentiation.",
  targetCustomer: "Casual web users",
  problem: "Users want trivial browser distractions.",
  solution: "Ad-supported mini widgets",
  primaryMonetizationModel: "advertising",
  distributionStrategy: "Viral sharing",
  customerLifetimeValue: 0.35,
  averageOrderValue: 0.02,
  conversionRateEstimate: 0.001,
  ventureType: "consumer_utility",
  acquisitionArchitecture: { primaryChannel: "Viral", channels: [{ channel: "Viral", role: "primary" }] },
};

export const TEST_VENTURE_E_LOCAL_SERVICE: VentureOrganicContext = {
  ventureId: "test-venture-e-local",
  ventureName: "Summit HVAC Pros",
  domain: "summithvac-example.com",
  businessSummary: "Regional HVAC installation and emergency repair with premium service tiers.",
  targetCustomer: "Homeowners and small commercial property managers",
  problem: "Finding reliable HVAC service with transparent pricing is difficult.",
  solution: "Premium HVAC service with same-day emergency response",
  primaryMonetizationModel: "local_services",
  distributionStrategy: "Local SEO, Google Business Profile, referrals",
  customerLifetimeValue: 2800,
  averageOrderValue: 850,
  conversionRateEstimate: 0.04,
  ventureType: "local_service",
  acquisitionArchitecture: { primaryChannel: "Local SEO", channels: [{ channel: "Local SEO", role: "primary" }] },
  contentArchitecture: {
    geoUrlRoot: "service-area",
    geography: {
      cities: ["Cleveland", "Akron"],
      neighborhoods: [
        {
          name: "Ohio City",
          city: "Cleveland",
          evidenceConfidence: "SOURCE_BACKED",
          metadata: {
            differentiation: 0.72,
            neighborhoodSearchIntent: 0.68,
            serviceRelevance: 0.85,
            geographicDistinctness: 0.7,
            localEntityDensity: 0.65,
            localCharacteristics: ["Historic district with older housing stock requiring specialized ductwork"],
            localEntities: ["West Side Market", "Ohio City Red Line station"],
            verifiedEvidence: ["City of Cleveland neighborhood profile"],
          },
        },
        {
          name: "Tremont",
          city: "Cleveland",
          evidenceConfidence: "DERIVED",
          metadata: {
            differentiation: 0.62,
            neighborhoodSearchIntent: 0.55,
            serviceRelevance: 0.75,
            geographicDistinctness: 0.58,
            localEntityDensity: 0.5,
            localCharacteristics: ["Dense residential mix, parking constraints for service vehicles"],
            localEntities: ["Lincoln Park"],
            verifiedEvidence: [],
          },
        },
        {
          name: "Generic Subdivision",
          city: "Cleveland",
          evidenceConfidence: "UNKNOWN",
          metadata: {
            differentiation: 0.15,
            neighborhoodSearchIntent: 0.12,
            serviceRelevance: 0.3,
            geographicDistinctness: 0.1,
            localEntityDensity: 0.05,
          },
        },
        {
          name: "Highland Square",
          city: "Akron",
          evidenceConfidence: "DERIVED",
          metadata: {
            differentiation: 0.55,
            neighborhoodSearchIntent: 0.48,
            serviceRelevance: 0.7,
            geographicDistinctness: 0.52,
            localCharacteristics: ["Mixed-use corridor with older commercial HVAC systems"],
            verifiedEvidence: ["Akron city planning document reference"],
          },
        },
        {
          name: "Wallhaven",
          city: "Akron",
          evidenceConfidence: "ESTIMATED",
          metadata: {
            differentiation: 0.22,
            neighborhoodSearchIntent: 0.18,
            serviceRelevance: 0.35,
            geographicDistinctness: 0.2,
          },
        },
      ],
    },
  },
};

export const TEST_VENTURE_I_MASSIVE_COMBINATORIAL: VentureOrganicContext = {
  ...TEST_VENTURE_A_HIGH_VALUE_B2B,
  ventureId: "test-venture-i-1000-page",
  ventureName: "Apex Charter Combinatorial Test",
  contentArchitecture: {
    ...TEST_VENTURE_A_HIGH_VALUE_B2B.contentArchitecture,
    geography: {
      cities: Array.from({ length: 25 }, (_, i) => `Metro Area ${i + 1}`),
    },
    useCases: Array.from({ length: 20 }, (_, i) => `Use case cluster ${i + 1}`),
    routes: Array.from({ length: 40 }, (_, i) => `Route pair ${i + 1}`),
  },
};

export function buildViabilityInput(context: VentureOrganicContext): OrganicChannelViabilityInput {
  const clv = context.customerLifetimeValue ?? 100;
  const isLowValue = clv < 5;
  const isHighValue = clv > 10000;
  const isLocal = /local/.test(context.ventureType);
  const isSaaS = /saas/.test(context.ventureType);
  const seoFocused = /seo|organic|geo|local seo/i.test(context.distributionStrategy);

  return {
    searchDemand: isLowValue ? 0.12 : isHighValue ? 0.55 : isSaaS ? 0.35 : 0.5,
    aiAnswerDemand: isHighValue ? 0.6 : 0.4,
    commercialIntent: isHighValue ? 0.85 : isLowValue ? 0.15 : 0.45,
    customerValue: Math.min(1, clv / 50000),
    customerLifetimeValue: Math.min(1, clv / 50000),
    conversionPotential: isHighValue ? 0.7 : isLowValue ? 0.05 : 0.4,
    serpCompetition: isSaaS ? 0.75 : 0.5,
    answerEngineCompetition: 0.45,
    contentProductionCost: isHighValue ? 0.55 : isLowValue ? 0.8 : 0.45,
    researchCost: isHighValue ? 0.6 : 0.4,
    authorityRequirements: isHighValue ? 0.7 : isLowValue ? 0.85 : 0.5,
    timeToSignal: seoFocused ? 0.65 : 0.35,
    timeToRevenue: isLowValue ? 0.8 : 0.45,
    topicDepth: isHighValue ? 0.8 : isSaaS ? 0.35 : 0.55,
    entityDepth: isHighValue ? 0.75 : 0.4,
    geographicDepth: isLocal ? 0.8 : 0.25,
    questionDepth: isHighValue ? 0.75 : 0.4,
    comparisonDepth: /ecommerce|b2b|saas/.test(context.ventureType) ? 0.65 : 0.3,
    programmaticOpportunity: isHighValue ? 0.55 : isLowValue ? 0.2 : 0.35,
    contentDifferentiation: isLowValue ? 0.08 : isHighValue ? 0.7 : 0.5,
    evidenceAvailability: isHighValue ? 0.65 : isLowValue ? 0.12 : 0.5,
    brandRelevance: isLowValue ? 0.1 : 0.7,
    maintenanceRequirements: isHighValue ? 0.55 : 0.35,
    crawlIndexability: 0.8,
    expectedMarginalPageValue: isLowValue ? 0.02 : isHighValue ? 0.75 : 0.4,
    citationOpportunity: isHighValue ? 0.8 : 0.35,
    firstPartyInformationOpportunity: isHighValue ? 0.55 : 0.25,
  };
}

export const ALL_TEST_VENTURES: VentureOrganicContext[] = [
  TEST_VENTURE_A_HIGH_VALUE_B2B,
  TEST_VENTURE_B_NARROW_SAAS,
  TEST_VENTURE_C_ECOMMERCE,
  TEST_VENTURE_D_LOW_VALUE,
  TEST_VENTURE_E_LOCAL_SERVICE,
  TEST_VENTURE_I_MASSIVE_COMBINATORIAL,
];

export const HITL_TEST_PAGE_CLASSES = [
  { pageClass: "normal_informational", expected: "NOT_NEEDED" },
  { pageClass: "definitive_resource", expected: "RECOMMENDED" },
  { pageClass: "case_study_no_data", expected: "REQUIRED_FOR_PUBLICATION" },
  { pageClass: "regulated", expected: "REQUIRED_FOR_PUBLICATION" },
] as const;
