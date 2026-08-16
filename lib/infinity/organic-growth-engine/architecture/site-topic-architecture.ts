import type {
  InternalLinkGraph,
  InternalLinkRecommendation,
  PageOpportunity,
  SiteTopicArchitecture,
  SiteTopicPage,
} from "../types";
import type { CanonicalURLRegistry } from "../types";

export function buildSiteTopicArchitecture(
  ventureId: string,
  approved: PageOpportunity[],
): SiteTopicArchitecture {
  const pages: SiteTopicPage[] = [];
  const homepage = approved.find((p) => p.pageType === "homepage");
  const hubs = approved.filter((p) => p.authorityRelationship.includes("hub") || p.pageType === "guide");
  const rootTopics = [...new Set(hubs.map((h) => h.proposedTopic))];

  for (const opp of approved) {
    const parent = findParent(opp, approved, homepage);
    const children = approved
      .filter((child) => findParent(child, approved, homepage)?.pageOpportunityId === opp.pageOpportunityId)
      .map((c) => c.pageOpportunityId);
    const siblings = approved
      .filter(
        (s) =>
          s.pageOpportunityId !== opp.pageOpportunityId &&
          s.pageType === opp.pageType &&
          s.primaryIntent === opp.primaryIntent &&
          s.geographicContext?.city === opp.geographicContext?.city,
      )
      .map((s) => s.pageOpportunityId)
      .slice(0, 8);

    pages.push({
      pageOpportunityId: opp.pageOpportunityId,
      role: inferRole(opp),
      parentPageId: parent?.pageOpportunityId,
      childrenPageIds: children,
      siblingPageIds: siblings,
      relatedPageIds: findRelated(opp, approved),
      conversionDestination: inferConversionDestination(opp, approved),
      authorityRole: opp.authorityRelationship,
    });
  }

  return { ventureId, rootTopics, pages };
}

function findParent(
  opp: PageOpportunity,
  approved: PageOpportunity[],
  homepage?: PageOpportunity,
): PageOpportunity | undefined {
  if (opp.pageType === "homepage") return undefined;
  if (opp.geographicContext?.neighborhood) {
    return approved.find(
      (p) => p.pageType === "city" && p.geographicContext?.city === opp.geographicContext?.city,
    );
  }
  if (opp.geographicContext?.city) {
    return homepage ?? approved.find((p) => p.pageType === "service" || p.authorityRelationship.includes("hub"));
  }
  if (opp.pageType === "question" || opp.pageType === "comparison") {
    return approved.find((p) => p.authorityRelationship.includes("hub")) ?? homepage;
  }
  return homepage;
}

function inferRole(opp: PageOpportunity): SiteTopicPage["role"] {
  if (opp.pageType === "homepage" || opp.authorityRelationship === "root_hub") return "hub";
  if (opp.authorityRelationship.includes("hub")) return "hub";
  if (opp.pageType === "question") return "question_spoke";
  if (opp.pageType === "comparison") return "comparison_spoke";
  if (opp.geographicContext) return "geographic_spoke";
  if (/product|category/.test(opp.pageType)) return "product_spoke";
  if (/commercial|transactional/.test(opp.commercialRelationship)) return "commercial_spoke";
  return "spoke";
}

function findRelated(opp: PageOpportunity, approved: PageOpportunity[]): string[] {
  return approved
    .filter(
      (other) =>
        other.pageOpportunityId !== opp.pageOpportunityId &&
        (other.secondaryEntities.includes(opp.primaryEntity) ||
          other.primaryEntity === opp.primaryEntity ||
          other.primaryIntent === opp.primaryIntent),
    )
    .map((o) => o.pageOpportunityId)
    .slice(0, 6);
}

function inferConversionDestination(
  opp: PageOpportunity,
  approved: PageOpportunity[],
): string | undefined {
  const commercial = approved.find(
    (p) => p.pageType === "transactional_landing_page" || p.commercialRelationship === "primary_conversion",
  );
  if (commercial) return commercial.pageOpportunityId;
  return approved.find((p) => p.pageType === "homepage")?.pageOpportunityId;
}

export function buildInternalLinkGraph(
  approved: PageOpportunity[],
  architecture: SiteTopicArchitecture,
  registry: CanonicalURLRegistry,
): InternalLinkGraph {
  const urlByPage = new Map(registry.entries.map((e) => [e.pageOpportunityId, e.url]));
  const links: InternalLinkRecommendation[] = [];

  for (const page of architecture.pages) {
    const sourceUrl = urlByPage.get(page.pageOpportunityId);
    if (!sourceUrl) continue;

    if (page.parentPageId) {
      const targetUrl = urlByPage.get(page.parentPageId);
      if (targetUrl) {
        links.push({
          sourcePageId: page.pageOpportunityId,
          targetPageId: page.parentPageId,
          targetUrl,
          relationship: "PARENT",
          anchorIntent: "Navigate to parent topic hub",
          reason: "Hierarchy parent relationship",
          priority: 0.9,
        });
      }
    }

    for (const childId of page.childrenPageIds.slice(0, 12)) {
      const targetUrl = urlByPage.get(childId);
      if (targetUrl) {
        links.push({
          sourcePageId: page.pageOpportunityId,
          targetPageId: childId,
          targetUrl,
          relationship: "CHILD",
          anchorIntent: "Explore related subtopic",
          reason: "Hierarchy child relationship",
          priority: 0.8,
        });
      }
    }

    for (const relatedId of page.relatedPageIds.slice(0, 4)) {
      const targetUrl = urlByPage.get(relatedId);
      if (targetUrl) {
        links.push({
          sourcePageId: page.pageOpportunityId,
          targetPageId: relatedId,
          targetUrl,
          relationship: "RELATED",
          anchorIntent: "Related resource",
          reason: "Semantic related topic",
          priority: 0.5,
        });
      }
    }

    if (page.conversionDestination && page.conversionDestination !== page.pageOpportunityId) {
      const targetUrl = urlByPage.get(page.conversionDestination);
      if (targetUrl) {
        links.push({
          sourcePageId: page.pageOpportunityId,
          targetPageId: page.conversionDestination,
          targetUrl,
          relationship: "CONVERSION",
          anchorIntent: "Primary conversion action",
          reason: "Commercial conversion path",
          priority: 0.95,
        });
      }
    }
  }

  const linked = new Set(links.flatMap((l) => [l.sourcePageId, l.targetPageId]));
  const orphanPageIds = approved
    .filter((p) => p.pageType !== "homepage" && !linked.has(p.pageOpportunityId))
    .map((p) => p.pageOpportunityId);

  const inboundCount = new Map<string, number>();
  for (const link of links) {
    inboundCount.set(link.targetPageId, (inboundCount.get(link.targetPageId) ?? 0) + 1);
  }

  const hubPages = architecture.pages.filter((p) => p.role === "hub").map((p) => p.pageOpportunityId);
  const weakHubPageIds = hubPages.filter((id) => (inboundCount.get(id) ?? 0) < 2);
  const overlinkedPageIds = [...inboundCount.entries()].filter(([, c]) => c > 15).map(([id]) => id);
  const underlinkedPageIds = approved
    .filter((p) => (inboundCount.get(p.pageOpportunityId) ?? 0) < 1 && p.pageType !== "homepage")
    .map((p) => p.pageOpportunityId);

  const organicAuthorityGraphScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        50 +
          hubPages.length * 5 -
          weakHubPageIds.length * 8 -
          orphanPageIds.length * 5 -
          underlinkedPageIds.length * 2,
      ),
    ),
  );

  return {
    links,
    orphanPageIds,
    weakHubPageIds,
    overlinkedPageIds,
    underlinkedPageIds,
    organicAuthorityGraphScore,
  };
}
