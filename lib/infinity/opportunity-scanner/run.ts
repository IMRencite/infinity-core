import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runGroundedResearch } from "@/lib/infinity/research/run";
import { buildResearchSystemInstructions } from "@/lib/infinity/research/prompts";
import { redactSecrets } from "@/lib/infinity/research/redaction";
import {
  assertOpportunityScannerExecutable,
  loadOpportunityScannerConfig,
} from "./config";
import {
  assertScannerResearchBudget,
  emptyCostSummary,
  mergeCostSummaries,
} from "./cost-governance";
import { dedupeOpportunityCandidates } from "./dedupe/dedupe";
import { mapExtractionToCandidateDrafts } from "./extraction/map-candidates";
import { classifyScannerFailure } from "./failures";
import {
  buildScannerReport,
  findDiscoveryRunByIdempotencyKey,
  insertDiscoveryRun,
  markDiscoveryRunFailed,
  persistCandidateWithEvidence,
  updateDiscoveryRun,
} from "./persistence";
import { buildStrategyResearchUserPrompt } from "./prompts";
import { runStrategyExtractionResearch } from "./research/strategy-extraction";
import { calculateDeterministicScores, rankCandidates } from "./scoring/calculate";
import { resolveDiscoveryStrategies } from "./strategies";
import type {
  OpportunityCandidateDraft,
  RunOpportunityScannerInput,
  RunOpportunityScannerOutput,
} from "./types";

export async function runOpportunityScannerCycle(
  admin: AdminSupabaseClient,
  input: RunOpportunityScannerInput,
): Promise<RunOpportunityScannerOutput> {
  const config = loadOpportunityScannerConfig();
  assertOpportunityScannerExecutable(config);

  const existing = await findDiscoveryRunByIdempotencyKey(
    admin,
    input.organizationId,
    input.idempotencyKey,
  );
  if (existing?.status === "completed" && existing.scanner_report) {
    return {
      ok: true,
      discoveryRunId: existing.id,
      report: existing.scanner_report as never,
      candidates: [],
    };
  }

  const strategyIds = input.strategies ?? config.defaultStrategies;
  const strategies = resolveDiscoveryStrategies(strategyIds.slice(0, config.maxStrategiesPerRun));
  const correlationId = randomUUID();

  const runRow =
    existing ??
    (await insertDiscoveryRun(admin, {
      organizationId: input.organizationId,
      correlationId,
      idempotencyKey: input.idempotencyKey,
      strategies: strategies.map((strategy) => strategy.id),
      searchScope: input.searchScope ?? { geography: "United States" },
      constraints: input.constraints ?? {},
    }));

  let costSummary = emptyCostSummary();
  const researchRunIds: string[] = [];
  const draftCandidates: Array<
    OpportunityCandidateDraft & {
      scoringAssessment: import("./types").ScoringAssessmentInput;
    }
  > = [];

  try {
    await updateDiscoveryRun(admin, input.organizationId, runRow.id, {
      status: "researching",
    });

    const maxResearchCalls = input.maxResearchCalls ?? config.maxResearchCallsPerRun;
    assertScannerResearchBudget({
      config,
      plannedResearchCalls: strategies.length * 2,
      accumulatedEstimatedCostUsd: costSummary.estimatedCostUsd ?? 0,
    });

    const strategyFailures: string[] = [];

    for (const strategy of strategies) {
      if (researchRunIds.length >= maxResearchCalls) break;

      try {
        const researchObjective = strategy.buildResearchObjective(input.searchScope ?? {});
        const researchOutput = await runGroundedResearch(admin, {
          organizationId: input.organizationId,
          researchObjective: buildStrategyResearchUserPrompt(researchObjective),
          idempotencyKey: `${input.idempotencyKey}:research:${strategy.id}`,
          providerId: "gemini",
          runPurpose: input.runPurpose ?? "opportunity_scanner",
        });

        if (!researchOutput.ok) {
          strategyFailures.push(`${strategy.id}: ${researchOutput.failure.message}`);
          continue;
        }

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

        const extraction = await runStrategyExtractionResearch({
          strategyId: strategy.id,
          researchSummary: researchOutput.result.summary,
          researchEvidence: researchOutput.result.evidence,
          researchSources: researchOutput.result.sources,
          parentResearchGrounded: researchOutput.result.groundedStatus,
        });

        draftCandidates.push(
          ...mapExtractionToCandidateDrafts(extraction, researchOutput.result),
        );
      } catch (error) {
        strategyFailures.push(
          `${strategy.id}: ${error instanceof Error ? error.message : "strategy failed"}`,
        );
      }
    }

    if (draftCandidates.length === 0) {
      throw new Error(
        strategyFailures.join(" | ") || "No candidates extracted from discovery strategies.",
      );
    }

    await updateDiscoveryRun(admin, input.organizationId, runRow.id, {
      status: "extracting",
      research_run_ids: researchRunIds as never,
      research_call_count: costSummary.researchCallCount,
    });

    const discoveredCount = draftCandidates.length;
    const { kept, mergedCount } = dedupeOpportunityCandidates(draftCandidates);

    await updateDiscoveryRun(admin, input.organizationId, runRow.id, {
      status: "scoring",
      candidates_discovered: discoveredCount,
      candidates_merged: mergedCount,
    });

    const scoredDrafts = kept.map((candidate) => {
      const scoringAssessment =
        "scoringAssessment" in candidate
          ? (candidate as typeof draftCandidates[number]).scoringAssessment
          : {
              demandStrength: 0.5,
              marketGrowth: 0.5,
              competitionWeakness: 0.5,
              monetizationPotential: 0.5,
              buildability: 0.5,
              automationPotential: 0.5,
              distributionStrength: 0.5,
              capitalEfficiency: 0.5,
              speedToRevenue: 0.5,
              evidenceConfidence: 0.5,
            };
      const scores = calculateDeterministicScores(scoringAssessment);
      return { candidate, scores };
    });

    const ranked = rankCandidates(
      scoredDrafts.map(({ candidate, scores }) => ({
        ...candidate,
        id: candidate.dedupKey,
        opportunityScore: scores.opportunityScore,
      })),
    );

    const persisted: import("./types").OpportunityCandidate[] = [];
    for (const rankedCandidate of ranked.slice(0, config.maxCandidatesPerRun)) {
      const match = scoredDrafts.find(
        (entry) => entry.candidate.dedupKey === rankedCandidate.dedupKey,
      );
      if (!match) continue;

      const saved = await persistCandidateWithEvidence(admin, {
        organizationId: input.organizationId,
        discoveryRunId: runRow.id,
        candidate: match.candidate,
        scores: match.scores,
        rankPosition: rankedCandidate.rankPosition,
      });
      persisted.push(saved);
    }

    const report = buildScannerReport({
      strategiesExecuted: strategies.map((strategy) => strategy.id),
      researchRunIds,
      candidatesDiscovered: discoveredCount,
      candidatesMerged: mergedCount,
      candidates: persisted.sort(
        (a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999),
      ),
      costSummary,
    });

    const serialized = JSON.stringify(report);
    if (redactSecrets(serialized) !== serialized) {
      throw new Error("Secret leak detected in scanner report.");
    }

    await updateDiscoveryRun(admin, input.organizationId, runRow.id, {
      status: "completed",
      completed_at: report.completedAt,
      candidates_persisted: persisted.length,
      token_usage: costSummary.tokenUsage as never,
      grounding_usage: costSummary.groundingUsage as never,
      estimated_cost_usd: costSummary.estimatedCostUsd,
      cost_uncertainty: costSummary.costUncertainty,
      scanner_report: { ...report, strategyFailures } as never,
      failure_classification: null,
      error_message: null,
    });

    return {
      ok: true,
      discoveryRunId: runRow.id,
      report,
      candidates: persisted,
    };
  } catch (error) {
    const classified = classifyScannerFailure(error);
    await markDiscoveryRunFailed(admin, input.organizationId, runRow.id, {
      classification: classified.classification,
      message: classified.message,
      status: classified.classification === "budget_exceeded" ? "policy_blocked" : "failed",
    });

    return {
      ok: false,
      discoveryRunId: runRow.id,
      status: classified.classification === "budget_exceeded" ? "policy_blocked" : "failed",
      failureClassification: classified.classification,
      message: classified.message,
    };
  }
}

export async function runOpportunityScannerV1Test(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<RunOpportunityScannerOutput> {
  const suffix = process.env.OPPORTUNITY_SCANNER_TEST_IDEMPOTENCY_SUFFIX?.trim() || "v1";
  return runOpportunityScannerCycle(admin, {
    organizationId,
    idempotencyKey: `opportunity-scanner-v1-test:${organizationId}:${suffix}`,
    runPurpose: "opportunity_scanner_verification",
    searchScope: {
      geography: "United States",
      focus:
        "software-driven and automatable online business models including SaaS, marketplaces, lead-gen, APIs, content, ecommerce, and other digital models",
    },
  });
}

// Keep system instructions referenced so tree-shaking retains research prompt coupling.
void buildResearchSystemInstructions;
