import { DEFAULT_INITIAL_PAGE_BOUNDS, DIRECT_RESPONSE_AUTHORITY_PAGE_BOUNDS, MASS_LOW_VALUE_GENERATION_PERMITTED, VENTURE_SITE_ARCHITECTURE_PLANNER, VENTURE_SITE_ARCHITECTURE_VERSION } from "./constants";
import { seedPageOpportunities } from "./page-opportunity";
import { seedDirectResponseSuccessorPages } from "./page-opportunity-successor";
import type { PlannedPage, SiteArchitectureInput, VentureSiteArchitecture } from "./types";
import { schemaTypesForPage } from "./schema-pattern-registry";

function patternFor(role: PlannedPage["role"]): string {
  if (role === "HOMEPAGE") return "COMMERCIAL_HOMEPAGE";
  if (role === "QUESTION_PAGE") return "EDUCATIONAL_QUESTION_PAGE";
  if (role === "EDUCATIONAL_ARTICLE") return "EDUCATIONAL_QUESTION_PAGE";
  if (role === "EDUCATIONAL_HUB") return "EDUCATIONAL_HUB";
  if (role === "PERSONA") return "COMMERCIAL_PRODUCT_PAGE";
  if (role === "HOW_IT_WORKS" || role === "COMPARISON") return "COMMERCIAL_PRODUCT_PAGE";
  if (role === "PRICING") return "PRICING_HYPOTHESIS_PAGE";
  if (role === "FAQ") return "FAQ_PAGE";
  if (role === "LEGAL") return "LEGAL_PAGE";
  return "COMMERCIAL_PRODUCT_PAGE";
}

function titleFor(route: string, role: PlannedPage["role"]): string {
  const titles: Record<string, string> = {
    "/": "Compare commercial lease economics — early validation",
    "/how-it-works": "How the proposed lease comparison workflow works",
    "/commercial-lease-npv": "What is NPV in a commercial lease?",
    "/compare-commercial-leases": "How to compare commercial lease options",
    "/tenant-improvement-allowance": "Tenant improvement allowance and occupancy cost",
    "/discount-rate-sensitivity": "Discount-rate sensitivity in lease NPV",
    "/pricing": "Early validation pricing hypotheses",
    "/resources": "Commercial lease economics resources",
    "/faq": "Questions about this lease comparison pilot",
    "/early-access": "Request Pilot Access",
    "/privacy-policy": "Privacy Policy",
    "/terms-of-service": "Terms of Service",
    "/resources/cam-costs": "What is CAM in a commercial lease?",
    "/resources/free-rent": "How free rent changes occupancy cost",
    "/resources/rent-escalations": "How rent escalations change a lease comparison",
    "/resources/gross-vs-net-lease": "Gross lease vs net lease",
    "/for/tenant-rep-brokers": "For tenant-rep brokers comparing commercial leases",
  };
  return titles[route] ?? role;
}

function descriptionFor(route: string): string {
  const copy: Record<string, string> = {
    "/": "A focused early-validation workflow for comparing commercial lease economics, NPV, and discount-rate sensitivity. Pilot access only. No payment is collected.",
    "/how-it-works": "The proposed steps for moving a commercial lease comparison from a rebuilt spreadsheet to a shareable NPV and client summary.",
    "/commercial-lease-npv": "A commercial lease NPV converts future occupancy costs into today’s dollars so options with different timing and incentives can be compared more consistently.",
    "/compare-commercial-leases": "A practical way to compare two commercial leases when rent schedules, TI, free rent, and CAM differ.",
    "/tenant-improvement-allowance": "How a tenant improvement allowance changes effective occupancy cost, and why it belongs in a lease comparison.",
    "/discount-rate-sensitivity": "Why the discount rate moves commercial lease NPV and how to keep the assumption visible beside the terms.",
    "/pricing": "Early validation pricing hypotheses: $290 per year or $149 per deal. Interest only. Payment is not collected.",
    "/resources": "A bounded guide to commercial lease economics topics used when comparing occupancy cost and NPV.",
    "/faq": "Direct answers about this early-validation lease comparison concept, pricing hypotheses, and what is not claimed.",
    "/early-access": "Request a validation pilot for the proposed commercial lease comparison workflow. No payment is collected.",
    "/privacy-policy": "What this public validation site collects and what it does not collect.",
    "/terms-of-service": "Terms for this early-access commercial lease comparison validation site.",
    "/resources/cam-costs": "What CAM includes in a commercial lease, how it changes occupancy cost, and whether it belongs in lease NPV.",
    "/resources/free-rent": "How free rent is structured, why timing matters, and how abatements change occupancy cost and NPV.",
    "/resources/rent-escalations": "How fixed and percentage rent escalations change occupancy cost, NPV, and lease rankings.",
    "/resources/gross-vs-net-lease": "The difference between gross, modified gross, and net leases, and why face rent alone can mislead.",
    "/for/tenant-rep-brokers": "A tenant-representation workflow for comparing commercial leases with NPV, sensitivity, and a shareable client summary. Pilot only.",
  };
  return copy[route] ?? "Public validation page.";
}

export function planVentureSiteArchitecture(
  input: SiteArchitectureInput,
  options?: { includeDirectResponseSuccessorPages?: boolean },
): VentureSiteArchitecture {
  const extra = options?.includeDirectResponseSuccessorPages ? seedDirectResponseSuccessorPages(input) : [];
  const opportunities = [...seedPageOpportunities(input), ...extra];
  const selected = opportunities
    .filter((item) => item.status === "SELECTED")
    .sort((a, b) => b.priority - a.priority);
  const substantive = selected.filter((item) => item.recommendedPageType !== "LEGAL");
  const bounds = options?.includeDirectResponseSuccessorPages ? DIRECT_RESPONSE_AUTHORITY_PAGE_BOUNDS : DEFAULT_INITIAL_PAGE_BOUNDS;
  if (substantive.length < bounds.min || substantive.length > bounds.max) {
    throw new Error(`initial_site_size_out_of_bounds:${substantive.length}`);
  }
  const pages: PlannedPage[] = selected.map((item) => {
    const parentHub =
      item.route.startsWith("/resources/") ? "/resources" : item.route === "/for/tenant-rep-brokers" ? "/" : item.internalLinkRole === "SPOKE" ? "/resources" : item.recommendedPageType === "LEGAL" ? null : item.route === "/" ? null : "/";
    const faqVisible =
      item.route === "/faq" ||
      item.route === "/commercial-lease-npv" ||
      item.route === "/compare-commercial-leases" ||
      (Boolean(options?.includeDirectResponseSuccessorPages) &&
        (item.route === "/tenant-improvement-allowance" ||
          item.route === "/discount-rate-sensitivity" ||
          item.route.startsWith("/resources/") ||
          item.route === "/for/tenant-rep-brokers"));
    const draft: PlannedPage = {
      route: item.route,
      role: item.recommendedPageType,
      primaryIntent: item.primaryIntent,
      parentHub,
      title: titleFor(item.route, item.recommendedPageType),
      metaDescription: descriptionFor(item.route),
      canonical: item.route,
      indexable: item.indexable,
      schemaTypes: [],
      patternId: patternFor(item.recommendedPageType),
      ctaStrength: item.funnelStage === "VALIDATION" || item.primaryIntent === "COMMERCIAL" || item.primaryIntent === "TRANSACTIONAL" ? "STRONG" : item.primaryIntent === "COMPARISON" ? "STRONG" : "SOFT",
      topicCluster: item.parentTopic ?? "Product",
      pageOpportunityId: item.pageOpportunityId,
    };
    draft.schemaTypes = schemaTypesForPage(draft, faqVisible, item.route === "/how-it-works", false, false);
    return draft;
  });
  return {
    planner: VENTURE_SITE_ARCHITECTURE_PLANNER,
    version: VENTURE_SITE_ARCHITECTURE_VERSION,
    qualityTarget: input.economicsJustifySimplerArtifact ? "VALIDATION_GRADE_READY" : input.qualityTarget,
    rationale:
      "Smallest useful authority cluster: offer, workflow, pricing, resources hub, and the lease-economics concepts that change comparison outcomes (NPV, comparison method, TI, discount rate). City permutations, duplicate NPV phrasings, and extra incentive pages stay in expansion.",
    hierarchy: [
      { hub: "/", spokes: ["/how-it-works", "/pricing", "/resources", "/faq", "/early-access", ...(options?.includeDirectResponseSuccessorPages ? ["/for/tenant-rep-brokers"] : [])] },
      { hub: "/resources", spokes: ["/commercial-lease-npv", "/compare-commercial-leases", "/tenant-improvement-allowance", "/discount-rate-sensitivity", ...(options?.includeDirectResponseSuccessorPages ? ["/resources/cam-costs", "/resources/free-rent", "/resources/rent-escalations", "/resources/gross-vs-net-lease"] : [])] },
    ],
    pages,
    conversionPaths: [
      { from: "/commercial-lease-npv", to: "/compare-commercial-leases", reason: "Definition to comparison workflow" },
      { from: "/compare-commercial-leases", to: "/pricing", reason: "High-intent comparison to offer" },
      { from: "/pricing", to: "/early-access", reason: "Pricing interest to pilot form" },
      { from: "/resources", to: "/how-it-works", reason: "Education to product process" },
    ],
    schemaPlan: pages.map((page) => ({
      route: page.route,
      types: page.schemaTypes,
      reason: `Page-specific truthful schema for ${page.role}`,
    })),
    creativeRequirements: pages.map((page) => ({
      route: page.route,
      necessity: page.role === "LEGAL" || page.role === "FAQ" ? "NOT_REQUIRED" : page.role === "HOMEPAGE" || page.role === "COMPARISON" || page.role === "HOW_IT_WORKS" ? "REQUIRED" : "USEFUL",
      reason: page.role === "LEGAL" ? "Legal pages do not need product visuals" : "Visuals only when they explain economics or the product",
    })),
    rejectedOpportunities: opportunities.filter((item) => item.status !== "SELECTED"),
    massLowValueGenerationPermitted: MASS_LOW_VALUE_GENERATION_PERMITTED,
  };
}
