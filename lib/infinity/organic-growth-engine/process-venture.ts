import { buildSiteEntityGraph } from "./architecture/site-entity-graph";
import { buildOrganicAuthorityGraph } from "./architecture/organic-authority-graph";
import { buildInternalLinkGraph, buildSiteTopicArchitecture } from "./architecture/site-topic-architecture";
import {
  buildCanonicalUrlRegistry,
  validateInternalLinkTargets,
} from "./architecture/url-architecture-engine";
import {
  buildClaimGraph,
  buildEvidencePlan,
  buildInformationGainPlan,
  buildOrganicContentContract,
  buildTopicCoverageMap,
  calculateContentCompleteness,
  classifyResourceDepth,
} from "./content/content-planning";
import { deduplicateOpportunities, decidePages } from "./decisions/cannibalization-engine";
import { assessEEATReadiness, buildHumanContributionRequests, classifyHitlNecessity } from "./eeat/eeat-hitl";
import { calculateMarginalPageEconomics, calculateClusterEconomics, filterByMarginalEconomics } from "./economics/marginal-page-economics";
import type { ResolvedMonetizationEconomics } from "./types";
import type { FeedbackReadyMetricsContract } from "./types";
import {
  assessDigitalRealEstateExpansion,
} from "./expansion/digital-real-estate-expansion";
import {
  buildSearchAnswerOpportunityGraph,
  generatePageOpportunitiesFromGraph,
} from "./graph/search-answer-opportunity-graph";
import {
  applyNeighborhoodDecisions,
  buildNeighborhoodInformationGainPlan,
  evaluateNeighborhoodViability,
} from "./local/neighborhood-viability";
import {
  createOrganicGrowthBuildPackage,
  buildSiteMapPlan,
  groupExpansionWaves,
} from "./package/organic-growth-build-package";
import {
  assessThinContentRisk,
  calculateCitationWorthiness,
  passesPreGenerationGate,
} from "./quality/quality-gates";
import { runAdversarialSeoReview } from "./review/adversarial-review";
import { calculatePageOpportunityScore } from "./scoring/page-opportunity-score";
import { countFabricatedLocalBusiness, recommendSchemas } from "./schema/schema-recommendation-engine";
import { DEFAULT_QUALITY_THRESHOLDS } from "./constants";
import { buildViabilityInput } from "./fixtures/test-ventures";
import { calculateOrganicChannelViability } from "./viability/organic-channel-viability";
import type {
  OrganicGrowthBuildPackage,
  PageOpportunity,
  SourceLineage,
  VentureOrganicContext,
} from "./types";

export type VentureProcessingResult = {
  context: VentureOrganicContext;
  buildPackage: OrganicGrowthBuildPackage;
  stats: {
    rawOpportunities: number;
    deduplicatedOpportunities: number;
    create: number;
    merge: number;
    defer: number;
    reject: number;
    thinContentFailures: number;
    informationGainFailures: number;
    evidenceFailures: number;
    citationWorthinessFailures: number;
    initialGenerationWave: number;
    contentDepth: Record<string, number>;
    citiesEvaluated: number;
    neighborhoodsEvaluated: number;
    neighborhoodCreate: number;
    neighborhoodMerge: number;
    neighborhoodReject: number;
    neighborhoodSupporting: number;
    neighborhoodDefer: number;
  };
};

export function processVentureOrganicArchitecture(
  context: VentureOrganicContext,
  sourceLineage: SourceLineage,
  options?: {
    includeProgrammaticCombinations?: boolean;
    maxCandidates?: number;
    economics?: ResolvedMonetizationEconomics;
  },
): VentureProcessingResult {
  const viability = calculateOrganicChannelViability(buildViabilityInput(context));

  const graph = buildSearchAnswerOpportunityGraph(context);
  const rawOpportunities = generatePageOpportunitiesFromGraph(graph, context, {
    includeProgrammaticCombinations: options?.includeProgrammaticCombinations ?? false,
    maxCandidates: options?.maxCandidates,
  });

  const { deduplicated, rawCount } = deduplicateOpportunities(rawOpportunities);
  const scores = deduplicated.map((o) => calculatePageOpportunityScore(o));
  let decisions = decidePages(deduplicated, scores, {
    viabilityRecommendation: viability.recommendation,
  });

  if (["AUTHORITY", "LARGE_SCALE", "STANDARD"].includes(viability.recommendation)) {
    const targetMin =
      viability.recommendation === "LARGE_SCALE"
        ? 10
        : viability.recommendation === "AUTHORITY"
          ? 8
          : 5;
    let createCount = decisions.filter((d) => d.decision === "CREATE").length;
    if (createCount < targetMin) {
      const promotable = deduplicated
        .map((o) => ({
          opportunity: o,
          score: scores.find((s) => s.pageOpportunityId === o.pageOpportunityId)?.score ?? 0,
          decision: decisions.find((d) => d.pageOpportunityId === o.pageOpportunityId),
        }))
        .filter(
          (entry) =>
            entry.decision &&
            entry.decision.decision === "DEFER" &&
            entry.opportunity.pageType !== "programmatic_page" &&
            entry.opportunity.thinContentRisk <= DEFAULT_QUALITY_THRESHOLDS.maxThinContentRisk / 100 &&
            entry.score >= DEFAULT_QUALITY_THRESHOLDS.minPageOpportunityScore * 0.85,
        )
        .sort((a, b) => b.score - a.score);
      for (const entry of promotable) {
        if (createCount >= targetMin) break;
        entry.decision!.decision = "CREATE";
        entry.decision!.reason = "Promoted to foundation wave based on authority economics";
        createCount += 1;
      }
    }
  }

  const neighborhoodPages = deduplicated.filter((o) => o.pageType === "neighborhood");
  const neighborhoodViability = neighborhoodPages.map((o) => {
    const meta = context.contentArchitecture?.geography as
      | { neighborhoods?: Array<{ name: string; city: string; metadata?: Record<string, unknown> }> }
      | undefined;
    const match = meta?.neighborhoods?.find((n) => n.name === o.geographicContext?.neighborhood);
    if (match?.metadata) {
      (o as PageOpportunity & { metadata?: Record<string, unknown> }).metadata = match.metadata;
    }
    return evaluateNeighborhoodViability(o);
  });
  decisions = applyNeighborhoodDecisions(decisions, neighborhoodViability);

  const decisionMap = new Map(decisions.map((d) => [d.pageOpportunityId, d]));
  const approvedIds = new Set(
    decisions.filter((d) => d.decision === "CREATE").map((d) => d.pageOpportunityId),
  );

  let approved = deduplicated.filter((o) => approvedIds.has(o.pageOpportunityId));
  const economicsAll = deduplicated.map((o) =>
    calculateMarginalPageEconomics(o, context, options?.economics),
  );
  const minMarginal =
    viability.recommendation === "NONE"
      ? 999
      : (options?.economics?.minMarginalPageValue ?? 0);
  approved = filterByMarginalEconomics(approved, economicsAll, minMarginal);
  const clusterEconomics = calculateClusterEconomics(
    economicsAll.filter((e) => approved.some((a) => a.pageOpportunityId === e.pageOpportunityId)),
  );

  const topicCoverageMapsAll = deduplicated.map(buildTopicCoverageMap);
  const informationGainPlansAll = deduplicated.map((o) =>
    buildInformationGainPlan(
      o,
      deduplicated.map((a) => a.proposedTopic),
    ),
  );
  const evidencePlansAll = deduplicated.map(buildEvidencePlan);

  const topicCoverageMaps = approved.map((o) => topicCoverageMapsAll.find((t) => t.pageOpportunityId === o.pageOpportunityId)!);
  const informationGainPlans = approved.map((o) => informationGainPlansAll.find((p) => p.pageOpportunityId === o.pageOpportunityId)!);
  const evidencePlans = approved.map((o) => evidencePlansAll.find((p) => p.pageOpportunityId === o.pageOpportunityId)!);
  const claimGraphs = approved.map((o, i) => buildClaimGraph(o, evidencePlans[i]!));
  const thinAssessments = deduplicated.map(assessThinContentRisk);
  const citationScores = deduplicated.map(calculateCitationWorthiness);
  const completenessScores = approved.map((o, i) =>
    calculateContentCompleteness(o, topicCoverageMaps[i]!, informationGainPlans[i]!, evidencePlans[i]!),
  );

  const preGateFailures = approved.filter((o, i) => {
    const thin = thinAssessments.find((t) => t.pageOpportunityId === o.pageOpportunityId)!;
    const citation = citationScores.find((c) => c.pageOpportunityId === o.pageOpportunityId)!;
    const gate = passesPreGenerationGate({
      thin,
      citation,
      completenessScore: completenessScores[i]!.score,
      informationGainEstablished: informationGainPlans[i]!.meaningfulGainEstablished,
      evidenceSatisfiable: o.evidenceAvailability >= 0.35 || evidencePlans[i]!.claimsRequiringEvidence.length === 0,
    });
    return !gate.pass;
  });

  for (const failed of preGateFailures) {
    const decision = decisionMap.get(failed.pageOpportunityId);
    if (decision) {
      decision.decision = "REJECT";
      decision.reason = "Failed pre-generation quality gate";
    }
    approvedIds.delete(failed.pageOpportunityId);
  }
  approved = deduplicated.filter((o) => approvedIds.has(o.pageOpportunityId));

  const organicContentContracts = approved.map((o) =>
    buildOrganicContentContract(o, classifyResourceDepth(o)),
  );
  const eeatReadiness = approved.map((o) =>
    assessEEATReadiness(o, classifyResourceDepth(o)),
  );
  const humanExpertiseContributionPlans = approved.map((o) =>
    classifyHitlNecessity(o, classifyResourceDepth(o)),
  );
  const humanContributionRequests = buildHumanContributionRequests(
    humanExpertiseContributionPlans,
    context.ventureId,
  );

  const neighborhoodInformationGainPlans = neighborhoodViability
    .filter((n) => n.decision === "CREATE")
    .map((n) => {
      const opp = deduplicated.find((o) => o.pageOpportunityId === n.pageOpportunityId)!;
      return buildNeighborhoodInformationGainPlan(opp, n);
    })
    .filter((p) => p.meaningfulGainEstablished);

  const { registry, collisionsPrevented } = buildCanonicalUrlRegistry(approved, context);
  const siteTopicArchitecture = buildSiteTopicArchitecture(context.ventureId, approved);
  const internalLinkGraph = buildInternalLinkGraph(approved, siteTopicArchitecture, registry);
  const linkValidation = validateInternalLinkTargets(internalLinkGraph.links, registry);
  const siteEntityGraph = buildSiteEntityGraph(context, approved);
  const organicAuthorityGraph = buildOrganicAuthorityGraph({
    ventureId: context.ventureId,
    approved,
    siteTopicArchitecture,
    internalLinkGraph,
  });
  const schemaRecommendations = recommendSchemas(
    approved,
    context,
    registry.entries.map((e) => ({
      pageOpportunityId: e.pageOpportunityId,
      breadcrumbPath: e.breadcrumbPath,
    })),
  );

  const architectureParentMap = new Map(
    siteTopicArchitecture.pages.map((p) => [p.pageOpportunityId, p.parentPageId]),
  );
  const architectureChildrenMap = new Map(
    siteTopicArchitecture.pages.map((p) => [p.pageOpportunityId, p.childrenPageIds]),
  );
  const schemaTypeMap = new Map(schemaRecommendations.map((s) => [s.pageOpportunityId, s.schemaTypes]));
  const siteMapPlan = buildSiteMapPlan(
    context.ventureId,
    approved,
    decisions,
    registry.entries,
    schemaTypeMap,
    architectureParentMap,
    architectureChildrenMap,
  );
  const expansionWaves = groupExpansionWaves(siteMapPlan);

  const digitalRealEstateExpansion = assessDigitalRealEstateExpansion(deduplicated);
  const marginalPageEconomics = approved.map((o) => calculateMarginalPageEconomics(o, context, options?.economics));

  const feedbackReadyMetrics: FeedbackReadyMetricsContract[] = approved.map((o) => {
    const url = registry.entries.find((e) => e.pageOpportunityId === o.pageOpportunityId)?.url ?? "";
    return {
      pageOpportunityId: o.pageOpportunityId,
      canonicalUrl: url,
      metricSlots: [
        "indexation",
        "impressions",
        "clicks",
        "rank",
        "ai_citations",
        "sessions",
        "leads",
        "conversions",
        "revenue",
        "assisted_conversions",
        "backlinks",
        "claim_freshness",
      ],
      baselineRecorded: false,
    };
  });

  const thinContentFailures = thinAssessments.filter((t) => t.decision === "REJECT" || t.decision === "MERGE").length;
  const informationGainFailures = informationGainPlansAll.filter((p) => !p.meaningfulGainEstablished).length;
  const evidenceFailures = deduplicated.filter((o) => o.evidenceAvailability < 0.35).length;
  const citationWorthinessFailures = citationScores.filter((c) => c.score < 40).length;

  const adversarialReviewFindings = runAdversarialSeoReview({
    opportunities: deduplicated,
    approvedCount: approved.length,
    rawCount,
    invalidLinkTargets: linkValidation.invalid,
    fabricatedLocalBusiness: countFabricatedLocalBusiness(schemaRecommendations),
    informationGainFailures,
    thinContentFailures,
  });

  const blockedReasons: string[] = [];
  if (linkValidation.invalid > 0) blockedReasons.push("Internal links reference unregistered URLs");
  if (adversarialReviewFindings.some((f) => f.severity === "critical" && f.blocksExpansion)) {
    blockedReasons.push("Adversarial SEO review blocked expansion");
  }

  const buildPackage = createOrganicGrowthBuildPackage({
    context,
    sourceLineage,
    blockedReasons,
    package: {
      organicChannelViability: viability,
      searchAnswerOpportunityGraph: graph,
      approvedPageOpportunities: approved,
      pageDecisions: decisions,
      siteTopicArchitecture,
      canonicalUrlRegistry: registry,
      internalLinkGraph,
      siteEntityGraph,
      schemaRecommendations,
      organicContentContracts,
      topicCoverageMaps: approved.map((o) => topicCoverageMaps.find((t) => t.pageOpportunityId === o.pageOpportunityId)!).filter(Boolean),
      informationGainPlans: approved.map((o) => informationGainPlans.find((p) => p.pageOpportunityId === o.pageOpportunityId)!).filter(Boolean),
      evidencePlans: approved.map((o) => evidencePlans.find((p) => p.pageOpportunityId === o.pageOpportunityId)!).filter(Boolean),
      claimGraphs: approved.map((o) => claimGraphs.find((c) => c.pageOpportunityId === o.pageOpportunityId)!).filter(Boolean),
      contentCompletenessRequirements: approved.map((o) => completenessScores.find((c) => c.pageOpportunityId === o.pageOpportunityId)!).filter(Boolean),
      citationWorthinessRequirements: approved.map((o) => citationScores.find((c) => c.pageOpportunityId === o.pageOpportunityId)!).filter(Boolean),
      neighborhoodInformationGainPlans,
      eeatReadiness: approved.map((o) => eeatReadiness.find((e) => e.pageOpportunityId === o.pageOpportunityId)!).filter(Boolean),
      humanExpertiseContributionPlans: approved.map((o) => humanExpertiseContributionPlans.find((h) => h.pageOpportunityId === o.pageOpportunityId)!).filter(Boolean),
      humanContributionRequests,
      siteMapPlan,
      digitalRealEstateExpansion,
      marginalPageEconomics,
      expansionWaves,
      economicConstraints: context.economicTargets ?? {},
      generationPriorities: expansionWaves.FOUNDATION,
      qualityRequirements: [
        "Thin content risk gate",
        "Information gain gate",
        "Evidence plan gate",
        "Cannibalization gate",
        "Marginal economics gate",
      ],
      expansionStrategy: digitalRealEstateExpansion.initialArchitectureRecommendation,
      adversarialReviewFindings,
      feedbackReadyMetrics,
      clusterEconomics,
      economicsProvenance: options?.economics?.sources,
      organicAuthorityGraph,
    },
  });

  const contentDepth: Record<string, number> = {};
  for (const contract of organicContentContracts) {
    contentDepth[contract.resourceDepth] = (contentDepth[contract.resourceDepth] ?? 0) + 1;
  }

  const stats = {
    rawOpportunities: rawCount,
    deduplicatedOpportunities: deduplicated.length,
    create: decisions.filter((d) => d.decision === "CREATE" && approvedIds.has(d.pageOpportunityId)).length,
    merge: decisions.filter((d) => d.decision === "MERGE").length,
    defer: decisions.filter((d) => d.decision === "DEFER").length,
    noindex: decisions.filter((d) => d.decision === "NOINDEX").length,
    reject:
      decisions.filter((d) => d.decision === "REJECT").length +
      (viability.recommendation === "NONE"
        ? decisions.filter((d) => d.decision === "DEFER" && d.pageOpportunityId !== deduplicated.find((o) => o.pageType === "homepage")?.pageOpportunityId).length
        : 0),
    thinContentFailures,
    informationGainFailures,
    evidenceFailures,
    citationWorthinessFailures,
    initialGenerationWave: expansionWaves.FOUNDATION.length + expansionWaves.VALIDATION.length,
    contentDepth,
    citiesEvaluated: deduplicated.filter((o) => o.pageType === "city").length,
    neighborhoodsEvaluated: neighborhoodViability.length,
    neighborhoodCreate: neighborhoodViability.filter((n) => n.decision === "CREATE").length,
    neighborhoodMerge: neighborhoodViability.filter((n) => n.decision === "MERGE_INTO_CITY_PAGE").length,
    neighborhoodReject: neighborhoodViability.filter((n) => n.decision === "REJECT").length,
    neighborhoodSupporting: neighborhoodViability.filter((n) => n.decision === "SUPPORTING_SECTION").length,
    neighborhoodDefer: neighborhoodViability.filter((n) => n.decision === "DEFER").length,
  };

  return { context, buildPackage, stats };
}
