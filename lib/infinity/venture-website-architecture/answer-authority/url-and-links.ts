import { DIGITAL_REAL_ESTATE_URL_ARCHITECTURE } from "../constants";
import { auditInternalLinks, extractInternalHrefs } from "../quality-gates";
import type { PlannedPage, SiteKnowledgeGraph } from "../types";
import { extractInternalHrefsInBody, pageContent } from "./page-inspect";
import type { DigitalRealEstateURLArchitecture, Gate, InternalLinkSufficiency } from "./types";

export function digitalRealEstateUrlArchitecture(): DigitalRealEstateURLArchitecture {
  void DIGITAL_REAL_ESTATE_URL_ARCHITECTURE;
  return {
    model: "DigitalRealEstateURLArchitecture",
    currentFlatRouteConcerns: [
      "educational spokes sit at root instead of a resources silo",
      "comparison lives at /compare-commercial-leases instead of /compare/{topic}/",
      "no persona silo for tenant-rep brokers",
      "future expansion topics have no hierarchical home",
    ],
    recommendedSilos: [
      "/resources/commercial-lease-npv/",
      "/resources/tenant-improvement-allowance/",
      "/resources/discount-rate-sensitivity/",
      "/compare/commercial-leases/",
      "/for/tenant-rep-brokers/",
    ],
    moneyPages: ["/", "/compare-commercial-leases", "/how-it-works", "/pricing"],
    hubs: ["/resources"],
    topicClusters: ["commercial lease NPV", "lease incentives", "discount-rate sensitivity", "occupancy-cost comparison"],
    personaPages: ["/for/tenant-rep-brokers/"],
    comparisonPages: ["/compare/commercial-leases/"],
    questionClusters: ["NPV cluster", "TI cluster", "CAM/operating-expense cluster", "escalation cluster", "objection cluster"],
    conversionPages: ["/early-access", "/pricing"],
    redirectPlanRequiredIfApplied: true,
    executed: false,
    urlsShortDescriptiveStable: true,
  };
}

export function creRedirectPlanIfSilosApplied() {
  return {
    required: true as const,
    executed: false as const,
    mappings: [
      { from: "/commercial-lease-npv", to: "/resources/commercial-lease-npv/" },
      { from: "/tenant-improvement-allowance", to: "/resources/tenant-improvement-allowance/" },
      { from: "/discount-rate-sensitivity", to: "/resources/discount-rate-sensitivity/" },
      { from: "/compare-commercial-leases", to: "/compare/commercial-leases/" },
    ],
  };
}

export function evaluateHubQuality(content: string): Gate {
  const hasOverview = /smallest useful cluster|grouped by how decisions/i.test(content);
  const spokeCount = (content.match(/href="\/(commercial-lease-npv|discount-rate-sensitivity|tenant-improvement-allowance|compare-commercial-leases)"/g) ?? []).length;
  const questions = /Key questions/i.test(content);
  const visual = /data-visualization|topic map/i.test(content);
  const conversion = /early-access|pricing/i.test(content);
  const depth = (content.match(/<h2/g) ?? []).length >= 4 && /AuthorityRefs/.test(content);
  return hasOverview && spokeCount >= 4 && questions && visual && conversion && depth ? "PASS" : "FAIL";
}

export function evaluateInternalLinkSufficiency(input: {
  files: Array<{ path: string; content: string }>;
  pages: PlannedPage[];
  graph: SiteKnowledgeGraph;
}): InternalLinkSufficiency {
  const technical = auditInternalLinks(input.files, input.pages);
  let semanticLinkGaps = 0;
  const weaklyConnected: string[] = [];
  for (const page of input.pages.filter((item) => item.role !== "LEGAL")) {
    const content = pageContent(input.files, page.route);
    const contextual = extractInternalHrefsInBody(content);
    const expected: string[] = [];
    if (page.parentHub) expected.push(page.parentHub);
    if (page.role !== "HOMEPAGE") expected.push("/");
    if (page.role === "QUESTION_PAGE" || page.role === "EDUCATIONAL_ARTICLE") {
      expected.push("/resources", "/compare-commercial-leases", "/early-access");
    }
    if (page.route === "/resources") expected.push("/commercial-lease-npv", "/how-it-works", "/");
    const missing = expected.filter((href) => !contextual.includes(href) && !extractInternalHrefs(content).includes(href));
    semanticLinkGaps += missing.length;
    if (contextual.length < 2 && page.role !== "CONVERSION") weaklyConnected.push(page.route);
  }
  const hub = evaluateHubQuality(pageContent(input.files, "/resources"));
  const educational = input.pages.filter((page) => page.role === "QUESTION_PAGE" || page.role === "EDUCATIONAL_ARTICLE" || page.role === "EDUCATIONAL_HUB");
  const contextualLinking = educational.every((page) => /RelatedContent/.test(pageContent(input.files, page.route))) ? "PASS" : "FAIL";
  return {
    technicalBrokenLinks: technical.broken.length,
    semanticLinkGaps,
    weaklyConnectedPages: weaklyConnected.length,
    hubQuality: hub,
    contextualLinking,
    overall: technical.broken.length === 0 && hub === "PASS" && contextualLinking === "PASS" && semanticLinkGaps === 0 ? "PASS" : "FAIL",
  };
}

export function siteKnowledgeGraphWeighting(graph: SiteKnowledgeGraph) {
  const inbound = new Map<string, number>();
  for (const edge of graph.edges) {
    if (edge.to.startsWith("page:")) inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1);
  }
  const ranked = [...inbound.entries()].sort((a, b) => b[1] - a[1]);
  return {
    authorityHubs: ranked.filter(([id]) => id === "page:/resources" || id === "page:/").map(([id]) => id),
    supportingSpokes: ranked.filter(([id]) => /npv|allowance|discount/.test(id)).map(([id]) => id),
    moneyPages: ["page:/", "page:/compare-commercial-leases", "page:/pricing"],
    comparisonPages: ["page:/compare-commercial-leases"],
    conversionPaths: graph.edges.filter((edge) => edge.type === "commercial-path").map((edge) => edge.edgeId),
  };
}
