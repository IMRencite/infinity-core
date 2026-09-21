import { SITE_KNOWLEDGE_GRAPH } from "./constants";
import type { KnowledgeGraphEdge, SiteKnowledgeGraph, VentureSiteArchitecture } from "./types";

const ANCHORS: Record<string, string> = {
  "/": "commercial lease comparison offer",
  "/how-it-works": "how the proposed workflow works",
  "/commercial-lease-npv": "commercial lease NPV",
  "/compare-commercial-leases": "comparing two commercial leases",
  "/tenant-improvement-allowance": "tenant improvement allowance",
  "/discount-rate-sensitivity": "discount-rate sensitivity",
  "/pricing": "early validation pricing",
  "/resources": "lease economics resources",
  "/faq": "pilot questions",
  "/early-access": "request pilot access",
  "/privacy-policy": "privacy policy",
  "/terms-of-service": "terms of service",
  "/resources/cam-costs": "CAM costs in a commercial lease",
  "/resources/free-rent": "free rent and occupancy cost",
  "/resources/rent-escalations": "rent escalations in a comparison",
  "/resources/gross-vs-net-lease": "gross lease versus net lease",
  "/for/tenant-rep-brokers": "tenant-rep broker workflow",
};

export function buildSiteKnowledgeGraph(architecture: VentureSiteArchitecture): SiteKnowledgeGraph {
  void SITE_KNOWLEDGE_GRAPH;
  const nodes = architecture.pages.map((page) => ({
    nodeId: `page:${page.route}`,
    kind: "page" as const,
    label: page.title,
    route: page.route,
  }));
  const entities = [
    ["commercial_lease", "Commercial lease"],
    ["npv", "NPV"],
    ["discount_rate", "Discount rate"],
    ["tenant_improvement_allowance", "Tenant improvement allowance"],
    ["cam", "CAM"],
    ["free_rent", "Free rent"],
    ["rent_escalation", "Rent escalation"],
    ["tenant_representation", "Tenant representation"],
    ["lease_cash_flow", "Lease cash flow"],
    ["occupancy_cost", "Occupancy cost"],
    ["client_summary", "Client summary"],
  ].map(([entityId, label]) => ({ nodeId: `entity:${entityId}`, kind: "entity" as const, label, entityId }));
  const edges: KnowledgeGraphEdge[] = [];
  const add = (from: string, to: string, type: KnowledgeGraphEdge["type"], anchor: string) => {
    if (from === to) return;
    edges.push({ edgeId: `${type}:${from}->${to}`, from, to, type, anchor });
  };
  for (const page of architecture.pages) {
    if (page.parentHub) {
      add(`page:${page.route}`, `page:${page.parentHub}`, "parent", ANCHORS[page.parentHub] ?? page.parentHub);
      add(`page:${page.parentHub}`, `page:${page.route}`, "child", ANCHORS[page.route] ?? page.title);
    }
    if (page.route !== "/" && page.role !== "LEGAL") {
      add(`page:${page.route}`, "page:/", "commercial-path", ANCHORS["/"]);
    }
  }
  const present = new Set(architecture.pages.map((page) => page.route));
  const siblings = [
    "/commercial-lease-npv",
    "/compare-commercial-leases",
    "/tenant-improvement-allowance",
    "/discount-rate-sensitivity",
    "/resources/cam-costs",
    "/resources/free-rent",
    "/resources/rent-escalations",
    "/resources/gross-vs-net-lease",
  ].filter((route) => present.has(route));
  for (const left of siblings) {
    for (const right of siblings) {
      if (left !== right) add(`page:${left}`, `page:${right}`, "related", ANCHORS[right]);
    }
  }
  add("page:/commercial-lease-npv", "page:/compare-commercial-leases", "next-step", ANCHORS["/compare-commercial-leases"]);
  add("page:/compare-commercial-leases", "page:/pricing", "commercial-path", ANCHORS["/pricing"]);
  add("page:/pricing", "page:/early-access", "commercial-path", ANCHORS["/early-access"]);
  add("page:/how-it-works", "page:/early-access", "commercial-path", ANCHORS["/early-access"]);
  add("page:/resources", "page:/how-it-works", "next-step", ANCHORS["/how-it-works"]);
  add("page:/commercial-lease-npv", "entity:npv", "definition", "NPV");
  add("page:/discount-rate-sensitivity", "entity:discount_rate", "definition", "discount rate");
  add("page:/tenant-improvement-allowance", "entity:tenant_improvement_allowance", "definition", "tenant improvement allowance");
  add("page:/compare-commercial-leases", "entity:occupancy_cost", "comparison", "occupancy cost");
  if (present.has("/resources/cam-costs")) add("page:/resources/cam-costs", "entity:cam", "definition", "CAM");
  if (present.has("/resources/free-rent")) add("page:/resources/free-rent", "entity:free_rent", "definition", "free rent");
  if (present.has("/resources/rent-escalations")) add("page:/resources/rent-escalations", "entity:rent_escalation", "definition", "rent escalation");
  if (present.has("/for/tenant-rep-brokers")) {
    add("page:/for/tenant-rep-brokers", "entity:tenant_representation", "definition", "tenant representation");
    add("page:/for/tenant-rep-brokers", "page:/early-access", "commercial-path", ANCHORS["/early-access"]);
  }
  add("page:/privacy-policy", "page:/terms-of-service", "related", ANCHORS["/terms-of-service"]);
  add("page:/terms-of-service", "page:/privacy-policy", "related", ANCHORS["/privacy-policy"]);

  const existing = new Set(architecture.pages.map((page) => `page:${page.route}`));
  const pageIds = new Set(architecture.pages.filter((page) => page.indexable).map((page) => `page:${page.route}`));
  const inbound = new Map<string, number>();
  const broken: string[] = [];
  for (const edge of edges) {
    if (edge.from.startsWith("page:") && !existing.has(edge.from)) broken.push(edge.edgeId);
    if (edge.to.startsWith("page:") && !existing.has(edge.to)) broken.push(edge.edgeId);
    if (edge.to.startsWith("page:")) inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1);
  }
  const orphans = [...pageIds].filter((id) => (inbound.get(id) ?? 0) === 0 && id !== "page:/");
  return { nodes: [...nodes, ...entities], edges, orphans, brokenEdges: [...new Set(broken)] };
}

export function graphHrefMap(graph: SiteKnowledgeGraph): Record<string, Array<{ href: string; anchor: string; type: string }>> {
  const map: Record<string, Array<{ href: string; anchor: string; type: string }>> = {};
  for (const edge of graph.edges) {
    if (!edge.from.startsWith("page:") || !edge.to.startsWith("page:")) continue;
    const from = edge.from.replace("page:", "");
    const href = edge.to.replace("page:", "");
    map[from] ??= [];
    if (!map[from].some((item) => item.href === href)) map[from].push({ href, anchor: edge.anchor, type: edge.type });
  }
  return map;
}
