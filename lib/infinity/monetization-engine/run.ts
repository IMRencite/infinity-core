import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { mapCompletedResearchRunToResult } from "@/lib/infinity/research/persistence";
import type { ResearchResult } from "@/lib/infinity/research/types";
import { runGroundedResearch } from "@/lib/infinity/research/run";
import {
  assertMonetizationEngineExecutable,
  loadMonetizationEngineConfig,
} from "./config";
import {
  assertMonetizationResearchBudget,
  emptyCostSummary,
  mergeCostSummaries,
} from "./cost-governance";
import { mapExtractionToMonetizationPlans } from "./extraction/map-plans";
import { classifyMonetizationFailure } from "./failures";
import {
  buildMonetizationEngineReport,
  findMonetizationRunByIdempotencyKey,
  insertMonetizationRun,
  loadOpportunityCandidatesForMonetization,
  markMonetizationRunFailed,
  persistCandidateAnalysis,
  persistMonetizationPlanBundle,
  selectDiverseCandidatesForTest,
  updateMonetizationRun,
} from "./persistence";
import { buildMonetizationResearchObjective } from "./prompts";
import { runMonetizationExtractionResearch } from "./research/monetization-extraction";
import { selectBestPlanScore } from "./scoring/calculate";
import type {
  MonetizationCandidateAnalysis,
  RunMonetizationEngineInput,
  RunMonetizationEngineOutput,
} from "./types";
import { evaluateEconomicViability } from "./viability/evaluate";
import { redactSecrets } from "@/lib/infinity/research/redaction";

async function loadCompletedResearchFallback(
  admin: AdminSupabaseClient,
  organizationId: string,
  researchRunIds: string[],
): Promise<ResearchResult | null> {
  for (const runId of researchRunIds) {
    const { data, error } = await admin
      .from("research_runs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", runId)
      .eq("status", "completed")
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return mapCompletedResearchRunToResult(data as never);
    }
  }
  return null;
}

export async function runMonetizationEngineCycle(
  admin: AdminSupabaseClient,
  input: RunMonetizationEngineInput,
): Promise<RunMonetizationEngineOutput> {
  const config = loadMonetizationEngineConfig();
  assertMonetizationEngineExecutable(config);

  const existing = await findMonetizationRunByIdempotencyKey(
    admin,
    input.organizationId,
    input.idempotencyKey,
  );
  if (existing?.status === "completed" && existing.engine_report) {
    return {
      ok: true,
      monetizationRunId: existing.id,
      report: existing.engine_report as never,
      analyses: [],
    };
  }

  const candidates = input.opportunityCandidateIds?.length
    ? await loadOpportunityCandidatesForMonetization(
        admin,
        input.organizationId,
        input.opportunityCandidateIds,
        input.maxCandidates ?? config.maxCandidatesPerRun,
      )
    : await loadOpportunityCandidatesForMonetization(
        admin,
        input.organizationId,
        undefined,
        input.maxCandidates ?? config.maxCandidatesPerRun,
      );

  if (candidates.length === 0) {
    throw new Error("No opportunity candidates available for monetization analysis.");
  }

  const correlationId = randomUUID();
  const runRow =
    existing ??
    (await insertMonetizationRun(admin, {
      organizationId: input.organizationId,
      correlationId,
      idempotencyKey: input.idempotencyKey,
      opportunityCandidateIds: candidates.map((candidate) => candidate.id),
      discoveryRunIds: [...new Set(candidates.map((candidate) => candidate.discoveryRunId))],
    }));

  let costSummary = emptyCostSummary();
  const researchRunIds: string[] = [];
  const analyses: MonetizationCandidateAnalysis[] = [];
  let plansGenerated = 0;
  let revenueStreamsGenerated = 0;
  const candidateFailures: string[] = [];

  try {
    await updateMonetizationRun(admin, input.organizationId, runRow.id, {
      status: "researching",
    });

    const maxResearchCalls = input.maxResearchCalls ?? config.maxResearchCallsPerRun;
    assertMonetizationResearchBudget({
      config,
      plannedResearchCalls: candidates.length,
      accumulatedEstimatedCostUsd: costSummary.estimatedCostUsd ?? 0,
    });

    for (const candidate of candidates) {
      if (researchRunIds.length >= maxResearchCalls) break;

      try {
        const researchObjective = buildMonetizationResearchObjective(candidate);
        let researchResult: ResearchResult | null = null;

        const researchOutput = await runGroundedResearch(admin, {
          organizationId: input.organizationId,
          researchObjective,
          idempotencyKey: `${input.idempotencyKey}:research:${candidate.id}`,
          providerId: "gemini",
          runPurpose: input.runPurpose ?? "monetization_engine",
        });

        if (researchOutput.ok) {
          researchResult = researchOutput.result;
          researchRunIds.push(researchOutput.result.researchRunId);
          costSummary = mergeCostSummaries(costSummary, {
            tokenUsage: researchOutput.result.tokenUsage,
            groundingUsage: {
              searchQueryCount: researchOutput.result.groundingUsage.searchQueryCount,
              groundingChunkCount: researchOutput.result.groundingUsage.groundingChunkCount,
            },
            estimatedCostUsd: researchOutput.result.estimatedCostUsd,
            costUncertainty: researchOutput.result.costUncertainty,
          });
        } else {
          researchResult = await loadCompletedResearchFallback(
            admin,
            input.organizationId,
            candidate.researchRunIds,
          );
          if (!researchResult) {
            candidateFailures.push(`${candidate.id}: ${researchOutput.failure.message}`);
            continue;
          }
          if (!researchRunIds.includes(researchResult.researchRunId)) {
            researchRunIds.push(researchResult.researchRunId);
          }
        }

        const extraction = await runMonetizationExtractionResearch({
          candidate,
          researchSummary: researchResult.summary,
          researchEvidence: researchResult.evidence.map((item) => ({
            claim: item.claim,
            sourceUrls: item.sourceUrls,
            grounded: item.grounded,
          })),
          researchSources: researchResult.sources.map((source) => ({
            url: source.url,
            title: source.title ?? undefined,
          })),
          parentResearchGrounded: researchResult.groundedStatus,
        });

        const plans = mapExtractionToMonetizationPlans({
          extraction,
          candidate,
          monetizationRunId: runRow.id,
          organizationId: input.organizationId,
          researchRunIds: [researchResult.researchRunId],
        });

        const persistedPlanIds: string[] = [];
        for (const plan of plans) {
          const planId = await persistMonetizationPlanBundle(admin, {
            organizationId: input.organizationId,
            monetizationRunId: runRow.id,
            plan,
            scores: plan.scores,
          });
          persistedPlanIds.push(planId);
          plan.id = planId;
          plansGenerated += 1;
          revenueStreamsGenerated += plan.revenueStreams.length;
        }

        const bestPlan = selectBestPlanScore(plans);
        const primaryPlanId =
          persistedPlanIds.find((id) => id === bestPlan?.id) ?? persistedPlanIds[0] ?? null;

        const opportunityScore = candidate.opportunityScore ?? 0;
        const monetizationScore = bestPlan?.monetizationScore ?? 0;
        const viability = evaluateEconomicViability({
          opportunityScore,
          monetizationScore,
        });

        const recommendation = {
          ...extraction.recommendation,
          validationExperiments: extraction.validationExperiments,
        };

        const analysis = await persistCandidateAnalysis(admin, {
          organizationId: input.organizationId,
          monetizationRunId: runRow.id,
          candidate,
          primaryPlanId,
          viability,
          recommendation,
          researchRunIds: [researchResult.researchRunId],
          plans,
          validationExperiments: extraction.validationExperiments,
        });

        analyses.push(analysis);
      } catch (error) {
        candidateFailures.push(
          `${candidate.id}: ${error instanceof Error ? error.message : "candidate analysis failed"}`,
        );
      }
    }

    if (analyses.length === 0) {
      throw new Error(
        candidateFailures.join(" | ") || "No monetization analyses completed successfully.",
      );
    }

    await updateMonetizationRun(admin, input.organizationId, runRow.id, {
      status: "scoring",
      research_run_ids: researchRunIds as never,
      research_call_count: costSummary.researchCallCount,
      candidates_analyzed: analyses.length,
      plans_generated: plansGenerated,
      revenue_streams_generated: revenueStreamsGenerated,
    });

    const report = buildMonetizationEngineReport({
      analyses,
      researchRunIds,
      plansGenerated,
      revenueStreamsGenerated,
      costSummary,
    });

    const serialized = JSON.stringify(report);
    if (redactSecrets(serialized) !== serialized) {
      throw new Error("Secret leak detected in monetization engine report.");
    }

    await updateMonetizationRun(admin, input.organizationId, runRow.id, {
      status: "completed",
      completed_at: report.completedAt,
      token_usage: costSummary.tokenUsage as never,
      grounding_usage: costSummary.groundingUsage as never,
      estimated_cost_usd: costSummary.estimatedCostUsd,
      cost_uncertainty: costSummary.costUncertainty,
      engine_report: { ...report, candidateFailures } as never,
      failure_classification: null,
      error_message: null,
    });

    return {
      ok: true,
      monetizationRunId: runRow.id,
      report,
      analyses,
    };
  } catch (error) {
    const classified = classifyMonetizationFailure(error);
    await markMonetizationRunFailed(admin, input.organizationId, runRow.id, {
      classification: classified.classification,
      message: classified.message,
      status: classified.classification === "budget_exceeded" ? "policy_blocked" : "failed",
    });

    return {
      ok: false,
      monetizationRunId: runRow.id,
      status: classified.classification === "budget_exceeded" ? "policy_blocked" : "failed",
      failureClassification: classified.classification,
      message: classified.message,
    };
  }
}

export async function runMonetizationEngineV1Test(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<RunMonetizationEngineOutput> {
  const suffix = process.env.MONETIZATION_ENGINE_TEST_IDEMPOTENCY_SUFFIX?.trim() || "v1";
  const candidates = await selectDiverseCandidatesForTest(admin, organizationId);
  if (candidates.length === 0) {
    throw new Error("No persisted opportunity candidates found for monetization engine test.");
  }

  return runMonetizationEngineCycle(admin, {
    organizationId,
    idempotencyKey: `monetization-engine-v1-test:${organizationId}:${suffix}`,
    opportunityCandidateIds: candidates.map((candidate) => candidate.id),
    runPurpose: "monetization_engine_verification",
  });
}
