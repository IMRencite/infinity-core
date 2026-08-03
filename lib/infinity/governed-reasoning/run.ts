import type { Json } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { executeOpenAiGovernedReasoning } from "@/lib/infinity/ai-providers/openai";
import { loadOpenAiReasoningConfig } from "@/lib/infinity/ai-providers/openai/config";
import { OpenAiProviderError } from "@/lib/infinity/ai-providers/openai/errors";
import { PENDING_JOB_STATUSES, REASONING_ADVISORY_CAPABILITY_KEY } from "@/lib/infinity/constants";
import { buildBoundedReasoningContext } from "./context";
import {
  evaluateCostPolicy,
  estimateRequestCostUsd,
  estimateRequestTokens,
  loadReasoningCostPolicy,
} from "./cost-policy";
import { emitReasoningEvent } from "./events";
import { buildMockGovernedReasoningOutput, providerLabel } from "./mock-output";
import {
  loadGovernedReasoningMode,
  modeAllowsProviderNetwork,
  modeUsesMockProvider,
  resolveProviderIdForMode,
} from "./modes";
import {
  findReasoningSessionByIdempotency,
  insertReasoningSessionRequest,
  updateReasoningSession,
  type PersistedReasoningSession,
} from "./persistence";
import { buildGovernedReasoningSystemPrompt, buildGovernedReasoningUserPrompt } from "./prompts";
import { parseGovernedReasoningJson } from "./schema";
import { GOVERNED_REASONING_SCHEMA_VERSION } from "./constants";

type InfinitySupabase = SupabaseClient<Database>;

export type RunGovernedReasoningInput = {
  organizationId: string;
  missionId: string;
  opportunityId: string;
  runtimeInstanceId?: string | null;
  correlationId?: string | null;
  idempotencyKey: string;
  modeOverride?: ReturnType<typeof loadGovernedReasoningMode>;
};

export type RunGovernedReasoningResult = {
  session: PersistedReasoningSession;
  alreadyExists: boolean;
  providerFallbackRecorded: boolean;
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runGovernedReasoningSession(
  supabase: InfinitySupabase,
  input: RunGovernedReasoningInput,
): Promise<RunGovernedReasoningResult> {
  const mode = input.modeOverride ?? loadGovernedReasoningMode();
  const openAiConfig = loadOpenAiReasoningConfig();
  const costPolicy = loadReasoningCostPolicy();
  const providerId = resolveProviderIdForMode(mode, Boolean(openAiConfig.apiKey));

  const existing = await findReasoningSessionByIdempotency(
    supabase,
    input.organizationId,
    input.idempotencyKey,
  );

  if (existing && ["completed", "policy_blocked", "rejected"].includes(existing.status)) {
    return { session: existing, alreadyExists: true, providerFallbackRecorded: false };
  }

  const bounded = await buildBoundedReasoningContext(supabase, {
    organizationId: input.organizationId,
    missionId: input.missionId,
    opportunityId: input.opportunityId,
  });

  const systemPrompt = buildGovernedReasoningSystemPrompt();
  const userPrompt = buildGovernedReasoningUserPrompt(bounded.userPayload);
  const estimatedInputTokens = estimateRequestTokens(`${systemPrompt}\n${userPrompt}`);

  const costDecision = evaluateCostPolicy({
    policy: costPolicy,
    estimatedInputTokens,
    configuredOutputTokens: openAiConfig.maxOutputTokens,
    mode,
  });

  const session =
    existing ??
    (await insertReasoningSessionRequest(supabase, {
      organizationId: input.organizationId,
      missionId: input.missionId,
      opportunityId: input.opportunityId,
      runtimeInstanceId: input.runtimeInstanceId ?? null,
      validationRunId: bounded.manifest.validationRunId,
      executiveDecisionId: bounded.manifest.executiveDecisionId,
      provider: providerLabel(mode, providerId),
      model: openAiConfig.model,
      mode,
      promptVersion: bounded.promptVersion,
      contextManifest: bounded.manifest,
      contextHash: bounded.contextHash,
      correlationId: input.correlationId ?? null,
      idempotencyKey: input.idempotencyKey,
    }));

  await emitReasoningEvent(supabase, {
    organizationId: input.organizationId,
    eventType: "reasoning.session_requested",
    message: "Governed reasoning session requested.",
    entityId: session.id,
    correlationId: input.correlationId ?? null,
    payload: {
      mode,
      provider: session.provider,
      model: session.model,
      schema_version: GOVERNED_REASONING_SCHEMA_VERSION,
    },
  });

  if (!costDecision.allowed) {
    const blocked = await updateReasoningSession(supabase, session.id, input.organizationId, {
      status: "policy_blocked",
      error: { message: costDecision.reason } as Json,
      failed_at: new Date().toISOString(),
    });

    await emitReasoningEvent(supabase, {
      organizationId: input.organizationId,
      eventType: "reasoning.session_policy_blocked",
      message: costDecision.reason ?? "Policy blocked.",
      entityId: blocked.id,
      correlationId: input.correlationId ?? null,
    });

    return { session: blocked, alreadyExists: false, providerFallbackRecorded: false };
  }

  if (mode === "disabled" || !providerId) {
    const blocked = await updateReasoningSession(supabase, session.id, input.organizationId, {
      status: "policy_blocked",
      error: { message: "Reasoning provider disabled or unconfigured." } as Json,
      failed_at: new Date().toISOString(),
    });

    return { session: blocked, alreadyExists: false, providerFallbackRecorded: false };
  }

  const working = await updateReasoningSession(supabase, session.id, input.organizationId, {
    status: "started",
    started_at: new Date().toISOString(),
  });

  await emitReasoningEvent(supabase, {
    organizationId: input.organizationId,
    eventType: "reasoning.context_built",
    message: "Bounded reasoning context built.",
    entityId: working.id,
    correlationId: input.correlationId ?? null,
    payload: { context_hash: bounded.contextHash },
  });

  const allowedEvidence = new Set(bounded.manifest.evidenceReferenceIds);
  const providerFallbackRecorded = false;
  let rawText = "";
  let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let latencyMs = 0;
  let modelUsed = working.model;

  if (modeUsesMockProvider(mode) || !modeAllowsProviderNetwork(mode)) {
    const structured = buildMockGovernedReasoningOutput({
      evidenceReferenceIds: bounded.manifest.evidenceReferenceIds,
    });
    rawText = JSON.stringify(structured);
  } else {
    await emitReasoningEvent(supabase, {
      organizationId: input.organizationId,
      eventType: "reasoning.provider_called",
      message: "OpenAI provider called.",
      entityId: working.id,
      correlationId: input.correlationId ?? null,
      payload: { provider: "openai", model: openAiConfig.model },
    });

    let lastError: unknown;

    for (let attempt = 0; attempt <= costPolicy.maxRetries; attempt += 1) {
      try {
        const result = await executeOpenAiGovernedReasoning({
          config: openAiConfig,
          systemPrompt,
          userPrompt,
        });

        rawText = result.rawText;
        usage = result.usage;
        latencyMs = result.latencyMs;
        modelUsed = result.model;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const retryable = error instanceof OpenAiProviderError ? error.retryable : false;
        if (!retryable || attempt >= costPolicy.maxRetries) {
          break;
        }

        await sleep(100 * (attempt + 1));
      }
    }

    if (lastError) {
      const failed = await updateReasoningSession(supabase, session.id, input.organizationId, {
        status: "failed",
        error: {
          message: lastError instanceof Error ? lastError.message : "Provider failed.",
        } as Json,
        failed_at: new Date().toISOString(),
      });

      await emitReasoningEvent(supabase, {
        organizationId: input.organizationId,
        eventType: "reasoning.session_failed",
        message: "Reasoning session failed.",
        entityId: failed.id,
        correlationId: input.correlationId ?? null,
      });

      return { session: failed, alreadyExists: false, providerFallbackRecorded: false };
    }

    await emitReasoningEvent(supabase, {
      organizationId: input.organizationId,
      eventType: "reasoning.response_received",
      message: "Provider response received.",
      entityId: working.id,
      correlationId: input.correlationId ?? null,
      payload: { latency_ms: latencyMs, usage },
    });
  }

  let structured;

  try {
    structured = parseGovernedReasoningJson(rawText, allowedEvidence);
    await emitReasoningEvent(supabase, {
      organizationId: input.organizationId,
      eventType: "reasoning.output_validated",
      message: "Structured reasoning output validated.",
      entityId: working.id,
      correlationId: input.correlationId ?? null,
      payload: {
        recommendation: structured.recommendation,
        confidence: structured.recommendationConfidence,
      },
    });
  } catch (error) {
    const rejected = await updateReasoningSession(supabase, session.id, input.organizationId, {
      status: "rejected",
      error: { message: error instanceof Error ? error.message : "Validation failed." } as Json,
      failed_at: new Date().toISOString(),
    });

    await emitReasoningEvent(supabase, {
      organizationId: input.organizationId,
      eventType: "reasoning.output_rejected",
      message: "Structured output rejected.",
      entityId: rejected.id,
      correlationId: input.correlationId ?? null,
    });

    return { session: rejected, alreadyExists: false, providerFallbackRecorded };
  }

  const estimatedCost = estimateRequestCostUsd(usage.inputTokens, usage.outputTokens);

  const completed = await updateReasoningSession(supabase, session.id, input.organizationId, {
    status: "completed",
    provider: providerLabel(mode, providerId),
    model: modelUsed,
    structured_output: structured as unknown as Json,
    recommendation: structured.recommendation,
    confidence: structured.recommendationConfidence,
    usage: usage as unknown as Json,
    estimated_cost: estimatedCost,
    latency_ms: latencyMs,
    completed_at: new Date().toISOString(),
    error: providerFallbackRecorded
      ? ({ fallback: "recorded", from: "openai", to: "mock" } as Json)
      : ({} as Json),
  });

  await emitReasoningEvent(supabase, {
    organizationId: input.organizationId,
    eventType: "reasoning.session_completed",
    message: "Reasoning session completed.",
    entityId: completed.id,
    correlationId: input.correlationId ?? null,
    payload: {
      mode,
      recommendation: structured.recommendation,
      confidence: structured.recommendationConfidence,
      estimated_cost: estimatedCost,
    },
  });

  await emitReasoningEvent(supabase, {
    organizationId: input.organizationId,
    eventType: "reasoning.executive_review_requested",
    message: "Executive review requested for advisory reasoning.",
    entityId: completed.id,
    correlationId: input.correlationId ?? null,
    payload: { mode, advisory_only: true },
  });

  return { session: completed, alreadyExists: false, providerFallbackRecorded };
}

export async function hasPendingReasoningJobs(
  supabase: InfinitySupabase,
  organizationId: string,
  missionId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("engine_jobs")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("mission_id", missionId)
    .eq("capability_key", REASONING_ADVISORY_CAPABILITY_KEY)
    .in("status", [...PENDING_JOB_STATUSES]);

  return (count ?? 0) > 0;
}
