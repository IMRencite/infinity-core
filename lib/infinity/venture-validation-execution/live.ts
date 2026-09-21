import { runGroundedResearch } from "@/lib/infinity/research/run";
import { compileInputFromIntelligence } from "@/lib/infinity/venture-build-orchestration/from-intelligence";
import { loadCanonicalCandidateIntelligence } from "@/lib/infinity/venture-intelligence/load";
import { fromOpportunityCandidate } from "@/lib/infinity/venture-intelligence/adapters/from-opportunity-candidate";
import { asRecord } from "@/lib/infinity/venture-intelligence/json";
import { createAdminClient } from "@/lib/supabase/admin";
import { compileExecutableValidationPlan } from "./compile";
import { LIVE_QUERY_BUDGET } from "./constants";
import { executeGovernedValidation } from "./execute";
import { CRE_CANDIDATE_ID, LIVE_ORG, inspectPreRunCandidateState, loadEnvLocal } from "./inspect";
import { persistValidationLineage } from "./persist";
import type { ValidationExecutionResult } from "./types";

export function livePreRunGate(checks: Record<string, boolean>): { ok: boolean; failed: string[] } {
  const failed = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  return { ok: failed.length === 0, failed };
}

export async function executeLiveCreValidation(): Promise<ValidationExecutionResult> {
  if (!loadEnvLocal()) {
    throw new Error("live_env_missing");
  }
  const admin = createAdminClient();
  const preRun = await inspectPreRunCandidateState(CRE_CANDIDATE_ID);
  if (!preRun) throw new Error("cre_pre_run_unavailable");
  const view = await loadCanonicalCandidateIntelligence(admin, LIVE_ORG, CRE_CANDIDATE_ID);
  const compile = compileInputFromIntelligence(view, { organizationId: LIVE_ORG });
  const plan = compileExecutableValidationPlan({ compile, view, preRun });

  const research = await runGroundedResearch(admin, {
    organizationId: LIVE_ORG,
    candidateId: CRE_CANDIDATE_ID,
    researchObjective: [
      "Validate Commercial Real Estate lease comparison and NPV calculator demand for independent brokers and tenant reps.",
      "Find complaint-shaped evidence of spreadsheet lease math pain, current alternatives (CRE analytics, lease admin, templates, calculators, brokerage software), and why smaller brokers fail with those tools.",
      "Find pricing anchors and comparable spend. Do not treat a list price as willingness to pay.",
      "Research whether usage is monthly, annual seat, per-deal, team license, or one-time.",
      "Cite public URLs only.",
    ].join(" "),
    idempotencyKey: `gavve-v1:${CRE_CANDIDATE_ID}:${plan.planId}`,
    runPurpose: "governed_autonomous_venture_validation_v1",
    requireSourceBackedFindings: true,
    coverageSeed: {
      ideaTitle: preRun.name,
      targetCustomer: view.customer.targetCustomer,
      problem: view.problem.coreProblem,
    },
  });

  if (!research.ok) {
    const failed = await executeGovernedValidation({
      compile,
      view,
      preRun,
      candidate: preRun.candidate,
      persist: false,
      liveResearch: {
        ran: true,
        provider: research.failure.providerId ?? null,
        model: research.failure.modelId ?? null,
        providerCalls: 1,
        queries: 0,
        sources: 0,
        costUsd: research.failure.estimatedCostUsd,
        costKnown: research.failure.estimatedCostUsd != null,
        researchRunIds: research.failure.researchRunId ? [research.failure.researchRunId] : [],
      },
    });
    return failed;
  }

  const resultRow = research.result;
  const { data: candidateRow } = await admin.from("opportunity_candidates").select("*").eq("id", CRE_CANDIDATE_ID).maybeSingle();
  const candidate = fromOpportunityCandidate(asRecord(candidateRow));
  const findings = resultRow.findings;
  const sources = resultRow.sources;
  const additions = {
    demandEvidence: findings.filter((item) => /pain|spreadsheet|broker|complaint|error/i.test(item.summary)).map((item) => item.summary),
    competitionEvidence: findings.filter((item) => /compet|alternativ|excel|costar|template/i.test(item.summary)).map((item) => item.summary),
    monetizationEvidence: findings.filter((item) => /price|pricing|subscription|fee|cac|ltv/i.test(item.summary)).map((item) => item.summary),
    researchSources: sources.map((item) => item.url).filter(Boolean),
  };

  const result = await executeGovernedValidation({
    compile,
    view,
    preRun,
    candidate,
    researchAdditions: additions,
    persist: true,
    liveResearch: {
      ran: true,
      provider: resultRow.providerId,
      model: resultRow.modelId,
      providerCalls: resultRow.callTelemetry?.initialResearchCallCount ?? 1,
      queries: Math.min(LIVE_QUERY_BUDGET.hardQueryCap, resultRow.groundingUsage.searchQueryCount),
      sources: sources.length,
      costUsd: resultRow.estimatedCostUsd,
      costKnown: resultRow.estimatedCostUsd != null,
      researchRunIds: [resultRow.researchRunId],
    },
  });

  const persisted = await persistValidationLineage(admin, result);
  return {
    ...result,
    persistence: {
      persisted: true,
      researchRunIds: result.live.researchRunIds,
      selectionRunId: persisted.selectionRunId,
      monetizationPlanId: persisted.monetizationPlanId,
    },
  };
}
