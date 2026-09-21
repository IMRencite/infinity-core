import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { buildResearchSystemInstructions } from "@/lib/infinity/research/prompts";
import { redactSecrets } from "@/lib/infinity/research/redaction";
import {
  assertOpportunityScannerExecutable,
  loadOpportunityScannerConfig,
} from "./config";
import {
  assertScannerResearchBudget,
  emptyCostSummary,
  mergeCostSummaryBlocks,
} from "./cost-governance";
import { dedupeOpportunityCandidates } from "./dedupe/dedupe";
import { classifyScannerFailure } from "./failures";
import {
  buildScannerReport,
  findDiscoveryRunByIdempotencyKey,
  insertDiscoveryRun,
  markDiscoveryRunFailed,
  persistCandidateWithEvidence,
  updateDiscoveryRun,
} from "./persistence";
import { executeDiscoveryStrategy } from "./research/execute-strategy";
import { calculateDeterministicScores, rankCandidates } from "./scoring/calculate";
import { resolveDiscoveryStrategies, type DiscoveryStrategyDefinition } from "./strategies";
import {
  assessCandidatePoolAdequacy,
  isTechnicalStrategyFailure,
  shouldAttemptPoolRecovery,
} from "./pool-adequacy";
import type {
  OpportunityCandidateDraft,
  RunOpportunityScannerInput,
  RunOpportunityScannerOutput,
} from "./types";
import type { DiscoveryStrategyId } from "./constants";

async function runStrategyBatch(input: {
  admin: AdminSupabaseClient;
  organizationId: string;
  idempotencyKey: string;
  runPurpose?: string;
  searchScope: Record<string, unknown>;
  strategies: DiscoveryStrategyDefinition[];
  maxResearchCalls: number;
  researchRunIds: string[];
  attemptSuffix?: string;
  requireSourceBackedFindings?: boolean;
}): Promise<{
  draftCandidates: Array<
    OpportunityCandidateDraft & {
      scoringAssessment: import("./types").ScoringAssessmentInput;
    }
  >;
  strategyFailures: string[];
  costDelta: ReturnType<typeof emptyCostSummary>;
}> {
  const draftCandidates: Array<
    OpportunityCandidateDraft & {
      scoringAssessment: import("./types").ScoringAssessmentInput;
    }
  > = [];
  const strategyFailures: string[] = [];
  let costDelta = emptyCostSummary();

  for (const strategy of input.strategies) {
    if (input.researchRunIds.length >= input.maxResearchCalls) break;

    const strategyStartedAt = Date.now();
    console.info("[FAVC1] venture radar strategy start", {
      strategyId: strategy.id,
      attempt: input.researchRunIds.length + 1,
      maxResearchCalls: input.maxResearchCalls,
      recoveryPass: input.attemptSuffix ?? null,
    });

    const outcome = await executeDiscoveryStrategy({
      admin: input.admin,
      organizationId: input.organizationId,
      idempotencyKey: input.idempotencyKey,
      runPurpose: input.runPurpose,
      strategy,
      searchScope: input.searchScope,
      attemptSuffix: input.attemptSuffix,
      requireSourceBackedFindings: input.requireSourceBackedFindings,
    });

    costDelta = mergeCostSummaryBlocks(costDelta, outcome.costDelta);

    if (!outcome.ok) {
      const failureLabel = outcome.degraded ? "DEGRADED" : "FAILED";
      strategyFailures.push(`${strategy.id}: [${failureLabel}] ${outcome.message}`);
      if (outcome.researchRunId) {
        input.researchRunIds.push(outcome.researchRunId);
      }
      console.warn("[FAVC1] venture radar strategy failed", {
        strategyId: strategy.id,
        classification: outcome.classification,
        message: outcome.message,
        degraded: outcome.degraded,
        durationMs: Date.now() - strategyStartedAt,
      });
      continue;
    }

    input.researchRunIds.push(outcome.researchRunId);
    draftCandidates.push(...outcome.candidates);
    console.info("[FAVC1] venture radar strategy complete", {
      strategyId: strategy.id,
      extractedCandidates: outcome.candidates.length,
      durationMs: Date.now() - strategyStartedAt,
    });
  }

  return { draftCandidates, strategyFailures, costDelta };
}

export async function runOpportunityScannerCycle(
  admin: AdminSupabaseClient,
  input: RunOpportunityScannerInput,
): Promise<RunOpportunityScannerOutput> {
  const config = loadOpportunityScannerConfig();
  assertOpportunityScannerExecutable(config);

  const strategyIds = input.strategies ?? config.defaultStrategies;
  const strategies = resolveDiscoveryStrategies(strategyIds.slice(0, config.maxStrategiesPerRun));
  const correlationId = randomUUID();

  let costSummary = emptyCostSummary();
  const researchRunIds: string[] = [];
  const strategyFailures: string[] = [];
  const draftCandidates: Array<
    OpportunityCandidateDraft & {
      scoringAssessment: import("./types").ScoringAssessmentInput;
    }
  > = [];
  let runRow: Awaited<ReturnType<typeof insertDiscoveryRun>> | null = null;

  try {
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

    runRow =
      existing ??
      (await insertDiscoveryRun(admin, {
        organizationId: input.organizationId,
        correlationId,
        idempotencyKey: input.idempotencyKey,
        strategies: strategies.map((strategy) => strategy.id),
        searchScope: input.searchScope ?? { geography: "United States" },
        constraints: input.constraints ?? {},
      }));

    await updateDiscoveryRun(admin, input.organizationId, runRow.id, {
      status: "researching",
    });

    const maxResearchCalls = input.maxResearchCalls ?? config.maxResearchCallsPerRun;
    assertScannerResearchBudget({
      config,
      plannedResearchCalls: strategies.length * 2,
      accumulatedEstimatedCostUsd: costSummary.estimatedCostUsd ?? 0,
    });

    const searchScope = input.searchScope ?? { geography: "United States" };
    const degradedStrategyIds: DiscoveryStrategyId[] = [];

    const initialBatch = await runStrategyBatch({
      admin,
      organizationId: input.organizationId,
      idempotencyKey: input.idempotencyKey,
      runPurpose: input.runPurpose,
      searchScope,
      strategies,
      maxResearchCalls,
      researchRunIds,
    });
    draftCandidates.push(...initialBatch.draftCandidates);
    strategyFailures.push(...initialBatch.strategyFailures);
    costSummary = mergeCostSummaryBlocks(costSummary, initialBatch.costDelta);

    for (const failure of initialBatch.strategyFailures) {
      const [strategyId] = failure.split(":");
      if (strategyId && isTechnicalStrategyFailure(failure)) {
        degradedStrategyIds.push(strategyId as DiscoveryStrategyId);
      }
    }

    const poolLevel = assessCandidatePoolAdequacy(draftCandidates.length);
    console.info("[FAVC1] venture radar pool adequacy", {
      candidateCount: draftCandidates.length,
      poolLevel,
      degradedStrategies: degradedStrategyIds.length,
    });

    if (
      shouldAttemptPoolRecovery({
        candidateCount: draftCandidates.length,
        technicalStrategyFailures: initialBatch.strategyFailures.filter(isTechnicalStrategyFailure),
        researchCallsRemaining: maxResearchCalls - researchRunIds.length,
        poolRecoveryAttempted: false,
      })
    ) {
      const recoveryStrategies = strategies.filter((strategy) =>
        degradedStrategyIds.includes(strategy.id),
      );
      console.info("[FAVC1] venture radar pool recovery start", {
        strategies: recoveryStrategies.map((strategy) => strategy.id),
      });
      const recoveryBatch = await runStrategyBatch({
        admin,
        organizationId: input.organizationId,
        idempotencyKey: input.idempotencyKey,
        runPurpose: input.runPurpose,
        searchScope,
        strategies: recoveryStrategies,
        maxResearchCalls,
        researchRunIds,
        attemptSuffix: "pool-recovery",
        requireSourceBackedFindings: true,
      });
      draftCandidates.push(...recoveryBatch.draftCandidates);
      strategyFailures.push(...recoveryBatch.strategyFailures);
      costSummary = mergeCostSummaryBlocks(costSummary, recoveryBatch.costDelta);
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
    if (runRow?.id) {
      await markDiscoveryRunFailed(admin, input.organizationId, runRow.id, {
        classification: classified.classification,
        message: classified.message,
        status: classified.classification === "budget_exceeded" ? "policy_blocked" : "failed",
        strategyFailures,
      });
    }

    return {
      ok: false,
      discoveryRunId: runRow?.id ?? "unknown",
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
