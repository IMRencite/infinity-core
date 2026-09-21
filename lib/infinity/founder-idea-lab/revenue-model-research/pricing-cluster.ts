import type { EconomicConfidenceLevel } from "../comparable-economics/provenance";
import type { VentureContext } from "../comparable-economics/qualify";
import type { PriceRole } from "./price-role";

export const PRICING_CLUSTERS = [
  "SELF_SERVE_SITE_BUILDER",
  "VERTICAL_CMS_PLATFORM",
  "AI_CMS_PLATFORM",
  "WEBSITE_AS_A_SERVICE",
  "HYBRID_CMS_MANAGED_SERVICE",
  "SEO_AEO_TOOLING",
  "MARKETING_RETAINER",
  "SETUP_IMPLEMENTATION",
  "OTHER",
] as const;

export type PricingCluster = (typeof PRICING_CLUSTERS)[number];

const CORE_ARPU_CLUSTERS = new Set<PricingCluster>([
  "VERTICAL_CMS_PLATFORM",
  "AI_CMS_PLATFORM",
  "WEBSITE_AS_A_SERVICE",
]);

const EXCLUDED_FROM_CORE_ARPU = new Set<PricingCluster>([
  "SELF_SERVE_SITE_BUILDER",
  "HYBRID_CMS_MANAGED_SERVICE",
  "SEO_AEO_TOOLING",
  "MARKETING_RETAINER",
  "SETUP_IMPLEMENTATION",
  "OTHER",
]);

export function isCoreArpuCluster(cluster: PricingCluster): boolean {
  return CORE_ARPU_CLUSTERS.has(cluster);
}

export function clusterExcludedFromCoreArpu(cluster: PricingCluster): boolean {
  return EXCLUDED_FROM_CORE_ARPU.has(cluster);
}

export function classifyPricingCluster(claim: string, context?: VentureContext | null): PricingCluster {
  const text = claim.trim();
  if (/\b(setup fee|onboarding fee|implementation fee|migration fee|launch fee)\b/i.test(text) && /\$\s*[\d]/.test(text)) {
    return "SETUP_IMPLEMENTATION";
  }
  if (/\bhibu\b/i.test(text) && /\$\s*[\d]/.test(text)) {
    return /website|cms/i.test(text) && /seo|ads|marketing|bundled/i.test(text)
      ? "HYBRID_CMS_MANAGED_SERVICE"
      : "MARKETING_RETAINER";
  }
  if (
    /\b(aeo|answer engine|geo solutions?|generative engine optimization|ai seo)\b/i.test(text) &&
    /\$\s*[\d]/.test(text) &&
    !/\b(website package|dealer website|cms platform subscription)\b/i.test(text)
  ) {
    return "SEO_AEO_TOOLING";
  }
  if (/\bself[- ]serve\b/i.test(text) && /website builder/i.test(text)) return "SELF_SERVE_SITE_BUILDER";
  if (/\bdealer spike\b|\bdealerspike\b/i.test(text)) {
    if (/bundled|managed (seo|marketing)|retainer/i.test(text)) return "HYBRID_CMS_MANAGED_SERVICE";
    return "VERTICAL_CMS_PLATFORM";
  }
  if (/\b(powersports|dealership|inventory-management cms|vertical cms)\b/i.test(text) && /\$\s*[\d]/.test(text)) {
    return "VERTICAL_CMS_PLATFORM";
  }
  if (/\b(local marketing|agency marketing|bundled.{0,24}managed|done-for-you marketing|marketing retainers?)\b/i.test(text)) {
    return /website|cms/i.test(text) ? "HYBRID_CMS_MANAGED_SERVICE" : "MARKETING_RETAINER";
  }
  if (
    /\bretainers?\b/i.test(text) &&
    /\b(marketing|agency)\b/i.test(text) &&
    !/\b(cms|website builder|website packages?)\b/i.test(text)
  ) {
    return "MARKETING_RETAINER";
  }
  if (/\b(ai[- ]driven aeo|ai seo tool|page-based tiers|keyword tool|rank ?track)\b/i.test(text)) return "SEO_AEO_TOOLING";
  if (/\bai (website|cms)\b|\bknowledge base\b|\bai-powered (cms|website)\b/i.test(text) && !/\bself[- ]serve\b/i.test(text)) {
    return "AI_CMS_PLATFORM";
  }
  if (/\bwebsite-as-a-service\b|\bwaas\b|\bhosted website\b|\bwebsite packages?\b/i.test(text) && !/\bdealer\b/i.test(text)) {
    return "WEBSITE_AS_A_SERVICE";
  }
  const ctx = context
    ? `${context.title} ${context.description} ${context.proposedSolution} ${context.businessModelHypothesis}`
    : "";
  if (/\bvertical\b/i.test(text) && /\bcms\b/i.test(text)) return "VERTICAL_CMS_PLATFORM";
  if (/\bself[- ]serve\b/i.test(ctx) && /website builder/i.test(text)) return "SELF_SERVE_SITE_BUILDER";
  if (/\bai\b/i.test(text) && /\b(cms|website builder)\b/i.test(text)) return "AI_CMS_PLATFORM";
  if (/\b(cms|waas)\b/i.test(text) || /\bwebsite/i.test(text)) {
    return "WEBSITE_AS_A_SERVICE";
  }
  if (/\bweb\b/i.test(text) && /\$\s*[\d]/.test(text) && /\b(month|retainer|plan|package|subscription)\b/i.test(text)) {
    return "WEBSITE_AS_A_SERVICE";
  }
  if (/\b(crm|erp|field-sales|unrelated)\b/i.test(text) && !/\b(website|cms|web)\b/i.test(text)) return "OTHER";
  return "OTHER";
}

export function clusterFromPriceRole(role: PriceRole, claim: string, context?: VentureContext | null): PricingCluster {
  if (role === "SETUP_FEE" || role === "IMPLEMENTATION_FEE") return "SETUP_IMPLEMENTATION";
  if (role === "TOOLING_PRICE" || role === "ADD_ON_PRICE") return "SEO_AEO_TOOLING";
  if (role === "MANAGED_SERVICE_RETAINER") {
    return /website|cms/i.test(claim) ? "HYBRID_CMS_MANAGED_SERVICE" : "MARKETING_RETAINER";
  }
  return classifyPricingCluster(claim, context);
}

type ClusterScore = Record<PricingCluster, number>;

function emptyScores(): ClusterScore {
  return {
    SELF_SERVE_SITE_BUILDER: 0,
    VERTICAL_CMS_PLATFORM: 0,
    AI_CMS_PLATFORM: 0,
    WEBSITE_AS_A_SERVICE: 0,
    HYBRID_CMS_MANAGED_SERVICE: 0,
    SEO_AEO_TOOLING: 0,
    MARKETING_RETAINER: 0,
    SETUP_IMPLEMENTATION: 0,
    OTHER: 0,
  };
}

export function scorePricingClusters(context: VentureContext): ClusterScore {
  const blob = `${context.title} ${context.description} ${context.proposedSolution} ${context.businessModelHypothesis} ${context.pricingHypothesis} ${context.targetCustomer}`.toLowerCase();
  const scores = emptyScores();
  if (/\bai\b/.test(blob) && /\b(cms|website)\b/.test(blob)) scores.AI_CMS_PLATFORM += 4;
  if (/\bknowledge base\b|\bgenerate\b|\bautomat/.test(blob)) scores.AI_CMS_PLATFORM += 2;
  if (/\bwebsite package\b|\bmonthly website\b|\bhosted website\b|\bcms\b/.test(blob)) scores.WEBSITE_AS_A_SERVICE += 3;
  if (/\bsmb\b|\blocal business/.test(blob)) scores.WEBSITE_AS_A_SERVICE += 2;
  if (/\b(optional )?(seo|aeo|content services?)\b/.test(blob) || /\bhybrid\b/.test(blob) || /\bmanaged\b/.test(blob)) {
    scores.HYBRID_CMS_MANAGED_SERVICE += 2;
  }
  if (/\bdealer\b|\bvertical\b|\binventory\b/.test(blob)) scores.VERTICAL_CMS_PLATFORM += 3;
  if (/\bself[- ]serve\b|\bdiy\b/.test(blob)) scores.SELF_SERVE_SITE_BUILDER += 3;
  if (/\bretainer\b|\bagency\b/.test(blob) && !/\bcms\b/.test(blob)) scores.MARKETING_RETAINER += 2;
  if (/\bseo tool\b|\baeo tool\b/.test(blob)) scores.SEO_AEO_TOOLING += 2;
  return scores;
}

export type PricingClusterSelection = {
  recommendedPricingCluster: PricingCluster;
  selectedPricingCluster: PricingCluster;
  reason: string;
  confidence: EconomicConfidenceLevel;
  fallbackUsed: boolean;
  acceptedEvidence: PricingCluster[];
  rejectedEvidence: PricingCluster[];
};

export function selectPricingCluster(input: {
  context: VentureContext;
  pricedClusters: PricingCluster[];
}): PricingClusterSelection {
  const scores = scorePricingClusters(input.context);
  const ranked = [...PRICING_CLUSTERS]
    .filter((cluster) => cluster !== "SETUP_IMPLEMENTATION" && cluster !== "OTHER")
    .sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
  const recommended = ranked[0] ?? "WEBSITE_AS_A_SERVICE";
  const priced = new Set(input.pricedClusters.filter((cluster) => cluster !== "SETUP_IMPLEMENTATION" && cluster !== "OTHER"));
  const rejectedEvidence = input.pricedClusters.filter((cluster) => clusterExcludedFromCoreArpu(cluster) || cluster !== recommended);
  if (isCoreArpuCluster(recommended) && priced.has(recommended)) {
    return {
      recommendedPricingCluster: recommended,
      selectedPricingCluster: recommended,
      reason: `Founder-idea profile matches ${recommended}; priced comparables exist in that cluster.`,
      confidence: "MEDIUM",
      fallbackUsed: false,
      acceptedEvidence: [recommended],
      rejectedEvidence: [...new Set(rejectedEvidence.filter((cluster) => cluster !== recommended))],
    };
  }
  const fallback = ranked.find((cluster) => isCoreArpuCluster(cluster) && priced.has(cluster));
  if (fallback) {
    return {
      recommendedPricingCluster: recommended,
      selectedPricingCluster: fallback,
      reason: `Profile match ${recommended} has no priced comparables; ARPU uses ${fallback} as the nearest core software cluster.`,
      confidence: "LOW",
      fallbackUsed: true,
      acceptedEvidence: [fallback],
      rejectedEvidence: [...new Set(input.pricedClusters.filter((cluster) => cluster !== fallback))],
    };
  }
  return {
    recommendedPricingCluster: recommended,
    selectedPricingCluster: recommended,
    reason: `Profile match ${recommended}; no priced core-software comparables, so core ARPU stays partial.`,
    confidence: "LOW",
    fallbackUsed: false,
    acceptedEvidence: [],
    rejectedEvidence: [...new Set(input.pricedClusters)],
  };
}

export function setupQueriesForCluster(cluster: PricingCluster, customer: string): string[] {
  const label =
    cluster === "VERTICAL_CMS_PLATFORM"
      ? "vertical CMS"
      : cluster === "AI_CMS_PLATFORM"
        ? "AI CMS"
        : cluster === "WEBSITE_AS_A_SERVICE"
          ? "website-as-a-service"
          : cluster === "HYBRID_CMS_MANAGED_SERVICE"
            ? "hybrid CMS managed service"
            : cluster === "SELF_SERVE_SITE_BUILDER"
              ? "self-serve website builder"
              : "SMB website platform";
  return [
    `${customer} ${label} setup fee`,
    `${label} onboarding fee`,
    `${label} implementation fee`,
    `${label} migration fee`,
    `${label} website build fee`,
    `${label} launch fee`,
    `${label} initial setup cost`,
  ];
}

export function marginQueriesForCluster(cluster: PricingCluster, customer: string): string[] {
  const model =
    cluster === "HYBRID_CMS_MANAGED_SERVICE" || cluster === "MARKETING_RETAINER"
      ? "hybrid SaaS service"
      : cluster === "VERTICAL_CMS_PLATFORM"
        ? "vertical SaaS"
        : cluster === "WEBSITE_AS_A_SERVICE"
          ? "website-as-a-service"
          : cluster === "AI_CMS_PLATFORM"
            ? "AI website platform"
            : "SMB SaaS";
  return [
    `${model} gross margin benchmark`,
    `${customer} ${model} gross margin`,
    `website platform gross margin`,
    `digital marketing SaaS margin`,
    `managed-service gross margin`,
    `agency gross margin`,
    `SMB SaaS gross margin`,
  ];
}

export function clusterLabel(cluster: PricingCluster): string {
  switch (cluster) {
    case "SELF_SERVE_SITE_BUILDER":
      return "Self-serve site builders";
    case "VERTICAL_CMS_PLATFORM":
      return "Vertical CMS platforms";
    case "AI_CMS_PLATFORM":
      return "AI CMS platforms";
    case "WEBSITE_AS_A_SERVICE":
      return "Website-as-a-service platforms";
    case "HYBRID_CMS_MANAGED_SERVICE":
      return "Hybrid CMS + managed service";
    case "SEO_AEO_TOOLING":
      return "SEO/AEO tooling";
    case "MARKETING_RETAINER":
      return "Marketing retainers";
    case "SETUP_IMPLEMENTATION":
      return "Setup and implementation";
    case "OTHER":
      return "Other pricing";
  }
}
