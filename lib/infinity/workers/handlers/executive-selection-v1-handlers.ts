import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { createPermissionEnforcer } from "../permissions";
import { requireStringField } from "../input-schema";
import type { WorkerExecutionContextBound, WorkerHandlerResult } from "../types";
import {
  attachScoresToManifest,
  buildExecutiveSelectionContext,
} from "@/lib/infinity/executive-selection/context";
import { loadExecutiveAiAdvisoryMode, runMockExecutiveAdvisory } from "@/lib/infinity/executive-selection/advisory";
import { emitExecutiveSelectionEvent } from "@/lib/infinity/executive-selection/events";
import {
  buildExecutiveContextIdempotencyKey,
  buildExecutivePipelineIdempotencyKey,
} from "@/lib/infinity/executive-selection/jobs";
import {
  finalizeSelectionDecision,
  insertExecutiveContext,
  insertSelectionDecisionDraft,
  loadExecutiveContext,
  updateExecutiveContextManifest,
} from "@/lib/infinity/executive-selection/persistence";
import { verifyExecutiveSelection } from "@/lib/infinity/executive-selection/qa";
import { scoreEligibleSet } from "@/lib/infinity/executive-selection/scoring";
import {
  applyResourceConstraintProfile,
  assignExecutiveDecisions,
  evaluatePortfolioConstraints,
} from "@/lib/infinity/executive-selection/selection-rules";
import { loadEligibleOpportunitiesForMission } from "@/lib/infinity/executive-selection/eligibility";
import type { ExecutiveContextManifest } from "@/lib/infinity/executive-selection/types";
import { defaultSelectionThresholds } from "@/lib/infinity/executive-selection/scoring";

function readInput(context: WorkerExecutionContextBound) {
  const input = context.approvedInput as Record<string, unknown>;
  requireStringField(input, "organization_id");
  if (input.organization_id !== context.organizationId) {
    throw new Error("Organization isolation violation");
  }
  const missionId = requireStringField(input, "mission_id");
  const runtimeInstanceId = requireStringField(input, "runtime_instance_id");
  const contextHash = requireStringField(input, "context_hash");
  const executiveContextId =
    typeof input.executive_context_id === "string" ? input.executive_context_id : null;
  return { missionId, runtimeInstanceId, contextHash, executiveContextId };
}

export async function dispatchExecutiveSelectionWorkerHandler(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult | null> {
  switch (context.capabilityKey) {
    case "executive.build_selection_context":
      return runExecutiveBuildSelectionContext(admin, context);
    case "executive.score_opportunity_set":
      return runExecutiveScoreOpportunitySet(admin, context);
    case "executive.request_ai_advisory":
      return runExecutiveRequestAiAdvisory(admin, context);
    case "executive.evaluate_constraints":
      return runExecutiveEvaluateConstraints(admin, context);
    case "executive.select_opportunity":
      return runExecutiveSelectOpportunity(admin, context);
    case "executive.persist_selection_decisions":
      return runExecutivePersistSelectionDecisions(admin, context);
    case "qa.verify_executive_selection":
      return runQaVerifyExecutiveSelection(admin, context);
    default:
      return null;
  }
}

async function runExecutiveBuildSelectionContext(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("executive.read");
  permissions.require("opportunity.read");

  const { missionId, runtimeInstanceId, contextHash } = readInput(context);
  const idempotencyKey = buildExecutiveContextIdempotencyKey({
    organizationId: context.organizationId,
    missionId,
    runtimeInstanceId,
    contextHash,
  });

  const { data: existingContext } = await admin
    .from("executive_contexts")
    .select("id, status")
    .eq("organization_id", context.organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingContext?.status === "completed") {
    return {
      structuredOutput: { valid: true, executive_context_id: existingContext.id, already_run: true },
      artifactType: "validation_report",
      artifactPayload: { skipped: true },
    };
  }

  await emitExecutiveSelectionEvent(admin, {
    organizationId: context.organizationId,
    eventType: "executive.context_started",
    message: "Executive context assembly started.",
    correlationId: context.correlationId,
    missionId,
    runtimeInstanceId,
  });

  const built = await buildExecutiveSelectionContext({
    admin,
    organizationId: context.organizationId,
    missionId,
    runtimeInstanceId,
    correlationId: context.correlationId,
  });

  if (built.contextHash !== contextHash) {
    throw new Error("Context hash mismatch for Executive context job.");
  }

  const row = await insertExecutiveContext(admin, {
    organizationId: context.organizationId,
    missionId,
    runtimeInstanceId,
    contextVersion: 1,
    objective: built.objective,
    portfolioStrategy: built.portfolioStrategy,
    opportunityIds: built.opportunityIds,
    contextManifest: built.manifest,
    contextHash: built.contextHash,
    idempotencyKey,
    correlationId: context.correlationId,
  });

  if (!row) throw new Error("Failed to persist executive context");

  await updateExecutiveContextManifest(admin, context.organizationId, row.id, built.manifest, {
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  await emitExecutiveSelectionEvent(admin, {
    organizationId: context.organizationId,
    eventType: "executive.context_completed",
    message: "Executive context persisted.",
    correlationId: context.correlationId,
    missionId,
    runtimeInstanceId,
    executiveContextId: row.id,
    payload: { context_hash: built.contextHash, opportunity_count: built.opportunityIds.length },
  });

  return {
    structuredOutput: {
      valid: true,
      executive_context_id: row.id,
      context_hash: built.contextHash,
      opportunity_ids: built.opportunityIds,
    },
    artifactType: "validation_report",
    artifactPayload: { executive_context_id: row.id },
  };
}

async function loadContextRow(
  admin: AdminSupabaseClient,
  organizationId: string,
  executiveContextId: string | null,
  contextHash: string,
) {
  if (!executiveContextId) {
    throw new Error("executive_context_id required");
  }
  const row = await loadExecutiveContext(admin, organizationId, executiveContextId);
  if (!row || row.context_hash !== contextHash) {
    throw new Error("Executive context not found or hash mismatch");
  }
  return row;
}

async function runExecutiveScoreOpportunitySet(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("executive.read");

  const { missionId, contextHash, executiveContextId } = readInput(context);
  const row = await loadContextRow(admin, context.organizationId, executiveContextId, contextHash);
  const manifest = row.context_manifest as ExecutiveContextManifest;

  await emitExecutiveSelectionEvent(admin, {
    organizationId: context.organizationId,
    eventType: "executive.scoring_started",
    message: "Executive scoring started.",
    correlationId: context.correlationId,
    missionId,
    executiveContextId: row.id,
  });

  const { eligible } = await loadEligibleOpportunitiesForMission(
    admin,
    context.organizationId,
    missionId,
  );
  const scores = scoreEligibleSet(eligible);
  const updated = attachScoresToManifest(manifest, scores);
  await updateExecutiveContextManifest(admin, context.organizationId, row.id, updated);

  await emitExecutiveSelectionEvent(admin, {
    organizationId: context.organizationId,
    eventType: "executive.scoring_completed",
    message: "Executive scoring completed.",
    correlationId: context.correlationId,
    missionId,
    executiveContextId: row.id,
  });

  return {
    structuredOutput: { valid: true, scored: scores.length },
    artifactType: "comparison_report",
    artifactPayload: { ranked: updated.rankedOpportunityIds },
  };
}

async function runExecutiveRequestAiAdvisory(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("executive.read");

  const { missionId, contextHash, executiveContextId } = readInput(context);
  const row = await loadContextRow(admin, context.organizationId, executiveContextId, contextHash);
  const manifest = row.context_manifest as ExecutiveContextManifest;
  const mode = loadExecutiveAiAdvisoryMode();

  await emitExecutiveSelectionEvent(admin, {
    organizationId: context.organizationId,
    eventType: "executive.ai_advisory_requested",
    message: "Executive AI advisory requested.",
    correlationId: context.correlationId,
    missionId,
    executiveContextId: row.id,
    payload: { mode },
  });

  if (mode === "disabled") {
    return {
      structuredOutput: { valid: true, skipped: true },
      artifactType: "validation_report",
      artifactPayload: { skipped: true },
    };
  }

  const advisory = runMockExecutiveAdvisory({ manifest, mode });
  const updated: ExecutiveContextManifest = {
    ...manifest,
    aiAdvisory: advisory.summary,
    aiAdvisorySummaries: { [advisory.advisoryId]: advisory.summary },
  };
  await updateExecutiveContextManifest(admin, context.organizationId, row.id, updated);

  await emitExecutiveSelectionEvent(admin, {
    organizationId: context.organizationId,
    eventType: "executive.ai_advisory_completed",
    message: "Executive AI advisory completed.",
    correlationId: context.correlationId,
    missionId,
    executiveContextId: row.id,
    payload: { mode, advisory_id: advisory.advisoryId },
  });

  return {
    structuredOutput: { valid: true, advisory_id: advisory.advisoryId, mode },
    artifactType: "validation_report",
    artifactPayload: advisory.summary,
  };
}

async function runExecutiveEvaluateConstraints(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("executive.read");

  const { missionId, contextHash, executiveContextId } = readInput(context);
  const row = await loadContextRow(admin, context.organizationId, executiveContextId, contextHash);
  const manifest = row.context_manifest as ExecutiveContextManifest;
  const thresholds = defaultSelectionThresholds();

  const scores = Object.values(manifest.deterministicScores ?? {});
  let constraints = evaluatePortfolioConstraints({
    scores,
    maxSelections: thresholds.maxSelections,
  });

  const { eligible } = await loadEligibleOpportunitiesForMission(
    admin,
    context.organizationId,
    missionId,
  );
  constraints = applyResourceConstraintProfile(eligible, constraints);

  const updated: ExecutiveContextManifest = {
    ...manifest,
    constraintResults: constraints,
  };
  await updateExecutiveContextManifest(admin, context.organizationId, row.id, updated);

  await emitExecutiveSelectionEvent(admin, {
    organizationId: context.organizationId,
    eventType: "executive.constraints_evaluated",
    message: "Executive constraints evaluated.",
    correlationId: context.correlationId,
    missionId,
    executiveContextId: row.id,
  });

  return {
    structuredOutput: { valid: true },
    artifactType: "validation_report",
    artifactPayload: constraints,
  };
}

async function runExecutiveSelectOpportunity(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("executive.read");

  const { missionId, runtimeInstanceId, contextHash, executiveContextId } = readInput(context);
  const row = await loadContextRow(admin, context.organizationId, executiveContextId, contextHash);
  const manifest = row.context_manifest as ExecutiveContextManifest;
  const mode = loadExecutiveAiAdvisoryMode();

  await emitExecutiveSelectionEvent(admin, {
    organizationId: context.organizationId,
    eventType: "executive.selection_started",
    message: "Executive selection started.",
    correlationId: context.correlationId,
    missionId,
    executiveContextId: row.id,
  });

  const { eligible } = await loadEligibleOpportunitiesForMission(
    admin,
    context.organizationId,
    missionId,
  );
  let scores = Object.values(manifest.deterministicScores ?? {});
  if (scores.length === 0 && eligible.length > 0) {
    scores = scoreEligibleSet(eligible);
  }
  const constraints = (manifest.constraintResults ?? evaluatePortfolioConstraints({
    scores,
    maxSelections: defaultSelectionThresholds().maxSelections,
  })) as ReturnType<typeof evaluatePortfolioConstraints>;

  const advisoryId = manifest.aiAdvisory
    ? Object.keys(manifest.aiAdvisorySummaries ?? {})[0] ?? null
    : null;

  const outcomes = assignExecutiveDecisions({
    opportunities: eligible,
    scores,
    evidenceQuality: manifest.evidenceQuality ?? {},
    constraints,
    aiAdvisoryRecommendationId: advisoryId,
    aiMode: mode,
  });

  const decisionIds: string[] = [];
  for (const outcome of outcomes) {
    const idempotencyKey = buildExecutivePipelineIdempotencyKey({
      organizationId: context.organizationId,
      missionId,
      runtimeInstanceId,
      contextHash,
      capabilityKey: "executive.select_opportunity",
    }).concat(`:${outcome.opportunityId}`);

    const draft = await insertSelectionDecisionDraft(admin, {
      organizationId: context.organizationId,
      missionId,
      runtimeInstanceId,
      executiveContextId: row.id,
      outcome,
      contextHash,
      idempotencyKey,
      validationRunId: null,
    });
    if (draft) decisionIds.push(draft.id);

    const eventType =
      outcome.decision === "select_for_planning"
        ? "executive.opportunity_selected"
        : outcome.decision === "reject"
          ? "executive.opportunity_rejected"
          : outcome.decision === "monitor"
            ? "executive.opportunity_monitored"
            : outcome.decision === "request_more_validation"
              ? "executive.more_validation_requested"
              : outcome.decision === "defer_due_to_constraints"
                ? "executive.opportunity_deferred"
                : "executive.human_review_required";

    await emitExecutiveSelectionEvent(admin, {
      organizationId: context.organizationId,
      eventType,
      message: outcome.rationaleSummary,
      correlationId: context.correlationId,
      missionId,
      executiveContextId: row.id,
      opportunityId: outcome.opportunityId,
      payload: { decision: outcome.decision, rank: outcome.rank },
    });
  }

  return {
    structuredOutput: { valid: true, decision_ids: decisionIds, count: outcomes.length },
    artifactType: "comparison_report",
    artifactPayload: { outcomes: outcomes.map((o) => ({ id: o.opportunityId, decision: o.decision })) },
  };
}

async function runExecutivePersistSelectionDecisions(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("executive.read");

  const { contextHash, executiveContextId } = readInput(context);
  const row = await loadContextRow(admin, context.organizationId, executiveContextId, contextHash);
  const manifest = row.context_manifest as ExecutiveContextManifest;
  const qaPass = manifest.qa?.verdict === "pass";

  const { data: drafts } = await admin
    .from("executive_selection_decisions")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("executive_context_id", row.id)
    .eq("status", "draft");

  for (const draft of drafts ?? []) {
    const planningEligible =
      qaPass && draft.decision === "select_for_planning" && draft.rank === 1;

    await finalizeSelectionDecision(admin, context.organizationId, draft.id, {
      planningEligible,
      reviewStatus: qaPass ? "passed" : "failed",
    });

    if (planningEligible) {
      await emitExecutiveSelectionEvent(admin, {
        organizationId: context.organizationId,
        eventType: "executive.planning_eligibility_granted",
        message: "Planning eligibility granted after QA pass.",
        correlationId: context.correlationId,
        missionId: draft.mission_id,
        executiveContextId: row.id,
        decisionId: draft.id,
        payload: { planning_eligible: true },
      });
    }

    await emitExecutiveSelectionEvent(admin, {
      organizationId: context.organizationId,
      eventType: "executive.decision_finalized",
      message: `Decision finalized: ${draft.decision}`,
      correlationId: context.correlationId,
      missionId: draft.mission_id,
      executiveContextId: row.id,
      decisionId: draft.id,
      opportunityId: draft.opportunity_id ?? undefined,
    });
  }

  return {
    structuredOutput: { valid: true, finalized: (drafts ?? []).length, qa_pass: qaPass },
    artifactType: "validation_report",
    artifactPayload: { finalized: (drafts ?? []).length },
  };
}

async function runQaVerifyExecutiveSelection(
  admin: AdminSupabaseClient,
  context: WorkerExecutionContextBound,
): Promise<WorkerHandlerResult> {
  const permissions = createPermissionEnforcer(context);
  permissions.require("executive.read");

  const { missionId, contextHash, executiveContextId } = readInput(context);
  const row = await loadContextRow(admin, context.organizationId, executiveContextId, contextHash);

  await emitExecutiveSelectionEvent(admin, {
    organizationId: context.organizationId,
    eventType: "executive.selection_qa_requested",
    message: "Executive selection QA requested.",
    correlationId: context.correlationId,
    missionId,
    executiveContextId: row.id,
  });

  const qa = await verifyExecutiveSelection(admin, {
    organizationId: context.organizationId,
    missionId,
    executiveContextId: row.id,
    contextHash,
    workerRunId: context.workerRunId,
  });

  const manifest = row.context_manifest as ExecutiveContextManifest;
  const updatedManifest: ExecutiveContextManifest = {
    ...manifest,
    qa: { verdict: qa.verdict, issues: qa.issues, verifiedAt: new Date().toISOString() },
  };
  await updateExecutiveContextManifest(admin, context.organizationId, row.id, updatedManifest);

  await emitExecutiveSelectionEvent(admin, {
    organizationId: context.organizationId,
    eventType: "executive.selection_qa_completed",
    message: `QA ${qa.verdict}`,
    correlationId: context.correlationId,
    missionId,
    executiveContextId: row.id,
    payload: { verdict: qa.verdict, issue_count: qa.issues.length },
  });

  return {
    structuredOutput: { valid: qa.verdict === "pass", verdict: qa.verdict, issues: qa.issues },
    artifactType: "qa_report",
    artifactPayload: { verdict: qa.verdict, issues: qa.issues },
  };
}
