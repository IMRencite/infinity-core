import { classifyCapability, classifyTableStake, differentiatorType } from "./capability";
import { clusterPainObservations } from "./cluster";
import { extractCompetitorStrengths, extractPainObservations } from "./extract";
import type { FounderResearchPacket } from "../research-packet";
import type { FounderProductAdvantageView, PainCluster, ProductResponse } from "./types";
import { PRODUCT_ADVANTAGE_AUTHORITY } from "./types";

type Context = {
  proposedSolution: string | null;
  pricingHypothesis: string | null;
  businessModelHypothesis: string | null;
  targetCustomer: string | null;
};

function strengthLabel(confidence: "HIGH" | "MEDIUM" | "LOW"): "Strong" | "Moderate" | "Weak" {
  if (confidence === "HIGH") return "Strong";
  if (confidence === "MEDIUM") return "Moderate";
  return "Weak";
}

function responseFor(cluster: PainCluster, context: Context): ProductResponse {
  const templates: Record<string, Omit<ProductResponse, "capabilityStatus" | "evidenceStrength" | "readOnlyIntelligence">> = {
    SEO: {
      customerProblem: "Generic site builders create thin local-service pages that fail to rank.",
      whyItMatters: "Local businesses pay for websites that do not produce search visibility.",
      recommendedImprovement: "Generate structured service + location page architecture automatically from a knowledge base.",
      featureCapability: "Knowledge-base-driven service/location page generator",
      prioritySignal: "high",
      expectedCustomerBenefit: "More complete local-search coverage without manual page creation.",
      differentiationOpportunity: "Purpose-built local SEO/AEO architecture rather than a generic page builder.",
      validationNeeded: "Build 10 location/service pages for a sample business and compare index coverage versus a template site.",
      economicLink: "Manual SEO work → automation value proposition",
    },
    AEO: {
      customerProblem: "Sites are not structured for answer engines and AI search.",
      whyItMatters: "Discovery is shifting beyond classic Google results.",
      recommendedImprovement: "Publish entity-rich, answer-ready pages from the same knowledge base used for SEO.",
      featureCapability: "AEO/entity page templates",
      prioritySignal: "high",
      expectedCustomerBenefit: "The business can be found in AI search without a separate content team.",
      differentiationOpportunity: "CMS designed for SEO and AEO together.",
      validationNeeded: "Test whether generated entity pages are cited by AI search previews.",
      economicLink: null,
    },
    CUSTOMIZATION: {
      customerProblem: "Generated sites are hard to customize and owners cannot edit pages they care about.",
      whyItMatters: "Business owners abandon tools they cannot control.",
      recommendedImprovement: "Let owners edit generated pages without breaking structure, with locked SEO/AEO scaffolding.",
      featureCapability: "Structured editor with safe customization",
      prioritySignal: "high",
      expectedCustomerBenefit: "Control without destroying search architecture.",
      differentiationOpportunity: "Editable generated sites, not locked AI blobs.",
      validationNeeded: "Watch whether owners edit pages in the first 14 days.",
      economicLink: "lack of customization → premium-tier opportunity",
    },
    CONTENT: {
      customerProblem: "AI-generated pages read generic and thin.",
      whyItMatters: "Thin content fails both customers and search engines.",
      recommendedImprovement: "Generate from the business knowledge base (services, proof, locations) instead of stock copy.",
      featureCapability: "Knowledge-base-grounded content generation",
      prioritySignal: "high",
      expectedCustomerBenefit: "Pages that sound like the actual business.",
      differentiationOpportunity: "Grounded local content versus generic AI filler.",
      validationNeeded: "Side-by-side quality review versus a generic AI builder.",
      economicLink: null,
    },
    PRICE: {
      customerProblem: "Small businesses pay bundled agency retainers for services they may not need.",
      whyItMatters: "Forced bundles hide software value and raise the entry price.",
      recommendedImprovement: "Offer a modular platform plus optional managed services, not a mandatory agency package.",
      featureCapability: "Software-first pricing with optional service add-ons",
      prioritySignal: "high",
      expectedCustomerBenefit: "A lower entry price with the option to buy help later.",
      differentiationOpportunity: "Software-first pricing without a mandatory agency bundle.",
      validationNeeded: "Test willingness to pay for self-serve versus managed tiers.",
      economicLink: "high competitor price → pricing opportunity",
    },
    ONBOARDING: {
      customerProblem: "Launch and onboarding feel slow or opaque.",
      whyItMatters: "Slow setup delays first revenue and raises refund risk.",
      recommendedImprovement: "A guided knowledge-base onboarding that produces a launch-ready site in a bounded session.",
      featureCapability: "Guided launch onboarding",
      prioritySignal: "medium",
      expectedCustomerBenefit: "A live site without a long implementation project.",
      differentiationOpportunity: "Hours-to-launch versus weeks of agency setup.",
      validationNeeded: "Time a first-run onboarding with a real SMB owner.",
      economicLink: "poor onboarding → setup/service opportunity",
    },
    AUTOMATION: {
      customerProblem: "Owners still do too much manual SEO and page creation.",
      whyItMatters: "Manual work is the job they were trying to buy their way out of.",
      recommendedImprovement: "Automatically expand pages as the knowledge base and account level grow.",
      featureCapability: "Account-level automatic page growth",
      prioritySignal: "medium",
      expectedCustomerBenefit: "Coverage grows with the plan instead of with agency hours.",
      differentiationOpportunity: "Ongoing page generation, not a one-time brochure.",
      validationNeeded: "Measure pages published per month without extra labor.",
      economicLink: "manual SEO work → automation value proposition",
    },
  };
  const fallback = {
    customerProblem: cluster.problem,
    whyItMatters: "This friction shows up in competitor/customer evidence.",
    recommendedImprovement: "Investigate this pain with a bounded product experiment before treating it as a roadmap item.",
    featureCapability: "Discovery, not a committed feature",
    prioritySignal: cluster.severity,
    expectedCustomerBenefit: "Reduce a documented source of frustration.",
    differentiationOpportunity: "Only if the pain remains unmet after table-stakes are covered.",
    validationNeeded: "Confirm the complaint with two independent sources or a customer interview.",
    economicLink: null as string | null,
  };
  const template = templates[cluster.category] ?? fallback;
  const capabilityStatus = classifyCapability({
    improvement: template.recommendedImprovement,
    proposedSolution: context.proposedSolution,
  });
  return {
    ...template,
    capabilityStatus,
    evidenceStrength: strengthLabel(cluster.confidence),
    readOnlyIntelligence: true,
  };
}

function doNotCopy(clusters: PainCluster[]): string[] {
  const items: string[] = [];
  const add = (value: string) => {
    if (!items.includes(value)) items.push(value);
  };
  for (const cluster of clusters) {
    if (cluster.category === "PRICE") add("forced bundles / confusing pricing");
    if (cluster.category === "CONTENT" || cluster.category === "SEO") add("thin AI-generated pages");
    if (cluster.category === "CUSTOMIZATION") add("poor customization / locked generated pages");
    if (cluster.category === "REPORTING") add("opaque reporting");
    if (cluster.category === "COMPLEXITY") add("overwhelming product complexity");
  }
  return items;
}

export function buildProductAdvantage(input: {
  packet: FounderResearchPacket;
  context: Context;
  willingnessToPay?: string | null;
  economicUncertainty?: string | null;
}): FounderProductAdvantageView {
  const observations = extractPainObservations(input.packet);
  const clusters = clusterPainObservations(observations);
  const strengths = extractCompetitorStrengths(input.packet).map((item) => {
    const tableStake = Boolean(classifyTableStake(item.strength));
    return {
      ...item,
      type: differentiatorType({
        tableStake,
        evidenceCount: 1,
        competitorCoverage: item.competitor ? 1 : 0,
      }),
    };
  });
  const evidencedStakes = [
    ...new Set(strengths.map((item) => classifyTableStake(item.strength)).filter((item): item is string => Boolean(item))),
  ];
  const categoryStakes =
    /cms|website|site builder/i.test(input.context.proposedSolution ?? "") && strengths.length
      ? ["mobile editing", "templates", "analytics", "support", "hosting", "basic SEO"]
      : [];
  const tableStakes = [...new Set([...evidencedStakes, ...categoryStakes])];
  const improvements = clusters.filter((item) => item.evidenceCount >= 1).map((item) => responseFor(item, input.context));
  const differentiators = improvements
    .filter((item) => item.capabilityStatus !== "ALREADY_BUILT")
    .map((item) => ({
      idea: item.differentiationOpportunity,
      type: differentiatorType({
        tableStake: false,
        evidenceCount: clusters.find((cluster) => cluster.problem === item.customerProblem)?.evidenceCount ?? 1,
        competitorCoverage: 1,
      }),
      evidenceStrength: item.evidenceStrength,
      customerImpact: item.expectedCustomerBenefit,
      competitorCoverage: "Named in competitor/customer pain evidence",
      validationNeeded: item.validationNeeded,
    }));
  const priceInsights = clusters
    .filter((item) => item.category === "PRICE")
    .map((item) => ({
      competitor: item.affectedCompetitors[0] ?? "bundled local-marketing platforms",
      price: "Competitor packages in the managed/retainer band",
      includedCapabilities: "Website plus marketing services",
      customerPain: item.problem,
      missingCapabilities: "Flexible core software without a mandatory agency bundle",
      betterValueOpportunity:
        "Offer a more flexible core platform at a lower entry price plus optional managed services — only as a hypothesis until willingness-to-pay is tested.",
    }));
  const avoid = doNotCopy(clusters);
  const bestOpportunities = improvements.slice(0, 3).map((item) => item.recommendedImprovement);
  const biggestPains = clusters.slice(0, 3).map((item) => item.problem);
  const evidenceStrength = clusters.length === 0 ? "Not enough evidence" : clusters.some((item) => item.confidence !== "LOW") ? "Moderate" : "Weak";
  return {
    summary: {
      biggestPains: biggestPains.length ? biggestPains : ["Not enough complaint evidence yet."],
      bestOpportunities: bestOpportunities.length ? bestOpportunities : ["Not enough evidence to recommend a product change."],
      strongestDifferentiator: improvements[0]?.differentiationOpportunity ?? "Not enough evidence yet",
      biggestThingToAvoid: avoid[0] ?? "Not enough evidence yet",
      evidenceStrength,
      whyThisCouldWin: improvements[0]?.expectedCustomerBenefit ?? "Not enough evidence yet to say why this could win.",
      whatCustomersHate: biggestPains[0]
        ? `${observations[0]?.provenancePhrase ?? "Public research suggests"} ${biggestPains[0]}`
        : "Not enough public complaint evidence yet.",
      whatInfinityShouldDoDifferently: improvements[0]?.recommendedImprovement ?? "Keep researching competitor friction before changing the product.",
      whatCustomersWouldLikelyPay:
        input.willingnessToPay ??
        "Competitor prices are anchors, not proof that Infinity will achieve the same price.",
      biggestEconomicUncertainty: input.economicUncertainty ?? "Unit economics are still modeled, not observed.",
    },
    painClusters: clusters,
    competitorStrengths: strengths,
    tableStakes,
    recommendedImprovements: improvements,
    differentiators,
    doNotCopy: avoid,
    expectedByCustomers: tableStakes,
    validationIdeas: improvements.map((item) => item.validationNeeded),
    priceFeatureInsights: priceInsights,
    buildBetter: improvements.slice(0, 5).map((item) => ({
      problem: item.customerProblem,
      whatCustomersDislike: item.customerProblem,
      infinityOpportunity: item.differentiationOpportunity,
      recommendedImprovement: item.recommendedImprovement,
      whyItCouldWin: item.expectedCustomerBenefit,
      evidenceStrength: item.evidenceStrength,
    })),
    authority: PRODUCT_ADVANTAGE_AUTHORITY,
  };
}
