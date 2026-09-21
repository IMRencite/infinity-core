import { EXPANSION_QUESTION_PAGES } from "@/lib/infinity/venture-website-architecture/authority-expansion-catalog";
import { DEPTH_QUESTION_PAGES } from "@/lib/infinity/venture-website-architecture/search-demand-depth-catalog";
import {
  SEO_GEO_LEGAL_ROUTES,
  SEO_GEO_PRODUCT_ROUTES,
  SEO_GEO_QUESTION_PAGES,
  SEO_GEO_REDIRECTS,
  SEO_GEO_TOPIC_HUBS,
} from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";

export function authorityExpansionRouteManifest() {
  const topLevelProduct = [...SEO_GEO_PRODUCT_ROUTES];
  const topicHubs = SEO_GEO_TOPIC_HUBS.map((hub) => hub.route);
  const questionAuthorityPages = [
    ...SEO_GEO_QUESTION_PAGES.map((page) => page.route),
    ...EXPANSION_QUESTION_PAGES.map((page) => page.route),
  ];
  const personaCommercial = ["/for/tenant-rep-brokers", "/compare-commercial-leases", "/pricing", "/early-access"];
  const legal = [...SEO_GEO_LEGAL_ROUTES];
  const redirectSupport = SEO_GEO_REDIRECTS.map((item) => item.from);
  const sitemapRobots = ["/sitemap.xml", "/robots.txt"] as const;
  const pageRoutes = [...topLevelProduct, ...topicHubs, ...questionAuthorityPages, ...legal, ...redirectSupport];
  return {
    topLevelProduct,
    topicHubs,
    questionAuthorityPages,
    personaCommercial,
    legal,
    redirectSupport,
    sitemapRobots,
    pageRoutes,
    intendedCount: pageRoutes.length,
  };
}

export function searchDepthRouteManifest() {
  const base = authorityExpansionRouteManifest();
  const depthRoutes = DEPTH_QUESTION_PAGES.map((page) => page.route);
  const pageRoutes = [...base.pageRoutes, ...depthRoutes];
  return {
    ...base,
    questionAuthorityPages: [...base.questionAuthorityPages, ...depthRoutes],
    newStandaloneAuthorityRoutes: depthRoutes,
    pageRoutes,
    intendedCount: pageRoutes.length,
    previousCount: base.intendedCount,
  };
}

export const FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES = [
  "/",
  "/how-it-works",
  "/commercial-lease-npv",
  "/lease-comparison",
  "/commercial-lease-npv/what-is-npv-in-a-commercial-lease",
  "/lease-comparison/how-do-you-compare-two-commercial-lease-options",
  "/effective-rent/effective-rent-vs-npv",
  "/occupancy-costs/what-is-cam-in-a-commercial-lease",
  "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis",
  "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois",
  "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model",
  "/pricing",
  "/resources",
  "/for/tenant-rep-brokers",
  "/privacy-policy",
] as const;

export const AUTHORITY_POLISH_LIVE_SAMPLE_ROUTES = [
  "/",
  "/how-it-works",
  "/commercial-lease-npv",
  "/lease-financial-modeling",
  "/commercial-lease-npv/how-is-lease-npv-calculated",
  "/lease-comparison/how-do-you-normalize-commercial-lease-proposals",
  "/effective-rent/how-to-calculate-effective-rent",
  "/occupancy-costs/what-is-total-occupancy-cost",
  "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis",
  "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois",
  "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model",
  "/pricing",
  "/resources",
  "/for/tenant-rep-brokers",
  "/privacy-policy",
] as const;

export const AUTHORITY_EXPANSION_LIVE_SAMPLE_ROUTES = [
  "/",
  "/commercial-lease-npv",
  "/lease-financial-modeling",
  "/commercial-lease-npv/how-is-lease-npv-calculated",
  "/lease-comparison/how-do-you-normalize-commercial-lease-proposals",
  "/effective-rent/how-to-calculate-effective-rent",
  "/occupancy-costs/what-is-total-occupancy-cost",
  "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis",
  "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois",
  "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model",
  "/pricing",
  "/resources",
  "/for/tenant-rep-brokers",
  "/privacy-policy",
] as const;

export const AUTHORITY_WIDTH_LIVE_SAMPLE_ROUTES = [
  "/",
  "/lease-sensitivity-analysis",
  "/commercial-lease-npv",
  "/lease-comparison",
  "/effective-rent",
  "/occupancy-costs",
  "/tenant-rep-analysis",
  "/lease-financial-modeling",
  "/how-it-works",
  "/resources",
  "/pricing",
  "/for/tenant-rep-brokers",
  "/commercial-lease-npv/how-is-lease-npv-calculated",
  "/lease-comparison/how-do-you-normalize-commercial-lease-proposals",
  "/effective-rent/how-to-calculate-effective-rent",
  "/occupancy-costs/what-is-total-occupancy-cost",
  "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis",
  "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois",
  "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model",
] as const;

export const SEARCH_DEPTH_LIVE_SAMPLE_ROUTES = [
  "/",
  "/how-it-works",
  "/pricing",
  "/resources",
  "/for/tenant-rep-brokers",
  "/commercial-lease-npv",
  "/lease-comparison",
  "/effective-rent",
  "/occupancy-costs",
  "/lease-sensitivity-analysis",
  "/tenant-rep-analysis",
  "/lease-financial-modeling",
  "/commercial-lease-npv/what-is-npv-in-a-commercial-lease",
  "/commercial-lease-npv/why-use-npv-when-comparing-leases",
  "/commercial-lease-npv/npv-vs-total-lease-cost",
  "/commercial-lease-npv/should-cam-be-in-lease-npv",
  "/lease-comparison/how-do-you-compare-two-commercial-lease-options",
  "/lease-comparison/how-do-cfos-review-lease-comparisons",
  "/effective-rent/effective-rent-vs-npv",
  "/effective-rent/what-is-effective-rent",
  "/effective-rent/effective-rent-vs-asking-rent",
  "/occupancy-costs/what-is-cam-in-a-commercial-lease",
  "/occupancy-costs/base-rent-vs-occupancy-cost",
  "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk",
  "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis",
  "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis",
  "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois",
  "/tenant-rep-analysis/lease-abstract-vs-financial-analysis",
  "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model",
  "/lease-financial-modeling/what-is-a-commercial-lease-financial-model",
] as const;

export const AUTHORITY_EXPANSION_TOPIC_FAMILY_SAMPLES = {
  "commercial-lease-npv": "/commercial-lease-npv/how-is-lease-npv-calculated",
  "lease-comparison": "/lease-comparison/how-do-you-normalize-commercial-lease-proposals",
  "effective-rent": "/effective-rent/how-to-calculate-effective-rent",
  "occupancy-costs": "/occupancy-costs/what-is-total-occupancy-cost",
  "lease-sensitivity-analysis": "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis",
  "tenant-rep-analysis": "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois",
  "lease-financial-modeling": "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model",
} as const;
