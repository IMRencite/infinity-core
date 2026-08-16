import { randomUUID } from "node:crypto";
import type { GraphRelationshipType, PageType } from "../constants";
import type {
  PageOpportunity,
  SearchAnswerEdge,
  SearchAnswerNode,
  SearchAnswerOpportunityGraph,
  VentureOrganicContext,
} from "../types";

type GraphSeed = {
  nodeType: SearchAnswerNode["nodeType"];
  label: string;
  entityType?: string;
  evidenceConfidence?: SearchAnswerNode["evidenceConfidence"];
  metadata?: Record<string, unknown>;
};

function nodeId(prefix: string, label: string): string {
  return `${prefix}:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function addNode(
  nodes: SearchAnswerNode[],
  seed: GraphSeed,
): SearchAnswerNode {
  const id = nodeId(seed.nodeType, seed.label);
  if (nodes.some((n) => n.nodeId === id)) {
    return nodes.find((n) => n.nodeId === id)!;
  }
  const node: SearchAnswerNode = {
    nodeId: id,
    nodeType: seed.nodeType,
    label: seed.label,
    entityType: seed.entityType,
    evidenceConfidence: seed.evidenceConfidence ?? "DERIVED",
    metadata: seed.metadata,
  };
  nodes.push(node);
  return node;
}

function addEdge(
  edges: SearchAnswerEdge[],
  sourceNodeId: string,
  targetNodeId: string,
  relationship: GraphRelationshipType,
  evidenceConfidence: SearchAnswerEdge["evidenceConfidence"] = "DERIVED",
): void {
  const edgeId = `${sourceNodeId}->${relationship}->${targetNodeId}`;
  if (edges.some((e) => e.edgeId === edgeId)) return;
  edges.push({
    edgeId,
    sourceNodeId,
    targetNodeId,
    relationship,
    evidenceConfidence,
  });
}

function mapEntityTypeToNodeType(type: string): SearchAnswerNode["nodeType"] {
  if (type === "city") return "city";
  if (type === "neighborhood") return "neighborhood";
  if (type === "location") return "location";
  if (type === "use_case") return "use_case";
  if (type === "product") return "product";
  if (type === "category") return "category";
  if (type === "route") return "route";
  return "entity";
}

export function buildSearchAnswerOpportunityGraph(
  context: VentureOrganicContext,
): SearchAnswerOpportunityGraph {
  const nodes: SearchAnswerNode[] = [];
  const edges: SearchAnswerEdge[] = [];

  const rootEntity = addNode(nodes, {
    nodeType: "entity",
    label: context.ventureName,
    entityType: "organization",
    evidenceConfidence: "SOURCE_BACKED",
  });

  addNode(nodes, {
    nodeType: "topic",
    label: context.solution,
    evidenceConfidence: "DERIVED",
  });
  addEdge(edges, rootEntity.nodeId, nodeId("topic", context.solution), "supports_authority");

  addNode(nodes, {
    nodeType: "problem",
    label: context.problem,
    evidenceConfidence: "DERIVED",
  });
  addEdge(edges, nodeId("problem", context.problem), rootEntity.nodeId, "service_for");

  const customerNode = addNode(nodes, {
    nodeType: "entity",
    label: context.targetCustomer,
    entityType: "audience",
    evidenceConfidence: "DERIVED",
  });
  addEdge(edges, rootEntity.nodeId, customerNode.nodeId, "service_for");

  for (const stage of ["awareness", "consideration", "decision", "retention"]) {
    const stageNode = addNode(nodes, {
      nodeType: "buyer_stage",
      label: stage,
      evidenceConfidence: "DERIVED",
    });
    addEdge(edges, customerNode.nodeId, stageNode.nodeId, "supports_conversion");
  }

  const intents = inferIntentsFromContext(context);
  for (const intent of intents.informational) {
    const q = addNode(nodes, { nodeType: "question", label: intent, evidenceConfidence: "ESTIMATED" });
    addEdge(edges, q.nodeId, nodeId("topic", context.solution), "question_about");
  }
  for (const intent of intents.commercial) {
    const intentNode = addNode(nodes, { nodeType: "intent", label: intent, evidenceConfidence: "ESTIMATED" });
    addEdge(edges, intentNode.nodeId, rootEntity.nodeId, "supports_purchase");
  }
  for (const intent of intents.transactional) {
    const intentNode = addNode(nodes, { nodeType: "intent", label: intent, evidenceConfidence: "ESTIMATED" });
    addEdge(edges, intentNode.nodeId, rootEntity.nodeId, "supports_conversion");
  }

  for (const entity of intents.entities) {
    const entityNode = addNode(nodes, {
      nodeType: mapEntityTypeToNodeType(entity.type),
      label: entity.label,
      entityType: entity.type,
      evidenceConfidence: entity.evidenceConfidence,
      metadata: {
        ...entity.metadata,
        ...(entity.parentLabel ? { city: entity.parentLabel } : {}),
      },
    });
    addEdge(edges, entityNode.nodeId, rootEntity.nodeId, entity.relationship);
    if (entity.parentLabel) {
      const parentNodeType = mapEntityTypeToNodeType("city");
      addEdge(edges, entityNode.nodeId, nodeId(parentNodeType, entity.parentLabel), "located_in");
    }
  }

  for (const comparison of intents.comparisons) {
    const cmp = addNode(nodes, { nodeType: "comparison", label: comparison, evidenceConfidence: "DERIVED" });
    addEdge(edges, cmp.nodeId, rootEntity.nodeId, "comparison_between");
  }

  return { ventureId: context.ventureId, nodes, edges };
}

function inferIntentsFromContext(context: VentureOrganicContext): {
  informational: string[];
  commercial: string[];
  transactional: string[];
  entities: Array<{
    label: string;
    type: string;
    relationship: GraphRelationshipType;
    parentLabel?: string;
    evidenceConfidence?: SearchAnswerNode["evidenceConfidence"];
    metadata?: Record<string, unknown>;
  }>;
  comparisons: string[];
} {
  const vt = `${context.ventureType} ${context.secondaryVentureTypes?.join(" ") ?? ""}`.toLowerCase();
  const dist = context.distributionStrategy.toLowerCase();
  const summary = `${context.businessSummary} ${context.solution}`.toLowerCase();

  const informational: string[] = [
    `What is ${context.solution}?`,
    `How does ${context.solution} work for ${context.targetCustomer}?`,
    `What should ${context.targetCustomer} consider before choosing ${context.solution}?`,
  ];

  const commercial = [`${context.solution} pricing`, `${context.solution} vs alternatives`];
  const transactional = [`Book ${context.solution}`, `Get ${context.solution}`];
  const comparisons: string[] = [];
  const entities: Array<{
    label: string;
    type: string;
    relationship: GraphRelationshipType;
    parentLabel?: string;
    evidenceConfidence?: SearchAnswerNode["evidenceConfidence"];
    metadata?: Record<string, unknown>;
  }> = [];

  if (/saas|software|subscription/.test(vt)) {
    informational.push(
      `How to implement ${context.solution}`,
      `Common mistakes when adopting ${context.solution}`,
    );
    comparisons.push(`${context.solution} vs competitor platforms`);
    for (const feature of extractFeatureHints(context)) {
      entities.push({ label: feature, type: "feature", relationship: "entity_attribute" });
    }
  }

  if (/marketplace|ecommerce|commerce/.test(vt)) {
    informational.push(`Best practices for ${context.targetCustomer}`);
    for (const feature of extractFeatureHints(context)) {
      entities.push({ label: feature, type: "product", relationship: "product_for" });
    }
    entities.push({ label: "Shop by category", type: "category", relationship: "supports_authority" });
    comparisons.push(`Top alternatives for ${context.targetCustomer}`);
  }

  if (/local|service|geo|city|neighborhood/.test(vt) || /local|city|service area/.test(summary)) {
    for (const city of extractGeographicHints(context, "cities")) {
      entities.push({ label: String(city), type: "city", relationship: "location_for" });
    }
    for (const neighborhood of extractGeographicHints(context, "neighborhoods")) {
      if (typeof neighborhood === "string") continue;
      const city = neighborhood.city;
      entities.push({
        label: neighborhood.name,
        type: "neighborhood",
        relationship: "location_for",
        parentLabel: city,
        evidenceConfidence: neighborhood.evidenceConfidence,
        metadata: neighborhood.metadata,
      });
    }
  }

  if (/b2b|enterprise|high.?value|premium|consulting/.test(vt) || /premium|enterprise|b2b/.test(summary)) {
    informational.push(
      `ROI of ${context.solution}`,
      `Compliance and risk considerations for ${context.targetCustomer}`,
    );
    for (const useCase of extractUseCaseHints(context)) {
      entities.push({ label: useCase, type: "use_case", relationship: "supports_conversion" });
    }
    for (const route of extractRouteHints(context)) {
      entities.push({ label: route, type: "route", relationship: "supports_authority", evidenceConfidence: "ESTIMATED" });
    }
  }

  if (/seo|organic|content|geo/.test(dist)) {
    informational.push(`Complete guide to ${context.problem.replace(/\.$/, "")}`);
  }

  return { informational, commercial, transactional, entities, comparisons };
}

function extractFeatureHints(context: VentureOrganicContext): string[] {
  const hints = context.contentArchitecture?.features;
  if (Array.isArray(hints)) return hints.slice(0, 8).map(String);
  return ["Core workflow automation", "Reporting dashboard", "Integrations"];
}

function extractUseCaseHints(context: VentureOrganicContext): string[] {
  const meta = context.contentArchitecture?.useCases;
  if (Array.isArray(meta)) return meta.slice(0, 10).map(String);
  return [
    `${context.targetCustomer} onboarding`,
    `${context.targetCustomer} compliance workflow`,
    `${context.targetCustomer} executive reporting`,
  ];
}

function extractRouteHints(context: VentureOrganicContext): string[] {
  const meta = context.contentArchitecture?.routes;
  if (Array.isArray(meta)) return meta.slice(0, 20).map(String);
  return [];
}

function extractGeographicHints(
  context: VentureOrganicContext,
  kind: "cities" | "neighborhoods",
): Array<
  | string
  | {
      name: string;
      city: string;
      evidenceConfidence?: SearchAnswerNode["evidenceConfidence"];
      metadata?: Record<string, unknown>;
    }
> {
  const geo = context.contentArchitecture?.geography as
    | { cities?: string[]; neighborhoods?: Array<{ name: string; city: string; metadata?: Record<string, unknown>; evidenceConfidence?: string }> }
    | undefined;
  if (!geo) return [];
  if (kind === "cities") return geo.cities ?? [];
  return (geo.neighborhoods ?? []).map((n) => ({
    name: n.name,
    city: n.city,
    metadata: n.metadata,
    evidenceConfidence: (n.evidenceConfidence as SearchAnswerNode["evidenceConfidence"]) ?? "DERIVED",
  }));
}

export function graphNodeToPageType(node: SearchAnswerNode): PageType {
  if (node.nodeType === "product") return "product";
  if (node.nodeType === "category") return "category";
  if (node.nodeType === "route") return "route";
  switch (node.nodeType) {
    case "question":
      return "question";
    case "comparison":
      return "comparison";
    case "city":
      return "city";
    case "neighborhood":
      return "neighborhood";
    case "location":
      return "location";
    case "entity":
      if (node.entityType === "category") return "category";
      if (node.entityType === "route") return "route";
      if (node.entityType === "use_case") return "use_case";
      return "service";
    case "topic":
      return "guide";
    case "intent":
      return "transactional_landing_page";
    default:
      return "resource";
  }
}

export function generatePageOpportunityId(): string {
  return randomUUID();
}

export function generatePageOpportunitiesFromGraph(
  graph: SearchAnswerOpportunityGraph,
  context: VentureOrganicContext,
  options?: { includeProgrammaticCombinations?: boolean; maxCandidates?: number },
): PageOpportunity[] {
  const opportunities: PageOpportunity[] = [];
  const clv = context.customerLifetimeValue ?? 500;
  const aov = context.averageOrderValue ?? clv * 0.2;
  const conv = context.conversionRateEstimate ?? 0.02;

  const homepage: PageOpportunity = {
    pageOpportunityId: generatePageOpportunityId(),
    ventureId: context.ventureId,
    pageType: "homepage",
    primaryEntity: context.ventureName,
    secondaryEntities: [],
    primaryIntent: "navigational",
    secondaryIntents: ["brand"],
    buyerStage: "awareness",
    proposedTopic: context.ventureName,
    proposedPurpose: "Establish brand, value proposition, and primary conversion paths",
    commercialRelationship: "primary_conversion",
    conversionRelationship: "entry_point",
    authorityRelationship: "root_hub",
    searchDemandSignal: { level: 0.7, evidenceConfidence: "DERIVED" },
    aiAnswerDemandSignal: { level: 0.5, evidenceConfidence: "DERIVED" },
    uniquenessPotential: 0.95,
    evidenceAvailability: 0.9,
    contentDepthPotential: 0.7,
    citationPotential: 0.4,
    programmaticPotential: 0,
    estimatedProductionCost: 400,
    estimatedResearchCost: 50,
    estimatedMaintenanceCost: 40,
    estimatedTrafficPotential: 500,
    estimatedConversionPotential: 0.04,
    estimatedRevenueContribution: 500 * conv * aov,
    cannibalizationRisk: 0.05,
    thinContentRisk: 0.05,
    crawlValue: 1,
    confidence: 0.95,
  };
  opportunities.push(homepage);

  for (const node of graph.nodes) {
    if (node.nodeType === "buyer_stage" || node.nodeType === "intent") continue;
    if (node.nodeType === "entity" && node.entityType === "organization") continue;

    const pageType = graphNodeToPageType(node);
    const isGeo = node.nodeType === "city" || node.nodeType === "neighborhood" || node.nodeType === "location";
    const isQuestion = node.nodeType === "question";
    const isComparison = node.nodeType === "comparison";
    const evidence = node.evidenceConfidence === "SOURCE_BACKED" ? 0.85 : node.evidenceConfidence === "DERIVED" ? 0.65 : node.evidenceConfidence === "ESTIMATED" ? 0.45 : 0.2;

    const demand = isQuestion ? 0.55 : isComparison ? 0.6 : isGeo ? 0.5 : 0.45;
    const uniqueness = isGeo && node.nodeType === "neighborhood" ? (node.metadata?.differentiation as number) ?? 0.35 : isQuestion ? 0.7 : 0.55;
    const thinRisk = isGeo && node.nodeType === "neighborhood" && uniqueness < 0.45 ? 0.75 : isGeo ? 0.35 : 0.2;
    const productionCost = isGeo ? 350 : isQuestion ? 250 : isComparison ? 400 : 300;
    const researchCost = evidence < 0.5 ? 200 : 80;

    const opportunity: PageOpportunity = {
      pageOpportunityId: generatePageOpportunityId(),
      ventureId: context.ventureId,
      pageType,
      primaryEntity: node.label,
      secondaryEntities: [context.ventureName],
      primaryIntent: isQuestion ? "informational" : isComparison ? "commercial" : isGeo ? "local_commercial" : "informational",
      secondaryIntents: isGeo ? ["local", "service"] : [],
      buyerStage: isComparison ? "decision" : isQuestion ? "consideration" : "awareness",
      proposedTopic: node.label,
      proposedPurpose: describePurpose(node, context),
      commercialRelationship: isComparison || pageType === "transactional_landing_page" ? "conversion_support" : "authority_support",
      conversionRelationship: isGeo ? "local_lead" : "assisted_conversion",
      authorityRelationship: node.nodeType === "topic" ? "hub" : "spoke",
      searchDemandSignal: { level: demand, evidenceConfidence: node.evidenceConfidence },
      aiAnswerDemandSignal: { level: isQuestion ? 0.75 : 0.4, evidenceConfidence: node.evidenceConfidence },
      uniquenessPotential: uniqueness,
      evidenceAvailability: evidence,
      contentDepthPotential: isQuestion ? 0.65 : 0.55,
      citationPotential: isQuestion ? 0.7 : 0.45,
      programmaticPotential: node.nodeType === "route" ? 0.6 : 0.1,
      estimatedProductionCost: productionCost,
      estimatedResearchCost: researchCost,
      estimatedMaintenanceCost: isGeo ? 60 : 30,
      estimatedTrafficPotential: Math.round(demand * 800),
      estimatedConversionPotential: isGeo ? 0.03 : conv,
      estimatedRevenueContribution: demand * 800 * (isGeo ? 0.03 : conv) * aov,
      cannibalizationRisk: isGeo ? 0.45 : 0.25,
      thinContentRisk: thinRisk,
      crawlValue: thinRisk > 0.6 ? 0.3 : 0.8,
      confidence: evidence,
      parentEntityId: node.metadata?.parentEntityId as string | undefined,
      geographicContext: isGeo
        ? {
            city:
              node.nodeType === "city"
                ? node.label
                : (node.metadata?.city as string | undefined) ?? (node.metadata?.parentLabel as string | undefined),
            neighborhood: node.nodeType === "neighborhood" ? node.label : undefined,
            region: node.metadata?.region as string | undefined,
          }
        : undefined,
    };

    if (node.metadata) {
      (opportunity as PageOpportunity & { metadata?: Record<string, unknown> }).metadata = node.metadata;
    }
    opportunities.push(opportunity);
  }

  if (options?.includeProgrammaticCombinations) {
    const cities = graph.nodes.filter((n) => n.nodeType === "city");
    const services = graph.nodes.filter(
      (n) => n.nodeType === "use_case" || (n.nodeType === "entity" && n.entityType === "use_case"),
    );
    const routes = graph.nodes.filter((n) => n.entityType === "route");
    for (const city of cities) {
      for (const service of services) {
        opportunities.push(buildProgrammaticOpportunity(context, city.label, service.label, "service"));
      }
      for (const route of routes) {
        opportunities.push(buildProgrammaticOpportunity(context, city.label, route.label, "route"));
      }
    }
    for (const route of routes) {
      for (const service of services) {
        opportunities.push(buildProgrammaticOpportunity(context, service.label, route.label, "route-service"));
      }
    }
  }

  const max = options?.maxCandidates ?? opportunities.length;
  return opportunities.slice(0, max);
}

function buildProgrammaticOpportunity(
  context: VentureOrganicContext,
  primary: string,
  secondary: string,
  kind: string,
): PageOpportunity {
  const aov = context.averageOrderValue ?? (context.customerLifetimeValue ?? 500) * 0.2;
  return {
    pageOpportunityId: generatePageOpportunityId(),
    ventureId: context.ventureId,
    pageType: "programmatic_page",
    primaryEntity: `${secondary} in ${primary}`,
    secondaryEntities: [primary, secondary],
    primaryIntent: "local_commercial",
    secondaryIntents: ["programmatic", kind],
    buyerStage: "decision",
    proposedTopic: `${secondary} — ${primary}`,
    proposedPurpose: `Programmatic combination (${kind}) of ${secondary} and ${primary}`,
    commercialRelationship: "conversion_support",
    conversionRelationship: "local_lead",
    authorityRelationship: "geographic_spoke",
    searchDemandSignal: { level: 0.25, evidenceConfidence: "ESTIMATED" },
    aiAnswerDemandSignal: { level: 0.2, evidenceConfidence: "ESTIMATED" },
    uniquenessPotential: 0.2,
    evidenceAvailability: 0.25,
    contentDepthPotential: 0.25,
    citationPotential: 0.15,
    programmaticPotential: 0.95,
    estimatedProductionCost: 120,
    estimatedResearchCost: 80,
    estimatedMaintenanceCost: 40,
    estimatedTrafficPotential: 80,
    estimatedConversionPotential: 0.01,
    estimatedRevenueContribution: 80 * 0.01 * aov,
    cannibalizationRisk: 0.7,
    thinContentRisk: 0.85,
    crawlValue: 0.2,
    confidence: 0.25,
    geographicContext: kind.includes("route") ? undefined : { city: primary },
  };
}

function describePurpose(node: SearchAnswerNode, context: VentureOrganicContext): string {
  switch (node.nodeType) {
    case "question":
      return `Authoritative answer resource for: ${node.label}`;
    case "comparison":
      return `Decision-support comparison relevant to ${context.targetCustomer}`;
    case "city":
      return `City-level local authority hub for ${context.solution}`;
    case "neighborhood":
      return `Neighborhood spoke with verified local differentiation for ${context.solution}`;
    case "topic":
      return `Topical authority hub covering ${node.label}`;
    default:
      return `Support ${context.targetCustomer} understanding of ${node.label}`;
  }
}
