import { SITE_AI_ROLES } from "./constants";
import type { SiteAiRole, SiteAiRoleContract } from "./types";

const CONTRACTS: Record<SiteAiRole, SiteAiRoleContract> = {
  RESEARCHER: {
    role: "RESEARCHER",
    responsibilities: ["facts", "source discovery", "market language", "buyer questions", "authority sources", "entity validation"],
    capability: "research.public_web",
    providerBound: false,
  },
  QUESTION_RESEARCHER: {
    role: "QUESTION_RESEARCHER",
    responsibilities: ["question discovery", "question clustering", "disposition", "coverage gaps", "no question-permutation spam"],
    capability: "research.public_web",
    providerBound: false,
  },
  SEARCH_GEO_PLANNER: {
    role: "SEARCH_GEO_PLANNER",
    responsibilities: ["topic universe", "query clustering", "intent classification", "hub/spoke opportunities", "GEO question structures", "page opportunities"],
    capability: "web.search",
    providerBound: false,
  },
  SITE_ARCHITECT: {
    role: "SITE_ARCHITECT",
    responsibilities: ["site hierarchy", "page roles", "relationships", "internal-link graph", "conversion paths", "navigation", "schema plan"],
    capability: "site.architecture.plan",
    providerBound: false,
  },
  CONTENT_STRATEGIST: {
    role: "CONTENT_STRATEGIST",
    responsibilities: ["page purposes", "depth targets", "CTA strength", "cannibalization avoidance"],
    capability: "content.strategy",
    providerBound: false,
  },
  WRITER: {
    role: "WRITER",
    responsibilities: ["clear page content", "answer-first sections", "examples", "definitions", "reader clarity", "no fabricated evidence"],
    capability: "content.write",
    providerBound: false,
  },
  DIRECT_RESPONSE_REVIEWER: {
    role: "DIRECT_RESPONSE_REVIEWER",
    responsibilities: ["hook", "problem", "mechanism", "objections", "offer clarity", "CTA sequence", "no branded copy theft"],
    capability: "content.direct_response_review",
    providerBound: false,
  },
  SEO_GEO_REVIEWER: {
    role: "SEO_GEO_REVIEWER",
    responsibilities: ["primary intent", "citation readiness", "entity clarity", "internal linking", "schema truth", "no stuffing"],
    capability: "content.seo_geo_review",
    providerBound: false,
  },
  DESIGN_PLANNER: {
    role: "DESIGN_PLANNER",
    responsibilities: ["tokens", "section composition", "page-specific layouts", "consistency"],
    capability: "design.plan",
    providerBound: false,
  },
  CREATIVE_PLANNER: {
    role: "CREATIVE_PLANNER",
    responsibilities: ["visual necessity", "product visualization", "Creative Media routing"],
    capability: "creative.image.generate",
    providerBound: false,
  },
  REVIEWER: {
    role: "REVIEWER",
    responsibilities: ["factual support", "intent", "duplication", "thinness", "links", "schema", "claims", "conversion clarity"],
    capability: "content.review",
    providerBound: false,
  },
  ADVERSARIAL_REVIEWER: {
    role: "ADVERSARIAL_REVIEWER",
    responsibilities: [
      "thin AI content",
      "duplicate phrasing",
      "keyword stuffing",
      "fake authority",
      "unsupported claims",
      "fake customer evidence",
      "schema misuse",
      "generic filler",
    ],
    capability: "content.adversarial_review",
    providerBound: false,
  },
  REPAIRER: {
    role: "REPAIRER",
    responsibilities: ["repair only failed components", "do not regenerate the whole site for a local failure"],
    capability: "content.repair",
    providerBound: false,
  },
};

export function siteAiRoleContracts(): SiteAiRoleContract[] {
  return SITE_AI_ROLES.map((role) => CONTRACTS[role]);
}

export function roleIsNotProvider(): true {
  return siteAiRoleContracts().every((item) => item.providerBound === false) as true;
}

export function multiProviderEconomicallyGated(): {
  gated: true;
  defaultSharedExecution: true;
  escalateOnlyWhenExpectedValueJustifies: true;
} {
  return { gated: true, defaultSharedExecution: true, escalateOnlyWhenExpectedValueJustifies: true };
}

export function repairScope(failedComponentIds: string[]): { regenerateEntireSite: false; components: string[] } {
  return { regenerateEntireSite: false, components: failedComponentIds };
}
