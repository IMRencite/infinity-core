import { assembleReasoningContext, type AssembleReasoningContextInput } from "./context";
import { defaultReasoningConstraints, injectConstraints } from "./constraints";
import { buildReasoningEvent } from "./events";
import { getPromptTemplate, composePrompts, type PromptTemplateSegment } from "./prompts";
import { selectReasoningProvider } from "./registry";
import { transitionSessionStatus, withSessionContext } from "./sessions";
import { notImplementedToolResolver } from "./tools";
import { executeProviderRuntimeSync } from "@/lib/infinity/ai-providers/runtime";
import type {
  PipelineStageResult,
  ReasoningPipelineInput,
  ReasoningPipelineResult,
  ReasoningPipelineStage,
  ReasoningSession,
  ReasoningEventRecord,
} from "./types";
import { toPersistableSession } from "./sessions";

function stageResult(
  stage: ReasoningPipelineStage,
  status: PipelineStageResult["status"],
  message: string,
): PipelineStageResult {
  return { stage, status, message, completedAt: new Date().toISOString() };
}

function recordStage(
  session: ReasoningSession,
  result: PipelineStageResult,
): ReasoningSession {
  return {
    ...session,
    pipelineStageResults: {
      ...session.pipelineStageResults,
      [result.stage]: result,
    },
    updatedAt: new Date().toISOString(),
  };
}

function buildPromptSegments(session: ReasoningSession): PromptTemplateSegment[] {
  const ctx = session.context;
  if (!ctx) return [];

  const segments: PromptTemplateSegment[] = [];
  const add = (templateKey: string, variables: Record<string, string>) => {
    const template = getPromptTemplate(templateKey);
    if (template) segments.push({ template, variables });
  };

  add("advisory_boundary", { organization_id: ctx.organizationId });
  add("runtime_metadata", {
    session_id: session.id,
    correlation_id: ctx.correlationId,
  });
  add("mission_summary", {
    mission_id: ctx.mission.missionId ?? "",
    mission_title: ctx.mission.title ?? "",
    objective: ctx.mission.objective ?? "",
  });
  add("opportunity_summary", {
    opportunity_id: ctx.opportunity.opportunityId ?? "",
    opportunity_name: ctx.opportunity.name ?? "",
  });
  add("validation_summary", {
    validation_run_id: ctx.validation.validationRunId ?? "",
    recommendation: ctx.validation.recommendation ?? "",
  });
  add("executive_decision_summary", {
    executive_decision_id: ctx.executive.executiveDecisionId ?? "",
    decision: ctx.executive.decision ?? "",
    planning_eligible: ctx.executive.planningEligible ? "true" : "false",
  });
  add("planner_handoff_summary", {
    planner_plan_id: ctx.planner.plannerPlanId ?? "",
    gate_status: ctx.planner.gateStatus,
  });

  return segments;
}

export function runContextAssemblyStage(
  session: ReasoningSession,
  input: AssembleReasoningContextInput | null,
): ReasoningSession {
  if (!input) {
    return recordStage(
      session,
      stageResult("context_assembly", "failed", "Context assembly input missing."),
    );
  }

  const context = assembleReasoningContext(input);
  const next = withSessionContext(session, context);
  return recordStage(
    next,
    stageResult("context_assembly", "completed", "Structured context assembled."),
  );
}

export function runConstraintInjectionStage(session: ReasoningSession): ReasoningSession {
  const next = injectConstraints({
    ...session,
    constraints: session.constraints ?? defaultReasoningConstraints(),
  });
  return recordStage(
    next,
    stageResult("constraint_injection", "completed", "Advisory safety constraints applied."),
  );
}

export function runPromptConstructionStage(session: ReasoningSession): ReasoningSession {
  const segments = buildPromptSegments(session);
  const composedPrompts = composePrompts(segments);
  const next: ReasoningSession = {
    ...session,
    composedPrompts,
    updatedAt: new Date().toISOString(),
  };
  return recordStage(
    next,
    stageResult(
      "prompt_construction",
      segments.length > 0 ? "completed" : "skipped",
      segments.length > 0
        ? "Prompt template bundle composed."
        : "No prompt segments available.",
    ),
  );
}

export function runProviderSelectionStage(
  session: ReasoningSession,
  input: ReasoningPipelineInput,
): ReasoningSession {
  const provider = selectReasoningProvider(input.selectionPolicy);
  if (!provider) {
    return recordStage(
      transitionSessionStatus(session, "awaiting_provider"),
      stageResult(
        "provider_selection",
        "skipped",
        "No provider registered; execution remains disabled.",
      ),
    );
  }

  const models = provider.listModels();
  const model = models[0] ?? null;

  const next: ReasoningSession = {
    ...session,
    selectedProviderId: provider.id,
    selectedModel: model,
    status: "awaiting_provider",
    updatedAt: new Date().toISOString(),
  };

  return recordStage(
    next,
    stageResult("provider_selection", "completed", `Provider metadata selected: ${provider.id}.`),
  );
}

export function runExecutionStage(session: ReasoningSession): ReasoningSession {
  const execution = executeProviderRuntimeSync({
    session,
    preferredProviderId: "mock",
    fallbackProviderIds: ["mock"],
    env: {
      ...process.env,
      AI_PROVIDER_ALLOW_LIVE_EXECUTION: "false",
    },
  });

  if (execution.status === "completed" && execution.execution && execution.executiveReview) {
    const structured = execution.execution.structured;
    const next: ReasoningSession = {
      ...session,
      status: "executing",
      advisoryOutputs: [
        ...session.advisoryOutputs,
        {
          kind: "recommendation",
          summary: structured.summary,
          details: [...structured.recommendations, ...structured.rationale],
          generatedAt: new Date().toISOString(),
          binding: false,
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    return recordStage(
      transitionSessionStatus(next, "executive_review"),
      stageResult(
        "execution",
        "completed",
        `${execution.message} ${execution.executiveReview.message}`,
      ),
    );
  }

  return recordStage(
    session,
    stageResult(
      "execution",
      execution.status === "failed" ? "failed" : "skipped",
      execution.message,
    ),
  );
}

export function runToolResolutionStage(session: ReasoningSession): ReasoningSession {
  const resolution = notImplementedToolResolver.resolve({ toolId: "tool.memory", arguments: {} });
  return recordStage(
    session,
    stageResult("tool_resolution", "skipped", resolution.summary),
  );
}

export function runReflectionStage(session: ReasoningSession): ReasoningSession {
  const next: ReasoningSession = {
    ...session,
    status: "reflecting",
    advisoryOutputs: [
      ...session.advisoryOutputs,
      {
        kind: "reflection",
        summary: "Deterministic reflection placeholder (no model execution).",
        details: ["Executive authority preserved.", "Output is advisory only."],
        generatedAt: new Date().toISOString(),
        binding: false,
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  return recordStage(
    next,
    stageResult("reflection", "completed", "Reflection stage recorded."),
  );
}

export function runCritiqueStage(session: ReasoningSession): ReasoningSession {
  const next: ReasoningSession = {
    ...session,
    status: "critiquing",
    advisoryOutputs: [
      ...session.advisoryOutputs,
      {
        kind: "critique",
        summary: "Deterministic critique placeholder (no model execution).",
        details: ["Critique does not modify Executive decisions."],
        generatedAt: new Date().toISOString(),
        binding: false,
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  return recordStage(
    next,
    stageResult("critique", "completed", "Critique stage recorded."),
  );
}

export function runExecutiveReviewStage(session: ReasoningSession): ReasoningSession {
  return recordStage(
    transitionSessionStatus(session, "executive_review"),
    stageResult(
      "executive_review",
      "completed",
      "Executive review requested; AI output remains non-binding.",
    ),
  );
}

export function runPlanningHandoffStage(session: ReasoningSession): ReasoningSession {
  const eligible = session.context?.executive.planningEligible === true;
  return recordStage(
    transitionSessionStatus(session, "planning_handoff"),
    stageResult(
      "planning_handoff",
      eligible ? "completed" : "skipped",
      eligible
        ? "Planner handoff metadata prepared (Executive gate still required)."
        : "Planner handoff skipped — Executive planning not eligible.",
    ),
  );
}

export function runPersistenceStage(session: ReasoningSession): ReasoningSession {
  const persistable = toPersistableSession(session);
  void persistable;
  return recordStage(
    transitionSessionStatus(session, "completed"),
    stageResult("persistence", "skipped", "Persistence hooks reserved; no migration in v1."),
  );
}

export function runReasoningPipeline(
  input: ReasoningPipelineInput,
  contextAssemblyInput?: Parameters<typeof assembleReasoningContext>[0],
): ReasoningPipelineResult {
  let session = input.session;
  const events: ReasoningEventRecord[] = [];

  const pushEvent = (eventType: ReasoningPipelineResult["events"][number]["eventType"], message: string) => {
    events.push(
      buildReasoningEvent({
        organizationId: session.refs.organizationId,
        sessionId: session.id,
        eventType,
        message,
        correlationId: session.refs.correlationId,
      }),
    );
  };

  pushEvent("reasoning.started", "Reasoning pipeline started.");

  if (contextAssemblyInput) {
    session = runContextAssemblyStage(session, contextAssemblyInput);
    pushEvent("reasoning.context_ready", "Reasoning context ready.");
  } else if (session.context) {
    session = recordStage(
      session,
      stageResult("context_assembly", "completed", "Preloaded context used."),
    );
    pushEvent("reasoning.context_ready", "Reasoning context ready.");
  } else {
    session = recordStage(
      session,
      stageResult("context_assembly", "failed", "No context available."),
    );
    pushEvent("reasoning.failed", "Context assembly failed.");
    return { session: transitionSessionStatus(session, "failed"), events };
  }

  session = runConstraintInjectionStage(session);
  session = runPromptConstructionStage(session);
  session = runProviderSelectionStage(session, input);

  if (session.selectedProviderId) {
    pushEvent("reasoning.provider_selected", `Provider ${session.selectedProviderId} selected.`);
  }

  session = runExecutionStage(session);
  session = runToolResolutionStage(session);
  session = runReflectionStage(session);
  pushEvent("reasoning.reflection_completed", "Reflection stage completed.");
  session = runCritiqueStage(session);
  pushEvent("reasoning.critique_completed", "Critique stage completed.");
  session = runExecutiveReviewStage(session);
  pushEvent("reasoning.executive_review_requested", "Executive review requested.");
  session = runPlanningHandoffStage(session);
  session = runPersistenceStage(session);

  if (session.status === "completed") {
    pushEvent("reasoning.completed", "Reasoning pipeline completed.");
  }

  return { session, events };
}
