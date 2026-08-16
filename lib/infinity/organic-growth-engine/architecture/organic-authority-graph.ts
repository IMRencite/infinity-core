import type {
  InternalLinkGraph,
  OrganicAuthorityGraph,
  OrganicAuthorityNode,
  PageOpportunity,
  SiteTopicArchitecture,
} from "../types";

export function buildOrganicAuthorityGraph(input: {
  ventureId: string;
  approved: PageOpportunity[];
  siteTopicArchitecture: SiteTopicArchitecture;
  internalLinkGraph: InternalLinkGraph;
}): OrganicAuthorityGraph {
  const nodes: OrganicAuthorityNode[] = input.approved.map((opp) => {
    const arch = input.siteTopicArchitecture.pages.find(
      (p) => p.pageOpportunityId === opp.pageOpportunityId,
    );
    const inbound = input.internalLinkGraph.links.filter((l) => l.targetPageId === opp.pageOpportunityId).length;
    const outbound = input.internalLinkGraph.links.filter((l) => l.sourcePageId === opp.pageOpportunityId).length;
    const role = arch?.role ?? "spoke";
    const authorityWeight =
      role === "hub" ? 1 : opp.authorityRelationship.includes("hub") ? 0.85 : 0.45;
    return {
      pageOpportunityId: opp.pageOpportunityId,
      role,
      authorityWeight,
      inboundLinkCount: inbound,
      outboundLinkCount: outbound,
      parentPageId: arch?.parentPageId,
      coverageGap: opp.evidenceAvailability < 0.4 || opp.uniquenessPotential < 0.35,
      priorityScore: Math.round(
        (authorityWeight * 40 + inbound * 5 + opp.citationPotential * 30 + opp.crawlValue * 25) * 100,
      ) / 100,
    };
  });

  const hubNodes = nodes.filter((n) => n.role === "hub").map((n) => n.pageOpportunityId);
  const coverageGaps = nodes.filter((n) => n.coverageGap).map((n) => n.pageOpportunityId);

  return {
    ventureId: input.ventureId,
    hubPageIds: hubNodes,
    nodes,
    coverageGaps,
    authorityFlowEdges: input.internalLinkGraph.links.map((l) => ({
      sourcePageId: l.sourcePageId,
      targetPageId: l.targetPageId,
      relationship: l.relationship,
      priority: l.priority,
    })),
  };
}
