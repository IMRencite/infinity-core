import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { redactSecrets } from "@/lib/infinity/research/redaction";
import { assertOrganicGrowthEngineExecutable, loadOrganicGrowthEngineConfig } from "./config";
import { classifyOrganicGrowthFailure, OrganicGrowthEngineError } from "./failures";
import { ALL_TEST_VENTURES, TEST_VENTURE_I_MASSIVE_COMBINATORIAL } from "./fixtures/test-ventures";
import { buildUpstreamOrganicInput } from "./adapters/upstream-context";
import { resolveMonetizationEconomics } from "./economics/monetization-economics";
import { runOrganicPabHandoff } from "./integration/pab-handoff";
import { loadUpstreamOrganicInputs } from "./load/load-upstream";
import {
  buildOrganicGrowthEngineReport,
  findOrganicGrowthRunByIdempotencyKey,
  insertOrganicGrowthRun,
  markOrganicGrowthRunFailed,
  persistHumanContributionRequests,
  persistOrganicGrowthBuildPackage,
  updateOrganicGrowthRun,
} from "./persistence";
import { processVentureOrganicArchitecture } from "./process-venture";
import { enrichContextWithGroundedResearch } from "./research/grounded-evidence";
import type { HitlNecessityLevel, ResourceDepthClassification } from "./constants";
import type {
  OrganicGrowthEngineReport,
  OrganicGrowthBuildPackage,
  RunOrganicGrowthEngineInput,
  RunOrganicGrowthEngineOutput,
  SourceLineage,
  UpstreamOrganicInput,
  VentureOrganicContext,
} from "./types";

function buildSourceLineage(runId: string, partial?: Partial<SourceLineage>): SourceLineage {
  return {
    organicGrowthRunId: runId,
    capabilityTest: partial?.capabilityTest ?? false,
    inputMode: partial?.inputMode ?? "simulation",
    ...partial,
  };
}

export function runOrganicGrowthEngineForVenture(
  context: VentureOrganicContext,
  sourceLineage: SourceLineage,
  options?: { includeProgrammaticCombinations?: boolean; maxCandidates?: number },
) {
  const economics = resolveMonetizationEconomics(context, null);
  return processVentureOrganicArchitecture(context, sourceLineage, {
    ...options,
    economics,
  });
}

function aggregateReport(
  results: ReturnType<typeof processVentureOrganicArchitecture>[],
): OrganicGrowthEngineReport {
  const hitlClassification: Record<HitlNecessityLevel, number> = {
    NOT_NEEDED: 0,
    OPTIONAL_ENRICHMENT: 0,
    RECOMMENDED: 0,
    REQUIRED_FOR_PUBLICATION: 0,
  };

  let topicCoverageMapsGenerated = 0;
  let informationGainPlansGenerated = 0;
  let evidencePlansGenerated = 0;
  let claimGraphsGenerated = 0;
  let citationWorthinessScores = 0;
  let eeatReadinessAssessments = 0;

  const organicViability: OrganicGrowthEngineReport["organicViability"] = {};
  const opportunityGraphStats: OrganicGrowthEngineReport["opportunityGraphStats"] = {};
  const digitalRealEstate: OrganicGrowthEngineReport["digitalRealEstate"] = {};
  const contentDepth: OrganicGrowthEngineReport["contentDepth"] = {};

  let citiesEvaluated = 0;
  let neighborhoodsEvaluated = 0;
  let neighborhoodCreate = 0;
  let neighborhoodMerge = 0;
  let neighborhoodSupporting = 0;
  let neighborhoodDefer = 0;
  let neighborhoodReject = 0;
  let urlsAssigned = 0;
  let collisionsPrevented = 0;
  let internalLinkEdges = 0;
  let orphans = 0;
  let invalidTargets = 0;
  let schemaRecommendations = 0;
  let localBusinessFabricated = 0;

  for (const result of results) {
    const { context, buildPackage, stats } = result;
    organicViability[context.ventureId] = buildPackage.organicChannelViability;
    opportunityGraphStats[context.ventureId] = {
      nodes: buildPackage.searchAnswerOpportunityGraph.nodes.length,
      edges: buildPackage.searchAnswerOpportunityGraph.edges.length,
    };
    digitalRealEstate[context.ventureId] = {
      rawOpportunities: stats.rawOpportunities,
      deduplicatedOpportunities: stats.deduplicatedOpportunities,
      create: stats.create,
      merge: stats.merge,
      defer: stats.defer,
      reject: stats.reject,
      thinContentFailures: stats.thinContentFailures,
      informationGainFailures: stats.informationGainFailures,
      evidenceFailures: stats.evidenceFailures,
      citationWorthinessFailures: stats.citationWorthinessFailures,
      initialGenerationWave: stats.initialGenerationWave,
    };
    contentDepth[context.ventureId] = stats.contentDepth as Record<ResourceDepthClassification, number>;

    topicCoverageMapsGenerated += buildPackage.topicCoverageMaps.length;
    informationGainPlansGenerated += buildPackage.informationGainPlans.length;
    evidencePlansGenerated += buildPackage.evidencePlans.length;
    claimGraphsGenerated += buildPackage.claimGraphs.length;
    citationWorthinessScores += buildPackage.citationWorthinessRequirements.length;
    eeatReadinessAssessments += buildPackage.eeatReadiness.length;

    for (const plan of buildPackage.humanExpertiseContributionPlans) {
      hitlClassification[plan.necessityLevel] += 1;
    }

    citiesEvaluated += stats.citiesEvaluated;
    neighborhoodsEvaluated += stats.neighborhoodsEvaluated;
    neighborhoodCreate += stats.neighborhoodCreate;
    neighborhoodMerge += stats.neighborhoodMerge;
    neighborhoodSupporting += stats.neighborhoodSupporting;
    neighborhoodDefer += stats.neighborhoodDefer;
    neighborhoodReject += stats.neighborhoodReject;

    urlsAssigned += buildPackage.canonicalUrlRegistry.entries.length;
    internalLinkEdges += buildPackage.internalLinkGraph.links.length;
    orphans += buildPackage.internalLinkGraph.orphanPageIds.length;
    schemaRecommendations += buildPackage.schemaRecommendations.length;
    localBusinessFabricated += buildPackage.schemaRecommendations.filter(
      (s) => s.schemaTypes.includes("LocalBusiness") && !s.requirementsSatisfied,
    ).length;

    const linkCheck = buildPackage.internalLinkGraph.links.filter(
      (l) => !buildPackage.canonicalUrlRegistry.entries.some((e) => e.url === l.targetUrl),
    );
    invalidTargets += linkCheck.length;
  }

  return {
    engineVersion: "organic_growth_engine_v1",
    venturesProcessed: results.length,
    organicViability,
    opportunityGraphStats,
    digitalRealEstate,
    contentDepth,
    topicCoverageMapsGenerated,
    informationGainPlansGenerated,
    evidencePlansGenerated,
    claimGraphsGenerated,
    citationWorthinessScores,
    eeatReadinessAssessments,
    hitlClassification,
    cityNeighborhood: {
      citiesEvaluated,
      neighborhoodsEvaluated,
      create: neighborhoodCreate,
      mergeIntoCityPage: neighborhoodMerge,
      supportingSection: neighborhoodSupporting,
      defer: neighborhoodDefer,
      reject: neighborhoodReject,
    },
    urlArchitecture: {
      urlsAssigned,
      collisionsPrevented,
      invalidLinkTargets: invalidTargets,
    },
    internalLinks: { edges: internalLinkEdges, orphans, invalidTargets },
    schema: { recommendations: schemaRecommendations, localBusinessFabricated },
    buildPackagesCreated: results.length,
    autonomyBoundary: {
      pagesPublished: 0,
      publicDeployments: 0,
      realWebsitesModified: 0,
      purchases: 0,
      externalMutations: 0,
    },
  };
}

async function resolveProcessingInputs(
  admin: AdminSupabaseClient,
  input: RunOrganicGrowthEngineInput,
  config: ReturnType<typeof loadOrganicGrowthEngineConfig>,
  runId: string,
  idempotencySuffix: string,
): Promise<Array<{ upstream: UpstreamOrganicInput; researchStatus?: string }>> {
  const resolved: Array<{ upstream: UpstreamOrganicInput; researchStatus?: string }> = [];

  const hasUpstreamIds =
    Boolean(input.companyBuilderBlueprintIds?.length) ||
    Boolean(input.companyBuilderBuildPackageIds?.length) ||
    Boolean(input.ventureSelectionHandoffIds?.length);

  if (hasUpstreamIds) {
    const upstreamInputs = await loadUpstreamOrganicInputs(admin, input.organizationId, {
      blueprintIds: input.companyBuilderBlueprintIds,
      buildPackageIds: input.companyBuilderBuildPackageIds,
      handoffIds: input.ventureSelectionHandoffIds,
    });
    for (const upstream of upstreamInputs) {
      const researchEnabled = input.enableGroundedResearch ?? config.enableGroundedResearch;
      const enriched = researchEnabled
        ? await enrichContextWithGroundedResearch(
            admin,
            input.organizationId,
            upstream.context,
            { ...config, enableGroundedResearch: true },
            idempotencySuffix,
          )
        : { context: upstream.context, researchRunIds: [], status: "SKIPPED_DISABLED" as const };

      resolved.push({
        upstream: {
          ...upstream,
          context: enriched.context,
          sourceLineage: buildSourceLineage(runId, {
            ...upstream.sourceLineage,
            inputMode: "blueprint",
          }),
        },
        researchStatus: enriched.status,
      });
    }
  }

  if (input.ventureContexts?.length) {
    for (const context of input.ventureContexts) {
      resolved.push({
        upstream: buildUpstreamOrganicInput({
          context,
          sourceLineage: buildSourceLineage(runId, {
            inputMode: input.capabilityTest ? "simulation" : "blueprint",
            capabilityTest: input.capabilityTest ?? false,
          }),
          monetizationPlan: null,
        }),
      });
    }
  }

  if (input.capabilityTest && resolved.length === 0) {
    for (const context of ALL_TEST_VENTURES) {
      resolved.push({
        upstream: buildUpstreamOrganicInput({
          context,
          sourceLineage: buildSourceLineage(runId, { inputMode: "simulation", capabilityTest: true }),
          monetizationPlan: null,
        }),
      });
    }
  }

  return resolved;
}

export async function runOrganicGrowthEngineCycle(
  admin: AdminSupabaseClient,
  input: RunOrganicGrowthEngineInput,
): Promise<RunOrganicGrowthEngineOutput> {
  const config = loadOrganicGrowthEngineConfig();
  assertOrganicGrowthEngineExecutable(config);

  const existing = await findOrganicGrowthRunByIdempotencyKey(
    admin,
    input.organizationId,
    input.idempotencyKey,
  );
  if (existing?.status === "completed" && existing.engine_report) {
    return {
      ok: true,
      organicGrowthRunId: existing.id,
      report: existing.engine_report as OrganicGrowthEngineReport,
      buildPackages: [],
    };
  }

  const correlationId = randomUUID();
  const runRow = await insertOrganicGrowthRun(admin, {
    organizationId: input.organizationId,
    idempotencyKey: input.idempotencyKey,
    correlationId,
    simulationOnly: input.simulationOnly ?? config.simulationOnly,
    capabilityTest: input.capabilityTest ?? false,
  });

  try {
    const idempotencySuffix = input.idempotencyKey.replace(/[^a-zA-Z0-9-]/g, "-").slice(-48);
    const processingInputs = await resolveProcessingInputs(
      admin,
      input,
      config,
      runRow.id,
      idempotencySuffix,
    );

    if (processingInputs.length === 0) {
      throw new OrganicGrowthEngineError(
        "No venture contexts or upstream artifacts supplied for organic growth architecture.",
        "validation_failed",
      );
    }

    const results = processingInputs.map(({ upstream }) => {
      const isMassiveTest = upstream.context.ventureId === TEST_VENTURE_I_MASSIVE_COMBINATORIAL.ventureId;
      return processVentureOrganicArchitecture(upstream.context, upstream.sourceLineage, {
        includeProgrammaticCombinations: isMassiveTest,
        economics: upstream.economics,
      });
    });

    const buildPackages: OrganicGrowthBuildPackage[] = [];
    for (let i = 0; i < results.length; i += 1) {
      const result = results[i]!;
      const upstream = processingInputs[i]!.upstream;
      const lineage = { ...upstream.sourceLineage, organicGrowthRunId: runRow.id };

      const pkgId = await persistOrganicGrowthBuildPackage(admin, {
        organizationId: input.organizationId,
        organicGrowthRunId: runRow.id,
        buildPackage: { ...result.buildPackage, sourceLineage: lineage },
        sourceLineage: lineage,
      });

      await persistHumanContributionRequests(admin, {
        organizationId: input.organizationId,
        organicGrowthRunId: runRow.id,
        organicGrowthBuildPackageId: pkgId,
        requests: result.buildPackage.humanContributionRequests,
      });

      buildPackages.push({
        ...result.buildPackage,
        sourceLineage: lineage,
      });
    }

    const report = aggregateReport(results);
    await updateOrganicGrowthRun(admin, runRow.id, {
      status: "completed",
      engineReport: report,
      buildPackagesCreated: buildPackages.length,
    });

    return {
      ok: true,
      organicGrowthRunId: runRow.id,
      report,
      buildPackages,
    };
  } catch (error) {
    const classification = classifyOrganicGrowthFailure(error);
    await markOrganicGrowthRunFailed(admin, runRow.id, {
      failureClassification: classification,
      errorMessage: redactSecrets(error instanceof Error ? error.message : String(error)),
    });
    throw error;
  }
}

export async function runOrganicGrowthV1Test(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencySuffix = "test",
): Promise<RunOrganicGrowthEngineOutput> {
  return runOrganicGrowthEngineCycle(admin, {
    organizationId,
    idempotencyKey: `organic-growth-v1-${idempotencySuffix}`,
    simulationOnly: true,
    capabilityTest: true,
    ventureContexts: ALL_TEST_VENTURES,
  });
}

export function runOrganicGrowthPabVerification(buildPackage: OrganicGrowthBuildPackage) {
  return runOrganicPabHandoff({
    buildPackage,
    buildRunId: randomUUID(),
    maxPages: 3,
  });
}

export { buildOrganicGrowthEngineReport, aggregateReport };
