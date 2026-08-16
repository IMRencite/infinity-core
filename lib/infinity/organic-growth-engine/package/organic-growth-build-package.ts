import { randomUUID } from "node:crypto";
import type { ExpansionWave } from "../constants";
import { assignExpansionWave } from "../expansion/digital-real-estate-expansion";
import type {
  OrganicGrowthBuildPackage,
  PageOpportunity,
  SiteMapPlan,
  SourceLineage,
  VentureOrganicContext,
} from "../types";
import type { PageDecisionRecord } from "../types";

export function buildSiteMapPlan(
  ventureId: string,
  approved: PageOpportunity[],
  decisions: PageDecisionRecord[],
  urlEntries: Array<{
    pageOpportunityId: string;
    url: string;
    breadcrumbPath: string[];
  }>,
  schemaTypes: Map<string, string[]>,
  architectureParentMap: Map<string, string | undefined>,
  architectureChildrenMap: Map<string, string[]>,
): SiteMapPlan {
  const decisionMap = new Map(decisions.map((d) => [d.pageOpportunityId, d.decision]));
  const entries = approved.map((opp, index) => {
    const urlEntry = urlEntries.find((e) => e.pageOpportunityId === opp.pageOpportunityId);
    const decision = decisionMap.get(opp.pageOpportunityId) ?? "CREATE";
    return {
      pageOpportunityId: opp.pageOpportunityId,
      url: urlEntry?.url ?? `/pending/${opp.pageOpportunityId}`,
      pageType: opp.pageType,
      status: "APPROVED" as const,
      priority: Math.round(opp.estimatedRevenueContribution + opp.citationPotential * 100),
      parentPageId: architectureParentMap.get(opp.pageOpportunityId),
      childrenPageIds: architectureChildrenMap.get(opp.pageOpportunityId) ?? [],
      schemaTypes: schemaTypes.get(opp.pageOpportunityId) ?? ["WebPage"],
      generationOrder: index + 1,
      expansionWave: assignExpansionWave(opp, decision),
      freshnessRequirement: opp.pageType === "comparison" ? "90d" : undefined,
    };
  });

  const clusterCount = new Set(entries.map((e) => e.parentPageId ?? e.pageOpportunityId)).size;
  return { ventureId, entries, clusterCount };
}

export function groupExpansionWaves(
  siteMap: SiteMapPlan,
): Record<ExpansionWave, string[]> {
  const waves: Record<ExpansionWave, string[]> = {
    FOUNDATION: [],
    VALIDATION: [],
    EXPANSION: [],
    SCALE: [],
  };
  for (const entry of siteMap.entries) {
    waves[entry.expansionWave].push(entry.pageOpportunityId);
  }
  return waves;
}

export function createOrganicGrowthBuildPackage(input: {
  context: VentureOrganicContext;
  sourceLineage: SourceLineage;
  package: Omit<
    OrganicGrowthBuildPackage,
    "packageVersion" | "status" | "sourceLineage" | "ventureId" | "blockedReasons"
  >;
  blockedReasons?: string[];
}): OrganicGrowthBuildPackage {
  const buildPackage: OrganicGrowthBuildPackage = {
    packageVersion: "organic_growth_build_package_v1",
    ventureId: input.context.ventureId,
    status: "READY",
    sourceLineage: input.sourceLineage,
    blockedReasons: input.blockedReasons ?? [],
    ...input.package,
  };

  if (buildPackage.blockedReasons.length > 0) {
    buildPackage.status = buildPackage.approvedPageOpportunities.length > 0 ? "PARTIAL" : "BLOCKED";
  } else if (!buildPackage.organicChannelViability.organicAcquisitionRecommended) {
    buildPackage.status = buildPackage.approvedPageOpportunities.length > 0 ? "PARTIAL" : "BLOCKED";
  }

  return buildPackage;
}

export function buildPackageId(): string {
  return randomUUID();
}
