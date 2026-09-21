import type { PlannedPage } from "./types";

export const SEO_GEO_TOPIC_HUBS = [
  {
    route: "/commercial-lease-npv",
    slug: "commercial-lease-npv",
    title: "Commercial lease NPV",
    h1: "Commercial lease NPV, in plain words",
    description: "Learn what net present value means for a commercial lease, why later cash is not equal to cash today, and how brokers use it to compare options.",
    cluster: "commercial-lease-npv",
    cta: { href: "/compare-commercial-leases", label: "See How the Workflow Works" },
    midCta: { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "Read what NPV means" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/lease-comparison",
    slug: "lease-comparison",
    title: "Lease comparison",
    h1: "How to compare commercial lease options",
    description: "Compare two or more commercial leases on the same timeline. See how free rent, TI money, term length, and start dates change the result.",
    cluster: "lease-comparison",
    cta: { href: "/compare-commercial-leases", label: "Compare Your Lease Options" },
    midCta: { href: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", label: "See a worked comparison" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/effective-rent",
    slug: "effective-rent",
    title: "Effective rent",
    h1: "Effective rent, and when it is not enough",
    description: "Effective rent averages a lease into one number. Learn what it includes, what it hides, and how it differs from NPV.",
    cluster: "effective-rent",
    cta: { href: "/effective-rent/effective-rent-vs-npv/", label: "Compare effective rent and NPV" },
    midCta: { href: "/commercial-lease-npv/", label: "Learn commercial lease NPV" },
    finalCta: { href: "/compare-commercial-leases", label: "Try the Lease Comparison Tool" },
  },
  {
    route: "/occupancy-costs",
    slug: "occupancy-costs",
    title: "Occupancy costs",
    h1: "Occupancy cost beyond face rent",
    description: "Face rent is not the full bill. Learn how CAM, taxes, insurance, and other costs change which lease is cheaper.",
    cluster: "occupancy-costs",
    cta: { href: "/lease-comparison/", label: "Compare occupancy costs" },
    midCta: { href: "/compare-commercial-leases", label: "See the comparison workflow" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/lease-sensitivity-analysis",
    slug: "lease-sensitivity-analysis",
    title: "Lease sensitivity analysis",
    h1: "What lease sensitivity analysis shows",
    description: "A ranking can flip when one assumption changes. Learn which inputs move the result and how to show that to a client.",
    cluster: "lease-sensitivity-analysis",
    cta: { href: "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/", label: "See what sensitivity shows" },
    midCta: { href: "/commercial-lease-npv/what-discount-rate-should-you-use/", label: "Read about discount rates" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/tenant-rep-analysis",
    slug: "tenant-rep-analysis",
    title: "Tenant-rep analysis",
    h1: "How a tenant-rep broker can explain lease economics",
    description: "A tenant-rep broker needs a clear story for a client. Learn how to move from proposals to a simple comparison a CFO can review.",
    cluster: "tenant-rep-analysis",
    cta: { href: "/for/tenant-rep-brokers", label: "See the Tenant-Rep Workflow" },
    midCta: { href: "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/", label: "Read the broker explainer" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/lease-financial-modeling",
    slug: "lease-financial-modeling",
    title: "Lease financial modeling",
    h1: "From proposals to a client summary",
    description: "See the path from raw proposals to shared assumptions, comparison, sensitivity, and a summary. Learn common model mistakes.",
    cluster: "lease-financial-modeling",
    cta: { href: "/how-it-works", label: "See How the Workflow Works" },
    midCta: { href: "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/", label: "Read common mistakes" },
    finalCta: { href: "/pricing", label: "View Pilot Pricing" },
  },
] as const;

export const SEO_GEO_QUESTION_PAGES = [
  {
    route: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease",
    hub: "/commercial-lease-npv",
    question: "What is NPV in a commercial lease?",
    slug: "what-is-npv-in-a-commercial-lease",
    title: "What is NPV in a commercial lease?",
    description: "NPV turns later lease costs into today's dollars so you can compare options fairly. This page explains the idea with a worked example.",
    cluster: "commercial-lease-npv",
    cta: { href: "/compare-commercial-leases", label: "Try the Lease Comparison Tool" },
    midCta: { href: "/commercial-lease-npv/what-discount-rate-should-you-use/", label: "See how the discount rate works" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/commercial-lease-npv/what-discount-rate-should-you-use",
    hub: "/commercial-lease-npv",
    question: "What discount rate should be used for commercial lease NPV?",
    slug: "what-discount-rate-should-you-use",
    title: "What discount rate should you use?",
    description: "The discount rate is the price of waiting. Learn how to pick a rate, show it, and test nearby rates without hiding the assumption.",
    cluster: "commercial-lease-npv",
    cta: { href: "/lease-sensitivity-analysis/", label: "See sensitivity analysis" },
    midCta: { href: "/compare-commercial-leases", label: "See the comparison workflow" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/commercial-lease-npv/when-is-npv-the-wrong-metric",
    hub: "/commercial-lease-npv",
    question: "When is NPV the wrong metric?",
    slug: "when-is-npv-the-wrong-metric",
    title: "When is NPV the wrong metric?",
    description: "NPV is a consistency tool, not a complete decision. Learn when it should not drive the choice and what else to show beside it.",
    cluster: "commercial-lease-npv",
    cta: { href: "/lease-comparison/", label: "See lease comparison methods" },
    midCta: { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "Review what NPV is" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/lease-comparison/how-do-you-compare-two-commercial-lease-options",
    hub: "/lease-comparison",
    question: "How do you compare two commercial lease proposals?",
    slug: "how-do-you-compare-two-commercial-lease-options",
    title: "How do you compare two commercial lease options?",
    description: "Put both leases on one timeline. Include rent, extras, credits, and start dates. Then discount the cash and read the result with care.",
    cluster: "lease-comparison",
    cta: { href: "/compare-commercial-leases", label: "Compare Your Lease Options" },
    midCta: { href: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/", label: "See how free rent and TI change NPV" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv",
    hub: "/lease-comparison",
    question: "How do free rent periods and tenant improvement allowances affect NPV?",
    slug: "how-do-free-rent-and-ti-allowances-affect-npv",
    title: "How do free rent and TI allowances affect NPV?",
    description: "Free rent and TI money change when cash moves. Learn how to place both on the timeline so a lower face rent is not the whole story.",
    cluster: "lease-comparison",
    cta: { href: "/compare-commercial-leases", label: "Compare Your Lease Options" },
    midCta: { href: "/occupancy-costs/", label: "Read about occupancy costs" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/lease-comparison/how-do-you-compare-different-lease-terms",
    hub: "/lease-comparison",
    question: "How do you compare leases with different term lengths?",
    slug: "how-do-you-compare-different-lease-terms",
    title: "How do you compare different lease terms?",
    description: "A five-year lease and a ten-year lease are not the same product. Learn how to compare them without pretending the extra years are free.",
    cluster: "lease-comparison",
    cta: { href: "/compare-commercial-leases", label: "Compare Your Lease Options" },
    midCta: { href: "/lease-sensitivity-analysis/", label: "Test the assumptions" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/effective-rent/effective-rent-vs-npv",
    hub: "/effective-rent",
    question: "Effective rent vs NPV: what is the difference?",
    slug: "effective-rent-vs-npv",
    title: "Effective rent vs NPV",
    description: "Effective rent averages. NPV discounts time. Learn when each helps, when each hides risk, and how to use both without mixing them up.",
    cluster: "effective-rent",
    cta: { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "Learn NPV first" },
    midCta: { href: "/compare-commercial-leases", label: "Try the Lease Comparison Tool" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show",
    hub: "/lease-sensitivity-analysis",
    question: "What does lease sensitivity analysis show?",
    slug: "what-does-lease-sensitivity-analysis-show",
    title: "What does lease sensitivity analysis show?",
    description: "Sensitivity analysis asks what happens if a key number changes. Learn which assumptions matter and how to show a flip without hiding it.",
    cluster: "lease-sensitivity-analysis",
    cta: { href: "/commercial-lease-npv/what-discount-rate-should-you-use/", label: "Read discount-rate choices" },
    midCta: { href: "/compare-commercial-leases", label: "See the comparison workflow" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics",
    hub: "/tenant-rep-analysis",
    question: "How should a tenant-rep broker explain lease economics to a client?",
    slug: "how-should-a-tenant-rep-broker-explain-lease-economics",
    title: "How should a tenant-rep broker explain lease economics?",
    description: "Clients need a short story they can trust. Learn how to explain rent, extras, time, and risk without hiding the hard parts.",
    cluster: "tenant-rep-analysis",
    cta: { href: "/for/tenant-rep-brokers", label: "See the Tenant-Rep Workflow" },
    midCta: { href: "/how-it-works", label: "See How the Workflow Works" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
  {
    route: "/lease-financial-modeling/what-are-common-lease-analysis-mistakes",
    hub: "/lease-financial-modeling",
    question: "What are common lease-analysis mistakes?",
    slug: "what-are-common-lease-analysis-mistakes",
    title: "What are common lease-analysis mistakes?",
    description: "Most bad comparisons hide a missing cost or a hidden assumption. Learn the mistakes that flip a ranking and how to catch them.",
    cluster: "lease-financial-modeling",
    cta: { href: "/how-it-works", label: "See How the Workflow Works" },
    midCta: { href: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", label: "See a clean comparison" },
    finalCta: { href: "/early-access", label: "Request Pilot Access" },
  },
] as const;

export const SEO_GEO_MERGED_QUESTIONS = [
  { question: "How do rent escalations affect NPV?", home: "/lease-comparison/", reason: "Escalations are a comparison input, not a standalone topic with enough unique depth." },
  { question: "How do operating expenses affect occupancy cost?", home: "/occupancy-costs/", reason: "Covered as the occupancy-cost hub core." },
  { question: "Why can the lowest rent option have a higher total occupancy cost?", home: "/occupancy-costs/", reason: "Same occupancy-cost decision, not a second page." },
  { question: "How do you normalize different commencement dates?", home: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", reason: "Part of comparison mechanics." },
  { question: "How do renewal options affect lease comparison?", home: "/lease-comparison/", reason: "Hub section; not enough unique math for a 2000-word page." },
  { question: "How should expansion and contraction rights be modeled?", home: "/lease-comparison/", reason: "Scenario note on the comparison hub." },
  { question: "What is effective rent?", home: "/effective-rent/", reason: "Hub defines it; the spoke compares it to NPV." },
  { question: "How do you compare multiple office or industrial locations?", home: "/occupancy-costs/", reason: "Location compare is occupancy-cost plus operations, not a thin clone." },
  { question: "How do taxes, CAM, and insurance affect lease comparison?", home: "/occupancy-costs/", reason: "Same cost stack." },
  { question: "What belongs in a commercial lease comparison report?", home: "/tenant-rep-analysis/", reason: "Report contents belong with broker explanation." },
  { question: "Which assumptions materially change the result?", home: "/lease-sensitivity-analysis/", reason: "Sensitivity hub topic." },
  { question: "What information is needed before comparing lease proposals?", home: "/lease-financial-modeling/", reason: "Modeling workflow hub." },
  { question: "How should lease economics be presented to CFOs/executives?", home: "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/", reason: "Same audience story." },
  { question: "Commercial lease spreadsheet vs purpose-built comparison software", home: "/lease-financial-modeling/", reason: "Workflow contrast, not a product attack page." },
  { question: "How does the workflow move from proposals to normalized assumptions to comparison to sensitivity to client summary?", home: "/lease-financial-modeling/", reason: "Hub process." },
  { question: "How does a lease comparison tool differ from a brokerage CRM?", home: "/tenant-rep-analysis/", reason: "Persona/product distinction, not a keyword page." },
] as const;

export const SEO_GEO_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "/tenant-improvement-allowance", to: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/" },
  { from: "/discount-rate-sensitivity", to: "/commercial-lease-npv/what-discount-rate-should-you-use/" },
  { from: "/resources/cam-costs", to: "/occupancy-costs/" },
  { from: "/resources/free-rent", to: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/" },
  { from: "/resources/rent-escalations", to: "/lease-comparison/" },
  { from: "/resources/gross-vs-net-lease", to: "/occupancy-costs/" },
];

export const SEO_GEO_PRODUCT_ROUTES = [
  "/",
  "/how-it-works",
  "/compare-commercial-leases",
  "/resources",
  "/pricing",
  "/faq",
  "/early-access",
  "/for/tenant-rep-brokers",
] as const;

export const SEO_GEO_LEGAL_ROUTES = ["/privacy-policy", "/terms-of-service"] as const;

export function seoGeoPageRouteManifest() {
  return {
    topLevelProduct: [...SEO_GEO_PRODUCT_ROUTES],
    topicHubs: SEO_GEO_TOPIC_HUBS.map((hub) => hub.route),
    questionPages: SEO_GEO_QUESTION_PAGES.map((page) => page.route),
    legal: [...SEO_GEO_LEGAL_ROUTES],
    redirects: SEO_GEO_REDIRECTS.map((item) => item.from),
    support: ["/sitemap.xml", "/robots.txt"] as const,
    pageRoutes: [
      ...SEO_GEO_PRODUCT_ROUTES,
      ...SEO_GEO_TOPIC_HUBS.map((hub) => hub.route),
      ...SEO_GEO_QUESTION_PAGES.map((page) => page.route),
      ...SEO_GEO_LEGAL_ROUTES,
      ...SEO_GEO_REDIRECTS.map((item) => item.from),
    ],
  };
}

export function seoGeoTopicRootUrlArchitecture() {
  return {
    model: "DigitalRealEstateURLArchitecture" as const,
    pattern: "/{topic}/{question-slug}/" as const,
    executed: true as const,
    hubs: SEO_GEO_TOPIC_HUBS.map((hub) => hub.route),
    questionPages: SEO_GEO_QUESTION_PAGES.map((page) => (page.route.endsWith("/") ? page.route : `${page.route}/`)),
    flatQuestionPages: 0,
    moneyPages: ["/", "/compare-commercial-leases", "/how-it-works", "/pricing"],
    conversionPages: ["/early-access", "/pricing"],
    redirectPlanRequiredIfApplied: true,
    redirects: SEO_GEO_REDIRECTS,
    urlsShortDescriptiveStable: true,
  };
}

export function plannedHubPage(hub: (typeof SEO_GEO_TOPIC_HUBS)[number]): PlannedPage {
  return {
    route: hub.route,
    role: "EDUCATIONAL_HUB",
    primaryIntent: "EDUCATIONAL",
    parentHub: "/",
    title: hub.title,
    metaDescription: hub.description,
    canonical: hub.route.endsWith("/") ? hub.route : `${hub.route}/`,
    indexable: true,
    schemaTypes: ["WebPage", "BreadcrumbList", "Article"],
    patternId: "EDUCATIONAL_HUB",
    ctaStrength: "CONTEXTUAL",
    topicCluster: hub.cluster,
    pageOpportunityId: `opp_${hub.slug}`,
  };
}

export function plannedQuestionPage(page: (typeof SEO_GEO_QUESTION_PAGES)[number]): PlannedPage {
  return {
    route: page.route,
    role: "QUESTION_PAGE",
    primaryIntent: "DEFINITIONAL",
    parentHub: page.hub,
    title: page.title,
    metaDescription: page.description,
    canonical: page.route.endsWith("/") ? page.route : `${page.route}/`,
    indexable: true,
    schemaTypes: ["WebPage", "Article", "BreadcrumbList"],
    patternId: "DEEP_AUTHORITY_QUESTION_PAGE",
    ctaStrength: "CONTEXTUAL",
    topicCluster: page.cluster,
    pageOpportunityId: `opp_${page.slug}`,
  };
}

export function allSeoGeoPlannedPages(): PlannedPage[] {
  return [...SEO_GEO_TOPIC_HUBS.map(plannedHubPage), ...SEO_GEO_QUESTION_PAGES.map(plannedQuestionPage)];
}

export function hubLabel(route: string): string {
  return SEO_GEO_TOPIC_HUBS.find((hub) => hub.route === route)?.title ?? "Topic";
}
