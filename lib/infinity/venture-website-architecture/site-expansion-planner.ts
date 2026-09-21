import { SITE_EXPANSION_PLANNER } from "./constants";
import type { AuthorityContentGap, QuestionCoverageProfile } from "./answer-authority/types";
import type { PageRole, SiteExpansionOpportunity, VentureSiteArchitecture } from "./types";

export function planSiteExpansion(
  architecture: VentureSiteArchitecture,
  input?: {
    gaps?: AuthorityContentGap[];
    coverage?: QuestionCoverageProfile;
    performanceIntelligence?: { live: false; gscLive: false };
  },
): {
  planner: typeof SITE_EXPANSION_PLANNER;
  autoPublishThousands: false;
  autoPublish: false;
  opportunities: SiteExpansionOpportunity[];
  pruningSupported: Array<"merge" | "refresh" | "redirect" | "prune" | "deindex">;
  consumesQuestionCoverage: boolean;
  consumesAuthorityGaps: boolean;
  gscLive: false;
} {
  const rejected = architecture.rejectedOpportunities
    .filter((item) => item.status === "FUTURE_EXPANSION")
    .map((item) => ({
      topic: item.topic,
      recommendedPageType: item.recommendedPageType,
      reason: item.searchOpportunity.evidence,
      status: "FUTURE_EXPANSION" as const,
      autoPublish: false as const,
    }));
  const fromGaps = (input?.gaps ?? [])
    .filter((gap) => gap.reason === "DEDICATED_PAGE_NEEDED" || gap.reason === "QUESTION_UNANSWERED")
    .map((gap) => ({
      topic: gap.summary,
      recommendedPageType: (gap.reason === "DEDICATED_PAGE_NEEDED" ? "EDUCATIONAL_ARTICLE" : "QUESTION_PAGE") as PageRole,
      reason: gap.reason,
      status: "FUTURE_EXPANSION" as const,
      autoPublish: false as const,
    }));
  const merged = [...rejected];
  for (const item of fromGaps) {
    if (!merged.some((existing) => existing.topic === item.topic)) merged.push(item);
  }
  void input?.coverage;
  void input?.performanceIntelligence;
  return {
    planner: SITE_EXPANSION_PLANNER,
    autoPublishThousands: false,
    autoPublish: false,
    opportunities: merged,
    pruningSupported: ["merge", "refresh", "redirect", "prune", "deindex"],
    consumesQuestionCoverage: Boolean(input?.coverage),
    consumesAuthorityGaps: Boolean(input?.gaps?.length),
    gscLive: false,
  };
}
